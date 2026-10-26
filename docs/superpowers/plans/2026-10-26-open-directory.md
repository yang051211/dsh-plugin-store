# 开放目录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把生态家园从 35 个人工审核插件改成每天自动重建的开放目录（约 4800 个 DSH 插件），界面去掉所有审核表述。

**Architecture:** 新建 `tools/directory/`：发现（npm 搜索）→ 包信息（packument，按最新版本增量）→ 统计（下载量批量、星标轮换）→ 自动检测（只扫最新版 tarball，顺带取图标）→ 构建（format-1 `market/index.json` + 每包详情 + 图标）。状态文件入库在 `directory/`，GitHub Actions 每天跑一遍并提交。Host 增加 README 路由（只读目录里列出的包、指定版本，经 jsDelivr）。客户端模型与界面改为排序/分页的大目录。

**Tech Stack:** Node 24 ESM 工具脚本、`@deepseek-ai/dsh-plugin-market-index`（官方索引校验）、`semver`、`tar`；React（DSH 共享模块）+ esbuild；node:test + react-test-renderer。

**Spec:** `docs/superpowers/specs/2026-10-26-open-directory-design.md`

## Global Constraints

- 界面、README、关于页、package 描述里不得出现「审核 / 审过 / 人工读过源码 / 安全」类承诺；权限标记统一叫「自动检测」，并注明「由程序扫描源码自动得出，可能不准，不代表安全审查」。
- 收录条件（全部满足）：最新版 manifest 有 `dsh.bundle.patch` 且未 deprecated；有 `repository` 或 http(s) `homepage`；`enginesDshOf(manifest)` 为空或 `semver.satisfies(config.dshVersion, range, { includePrerelease: true })`；最新版发布时间在 `config.recentDays`（90）天内。
- 不做屏蔽名单，不翻译描述。
- tarball 只下载读取，绝不执行（沿用 `downloadTarball` 的完整性校验与大小上限）。
- 单个包失败不得中断整轮；失败的下轮重试，旧数据保留。
- 详情文件只在内容变化时重写；统计集中在一个文件；README 不入库。
- Host 只为目录里列出的包、按索引里的版本去 jsDelivr 取 README，绝不按浏览器传来的任意 URL 取。
- 提交作者 yang051211，提交信息零 AI 署名；推送 / 开分支 / 关 Issue 前先问用户。
- 版本 0.2.0；发版仍是 `git push --atomic origin main v0.2.0`。

## Review Focus

1. npm 搜索结果漂移或分页上限：某个已收录包本轮没被搜到 → 不能因此下架（已知包名每轮都要重查）。
2. packument 极大或畸形（无 `time`、`dist-tags.latest` 指向不存在的版本、description 非字符串）→ 该包跳过并记录，不中断。
3. 同名包从 DSH 插件变成普通包（新版去掉 `dsh.bundle`）→ 下架。
4. 下载量接口对 scope 包不支持批量、对不存在的包返回 404 → 记 null，不报错。
5. README 路由被要求读未列出的包名或带 `..`/URL 的名字 → 404，不发外部请求。

（每条都在下面对应任务里有测试。）

---

## File Structure

| 文件 | 职责 |
|---|---|
| `directory/config.json` | 当前 DSH 版本、recentDays、搜索关键词、每轮扫描/星标上限、分类定义（id、中英标题、关键词规则） |
| `directory/names.json` | 已知候选包名（只增不减，排序） |
| `directory/packages/<slug>.json` | 每包事实：最新版 manifest 摘要、版本列表（最多 30 个，含时间与 engines）、首发时间、是否合格及原因 |
| `directory/stats.json` | `{ [name]: { weeklyDownloads, stars, starsAt } }` |
| `directory/scan/<slug>.json` | 最新版自动检测结果（沿用 `scanPackage` 输出 + version） |
| `tools/directory/npm.mjs` | 从 `tools/catalog/fetch-upstream.mjs` 迁来的 `downloadTarball`、`enginesDshOf`、`repositoryOf`、`authorName`、`pickIcon`、`get` |
| `tools/directory/discover.mjs` | npm 搜索翻页 → 包名 |
| `tools/directory/packages.mjs` | packument → 包事实；`qualifies` |
| `tools/directory/categorize.mjs` | 关键词/描述 → 分类 id |
| `tools/directory/stats.mjs` | 下载量批量、星标轮换 |
| `tools/directory/build.mjs` | 事实 + 统计 + 检测 → `market/index.json`、`market/plugins/*.json`、`market/icons/*` |
| `tools/directory/cli.mjs` | `discover / refresh / stats / scan / build / check` |
| `tools/directory/pool.mjs` | 并发上限执行器 |
| `tools/catalog/scan.mjs`、`slug.mjs`、`outputs.mjs` | 保留并移到 `tools/directory/`（`toJson`、`staleMarketFiles` 继续用） |
| 删除 | `catalog/`（整个目录）、`tools/catalog/{curation,build-index,preflight,updates,cli,fetch-upstream}.mjs`、对应测试、`tests/fixtures/catalog/`、`.github/workflows/upstream.yml`、`src/client/ui/Scenes.tsx` |
| `.github/workflows/directory.yml` | 每天 + 手动；`timeout-minutes: 300` |
| `src/host/readme-route.ts` | `GET /api/plugin-store/readme?name=` |
| `src/client/model/catalog.ts` | 新 `StorePlugin`、`sortPlugins`、`pageOf`、`searchPlugins` |

---

### Task 1: 迁移公共件 + 并发执行器

**Files:** Create `tools/directory/{npm,pool,scan,slug,outputs}.mjs`（scan/slug/outputs 用 `git mv`）；Test `tests/directory/pool.test.mjs`

**Produces:** `downloadTarball(versionManifest, io)`, `enginesDshOf(manifest)`, `repositoryOf(repo)`, `authorName(author)`, `pickIcon(manifest, files) → {ext,data}|null`, `get(io,url,init?,timeoutMs?)`；`runPool(items, limit, worker) → Promise<Array<{item, ok, value?, error?}>>`

- [ ] 写 `pool.test.mjs`：并发数从不超过 limit；一个 worker 抛错不影响其他，结果里该项 `ok:false`；结果顺序与输入一致。
- [ ] 跑 `node --test tests/directory/pool.test.mjs`，预期 FAIL（模块不存在）。
- [ ] 实现 `pool.mjs`；`git mv` scan/slug/outputs 到 `tools/directory/`；把上述 npm 函数从 fetch-upstream 搬到 `npm.mjs` 并 export；`tests/catalog/scan.test.mjs` 移到 `tests/directory/` 并改 import。
- [ ] 跑 `node --test tests/directory/`，预期 PASS。
- [ ] Commit `directory: shared npm helpers, scan and a bounded pool`

### Task 2: 发现

**Files:** Create `tools/directory/discover.mjs`；Test `tests/directory/discover.test.mjs`

**Produces:** `searchNames(io, keywords, { pageSize = 250 }) → Promise<string[]>`（排序去重）；`mergeNames(known, found) → string[]`

- [ ] 测试（用假 fetch）：按 `from` 翻页直到某页不足 pageSize；多个关键词结果去重；某关键词请求失败时抛错（整轮应失败，避免误判全部下架——下架只由 Task 3 的事实决定）；`mergeNames` 只增不减并排序。
- [ ] 实现：`${registry}-/v1/search?text=keywords:${kw}&size=${pageSize}&from=${n}`。
- [ ] 测试 PASS → Commit `directory: discover candidate names from npm search`

### Task 3: 包事实与收录条件

**Files:** Create `tools/directory/packages.mjs`、`tools/directory/categorize.mjs`；Test `tests/directory/packages.test.mjs`、`tests/directory/categorize.test.mjs`

**Produces:**
- `factsOf(packument, now) → PackageFacts | { name, error }`，`PackageFacts = { name, latest, published, created, modified, description, author, keywords, repository, homepage, enginesDsh, isBundle, deprecated, versions: Array<{version, publishTimestamp, enginesDsh}> }`（versions 只保留有 `dsh.bundle.patch` 且未 deprecated 的，按时间倒序最多 30）
- `qualifies(facts, config, now) → { ok: boolean, reason?: 'not-bundle'|'deprecated'|'no-source'|'engines'|'stale' }`
- `categorize(facts, categories) → string`（第一个命中规则的分类，否则 `'other'`）

- [ ] 测试：正常包合格；无 `dsh.bundle.patch` → not-bundle；latest deprecated → deprecated；无 repository 且 homepage 非 http → no-source；`engines.dsh: ">=0.3.0"` 对 `0.2.1-rc.2` → engines；最新版 91 天前 → stale；**Review Focus 2**：缺 `time` / latest 不在 versions / description 是对象 → 返回 `{name, error}` 不抛；**Review Focus 3**：老版本是 bundle、latest 不是 → not-bundle。categorize：关键词 `theme` → fun，`memory` → memory，什么都不命中 → other；规则按 config 顺序。
- [ ] 实现；分类规则写进 `directory/config.json`：ui（ui, theme?, sidebar, layout, interface, 界面）、memory（memory, context, 记忆）、dev（git, lsp, code, debug, ide, 开发）、cost（cost, usage, billing, balance, 费用）、fun（pet, theme, wallpaper, music, game, 壁纸）、ops（ssh, docker, server, vps, deploy, 运维）、im（qq, wechat, telegram, dingtalk, feishu, slack, 机器人）、tools（mcp, tool, search, image, vision, tts）、other。具体词表按实现时对真实数据抽样调整，测试只钉顺序与兜底。
- [ ] PASS → Commit `directory: package facts, listing rules and categories`

### Task 4: 统计

**Files:** Create `tools/directory/stats.mjs`；Test `tests/directory/stats.test.mjs`

**Produces:** `weeklyDownloads(io, names) → Promise<Map<string, number|null>>`；`pickStarRefresh(names, stats, limit) → string[]`（从没刷过的优先，其次 `starsAt` 最旧）；`fetchStars(io, repositoryUrl) → number|null`

- [ ] 测试：非 scope 名每 128 个一批走 `/downloads/point/last-week/a,b,c`；scope 名逐个；**Review Focus 4**：批量响应里缺某包 / 单个 404 → null；`pickStarRefresh` 的顺序与上限。
- [ ] 实现 → PASS → Commit `directory: weekly downloads in batches, rotating star refresh`

### Task 5: 构建与校验

**Files:** Create `tools/directory/build.mjs`；Test `tests/directory/build.test.mjs`

**Produces:** `buildDirectory({ facts: PackageFacts[], stats, scans: Map<name, scan>, icons: Map<name, {file}>, config, storeVersion, now }) → { index, details: Map<slug, object> }`

- index：`format: 1`，`metadata.categories`（config 里的中英标题，含 other），`store: { self: { version }, generatedAt, dshVersion, categoryOrder }`；每个合格包一条：`name, title(= package 名去 scope 与 dsh- 前缀后的人读形式，manifest.dsh.title 优先), description, author, homepage, repository, icon(相对路径), metadata.{category, keywords}, dist-tags.latest, versions:[仅 latest {version, publishTimestamp, engines?:{dsh}}], store: { created, stats:{stars, weeklyDownloads}, permissions|null, scannedVersion|null, detail: 'plugins/<slug>.json' }`；按 weeklyDownloads 降序、名字升序稳定排序。
- detail：`{ name, versions:[…最多 30], scan: { version, evidence 摘要 } | null }`。
- 用官方 `parseMarketIndex` 校验。

- [ ] 测试：不合格的不出现；`permissions` 只在 scan.version === latest 时给出，否则 null；输出与输入顺序无关（稳定）；官方解析通过；生成的 JSON 不含字串「审」。
- [ ] 实现 → PASS → Commit `directory: build the published index and details`

### Task 6: CLI、配置、工作流，删除旧目录

**Files:** Create `tools/directory/cli.mjs`、`directory/config.json`、`.github/workflows/directory.yml`；Modify `package.json` scripts、`scripts/verify.mjs`；Delete 见 File Structure

**Produces:** `npm run directory:{discover,refresh,stats,scan,build,check}`；`--limit N`、`--registry`

- refresh：names ∪ 已有 packages 文件的名字；用搜索结果里的 version/date 对比已存 `latest`，不同或缺失才拉 packument（并发 8）；失败保留旧文件。
- scan：合格且 `scan.version !== latest` 的，按 weeklyDownloads 降序取前 `--limit`（默认 config.scanLimit=600），下载 → `scanPackage` → 写 `directory/scan/<slug>.json`，有图标写 `market/icons/<slug><ext>`（≤256KB）。
- build / check：同旧版语义（check 比对 market/ 与 build 结果，并检查 `market/` 下多余文件）。
- workflow：checkout@v7 → setup-node@v7（node 24, cache npm）→ npm ci → discover → refresh → stats → scan → build → check → 以 github-actions[bot] 提交 `directory market` 并推送；`schedule: '23 */6 * * *'`（首轮回填期每 6 小时一次，回填完可改成每天）、`workflow_dispatch`、`push` 到分支 `directory`（仅首轮回填用，发版前删掉这个触发器）。
- 删除旧 catalog 工具、数据、测试、upstream.yml；`scripts/verify.mjs` 的 `catalog:check` 换成 `directory:check`。

- [ ] 写 `tests/directory/cli-guard.test.mjs`：CLI 源码里所有写文件调用的目标只在 `directory/` 或 `market/` 下（沿用旧 curation 守卫测试的做法）。
- [ ] 实现、删除；`npm run directory:build && npm run directory:check` 在空状态下得到 0 个插件、index 合法。
- [ ] `npm test` 全绿 → Commit `directory: daily pipeline replaces the reviewed catalog`

### Task 7: Host — README 路由与上限

**Files:** Create `src/host/readme-route.ts`；Modify `src/index.ts`（注册）、`src/host/catalog-cache.ts`（`MAX_INDEX_BYTES` 16 MB）、`src/host/index-route.ts`（去掉「hand-reviewed」注释）；Test `tests/readme-route.test.mjs`

**Produces:** `README_ROUTE = '/api/plugin-store/readme'`；`createReadmeFetch(cache, fetchImpl) → (Request) => Promise<Response>`；只对 index 里列出的 name，取 `https://cdn.jsdelivr.net/npm/${name}@${latest}/README.md`（再试 `readme.md`），上限 1 MB，缓存 10 分钟。

- [ ] 测试：列出的包 → 200 `{ok, markdown, base}`（base 供相对图片解析）；**Review Focus 5**：未列出 / 名字含 `..` 或 `://` → 404 且假 fetch 未被调用；jsDelivr 404 → 200 `{ok, markdown:''}`。
- [ ] 实现 → PASS → Commit `host: README of a listed plugin, read through jsDelivr`

### Task 8: 客户端模型

**Files:** Modify `src/client/model/catalog.ts`、`src/client/model/api.ts`（`loadReadme(name)`）；Test 重写 `tests/client-model.test.mjs`

**Produces:**
- `StorePlugin = { name, title: string, description: string, icon, author, category, keywords, version, publishTimestamp, created, enginesDsh, stats:{stars, weeklyDownloads}, permissions: Permissions|null, compatibility, repository, homepage }`
- `Catalog = { plugins, byName, categories: Grouping[], storeVersion, generatedAt, stale, dshVersion }`（无 sections/featured）
- `SortKey = 'popular'|'updated'|'new'|'stars'`；`sortPlugins(plugins, key) → StorePlugin[]`（null 排最后，名字兜底）；`pageOf(list, page, size=30) → { items, page, pages }`（页码夹到范围内）；`searchPlugins(catalog, query)` 搜 name/title/description/keywords/author。

- [ ] 测试：四种排序与 null 处理；`pageOf` 越界夹取；搜索命中作者；旧格式索引（有 store.review）也能读出（兼容上线过渡期）。
- [ ] 实现 → PASS → Commit `client: catalog model for a large directory`

### Task 9: 界面

**Files:** Modify `src/client/ui/{common,Home,ListView,DetailView,About,StoreApp,ConfirmInstall,styles,testing}.tsx|ts`、`locale/{zh,en}.json`；Delete `src/client/ui/Scenes.tsx`；Test 重写 `tests/ui.test.mjs`、`tests/store-app.test.mjs`

- 顶部：首页 / 全部插件 / 关于。
- 首页：PageHeader（标题「找到适合你工作流的 DSH 插件」，副文案「收录 npm 上 {count} 个 DSH 插件，每天自动更新」）+ 搜索；三个区「本周热门 / 最近更新 / 新上架」各 8 张卡，「查看全部 →」进列表并带对应排序。
- 列表：分类侧栏（带数量，含「其他」）；排序下拉；「只看兼容」开关；分页（上一页 / 第 n/m 页 / 下一页）；搜索结果同样分页。
- 卡片：`#分类 v版本`、关键词、描述、☆ ↓、「查看 / 已安装」。
- 详情：hero（作者、`#分类`、兼容徽章）、统计条（星标、周下载、最新版本、发布于、npm 包）、主列 README（经 `loadReadme`，加载中/失败/空三态）+ 版本 + 来源；侧栏安装面板（不变）+「自动检测」面板（五项是/否/尚未检测 + 固定说明句）+ 同类插件。
- 关于：四组问答——这是什么（npm 上所有合格 DSH 插件的目录，每天自动更新，**未经审核**）；收录条件；自动检测是什么、为什么可能不准；怎么安装与反馈。
- ConfirmInstall：去掉审核行，加一句「此插件未经审核，安装前请自行判断」。
- locale：删除所有 review*/usage*/scene*/featured 键，新增键；zh/en 键对齐。

- [ ] 测试：页面不含「审核」二字以外的审核表述——断言渲染结果不含 `审过`、`已审核`、`人工`（关于页与确认框里「未经审核」是允许的唯一形式）；列表分页与排序切换；只看兼容过滤；详情 README 三态；自动检测面板在 permissions 为 null 时显示「尚未检测」；导航三项。
- [ ] 截图核对（scratchpad `render-real.mjs` 改造）：首页、列表第 2 页、详情（有/无检测）、关于，浅深色各一。
- [ ] `npm run verify` 全绿 → Commit `v0.2.0 UI: open directory without review claims`

### Task 10: 文案与发版准备

**Files:** Modify `README.md`、`package.json`（version 0.2.0、description）、`cordis.patch.yml` 描述、`docs/` 里对外说明

- [ ] `git grep -n "审核\|审过\|reviewed\|hand-reviewed"` 只剩设计/计划文档与「未经审核」句。
- [ ] `npm run verify` 全绿 → Commit `docs: describe the open directory`
- [ ] **停下问用户**：推送分支 `directory` 触发首轮回填（GitHub Actions），确认后执行；看首轮结果（收录数、扫描进度、index 大小）报告用户。
- [ ] 回填完成后**再问用户**：去掉 workflow 的 `push: directory` 触发器，合入 main 并 `git tag v0.2.0 && git push --atomic origin main v0.2.0`；关闭 upstream-updates Issue #1。
