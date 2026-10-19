# 计划 3：正式商城界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把技术验证界面换成正式商城：应用商店式首页、分类和主题列表、搜索、详情页（8 个模块）、带确认的安装、「已安装 / 有新版本 / 不兼容」状态、整页面板到插件页标签页的安装交接，以及出错时不白屏。发布为 `v0.1.0`。

**Architecture:** Host 端提供两个带鉴权的只读路由：读取目录（带缓存、结构校验、兼容性计算）和按插件名读取详情。浏览器端分三层：纯数据层（本地化、分区、搜索、安装状态，能在 Node 里测试）、安全渲染层（Markdown 转 React 元素、URL 白名单）、界面层（React 组件 + 一份注入的样式表，配色用 DSH 的 `--dsw-*` 变量）。同一个 `StoreApp` 组件同时用于插件页「商城」标签页和整页面板；只有标签页拿得到 `install`，整页面板点「安装」时走交接流程（用户 2026-10-19 选定方案 A）。

**Tech Stack:** TypeScript、React 18（宿主提供）、esbuild、`marked`（打包进浏览器端）、`semver`（打包进 Host 端）、测试用 `node:test` + `react-dom/server`（开发依赖）。

**Spec:** `docs/superpowers/specs/2026-10-19-dsh-plugin-store-design.md`（§2 目标 0–4、§4 反目标、§6.5–6.6、§9 技术验证结论）；必须处理的安全事项见 `docs/spike/2026-10-19-findings.md` 末尾「计划 3 必须处理」。

## Global Constraints

- 浏览器端产物不得出现 `@deepseek-ai/`（构建已有纯净性检查）；DSH 包只用 `import type`。第三方库（`marked`）可以打包进去。
- Host 端除 `@deepseek-ai/*`（外部）以外的依赖都打包进 `lib/index.js`；读取 DSH 版本用**动态** `import('@deepseek-ai/dsh-app-boot')`，失败时版本记为 `null`，不能让插件加载失败。
- 不自己执行安装、卸载、更新、重启，不改 profile。安装只通过 `plugins.tab` owner 的 `install()`；只读调用 `ctx.remote.pluginManager.listBundles()` 获取已安装状态（设计 §4）。
- 整页面板点「安装」= 交接（方案 A）：记下待装插件 → `ctx.layout.selectPanel('plugins')` → 浮层提示「请点『商城』标签完成安装：<插件名>」→ 标签页挂载时自动弹出安装确认。
- 每个界面（标签页、整页面板）外层都有错误边界：出错时显示「商城出了点问题」和「重试」，不留白屏（设计 §9）。
- 第三方内容一律按不可信处理（findings「计划 3 必须处理」）：Markdown 不渲染原始 HTML；链接只允许 `https:`/`http:`，外链 `target="_blank" rel="noopener noreferrer"`；图片 `referrerPolicy="no-referrer" loading="lazy"`；相对链接和图片解析到 `https://cdn.jsdelivr.net/npm/<name>@<审核版本>/`；SVG 图标只用 `<img>`；`gradient` 只接受 `#rgb`/`#rrggbb`。
- 「需要的权限」同时显示「审核结论」（`permissions`）和「扫描结果」（`scanSummary`），两者不一致时都要显示，并注明扫描结果来自自动扫描。
- 样式只用 DSH 的 `--dsw-*` 变量（带回退值），跟随浅色 / 深色主题；所有类名加 `ps-` 前缀，避免污染宿主样式。
- 版本 `0.1.0`；`engines.dsh` 保持 `>=0.2.1-rc.2 <0.3.0-0`。
- 推送、打 tag、刷新 jsDelivr 前先征得用户确认。继续使用 npm。
- 商城自身收进目录不在本计划范围（设计 §10）。

## Review Focus

1. **目录或详情读取失败**（断网、jsDelivr 抽风、详情文件缺失）：首页和详情页显示简短错误和「重试」，保留上次成功的内容；详情读不到时，详情页仍显示目录里已有的字段（名字、卖点、版本、安装按钮）。→ Task 4 `detail view degrades to index fields when the detail fails`、Task 1 `serves the last good index when a refresh fails`。
2. **恶意 README**：`<script>`、`<img onerror>`、`javascript:` 链接、`data:` 图片都不能进入 DOM。→ Task 3 的安全测试。
3. **交接中途放弃**：用户在整页面板点了安装、但没去插件页，下一次打开标签页也不能突然弹出很久以前的安装确认。→ Task 5 `pending install expires after 10 minutes`。
4. **已安装但版本更新、或与当前 DSH 不兼容**：按钮分别是「有新版本」（点击打开该插件的已安装页）和禁用的「不兼容」（悬停说明原因），不能是「安装」。→ Task 2 `install state` 系列测试。
5. **组件渲染时抛异常**：只显示错误边界的提示，「重试」后重新渲染。→ Task 4 `error boundary shows retry instead of a blank area`。

---

### Task 1: Host 端目录与详情路由

**Files:**
- Modify: `src/host/index-route.ts`（重写为目录路由）、`src/index.ts`
- Create: `src/host/catalog-cache.ts`、`src/host/detail-route.ts`、`src/host/runtime-version.ts`
- Test: `tests/index-route.test.mjs`（改写）、`tests/detail-route.test.mjs`

**Interfaces:**
- Produces:
  - `GET /api/plugin-store/index` → `200 { ok: true, index: <原始目录 JSON，含 store 扩展>, fetchedAt: number, dshVersion: string | null, compatibility: Record<name, 'compatible' | 'incompatible' | 'unknown'> }`；失败 `502 { ok: false, error }`。`?refresh=1` 跳过缓存。
  - `GET /api/plugin-store/detail?name=<包名>` → `200 { ok: true, detail }`；名字不在当前目录里 → `404 { ok: false, error }`；读取失败 → `502`。
  - `createCatalogCache({ fetch, indexUrl, ttlMs = 600_000, now = Date.now }): { index(refresh?: boolean): Promise<CatalogSnapshot>, detail(name: string): Promise<object> }`：缓存 10 分钟；并发请求共用同一次读取；刷新失败时返回上次成功的结果并带上 `stale: true`。
  - 目录结构校验 `checkIndexShape(doc): void`：`format === 1`、`plugins` 是数组、每个插件 `name` 为字符串且 `versions` 为非空数组，否则抛错（→ 502）。
  - 详情地址 = `new URL(plugin.store.detail, indexUrl)`，必须与 `indexUrl` 同源且路径在目录所在目录之下，否则拒绝；大小上限 4 MiB。
  - `runtimeVersion(): Promise<string | null>`：动态 `import('@deepseek-ai/dsh-app-boot')` 调用 `getDshRuntimeVersion()`，任何异常都返回 `null`。
  - 兼容性：插件 `dist-tags.latest` 对应版本的 `engines.dsh` 为空 → `compatible`；版本未知 → `unknown`；否则 `semver.satisfies(version, range, { includePrerelease: true })`。
  - 删除验证用的 `SAMPLE_PLUGIN` 和 `sample` 字段，以及 Host 对外导出的测试符号（测试改从 `lib/test/host.js` 导入，由构建单独产出）。
  - 两个路由都用 `ctx.connection.fetch.register`，`methods: ['GET']`。

- [ ] **Step 1: 写失败测试**：`index route returns the raw catalog with store extensions`、`rejects a document that is not format 1`、`serves the last good index when a refresh fails`（第二次读取失败 → 200 且 `stale: true`）、`concurrent requests share one upstream fetch`、`cache expires after ttl`、`compatibility per plugin`（三种情况）、`runtimeVersion is null when app-boot cannot load`、`detail route serves only listed plugins`（未列出 → 404，且没有发出上游请求）、`detail url must stay under the index directory`（`store.detail = '../../x.json'` → 502）、`detail body over 4 MiB is rejected`，以及保留原有的鉴权注册测试（两个路由都 GET-only）
- [ ] **Step 2: 运行确认失败**：`npm run build && npm test`
- [ ] **Step 3: 实现**（`semver` 加为依赖并打包进 Host；`scripts/build.mjs` 增加 `lib/test/host.js` 测试构建）
- [ ] **Step 4: 运行确认通过**：`npm run build && npm test && npm run typecheck`
- [ ] **Step 5: 提交** `feat(host): serve the catalog with caching, compatibility and details`

---

### Task 2: 浏览器端数据层

**Files:**
- Create: `src/client/model/localize.ts`、`src/client/model/catalog.ts`、`src/client/model/install-state.ts`、`src/client/model/api.ts`
- Modify: `scripts/build.mjs`（把 `src/client/model/*.ts` 打包为 `lib/test/model.js`）
- Test: `tests/client-model.test.mjs`

**Interfaces:**
- Consumes: Task 1 的路由返回结构。
- Produces:
  - `localize(text: string | Record<string, string> | undefined, lang: string): string` — 先取 `lang`（`zh-CN` → `zh`），再 `zh`，再 `en`，再第一个值，都没有返回 `''`。
  - `buildCatalog(snapshot): Catalog`：

```ts
interface Catalog {
  title: LocalizedText
  plugins: StorePlugin[]                    // 目录顺序
  byName: Map<string, StorePlugin>
  categories: { id: string; title: LocalizedText; plugins: StorePlugin[] }[]   // 按 store.categoryOrder，空分类去掉
  sections: { id: string; title: LocalizedText; plugins: StorePlugin[] }[]     // 来自 store.sections，名字不存在的跳过
  featured: { plugin: StorePlugin; title: LocalizedText; subtitle: LocalizedText; gradient: [string, string] } | null
  stale: boolean
}
interface StorePlugin {
  name: string; title: LocalizedText; tagline: LocalizedText; icon: string | null   // 绝对 URL（相对于目录地址解析）
  author: string | null; category: string; keywords: string[]
  version: string; publishTimestamp: number; enginesDsh: string | null
  stats: { stars: number | null; weeklyDownloads: number | null; fetchedAt: string }
  review: { version: string; date: string }; upstreamLatest: string | null
  compatibility: 'compatible' | 'incompatible' | 'unknown'
  repository: { url: string; directory?: string } | null; homepage: string | null
}
```
    `gradient` 不是两个合法 `#hex` 时用默认 `['#4338ca', '#db2777']`。
  - `searchPlugins(catalog, query: string): StorePlugin[]`：不区分大小写，匹配包名、中英文标题、中英文卖点、关键词；空查询返回全部。
  - `installStateOf(plugin, installed: Map<string, { version?: string }>): 'install' | 'installed' | 'update' | 'incompatible'`：已安装且版本 < 目录版本 → `update`；已安装 → `installed`；未安装且 `incompatible` → `incompatible`；否则 `install`。
  - `installedFrom(bundles: { name: string; installed: boolean; version?: string }[]): Map` — 只取 `installed: true`。
  - `api.ts`：`loadCatalog(refresh?: boolean)`、`loadDetail(name)`，用 `fetch` 调 Task 1 的两个路由，非 2xx 或 `ok: false` 抛错并带上服务端的 `error`。

- [ ] **Step 1: 写失败测试**：`localize` 的回退链；`buildCatalog` 的分类排序、空分类去掉、分区跳过未知名字、`featured` 为 null 时为 null、非法渐变色回退、图标相对路径解析为绝对 URL；`searchPlugins` 中文与英文都能搜到；`install state` 四种结果
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 提交** `feat(client): add the catalog model`

---

### Task 3: 安全渲染

**Files:**
- Create: `src/client/safe/urls.ts`、`src/client/safe/markdown.tsx`
- Modify: `package.json`（依赖 `marked`；开发依赖 `react@18`、`react-dom@18`，只用于测试）
- Test: `tests/safe-render.test.mjs`（用 `react-dom/server` 的 `renderToStaticMarkup`）

**Interfaces:**
- Produces:
  - `safeUrl(href: string, base: string | null): string | null` — 绝对 `https:`/`http:` 原样返回；相对地址有 `base` 时解析；其他协议或无法解析时返回 `null`。
  - `npmFileBase(name: string, version: string): string` = `https://cdn.jsdelivr.net/npm/${name}@${version}/`
  - `Markdown({ source: string, base: string | null }): ReactElement` — 用 `marked.lexer` 得到 token，自己把 token 转成 React 元素（标题、段落、列表、引用、代码块、行内代码、强调、链接、图片、表格、分隔线）；`html` token 一律丢弃；链接走 `safeUrl` 后加 `target="_blank" rel="noopener noreferrer"`，`safeUrl` 返回 `null` 的链接只渲染文字；图片走 `safeUrl` 后加 `referrerPolicy="no-referrer" loading="lazy"`，`null` 时只渲染 `alt` 文字。

- [ ] **Step 1: 写失败测试**：`raw html is dropped`（`<script>alert(1)</script>`、`<img src=x onerror=alert(1)>` 都不出现在输出里）；`javascript links render as text`；`data images are dropped`；`relative images resolve to the npm cdn`（`docs/a.png` → `https://cdn.jsdelivr.net/npm/dsh-chat-toc@0.5.1/docs/a.png`）；`external images carry no-referrer`；`links open in a new tab without opener`；`tables and code blocks render`
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 提交** `feat(client): render third-party markdown safely`

---

### Task 4: 界面组件

**Files:**
- Create: `src/client/ui/styles.ts`（`STYLE_TEXT` 与 `injectStyles()`）、`src/client/ui/ErrorBoundary.tsx`、`src/client/ui/PluginIcon.tsx`、`src/client/ui/Home.tsx`、`src/client/ui/ListView.tsx`、`src/client/ui/DetailView.tsx`、`src/client/ui/ConfirmInstall.tsx`、`src/client/ui/StoreApp.tsx`
- Delete: `src/client/SpikeStore.tsx`
- Modify: `locale/zh.json`、`locale/en.json`（全部界面文案）
- Test: `tests/ui.test.mjs`（`renderToStaticMarkup` + 夹具目录）

**Interfaces:**
- Consumes: Task 2 的 `Catalog`、`StorePlugin`、`installStateOf`；Task 3 的 `Markdown`、`npmFileBase`。
- Produces:
  - `StoreApp(props: { mode: 'tab' | 'panel'; t: Translate; lang: string; onInstall(plugin: StorePlugin): void; onOpenInstalled(plugin: StorePlugin): void; services: StoreServices }): ReactElement` — 内部视图状态：`{ view: 'home' } | { view: 'list'; filter: { kind: 'category' | 'section' | 'search'; id?: string; query?: string } } | { view: 'detail'; name: string }`；返回时恢复上一视图和滚动位置。
  - `StoreServices = { loadCatalog, loadDetail, loadInstalled(): Promise<Map<…>>, subscribeInstalled(cb): () => void }`（Task 5 注入真实实现，测试注入假实现）。
  - **首页**（`Home`）：顶部搜索框；精选横幅（渐变背景、标题、副标题、「查看详情」）；每个主题分区一行卡片（大图标、中文名、一句话卖点、「全部 ›」）；底部「按分类浏览」按钮组。没有精选时不显示横幅。
  - **列表页**（`ListView`）：标题（分类名 / 分区名 / 「搜索：xxx」）、卡片网格（图标、名字、卖点、版本、作者、星标、安装按钮）、空结果提示。
  - **详情页**（`DetailView`），8 个模块按设计 §6.6 排列：头部（图标、名字、卖点、徽章：「已审核 · 日期」「兼容当前版本 / 不兼容 / 兼容性未知」、安装按钮、数据条：星标 / 周下载 / 最近发布 + 「数据截至 fetchedAt」）；截图横排（点开大图）；「能做什么」；「需要的权限」（每项两列：审核结论 / 扫描结果，不一致时扫描列加提示「自动扫描的命中，审核人判断为……」）；「审核结论」（审核人、日期、版本、说明）；标签页：介绍（README）/ 更新日志（为空时「作者没有提供更新日志」）/ 版本 / 来源（作者、主页、仓库、npm 包、上游最新版本提示）；同类推荐。上游有更新版本时显示「上游已发布 x.y.z，待审核」。
  - **安装按钮**四种状态：「安装」/「已安装」/「有新版本」/ 禁用的「不兼容」（`title` 写原因）。
  - **确认弹窗**（`ConfirmInstall`）：图标、名字、版本、来源「npm」、审核日期、信任提示「插件安装后以你的权限运行」，「取消」/「继续安装」。
  - **错误边界**（`ErrorBoundary`）：出错时显示「商城出了点问题」+ 错误信息 + 「重试」（重置状态重新渲染）。
  - 样式：`ps-` 前缀，颜色和圆角只用 `--dsw-*` 变量（附回退值），窗口宽度 ≥ 720px 时卡片三列，否则两列。

- [ ] **Step 1: 写失败测试**：`home shows banner, sections and categories`、`home hides the banner without a featured plugin`、`list shows an empty state`、`detail shows all eight modules`（用夹具检查各模块标题文字都在）、`detail shows review verdict next to a disagreeing scan result`、`detail degrades to index fields when the detail fails`、`install button states`（四种）、`changelog empty state`、`error boundary shows retry instead of a blank area`
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现组件和样式**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 提交** `feat(client): build the store home, list and detail views`

---

### Task 5: 接入 DSH（入口、安装与交接）

**Files:**
- Modify: `src/client.ts`、`package.json`（`dsh.client.inject` 加入 `@deepseek-ai/dsh-api-remotes`）
- Create: `src/client/handoff.ts`、`src/client/ui/HandoffToast.tsx`
- Test: `tests/handoff.test.mjs`

**Interfaces:**
- Consumes: Task 4 的 `StoreApp`、`ErrorBoundary`、`ConfirmInstall`。
- Produces:
  - `createHandoff(now = Date.now)`：`request(plugin)` 记下待装插件和时间；`take(): StorePlugin | null` 取出并清空，超过 10 分钟的视为过期返回 `null`；`peek()` 给浮层显示用；`subscribe(cb)`。
  - `client.ts` 的 `inject`：`['slots', 'locale', 'layout', 'remote', 'remote.pluginManager']`。注册：
    1. `plugins.tab`（id `store`，「商城」）：`<ErrorBoundary><StoreApp mode="tab" …/></ErrorBoundary>`；`onInstall` 打开 `ConfirmInstall`，确认后调用 `props.install({ spec: \`${name}@${version}\`, title, version })`；`onOpenInstalled` 调用 `props.openPackage(name)`；挂载时 `handoff.take()` 有值就自动打开确认弹窗。
    2. `main`（key `plugin-store`）+ `sidebar.panellist`（id `plugin-store`，「商城」，购物袋图标）：`<ErrorBoundary><StoreApp mode="panel" …/></ErrorBoundary>`；`onInstall` = `handoff.request(plugin)` + `ctx.layout.selectPanel('plugins')`；`onOpenInstalled` = `ctx.layout.selectPanel('plugins')`。
    3. `shell.overlay`（id `plugin-store.handoff`）：`HandoffToast`，有待装插件时显示「请点『商城』标签完成安装：<名字>」和关闭按钮，取出后自动消失。
    4. 首次运行自动打开整页面板（沿用 `shouldAutoOpen`）。
  - 安装状态：`loadInstalled` = `installedFrom(await ctx.remote.pluginManager.listBundles())`；`subscribeInstalled` 监听 `ctx.remote.$on('plugin-manager/changed', …)`，变化时重新读取。

- [ ] **Step 1: 写失败测试**：`take returns the requested plugin once`、`pending install expires after 10 minutes`、`subscribers hear request and take`
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `handoff.ts`、`HandoffToast.tsx`，重写 `client.ts`**
- [ ] **Step 4: 构建、测试、类型检查、纯净性检查全部通过**：`npm run verify`
- [ ] **Step 5: 本机冒烟**：按 `docs/spike/2026-10-19-findings.md` 的方法起隔离 DSH Web（`--patch` 行指向 `lib/index.js`），用 CDP 读取页面文字，确认首页出现「精选插件商城」「长对话一键导航」「让界面更顺手」「看清 Agent 在做什么」，点进「对话目录」后出现「能做什么」「需要的权限」「审核结论」
- [ ] **Step 6: 版本改为 `0.1.0`，提交** `feat: ship the store UI as 0.1.0`

---

### Task 6: 桌面端验收（需要用户参与）

- [ ] **Step 1: 征得确认后推送 `main`，打 tag `v0.1.0` 并推送**
- [ ] **Step 2: 请用户卸载旧商城，用 `github:yang051211/dsh-plugin-store#v0.1.0` 安装，按清单验收并截图：**

| # | 检查项 | 通过标准 |
|---|---|---|
| 1 | 首页 | 精选横幅、两个主题分区、分类按钮都显示，配色跟随主题 |
| 2 | 深色模式 | 切到深色主题后文字清楚、没有白底块 |
| 3 | 搜索 | 搜「目录」和「context」都能找到对应插件 |
| 4 | 详情页 | 截图、要点、权限（dsh-context 的安装脚本一项显示审核结论与扫描结果不一致的提示）、审核结论、README、版本、来源、同类推荐都在；README 里的图片能显示 |
| 5 | 已安装状态 | 已装的 dsh-chat-toc 显示「已安装」，点击跳到它的已安装页面 |
| 6 | 标签页安装 | 在插件页「商城」标签页对 dsh-context 点「安装」→ 弹出我们的确认 → 「继续安装」→ DSH 官方安装对话框（可以取消） |
| 7 | 整页面板交接 | 侧边栏「商城」里对 dsh-context 点「安装」→ 跳到插件页并出现提示 → 点「商城」标签后确认弹窗自动出现 |
| 8 | 出错提示 | 断网后点刷新：显示错误和「重试」，不白屏；恢复网络后重试成功 |

- [ ] **Step 3: 结果写入 `docs/spike/2026-10-19-findings.md`「计划 3 验收」一节并提交；不通过的项修复后重新验收**
