# 计划 2：收录工具与首批插件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出维护者在本机运行的收录工具（抓取 → 扫描 → 生成 → 校验），用它收录首批 2 个真实插件 dsh-chat-toc 和 dsh-context，发布一份官方「发现」页也能读的索引，并让商城默认读取它。

**Architecture:** 三类文件分开存放，重跑任何一步都不会覆盖人写的内容：人工收录清单 `catalog/catalog.yaml`（只有人改）、抓取结果 `catalog/upstream/*.json` 与扫描结果 `catalog/scan/*.json`（只有脚本写）、生成产物 `market/`（只有生成脚本写）。生成时用官方校验器 `parseMarketIndex` 校验格式 1 部分；商城需要的额外信息放在命名空间 `store` 下，官方读取器会忽略它。工具是不需要构建的 Node ESM 脚本（`.mjs`），在维护者本机运行，不进入插件安装包。

**Tech Stack:** Node 24 ESM、`node:test`、`yaml`、`tar`、`semver`、`@deepseek-ai/dsh-plugin-market-index@0.2.1-rc.2`（开发依赖）。

**Spec:** `docs/superpowers/specs/2026-10-19-dsh-plugin-store-design.md`（重点：§6.3 数据模型、§6.7 收录流程、§6.8 首批内容、§9 技术验证结论）

## Global Constraints

- 首批只收 2 个插件：**dsh-chat-toc**（界面优化类）和 **dsh-context**（功能性），由用户 2026-10-19 选定。
- **索引只列审核通过的版本**；`dist-tags.latest` 固定为最近一次审核通过的版本；上游有更新的版本时只记到 `store.upstreamLatest`，不列入 `versions`（设计 §6.7）。
- **只有 `review.status: approved` 的插件进入发布的索引。**
- 人写字段只存在于 `catalog/catalog.yaml`，脚本永远不写这个文件。
- 格式 1 的 `LocalizedText` 必须带 `en`；商城自己的扩展字段（`store.*`）可以只有 `zh`。
- 生成的 `market/index.json` 必须能通过 `parseMarketIndex(value, INDEX_PUBLIC_URL)` 校验。
- 公开地址：`INDEX_PUBLIC_URL = 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json'`。
- 权限扫描**只下载和读取，绝不执行**插件代码；界面上要标明「扫描结果」（设计 §4）。
- 工具代码和抓取缓存不进入插件安装包（`package.json` 的 `files` 不变）。
- 推送和 jsDelivr 刷新缓存前先告诉用户并等确认。
- 继续使用 npm（本机 corepack pnpm 坏了）。
- 设计 §6.1.1「商城插件本身也收进索引」推迟到计划 3：等正式界面发布了第一个正式版本再收录，现在收录的只会是验证版。
- 统计数据（星标、周下载）只在维护者运行 `catalog:fetch` 时刷新，界面显示 `fetchedAt`（设计 §6.7）。

## Review Focus

1. **重跑抓取后人写内容被覆盖**：维护者改好的中文名、要点、审核结论必须原样保留。→ Task 1 `curation file is never written by tools` + Task 4 `build reads human fields only from catalog.yaml`。
2. **未审核或待审核的插件出现在索引里**：→ Task 4 `pending plugins are left out`。
3. **上游发了新版本**：索引仍只列审核过的版本，并记录 `upstreamLatest`。→ Task 4 `only reviewed versions are listed`。
4. **审核过的版本在 npm 上已不存在（被撤销或删除）**：生成必须报错并指出插件名，不能悄悄生成一个装不上的条目。→ Task 4 `fails when the reviewed version is missing upstream`。
5. **图标过大或格式不对**：超过 32 KiB 不能内联，改写成相对路径文件；不是 SVG/PNG/JPEG/WebP 就不带图标，不能让整份索引校验失败。→ Task 2 `large icons are written as files`、`unsupported icon types are dropped`。

---

### Task 1: 收录清单格式与读取

**Files:**
- Create: `catalog/catalog.yaml`、`tools/catalog/curation.mjs`、`tools/catalog/slug.mjs`
- Test: `tests/catalog/curation.test.mjs`、`tests/fixtures/catalog/valid.yaml`、`tests/fixtures/catalog/invalid-*.yaml`

**Interfaces:**
- Produces:
  - `slugOf(name: string): string` — `@scope/pkg` → `scope__pkg`，普通包名不变。
  - `loadCuration(path: string): Curation` — 读 YAML 并校验，出错时抛 `CurationError(message)`，`message` 里带 YAML 路径（如 `plugins[1].category`）。
  - `Curation` 结构（即 `catalog/catalog.yaml` 的格式）：

```yaml
market:
  title: { zh: 精选插件商城, en: Curated Plugin Store }
  description: { zh: 人工审核过的 DSH 插件, en: Hand-reviewed DSH plugins }
categories:              # 顺序即显示顺序；id 用于格式 1 的 metadata.categories
  - { id: ui, title: { zh: 界面与体验, en: UI & Experience } }
  - { id: tools, title: { zh: 工具与能力, en: Tools & Capabilities } }
featured:                # 本周精选横幅
  plugin: dsh-chat-toc
  title: { zh: 长对话一键导航 }
  subtitle: { zh: 为每轮对话生成目录，长会话不再翻滚轮 }
  gradient: ['#4338ca', '#db2777']
sections:                # 首页主题分区，顺序即显示顺序
  - { id: ui-better, title: { zh: 让界面更顺手 }, plugins: [dsh-chat-toc] }
  - { id: insight, title: { zh: 看清 Agent 在做什么 }, plugins: [dsh-context] }
plugins:
  - name: dsh-chat-toc
    source: npm
    category: ui
    title: { zh: 对话目录, en: Chat TOC }
    tagline: { zh: …, en: … }          # 一句话卖点，en 必填（格式 1 的 description）
    features: { zh: [ …, … ] }          # 3–5 条
    screenshots: [ { url: https://…, caption: { zh: … } } ]
    review:
      status: pending                   # pending | approved
      version: 0.5.1
      date: 2026-10-19
      reviewer: yang051211
      notes: { zh: … }
      permissions:                      # 人工确认后的结论，不是扫描原始结果
        network: false
        fileSystem: false
        agentTools: false
        childProcess: false
        installScripts: false
```

  校验规则：`categories[].id` 唯一；每个插件的 `category` 必须是已声明的 id；`featured.plugin` 和 `sections[].plugins` 中的名字必须在 `plugins` 里出现；`title.en`、`tagline.en` 必填；`review.status` 只能是 `pending` 或 `approved`；`approved` 时 `version`、`date`、`reviewer`、`permissions` 五项全部必填；`features.zh` 为 3 到 5 条。

- [ ] **Step 1: 写失败测试**：`slugOf` 的两种情况；合法文件能读出 2 个插件；每条校验规则各一个 invalid 夹具，断言抛 `CurationError` 且 `message` 包含对应路径（例如 `invalid-category.yaml` → `/plugins\[0\]\.category/`）；`curation file is never written by tools`：对 `tools/catalog/` 下所有 `.mjs` 做静态检查，断言没有任何代码以写模式打开包含 `catalog.yaml` 的路径（grep `writeFile` 等调用的参数里不出现 `catalog.yaml`）。
- [ ] **Step 2: 运行确认失败**：`npm test` → FAIL（模块不存在）
- [ ] **Step 3: 实现 `slug.mjs`、`curation.mjs`**（`yaml` 包解析，手写校验，不引入 schema 库）
- [ ] **Step 4: 写 `catalog/catalog.yaml` 初稿**：两个插件的 `review.status` 都是 `pending`，人写字段先留 Task 5 起草（此时可以填英文占位，但必须能通过校验）
- [ ] **Step 5: 运行确认通过**：`npm test` → PASS
- [ ] **Step 6: 提交** `feat(catalog): define the curation file and its loader`

---

### Task 2: 抓取上游数据

**Files:**
- Create: `tools/catalog/fetch-upstream.mjs`、`tools/catalog/icon.mjs`、`tools/catalog/cli.mjs`
- Modify: `package.json`（scripts：`"catalog:fetch": "node tools/catalog/cli.mjs fetch"`）
- Test: `tests/catalog/fetch-upstream.test.mjs`、`tests/fixtures/upstream/dsh-chat-toc.packument.json`、`tests/fixtures/upstream/tiny-plugin-0.1.0.tgz`（用 `tar` 在测试 setup 里现场打包，不提交二进制）

**Interfaces:**
- Consumes: Task 1 的 `loadCuration`、`slugOf`。
- Produces:
  - `fetchUpstream(name: string, reviewedVersion: string, io: { fetch: typeof fetch, registry: string, githubToken?: string }): Promise<Upstream>`
  - `Upstream`（写到 `catalog/upstream/<slug>.json`）：

```ts
{
  name: string
  fetchedAt: string                 // ISO 时间
  latest: string                    // npm dist-tags.latest
  versions: Record<string, { publishTimestamp: number; enginesDsh: string | null }>   // 只含已发布、未弃用、声明了 dsh.bundle 的版本
  reviewed: {                       // reviewedVersion 那一版的展示信息；版本不存在时为 null
    description: string | null
    author: string | null
    homepage: string | null
    repository: { url: string; directory?: string } | null
    keywords: string[]
    icon: { file: string; bytes: number } | null   // 存到 market/icons/<slug>.<ext> 的文件名
    readme: string                  // packument 的 readme，或 tarball 里的 README.md
    changelog: string | null        // tarball 里的 CHANGELOG.md
  } | null
  stats: { stars: number | null; weeklyDownloads: number | null }
}
```
  - `enginesDsh` 的规则照搬官方生成器（`apps/plugin-market-generator/README.zh.md`「What gets listed」一节）：优先 `engines.dsh`（去首尾空白）；否则取 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*` peer 范围的交集，用空格连接、去重；`workspace:*|^|~` 跳过；全部是 `*` 或没有任何范围时为 `null`。
  - 图标：取 reviewed 版本 manifest 的 `icon`（相对路径）或导出的 `./icon`，只接受 SVG/PNG/JPEG/WebP，不超过 256 KiB，否则为 `null`。
  - 星标：从 `repository` 解析出 GitHub `owner/repo`，请求 `https://api.github.com/repos/<owner>/<repo>`（有 `GITHUB_TOKEN` 时带上）；周下载：`https://api.npmjs.org/downloads/point/last-week/<name>`。任何一项失败都记为 `null`，不让整次抓取失败。
  - `cli.mjs fetch`：对 `catalog.yaml` 里的每个插件调用 `fetchUpstream`，写 `catalog/upstream/<slug>.json`，并把图标写到 `market/icons/`。registry 默认读 `npm config get registry`。

- [ ] **Step 1: 写失败测试**：用夹具 packument 和假 `fetch`，断言 `versions` 排除了弃用版本和没有 `dsh.bundle` 的版本；`enginesDsh` 的 4 种情况（有 `engines.dsh`、只有 peer、`workspace:*`、全是 `*`）；`reviewed` 版本不存在时为 `null`；`large icons are written as files`（大于 32 KiB 的 PNG：`icon.file` 存在、`bytes` 正确）；`unsupported icon types are dropped`（`.gif` → `icon: null`）；GitHub 接口返回 403 时 `stars: null` 且函数正常返回。
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现**（tarball 用 `tar` 在内存中解包，只读普通文件，跳过 `node_modules` 和越出包目录的路径，整体不超过 64 MiB，校验 `dist.integrity`）
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 对 2 个真实插件跑一次**：`npm run catalog:fetch` → 生成 `catalog/upstream/dsh-chat-toc.json`、`catalog/upstream/dsh-context.json`；人工看一眼 `versions`、`enginesDsh`、`stats` 是否合理
- [ ] **Step 6: 提交**（含两份 upstream 文件和图标）`feat(catalog): fetch upstream facts for curated plugins`

---

### Task 3: 权限扫描

**Files:**
- Create: `tools/catalog/scan.mjs`
- Modify: `tools/catalog/cli.mjs`（`scan <name>@<version>`）、`package.json`（`"catalog:scan": "node tools/catalog/cli.mjs scan"`）
- Test: `tests/catalog/scan.test.mjs`（测试 setup 里现场打包几个小 tarball）

**Interfaces:**
- Consumes: Task 2 的 tarball 下载与解包函数（从 `fetch-upstream.mjs` 导出 `downloadTarball(name, version, io): Promise<Map<string, Buffer>>`）。
- Produces:
  - `scanPackage(files: Map<string, Buffer>): ScanResult`，写到 `catalog/scan/<slug>@<version>.json`：

```ts
{
  network:        { hit: boolean; evidence: Evidence[] }   // fetch(、http(s).request、WebSocket、XMLHttpRequest、undici、axios
  fileSystem:     { hit: boolean; evidence: Evidence[] }   // node:fs、fs/promises、require('fs')、writeFile、readFile
  agentTools:     { hit: boolean; evidence: Evidence[] }   // inject 含 'tools'、ctx.tools、tools.register
  childProcess:   { hit: boolean; evidence: Evidence[] }   // child_process、spawn(、exec(
  installScripts: { hit: boolean; evidence: Evidence[] }   // package.json scripts 中的 preinstall/install/postinstall/prepare
  dependencies: number                                      // package.json dependencies 数量
  minifiedFiles: string[]                                   // 有一行超过 5000 字符的 .js/.mjs/.cjs 文件，提示人工细看
}
type Evidence = { file: string; line: number; text: string }   // text 截断到 160 字符；每类最多 5 条
```

  只扫描 `.js/.mjs/.cjs/.ts/.tsx/.json`，跳过 `node_modules/`、`*.map`、`*.d.ts`。

- [ ] **Step 1: 写失败测试**：每一类各一个命中、一个不命中的小包；`evidence` 最多 5 条且 `text` 被截断；`minifiedFiles` 能识别超长行；`.d.ts` 里出现 `fetch(` 不算命中
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现**（纯函数，只做正则匹配，不 `import`、不 `eval`、不执行任何插件文件）
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 扫描 2 个真实插件**：`npm run catalog:scan -- dsh-chat-toc@0.5.1` 和 `npm run catalog:scan -- dsh-context@<upstream 文件里的 latest>`，结果提交到 `catalog/scan/`
- [ ] **Step 6: 提交** `feat(catalog): scan package sources for permission evidence`

---

### Task 4: 生成并校验索引

**Files:**
- Create: `tools/catalog/build-index.mjs`
- Modify: `tools/catalog/cli.mjs`（`build`、`check`）、`package.json`（`"catalog:build"`、`"catalog:check"`；开发依赖加入 `@deepseek-ai/dsh-plugin-market-index@0.2.1-rc.2`、`yaml`、`tar`、`semver`）
- Test: `tests/catalog/build-index.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `Curation`、Task 2 的 `Upstream`、Task 3 的 `ScanResult`。
- Produces:
  - `buildIndex(curation: Curation, upstream: Map<string, Upstream>, now: Date): { index: object; details: Map<string, object> }`（纯函数，不读写文件）
  - `index` 结构：格式 1 的全部必填字段，加上命名空间扩展：
    - 根：`store: { schema: 1, generatedAt, featured: { plugin, title, subtitle, gradient }, sections: [{ id, title, plugins }], categoryOrder: string[] }`
    - 每个插件：`store: { tagline, detail: 'plugins/<slug>.json', review: { version, date }, stats: { stars, weeklyDownloads, fetchedAt }, upstreamLatest?: string }`（只有上游 latest 高于审核版本时才有 `upstreamLatest`）
    - 每个插件的格式 1 字段：`name`、`title`（来自 curation）、`description`（= `tagline`）、`icon`（`icons/<file>` 相对路径）、`author`、`homepage`、`repository`、`metadata.category`、`metadata.keywords`、`dist-tags: { latest: <审核版本> }`、`versions: [{ version: <审核版本>, publishTimestamp, source: { type: 'npm' }, engines: { dsh } }]`（`enginesDsh` 为 `null` 时不写 `engines.dsh`）
  - `details` 中每个文件（写到 `market/plugins/<slug>.json`）：`{ schema: 1, name, features, screenshots, permissions, scanSummary, review: { version, date, reviewer, notes }, readme, changelog, related: string[] }`。`related` = 同分类的其他插件，再补同作者的插件，最多 6 个。
  - `cli.mjs build`：读 curation、upstream、scan，调用 `buildIndex`，用 `parseMarketIndex(index, INDEX_PUBLIC_URL)` 校验，通过后写 `market/index.json` 和 `market/plugins/*.json`（JSON 两空格缩进，结尾换行，结果确定，便于 diff）。`check` 只做读取和校验，不写文件。

- [ ] **Step 1: 写失败测试**：
  - `pending plugins are left out`：一个 approved、一个 pending → `index.plugins` 只有 1 个
  - `only reviewed versions are listed`：upstream 有 0.5.1 和 0.6.0、审核 0.5.1 → `versions` 只有 0.5.1，`dist-tags.latest === '0.5.1'`，`store.upstreamLatest === '0.6.0'`
  - `fails when the reviewed version is missing upstream`：抛错且 `message` 包含插件名和版本号
  - `build reads human fields only from catalog.yaml`：upstream 的 `description` 和 curation 的 `tagline` 不同 → index 用 `tagline`
  - `index passes the official validator`：`parseMarketIndex(index, INDEX_PUBLIC_URL)` 不抛错，且解析结果里 `plugins[0].title.zh === '对话目录'`
  - `extension members survive in the raw document`：`index.store.featured.plugin === 'dsh-chat-toc'`
  - `output is deterministic`：同样的输入跑两次，`JSON.stringify` 结果相同（`now` 固定）
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `buildIndex` 和 `build`/`check` 命令**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 提交** `feat(catalog): build and validate the market index`

---

### Task 5: 起草并审核首批 2 个插件（需要用户参与）

**Files:**
- Modify: `catalog/catalog.yaml`
- Create: `market/index.json`、`market/plugins/dsh-chat-toc.json`、`market/plugins/dsh-context.json`

- [ ] **Step 1: 执行者起草人写字段**：读两个插件的 README（`catalog/upstream/*.json` 里的 `readme`）和扫描结果，填写中文名、英文名、一句话卖点（中英）、3–5 条「能做什么」、截图（从 README 里挑 https 图片；没有就留空数组）、`permissions` 建议值和 `notes`。`review.status` 仍为 `pending`。
- [ ] **Step 2: 把起草内容和扫描证据整理成一张表给用户审核**：每个插件一张表，包括名字、卖点、要点、截图链接、每类权限的扫描证据（文件:行）和建议结论。用户逐项确认或修改。
- [ ] **Step 3: 按用户意见修改，把 `review.status` 改为 `approved`，`date` 填审核当天，`reviewer: yang051211`**
- [ ] **Step 4: 生成并校验**：`npm run catalog:build && npm run catalog:check` → 都成功，`market/index.json` 里有 2 个插件
- [ ] **Step 5: 提交** `feat(catalog): curate dsh-chat-toc and dsh-context`

---

### Task 6: 发布并接入商城（需要用户参与）

**Files:**
- Modify: `src/host/index-route.ts`（`DEFAULT_INDEX_URL = INDEX_PUBLIC_URL`）、`tests/index-route.test.mjs`（新增断言默认地址）、`lib/`（重新构建）、`README.md`（加一节「把本索引加到官方『发现』页」）

- [ ] **Step 1: 写失败测试** `default index is the published catalog`：断言 `DEFAULT_INDEX_URL === 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json'`
- [ ] **Step 2: 运行确认失败，改常量，`npm run verify` 通过**
- [ ] **Step 3: 提交** `feat: read the published catalog by default`
- [ ] **Step 4: 征得用户确认后推送 `main`、打 tag `catalog-1`，并刷新 jsDelivr 缓存**：`curl https://purge.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json`，然后用 `curl` 确认 jsDelivr 返回的内容含 2 个插件
- [ ] **Step 5: 请用户在桌面端验证两件事**：
  1. 用 `github:yang051211/dsh-plugin-store#catalog-1` 升级商城（先卸载再安装），商城标签页显示「精选插件商城，共 2 个插件」；
  2. 在官方「发现」页添加索引源 `https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json`，能看到「对话目录」和「上下文洞察」等中文标题、图标和分类。这一步证明同一份索引兼容官方「发现」页（设计 §2 目标 5）。
- [ ] **Step 6: 把结果追加到 `docs/spike/2026-10-19-findings.md` 末尾的「计划 2 验收」一节并提交**
