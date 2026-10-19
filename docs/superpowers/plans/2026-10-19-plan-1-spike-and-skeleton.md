# 计划 1：技术验证与项目骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭好商城插件的包结构和构建管线，并在用户的 DSH 0.2.1-rc.2 桌面端上实测设计文档 §6.4 列出的全部技术前提，把结论写回设计文档。

**Architecture:** 按社区通行做法组织成一个包、一行 patch，同时带 Host 与浏览器两半（设计 §6.1.2）。Host 端用 `ctx.webServer.register` 提供一个读取索引的 HTTP 路由；浏览器端通过 `plugins.tab`、`main`、`sidebar.panellist` 三个插槽挂出验证用的界面。构建用 esbuild：Host 端输出 ESM，浏览器端输出包在 `window.__ModuleLoader__.load(...)` 里的 CJS，React 由宿主提供。

**Tech Stack:** TypeScript 5、React（由宿主提供，`react` / `react/jsx-runtime` 设为 external）、esbuild、Node 内置 `node:test`、pnpm。DSH 类型包 `@deepseek-ai/*@0.2.1-rc.2`（npm 上已发布，仅用 `import type`）。

**Spec:** `docs/superpowers/specs/2026-10-19-dsh-plugin-store-design.md`

**计划拆分说明：** 设计文档包含三个相对独立的子系统，本项目按顺序拆成三份计划，后两份等本计划的实测结论出来后再写，因为它们的架构取决于这里的结果：

- **计划 1（本文）**：技术验证 + 项目骨架。
- 计划 2：索引格式与收录工具（抓取、起草、扫描、生成、校验），收录 2 个真实插件。
- 计划 3：商城界面（首页、列表、详情、安装、入口），对接计划 2 产出的索引。

本计划的界面全部是**验证用的临时界面**，计划 3 会替换掉；骨架、构建管线和 Host 路由会保留下来。

## Global Constraints

- 包名 `dsh-plugin-store`；patch 行 id `plugin-store`；标签页 id `store`、显示名「商城」；主面板与侧边栏入口 id `plugin-store`。
- `engines.dsh`: `">=0.2.1-rc.2 <0.3.0"`。
- 不发布到 npm。通过 GitHub 安装，`lib/` 构建产物**提交进仓库**，**不得**设置 `prepare` 脚本（设计 §6.1.1）。
- 浏览器端构建产物里不得出现字符串 `@deepseek-ai/`：所有 DSH 包一律只用 `import type`，否则会把宿主运行时再打包一份进来。
- 商城不得自己执行安装、卸载、更新、重启，也不得改写 profile 或 `cordis.patch.yml`（设计 §4）。安装只能调用 `plugins.tab` owner 提供的 `install()`。
- 本仓库位于 `D:\MCP\dsh-plugin-store`，与 TakoRAG 工作区无关，不得在其他仓库里改动任何东西。
- 推送到 GitHub、打 tag 之前先告诉用户并等确认。
- 验证用的默认索引地址：`https://raw.githubusercontent.com/fareyuu-ops/dsh-plugin-market/main/index.json`（用户已在桌面端「发现」页成功添加过）。

## Review Focus

1. **索引地址读不到或返回了非 JSON**（断网、超时、GitHub 抽风）：Host 路由应返回 `502` 和 `{ ok: false, error }`，界面显示错误文字，不能整页空白或抛到外层。→ 测试见 Task 2 Step 1 的 `returns 502 when upstream fails` 和 `returns 502 when upstream is not JSON`。
2. **上游响应超大**：Host 路由要限制大小（超过 8 MiB 就拒绝），不能把整个进程拖慢。→ Task 2 Step 1 的 `rejects bodies over the size cap`。
3. **浏览器端渲染时抛异常**：只能影响商城自己的区域，桌面端必须照常启动，其他页面不受影响（设计 §4 中对 dsh-market #869 的反目标）。→ Task 3 的「模拟崩溃」按钮 + Task 4 检查项 ⑦。
4. **构建产物混进 `@deepseek-ai/` 运行时代码**：会在宿主里装出第二份运行时，表现为奇怪的状态错乱。→ Task 1 Step 1 的构建产物纯净性测试。
5. **用 GitHub 地址安装时被要求批准构建**：这正是设计里要避免的体验。→ Task 4 检查项 ④。

---

### Task 1: 包结构与构建管线

**Files:**
- Create: `package.json`、`cordis.patch.yml`、`tsconfig.json`、`.gitignore`、`scripts/build.mjs`、`src/index.ts`、`src/client.ts`、`locale/zh.json`、`locale/en.json`、`README.md`
- Test: `tests/build.test.mjs`

**Interfaces:**
- Produces:
  - `pnpm build` → 生成 `lib/index.js`（ESM，Host 端）与 `lib/client.js`（浏览器端，CJS 包在 ModuleLoader 里）。
  - `src/index.ts`：`export const name = 'plugin-store'`、`export const inject = ['webServer']`、`export function apply(ctx: Context): void`。
  - `src/client.ts`：`export const name = 'plugin-store'`、`export const inject: string[]`、`export function apply(ctx: Context): void`。
  - `pnpm test` → `node --test tests/`。

- [ ] **Step 1: 写失败的测试 `tests/build.test.mjs`**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const client = () => readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const host = () => readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('client bundle is wrapped for the web module loader', () => {
  assert.ok(client().startsWith('window.__ModuleLoader__.load({ id: "dsh-plugin-store"'))
  assert.ok(client().trimEnd().endsWith('return module.exports; } });'))
})

test('client bundle carries no @deepseek-ai runtime code', () => {
  assert.equal(client().includes('@deepseek-ai/'), false)
})

test('host bundle is ESM and exports apply', () => {
  assert.match(host(), /export\s*\{[^}]*apply/)
})

test('manifest declares the bundle, the client half, and no prepare script', () => {
  assert.equal(pkg.name, 'dsh-plugin-store')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.engines.dsh, '>=0.2.1-rc.2 <0.3.0')
  assert.equal(pkg.scripts?.prepare, undefined)
  assert.deepEqual(pkg.exports['./client'], './lib/client.js')
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test`
Expected: FAIL（`lib/client.js` 不存在 / `package.json` 不存在）

- [ ] **Step 3: 写 `package.json`**

关键字段（其余字段由实现者补齐）：

```json
{
  "name": "dsh-plugin-store",
  "version": "0.0.1",
  "type": "module",
  "main": "./lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "files": ["lib", "locale", "cordis.patch.yml", "README.md", "LICENSE"],
  "engines": { "dsh": ">=0.2.1-rc.2 <0.3.0" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-plugin-manager",
        "@deepseek-ai/dsh-client-ui-sidebar",
        "@deepseek-ai/dsh-client-ui-layout"
      ]
    }
  },
  "scripts": { "build": "node scripts/build.mjs", "test": "node --test tests/", "typecheck": "tsc --noEmit" }
}
```

devDependencies：`esbuild`、`typescript`、`@types/react`、`@types/node`，以及只用于类型的 `@deepseek-ai/cordis@4.0.5`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-plugin-manager`、`@deepseek-ai/dsh-client-ui-sidebar`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-host-webserver`（均为 `0.2.1-rc.2`）。

- [ ] **Step 4: 写 `cordis.patch.yml`**

```yaml
# dsh-plugin-store：一行同时挂上 Host 端（lib/index.js）和浏览器端（lib/client.js，经 dsh.client 声明注入）。
- insert:
    - id: plugin-store
      name: dsh-plugin-store
```

- [ ] **Step 5: 写 `scripts/build.mjs`**

照搬 `PerryLink/dsh-session-pin` 的 `scripts/build.mjs` 结构（Apache-2.0，在文件头注明出处），改动如下：`ID = 'dsh-plugin-store'`；Host 端 `external` 为 `['@deepseek-ai/*']`；浏览器端入口 `src/client.ts`，`external: ['react', 'react/jsx-runtime']`，`jsx: 'automatic'`；保留「产物里出现 `@deepseek-ai/` 就构建失败」的纯净性检查。

- [ ] **Step 6: 写最小入口 `src/index.ts`、`src/client.ts`，以及 `tsconfig.json`、`.gitignore`、`locale/*.json`、`README.md`**

`src/index.ts` 的 `apply` 先留空；`src/client.ts` 的 `apply` 只注册文案命名空间 `pluginStore`。`.gitignore` 忽略 `node_modules/`，**不能忽略 `lib/`**。`locale/zh.json` 至少包含 `{ "meta": { "title": "插件商城", "description": "应用商店式的 DSH 插件商城" } }`，`en.json` 是对应的英文。`README.md` 用一句话说明这是开发中的项目，并写上 GitHub 安装方式。

- [ ] **Step 7: 构建并运行测试，确认通过**

Run: `pnpm install && pnpm build && pnpm test && pnpm typecheck`
Expected: 4 个测试 PASS，tsc 无错误

- [ ] **Step 8: 提交（包含 `lib/`）**

```bash
git add package.json pnpm-lock.yaml cordis.patch.yml tsconfig.json .gitignore scripts src lib locale README.md tests
git commit -m "feat: scaffold the dsh-plugin-store bundle and build pipeline"
```

---

### Task 2: Host 端索引读取路由

**Files:**
- Create: `src/host/index-route.ts`
- Modify: `src/index.ts`
- Test: `tests/index-route.test.mjs`（测试对象是构建产物 `lib/index.js` 导出的 `createIndexHandler`）

**Interfaces:**
- Consumes: Task 1 的构建管线。
- Produces:
  - `export const INDEX_ROUTE = '/api/plugin-store/index'`
  - `export const DEFAULT_INDEX_URL = 'https://raw.githubusercontent.com/fareyuu-ops/dsh-plugin-market/main/index.json'`
  - `export const MAX_INDEX_BYTES = 8 * 1024 * 1024`
  - `export function createIndexHandler(fetchImpl: typeof fetch, indexUrl: string): (req: IncomingMessage, res: ServerResponse) => Promise<void>`：成功时返回 `200` `{ ok: true, title, pluginCount, fetchedAt }`，失败时返回 `502` `{ ok: false, error }`。只读取 `indexUrl`，**不接受客户端传入的地址**。
  - `src/index.ts` 的 `apply` 中：`ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: INDEX_ROUTE, handler: createIndexHandler(fetch, DEFAULT_INDEX_URL) }))`。

- [ ] **Step 1: 写失败的测试**

测试用一个假的 `res`（记录 `statusCode`、响应头和写入的内容）和一个假的 `fetchImpl`：

```js
test('returns title and plugin count from the index', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: { en: 'X', zh: '某市场' }, plugins: [{}, {}, {}] }))
  const res = await call(createIndexHandler(fetchImpl, 'https://example.com/index.json'))
  assert.equal(res.statusCode, 200)
  assert.deepEqual(pick(res.json, ['ok', 'pluginCount']), { ok: true, pluginCount: 3 })
  assert.deepEqual(res.json.title, { en: 'X', zh: '某市场' })
})
test('returns 502 when upstream fails', async () => { /* fetchImpl 抛 TypeError('fetch failed') → 502, ok:false */ })
test('returns 502 when upstream is not JSON', async () => { /* 返回 '<html>' → 502 */ })
test('rejects bodies over the size cap', async () => { /* 返回 MAX_INDEX_BYTES+1 字节 → 502, error 含 'too large' */ })
test('never fetches a client-supplied URL', async () => { /* req.url = '/api/plugin-store/index?url=https://evil' → fetchImpl 收到的仍是 indexUrl */ })
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm build && pnpm test`
Expected: FAIL（`createIndexHandler` 未导出）

- [ ] **Step 3: 在 `src/host/index-route.ts` 实现 `createIndexHandler`，并在 `src/index.ts` 中注册路由、导出上述常量和函数**

读取响应体时边读边累计字节数，超过 `MAX_INDEX_BYTES` 立即中止；超时用 `AbortSignal.timeout(15000)`，与官方「发现」页的 `fetchTimeoutMs` 默认值一致。

- [ ] **Step 4: 构建并运行测试，确认通过**

Run: `pnpm build && pnpm test`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add src tests lib
git commit -m "feat: serve the configured market index through a host route"
```

---

### Task 3: 浏览器端验证界面（标签页、整页面板、侧边栏入口、首次自动打开）

**Files:**
- Create: `src/client/SpikeStore.tsx`、`src/client/first-run.ts`
- Modify: `src/client.ts`、`locale/zh.json`、`locale/en.json`
- Test: `tests/first-run.test.mjs`

**Interfaces:**
- Consumes: Task 2 的 `INDEX_ROUTE`（浏览器端里以字面量 `'/api/plugin-store/index'` 写死，**不能** value import Host 端代码）。
- Produces:
  - `export function SpikeStore(props: { mode: 'tab' | 'panel'; install?: PluginTabProps['install']; t: (key: string) => string }): ReactNode`：调用 `fetch('/api/plugin-store/index')` 显示「索引标题 + 插件数量」或错误文字；有 `install` 时显示一个「测试安装」按钮，调用 `install({ spec: 'dsh-chat-toc@<从索引读到的版本>', title: 'dsh-chat-toc', version })`；另有一个「模拟崩溃」按钮，点击后下一次渲染时 `throw new Error('plugin-store spike crash')`。
  - `export function shouldAutoOpen(storage: Pick<Storage, 'getItem' | 'setItem'>): boolean`：第一次调用返回 `true` 并写入标记 `dsh-plugin-store:first-run-done`，之后都返回 `false`；访问 storage 抛异常时返回 `false`。
  - `src/client.ts` 的 `inject = ['slots', 'locale', 'layout']`，`apply` 中依次注册：
    1. `plugins.tab`：`{ name: 'plugins.tab', id: 'store', label: () => t('tab'), locale: 'pluginStore' }`，组件渲染 `<SpikeStore mode="tab" install={props.install} t={props.t} />`；
    2. `main`：`{ name: 'main', key: 'plugin-store', locale: 'pluginStore' }`，组件渲染 `<SpikeStore mode="panel" t={props.t} />`；
    3. `sidebar.panellist`：`{ name: 'sidebar.panellist', id: 'plugin-store', order: 1, label: () => t('tab'), locale: 'pluginStore' }`，图标先用一个内联 SVG 购物袋；
    4. 如果 `shouldAutoOpen(window.localStorage)` 为真，执行 `ctx.layout.selectPanel('plugin-store')`。
  - 写法参照官方 `packages/client/ui-plugin-market/src/client/index.ts` 和 `packages/client/ui-plugin-manager/src/client/index.ts:104-152`（DSH 源码 commit `687f282e`）。插槽类型用 `import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'` 和 `'@deepseek-ai/dsh-client-ui-sidebar/client'` 引入；组件 props 类型用 `PropsRuntime` / `PropsLocale`（`@deepseek-ai/dsh-client-ui-slots`）。

- [ ] **Step 1: 写 `shouldAutoOpen` 的失败测试**

```js
test('auto-opens exactly once', () => {
  const store = new Map()
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  assert.equal(shouldAutoOpen(storage), true)
  assert.equal(shouldAutoOpen(storage), false)
})
test('does not auto-open when storage throws', () => {
  const storage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.equal(shouldAutoOpen(storage), false)
})
```

（`shouldAutoOpen` 需要能在 Node 里测试：在 `scripts/build.mjs` 里额外把 `src/client/first-run.ts` 单独构建成 `lib/test/first-run.js` 供测试导入；这个文件不在 `files` 里，不会进入安装包。）

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm build && pnpm test`
Expected: FAIL

- [ ] **Step 3: 实现 `first-run.ts`、`SpikeStore.tsx`，并改 `src/client.ts`，在 `locale/*.json` 加入 `tab`（「商城」/ "Store"）等文案**

- [ ] **Step 4: 构建、测试、类型检查全部通过**

Run: `pnpm build && pnpm test && pnpm typecheck`
Expected: 全部 PASS；构建纯净性检查通过

- [ ] **Step 5: 提交**

```bash
git add src tests lib locale scripts
git commit -m "feat: add spike surfaces for the store tab, panel and sidebar entry"
```

---

### Task 4: 桌面端实测与结论

这个任务需要**用户在自己的桌面端操作**。执行者负责准备、提供操作清单、记录结果，以及根据结果修改设计文档。

**Files:**
- Create: `docs/spike/2026-10-19-findings.md`
- Modify: `docs/superpowers/specs/2026-10-19-dsh-plugin-store-design.md`（§6.4、§6.1.1、§6.7 中「校验器是否已发布到 npm」一句）

- [ ] **Step 1: 推送并打 tag（先征得用户确认）**

告诉用户将推送 `main` 并打 tag `spike-1`，得到确认后执行：

```bash
git push origin main && git tag spike-1 && git push origin spike-1
```

- [ ] **Step 2: 请用户在桌面端按清单操作，并逐项回报结果**

安装方式：插件页 →「添加插件」→ 填 `github:yang051211/dsh-plugin-store#spike-1`。如果这种写法被拒，依次尝试 `https://github.com/yang051211/dsh-plugin-store#spike-1`、`git+https://github.com/yang051211/dsh-plugin-store.git#spike-1`，并记录哪种写法可用。

| # | 检查项 | 通过标准 |
|---|---|---|
| ④ | 用 GitHub 地址安装 | 没有出现「允许这些脚本并重试」，安装成功 |
| ⑤ | 装完不重启 | 插件页立刻出现「商城」标签页；商城整页面板自动打开（只有第一次） |
| ⑥ | 侧边栏入口 | 左侧边栏出现「商城」图标，点击打开整页面板 |
| ① | 标签页 | 插件页「商城」标签页能打开并显示内容 |
| ② | 外部索引 | 显示「awesome-dsh-plugin 精选」以及插件数量（应为 43 左右） |
| ③ | 官方安装对话框 | 点「测试安装」后打开 DSH 自带的安装对话框，并显示 dsh-chat-toc 和版本号；**点取消，不要真的装** |
| ⑦ | 崩溃隔离 | 点「模拟崩溃」后只有商城区域出错；切到别的页面正常；完全退出桌面端后重新打开，能正常启动 |
| ⑧ | 整页面板里的安装 | 记录整页面板能否拿到安装能力（预期拿不到，需要在计划 3 里设计交接方式） |
| ⑨ | 卸载 | 在「已安装」里卸载商城后，标签页、面板和侧边栏入口都消失，桌面端正常 |

- [ ] **Step 3: 把结果写进 `docs/spike/2026-10-19-findings.md`**

每一项写：结果（通过 / 不通过）、实际看到的现象、用户截图的文字描述、DSH 版本。不通过的项写明下一步替代方案。

- [ ] **Step 4: 按结论修改设计文档并提交**

- §6.4：根据 ② 定下读取方式（Host 路由）；根据 ⑤⑥⑧ 定下入口与安装交接方案；
- §6.1.1：写入实测可用的 GitHub 安装写法；
- §6.7：校验器 `@deepseek-ai/dsh-plugin-market-index@0.2.1-rc.2` 已发布到 npm（2026-10-19 用 `npm view` 核实），可以直接作为开发依赖使用，不需要移植。

```bash
git add docs
git commit -m "docs: record spike findings and settle the open technical choices"
```

- [ ] **Step 5: 卸载验证插件后，通知规划者开始写计划 2 和计划 3**
