# 生态家园插件总入口 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生态家园 v0.3.0：去掉独立整页面板，新增「已安装」页（更新提醒、启用/停用、卸载、设置），以及「只保留生态家园」开关。

**Architecture:** 所有界面都在插件页的「生态家园」标签（`plugins.tab`）里。已安装列表的分组和更新判定是纯函数（`src/client/model/installed.ts`）。目录里没有的 npm 插件，由 Host 新路由向用户设置的安装源查最新版本。开关逻辑集中在 `src/client/hub.ts`，包括偏好读写、隐藏样式、按标签文字切标签；`src/client.ts` 按开关注册或撤掉侧边栏条目、样式和「切回生态家园」的观察器。

**Tech Stack:** TypeScript、React 18、esbuild、`node --test` + `react-test-renderer`、semver。

**Spec:** `docs/superpowers/specs/2026-10-27-plugin-hub-design.md`

## Global Constraints

- 版本号 `0.3.0`（`package.json`），发布前跑 `npm run directory:build` 让 `market/index.json` 的 `store.self.version` 同步。
- 只用 DSH 公开的插槽和接口，不改 DSH 文件、不打补丁。
- 安装和更新一律经官方对话框（`install()`）或官方页面（`openPackage()`）；生态家园不调用 `installBundle`。
- 其他插件的「更新」按钮调用 `openPackage(name)`。只有生态家园自身走 `install()`（`github:` 地址）。
- 开关存储键 `dsh-startide:keep-only`，值 `'1'` 表示开启；读写抛错一律视为关闭。
- 开关名称「只保留生态家园」；说明「开启后侧边栏只显示生态家园，插件页隐藏官方标题和标签栏；关闭即恢复。」
- 卸载确认：标题「卸载「{name}」？」，说明「卸载后它提供的功能会消失。」
- `restart-required` 提示「重启 DSH 后生效」；非 npm 来源提示「来源不是 npm，无法检查更新」。
- 隐藏选择器匹配不到时什么都不隐藏；不能用会误伤其他页面的宽选择器。
- 浏览器端对 `@deepseek-ai/*` 只能 `import type`（构建有纯净检查）。
- 提交作者 yang051211，提交信息不带任何 AI 署名；本计划只做本地提交，推送和发版另行确认。

## Review Focus

1. 已安装列表读取失败（远程调用 `ok: false`）：页面显示错误和重试，不白屏，也不把列表当成空的。
2. 某个插件没有 `version`，或版本号不是合法 semver：不报更新，也不崩溃。
3. Host 的 `pluginManager` 服务不可用：只有更新路由不启动，目录、详情、README 路由照常工作；浏览器把「查不到」当成「没有更新信息」。
4. 开关开启时切换界面语言：「切回生态家园」按当前语言的标签文字查找，不因旧文字失效。
5. 生态家园自己出现在列表里：没有停用和卸载按钮，有更新时按钮走自更新。

---

### Task 1: 已安装列表模型

**Files:**
- Create: `src/shared/registry-spec.ts`
- Create: `src/client/model/installed.ts`
- Modify: `src/client/model/install-state.ts`（`installedFrom` 改为返回 bundle 数组，新增 `installedOf`）
- Modify: `src/client/model/testing.ts`
- Test: `tests/installed-model.test.mjs`；`tests/client-model.test.mjs` 中 `installedFrom` 的用例随签名更新

**Interfaces:**
- Produces:
  - `isRegistrySpec(name: string, source: string | undefined): boolean`（`src/shared/registry-spec.ts`，Host 和浏览器共用）
  - `type InstalledBundle = { name: string; version?: string; enabled: boolean; installed: boolean; official: boolean; availability: 'installation' | 'profile' | 'missing'; source?: string; removable: boolean; meta?: unknown }`
  - `installedFrom(result): InstalledBundle[]`：只保留 `installed: true`，`ok: false` 时抛出 `result.error`
  - `installedOf(bundles: InstalledBundle[]): Installed`（与现有 `Installed` 的 Map 形状相同）
  - `type InstalledRow = { name: string; title: string; plugin: StorePlugin | null; version: string | null; latest: string | null; check: 'catalog' | 'registry' | 'not-npm'; enabled: boolean; official: boolean; missing: boolean; removable: boolean; self: boolean }`
  - `buildInstalledRows(bundles: InstalledBundle[], catalog: Catalog | null, registryLatest: Record<string, string>, lang: string): { updates: InstalledRow[]; others: InstalledRow[]; official: InstalledRow[] }`
  - `changeOutcome(result: { ok: true; value: { application: string; error?: unknown } } | { ok: false; error: unknown }): 'applied' | 'restart-required' | { error: string }`

- [ ] **Step 1: 写失败的测试** `tests/installed-model.test.mjs`（从 `../lib/test/model.js` 导入）

```js
test('a registry spec is name@range; git, paths, tarballs and aliases are not', () => {
  assert.equal(isRegistrySpec('dsh-pet', 'dsh-pet@^1.2.0'), true)
  assert.equal(isRegistrySpec('@a/b', '@a/b@1.0.0'), true)
  assert.equal(isRegistrySpec('dsh-pet', 'dsh-pet'), true)
  for (const source of [undefined, 'github:o/r#v1', 'git+https://x/y.git', 'C:/plugins/pet', '/abs/pet', 'https://x/p.tgz', 'dsh-pet@npm:other@1', 'other@1.0.0'])
    assert.equal(isRegistrySpec('dsh-pet', source), false, String(source))
})

test('rows: updates first, official apart, the rest under others', () => {
  const rows = buildInstalledRows([
    bundle('dsh-pet', '1.0.0'),                       // 目录里是 1.1.0 → updates，check 'catalog'
    bundle('dsh-context', '9.9.9'),                   // 目录里更旧 → others
    bundle('off-catalog', '1.0.0', { source: 'off-catalog@^1.0.0' }), // registryLatest 2.0.0 → updates，check 'registry'
    bundle('from-git', '1.0.0', { source: 'github:o/r' }),          // others，check 'not-npm'，latest null
    bundle('dsh-builtin', '1.0.0', { official: true }),              // official
  ], catalog, { 'off-catalog': '2.0.0' }, 'zh')
  assert.deepEqual(rows.updates.map(r => [r.name, r.version, r.latest, r.check]), [['dsh-pet', '1.0.0', '1.1.0', 'catalog'], ['off-catalog', '1.0.0', '2.0.0', 'registry']])
  assert.deepEqual(rows.others.map(r => r.name).sort(), ['dsh-context', 'from-git'])
  assert.equal(rows.others.find(r => r.name === 'from-git').check, 'not-npm')
  assert.deepEqual(rows.official.map(r => r.name), ['dsh-builtin'])
})

test('a missing or invalid version never counts as an update', () => {
  const rows = buildInstalledRows([bundle('dsh-pet', undefined), bundle('dsh-chat-toc', 'next')], catalog, {}, 'zh')
  assert.equal(rows.updates.length, 0)
})

test('the store itself is marked self; uninstalled bundles are dropped', () => {
  const rows = buildInstalledRows([bundle('dsh-startide', '0.3.0'), bundle('gone', '1.0.0', { installed: false })], catalog, {}, 'zh')
  assert.deepEqual([...rows.updates, ...rows.others].map(r => [r.name, r.self]), [['dsh-startide', true]])
})

test('change outcome: applied, restart required, or the error text', () => {
  assert.equal(changeOutcome({ ok: true, value: { application: 'applied' } }), 'applied')
  assert.equal(changeOutcome({ ok: true, value: { application: 'restart-required' } }), 'restart-required')
  assert.deepEqual(changeOutcome({ ok: true, value: { application: 'failed', error: { message: 'boom' } } }), { error: 'boom' })
  assert.deepEqual(changeOutcome({ ok: false, error: new Error('offline') }), { error: 'offline' })
})
```

`bundle(name, version, extra)` 是测试内的小工具，默认 `{ installed: true, enabled: true, official: false, availability: 'profile', removable: true, source: \`${name}@^${version}\` }`。`catalog` 用 `buildCatalog(snapshot())` 从 `tests/fixtures/directory/index.json` 构建；断言里的目录版本号以 fixture 为准，写测试前先核对。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run build && node --test tests/installed-model.test.mjs`
Expected: FAIL，`isRegistrySpec` / `buildInstalledRows` 未导出

- [ ] **Step 3: 实现**

- `isRegistrySpec`：`source === name`；或 `source` 以 `${name}@` 开头，且剩余部分非空、不含 `:` `/` `\` `#`。
- `buildInstalledRows`：
  - 只取 `installed: true` 的 bundle。
  - 最新版本：目录里有就用目录的 `version`（`check: 'catalog'`）；否则 `isRegistrySpec` 为真时取 `registryLatest[name] ?? null`（`check: 'registry'`）；否则 `check: 'not-npm'`。
  - 有更新的条件：`version` 和 `latest` 都是 `semver.valid` 的合法版本，且 `semver.gt(latest, version)`。
  - 分组：`official` 一律进 official；其余有更新的进 updates，没有的进 others。
  - 每组按 `title` 用 `localeCompare` 排序。
  - `title` = 目录标题（`localize`）→ `meta` 里的显示标题（读 `dsh-package-manifest` 的 `PluginLocalizedMeta` 类型取法）→ 包名。
  - `self = name === STORE_PACKAGE`；`missing = availability === 'missing'`。
- `changeOutcome`：`ok: false` 返回 `{ error }`，`error` 是错误的 `message` 或 `String(error)`；`application` 为 `applied` / `restart-required` 时原样返回；其他值返回 `{ error: value.error?.message ?? application }`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm run build && node --test tests/installed-model.test.mjs tests/client-model.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/shared src/client/model tests/installed-model.test.mjs tests/client-model.test.mjs lib
git commit -m "installed list model: groups, update checks, change outcomes"
```

---

### Task 2: Host 更新查询路由

**Files:**
- Create: `src/host/updates-route.ts`
- Modify: `src/index.ts`
- Modify: `src/host/testing.ts`
- Test: `tests/updates-route.test.mjs`

**Interfaces:**
- Consumes: `isRegistrySpec`（Task 1）、`fetchJson`（`src/host/http.ts`）、`CatalogCache`
- Produces:
  - `UPDATES_ROUTE = '/api/startide/updates'`
  - `createUpdatesFetch(deps: { cache: CatalogCache; manager: { listBundles(): Promise<HostBundle[]>; registries(): Promise<{ registry: string | null; resolved: string | null }> }; fetch: typeof fetch; now?: () => number }): (request: Request) => Promise<Response>`
  - 响应：`200 { ok: true, latest: Record<string, string> }`；`listBundles` 或 `registries` 抛错时返回 `502 { ok: false, error }`

- [ ] **Step 1: 写失败的测试** `tests/updates-route.test.mjs`

```js
test('asks the configured registry only for npm bundles the catalog does not list', ...)
// listBundles 返回：dsh-pet（目录里有）、off-catalog（source off-catalog@^1.0.0）、from-git（github:）、builtin（official）
// registries → { registry: 'https://mirror.example/npm/', resolved: null }
// 断言：fetch 只被调用一次，URL 为 https://mirror.example/npm/off-catalog；响应 latest = { 'off-catalog': '2.0.0' }

test('falls back to pnpm\'s resolved registry, then to registry.npmjs.org', ...)
// registry null + resolved 'https://r.example/' → https://r.example/off-catalog
// 两者都是 null → https://registry.npmjs.org/off-catalog

test('a scoped name keeps its @ and escapes the slash', ...)
// @a/b → https://registry.npmjs.org/@a%2Fb

test('one failed lookup leaves that name out; the rest answer', ...)

test('answers from cache within ten minutes, asks again after', ...)
// now 推进 599_999 不重查，600_000 重查

test('a failing plugin manager answers 502', ...)
```

请求头带 `accept: application/vnd.npm.install-v1+json`，只读 `dist-tags.latest`；`latest` 不是合法 semver 的结果丢弃。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run build && node --test tests/updates-route.test.mjs`
Expected: FAIL，`createUpdatesFetch` 未导出

- [ ] **Step 3: 实现** `src/host/updates-route.ts`

- 常量：`UPDATE_TTL_MS = 600_000`、`LOOKUP_TIMEOUT_MS = 15_000`、`MAX_PACKUMENT_BYTES = 8 * 1024 * 1024`、并发 4。
- 缓存按「registry + 包名」做键。
- 目录里有哪些包名，用 `cache.index()` 的结果判断；目录读不到时按「都不在目录里」处理。

`src/index.ts`：更新路由放进一个子插件，单独声明 `inject: ['connection', 'pluginManager']`，这样 `pluginManager` 不可用时只有这个子插件不启动：

```ts
ctx.plugin({
  name: 'startide-updates',
  inject: ['connection', 'pluginManager'],
  apply: (sub: Context) => sub.effect(() => sub.connection.fetch.register({
    path: UPDATES_ROUTE, methods: ['GET'], requestBody: 'buffered',
    fetch: createUpdatesFetch({ cache, manager: sub.pluginManager, fetch }),
  }), 'startide: updates route'),
})
```

`ctx.plugin` 的确切写法以 cordis 4 类型为准。如果 Host 端的 `pluginManager` 不是 `@deepseek-ai/dsh-plugin-manager` 的 `PluginManager` 实例（要核对 `listBundles` 是直接返回数组还是 `{ ok, value }`），按实际形状包一层。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm run build && node --test tests/updates-route.test.mjs tests/index-route.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/host src/index.ts tests/updates-route.test.mjs lib
git commit -m "host: latest versions of npm plugins the catalog does not list"
```

---

### Task 3: 开关与切标签工具（hub.ts）

**Files:**
- Create: `src/client/hub.ts`
- Modify: `scripts/build.mjs`（`TEST_ENTRIES` 增加 `hub: { entry: 'src/client/hub.ts', platform: 'neutral' }`；`handoff` 条目留到 Task 5 和文件一起删）
- Test: `tests/hub.test.mjs`

**Interfaces:**
- Produces:
  - `KEEP_ONLY_KEY = 'dsh-startide:keep-only'`
  - `createKeepOnly(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>): { get(): boolean; set(on: boolean): void; subscribe(listener: () => void): () => void }`
  - `HIDE_CSS: string`；`injectHideStyle(doc?: Document): () => void`（`style[data-plugin="dsh-startide-hide"]`，重复注入不叠加）
  - `selectTabByLabel(root, label): boolean`、`selectTabWhenReady(root, label, opts?): Promise<boolean>`：从 `handoff.ts` 原样搬过来
  - `PLUGINS_PANEL_ID = 'plugins'`

- [ ] **Step 1: 写失败的测试** `tests/hub.test.mjs`

```js
test('keep-only is off by default, remembers on, and tells subscribers', () => { /* 内存 storage：get() false → set(true) → get() true，storage 里是 '1'，监听者被调用一次 */ })
test('keep-only reads as off when storage throws, and set does not throw', () => { /* getStorage 抛 SecurityError */ })
test('the hide style targets only the official heading and tab bar of a page holding the store', () => {
  assert.match(HIDE_CSS, /:has\(\.ps-root\)/)
  for (const part of ['_pageHeading', '_pageTabs']) assert.ok(HIDE_CSS.includes(part))
  assert.equal(HIDE_CSS.includes('_pageTabList'), false)
  assert.equal(HIDE_CSS.includes('_toolbar'), false)
})
// 以及从 handoff.test.mjs 原样搬来的 5 个 selectTabByLabel / selectTabWhenReady 用例
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run build && node --test tests/hub.test.mjs`
Expected: FAIL，`lib/test/hub.js` 不存在或导出缺失

- [ ] **Step 3: 实现**

`HIDE_CSS` 的选择器按类名结尾匹配，只在含 `.ps-root` 的插件页根元素内生效：

```css
:is([class$="_page"],[class*="_page "]):has(.ps-root) :is([class$="_pageHeading"],[class*="_pageHeading "],[class$="_pageTabs"],[class*="_pageTabs "]){display:none!important}
```

隐藏用 `display:none`，元素仍在 DOM 里，`selectTabByLabel` 照样能找到并点击被隐藏的标签。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm run build && node --test tests/hub.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**（`client.ts` 还引用着 handoff，所以 `handoff.ts` 和它的测试留到 Task 5 再删）

```bash
git add src/client/hub.ts scripts/build.mjs tests/hub.test.mjs lib
git commit -m "hub: keep-only preference, hide style, tab selection"
```

---

### Task 4: 「已安装」页和 StoreApp 改造

**Files:**
- Create: `src/client/ui/InstalledView.tsx`
- Create: `src/client/ui/ConfirmRemove.tsx`
- Modify: `src/client/ui/StoreApp.tsx`、`src/client/ui/testing.ts`、`src/client/ui/styles.ts`
- Modify: `src/client/model/api.ts`（新增 `loadLatest`）
- Modify: `locale/zh.json`、`locale/en.json`
- Test: `tests/store-app.test.mjs`（改造）、`tests/installed-view.test.mjs`（新增）

**Interfaces:**
- Consumes: Task 1 的 `InstalledBundle`、`installedOf`、`buildInstalledRows`、`changeOutcome`；Task 2 的 `UPDATES_ROUTE`（浏览器端写字面量 `/api/startide/updates`）
- Produces（`StoreApp` 的新契约，Task 5 使用）:

```ts
export interface StoreServices {
  loadCatalog, loadDetail, loadReadme,                // 不变
  loadBundles: () => Promise<InstalledBundle[]>,      // 替代 loadInstalled
  subscribeInstalled: (onChange: () => void) => () => void,
  loadLatest: () => Promise<Record<string, string>>,  // 失败时返回 {}
  setEnabled: (name: string, enabled: boolean) => Promise<ChangeOutcome>,
  remove: (name: string) => Promise<ChangeOutcome>,
  inspect: (spec: string) => Promise<{ ok: true; name: string; version: string } | { ok: false; reason: string }>,
}
export interface StoreAppProps {
  lang: string; t: Translate; services: StoreServices
  onInstall: (plugin: StorePlugin) => void
  onSelfUpdate: (update: SelfUpdate) => void
  onOpenPackage: (name: string) => void               // 替代 onOpenInstalled
  onInstallSpec: (target: { spec: string; title: string; version: string }) => void
  keepOnly: { value: boolean; set: (on: boolean) => void }
}
```

删掉 `mode`、`takePending` 和所有 `mode === 'panel'` 分支；`NavTab` 增加 `'installed'`，顺序为 `home, all, installed, about`。

- [ ] **Step 1: 写失败的测试**

`tests/store-app.test.mjs`：
- `services()` 改用 `loadBundles: async () => []`、`loadLatest: async () => ({})`；原来传 `new Map([...])` 的用例改用 Task 1 的 `bundle()` 数组。
- 删掉两个 handed-over 用例。
- nav 用例改成断言 4 个标签：首页 / 全部插件 / 已安装 / 关于。

`tests/installed-view.test.mjs`（经 `StoreApp` 挂载后点「已安装」标签）：

```js
test('the Installed tab shows a count of available updates, none when zero')
test('an update row shows "1.0.0 → 1.1.0" and its button opens the official page for that plugin') // onOpenPackage('dsh-pet')；install 未被调用
test('the store itself has no switch or uninstall; its update button asks for the self-update')
test('official plugins are listed apart, with settings only')
test('a non-npm plugin says its updates cannot be checked')
test('uninstall asks first with the official wording, then calls remove')  // 取消时 remove 未被调用
test('a restart-required change says so; a failed one shows the error text')
test('the switch calls setEnabled with the new state')
test('keep-only switch reflects and changes the preference')
test('the address box shows only with keep-only on; it inspects, then installs with the inspected name and version')
test('a refused address shows the reason and does not install')
test('a failed installed-list read shows the error and a retry, not an empty list')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run build && node --test tests/store-app.test.mjs tests/installed-view.test.mjs`
Expected: FAIL（找不到「已安装」标签等）

- [ ] **Step 3: 实现**

- `StoreApp` 在顶层持有 `bundles`（`loadBundles` + `subscribeInstalled`）和 `latest`（`loadLatest`，`bundles` 变化后重查）。`installed = installedOf(bundles)` 交给现有视图；角标数 = `buildInstalledRows(...).updates.length`。
- `InstalledView` 的布局：
  - 顶部：标题、右上角开关（`role="switch"`，`aria-checked`）和说明文字。
  - 开关开启时显示地址输入框和「安装」按钮。
  - 三组列表：有新版本 / 其他 / DSH 自带。
- 每行内容：`PluginIcon`（目录里有就用目录的），标题、包名、版本，以及以下操作：

  | 行 | 操作 |
  |---|---|
  | 有更新 | 「{current} → {latest}」+「更新」→ `onOpenPackage` |
  | `self` 且有更新 | 「更新」→ `onSelfUpdate(selfUpdateOf(...))` |
  | `check: 'not-npm'` | 灰字「来源不是 npm，无法检查更新」 |
  | 非 official、非 self、非 missing | 启用开关 → `setEnabled` |
  | 非 official、非 self 且 `removable` | 「卸载」→ `ConfirmRemove` → `remove` |
  | 所有行 | 「设置」→ `onOpenPackage` |

- 一次操作的结果显示在该行下方：`restart-required` 显示「重启 DSH 后生效」；失败显示错误原文；`applied` 不显示，等 `plugin-manager/changed` 刷新。
- `ConfirmRemove` 复用 `ConfirmInstall` 的弹窗样式和 Esc 处理；确认按钮用危险色（新增 `.ps-btn-danger`）。
- 地址安装：`inspect(spec)` 返回 `ok` → `onInstallSpec({ spec, title: name, version })`；返回 `refused` → 在输入框下显示 `reason`。
- 新增语言键：`navInstalled installedTitle groupUpdates groupOthers groupOfficial updateArrow updateAction settings enabledLabel remove removeTitle removeBody restartRequired notNpm keepOnly keepOnlyHint installFromSpec installFromSpecPlaceholder installFromSpecAction bundlesFailed`。中文按 Global Constraints 的原文；英文对应翻译。删除 `handoff`、`panelInstall` 等不再使用的键（用 grep 确认没有引用）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm run build && node --test tests/store-app.test.mjs tests/installed-view.test.mjs tests/ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/client locale tests lib
git commit -m "Installed page: updates, enable, uninstall, settings, keep-only switch"
```

---

### Task 5: client.ts 接线

**Files:**
- Modify: `src/client.ts`
- Delete: `src/client/handoff.ts`、`src/client/ui/HandoffToast.tsx`、`tests/handoff.test.mjs`，以及 `scripts/build.mjs` 里的 `handoff` 测试入口
- Test: 无新增单元测试（这里全是 DSH 上下文接线）；Step 4 做实机验证

**Interfaces:**
- Consumes: Task 3 的 `createKeepOnly`、`injectHideStyle`、`selectTabByLabel`、`selectTabWhenReady`、`PLUGINS_PANEL_ID`；Task 4 的 `StoreAppProps` / `StoreServices`

- [ ] **Step 1: 改写 `apply`**

- 删掉：`StorePanel`、`Notice`、`shell.overlay` 注册、`createHandoff`、`openInstalledFrom`、`handOver`。
- `services` 的写法：

  | 服务 | 实现 |
  |---|---|
  | `loadBundles` | `installedFrom(await ctx.remote.pluginManager.listBundles())` |
  | `loadLatest` | `api.loadLatest()` |
  | `setEnabled` | `changeOutcome(await ctx.remote.pluginManager.setBundleEnabled(name, enabled))` |
  | `remove` | `changeOutcome(await ctx.remote.pluginManager.removeBundle(name))` |
  | `inspect` | `ctx.remote.pluginManager.inspect(spec)`，把 `accepted` / `refused` 映射成 Task 4 的形状；远程调用失败也算 `refused`，`reason` 用错误文字 |

- `StoreTab` 的 props：
  - `onOpenPackage = props.openPackage`
  - `onInstallSpec = t => props.install(t)`
  - `keepOnly` 用 `useSyncExternalStore(keepOnly.subscribe, keepOnly.get)`
- 占位面板：保留 `main` 注册 `key: PANEL_ID`，组件返回 `null`。同时订阅 `ctx.layout.panelInfo`：`activePanelId === PANEL_ID` 时，`queueMicrotask` 里执行 `ctx.layout.selectPanel(PLUGINS_PANEL_ID)` 和 `void selectTabWhenReady(() => document, t('tab'))`。
- 按开关注册的东西：用 `keepOnly.subscribe` 驱动，每次切换先撤掉上一组 disposer。

  | 开关 | 注册 |
  |---|---|
  | 关 | `sidebar.panellist`：`{ id: PANEL_ID, order: 1 }` + `StoreIcon` |
  | 开 | `sidebar.panellist`：`{ id: PLUGINS_PANEL_ID, order: 0, priority: -1 }` + `StoreIcon`；`injectHideStyle()`；一个 `MutationObserver` |

  `MutationObserver` 的规则：
  - 观察 `document.body`，参数 `{ subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected'] }`。
  - 回调用 `requestAnimationFrame` 合并，再检查：`ctx.layout.panelInfo.getSnapshot().activePanelId === 'plugins'` 时执行 `selectTabByLabel(document, t('tab'))`。官方标签栏只在列表视图渲染，所以官方插件自己的页面不会被切走。

  所有注册都挂在 `ctx.effect` 上，插件停用时全部撤掉。
- 首次运行：`shouldAutoOpen` 为真时，执行 `ctx.layout.selectPanel(PLUGINS_PANEL_ID)` 和 `selectTabWhenReady(() => document, t('tab'))`。
- 文件头注释改成新结构。删除 handoff 相关文件。

- [ ] **Step 2: 构建、类型检查、全量测试**

Run: `npm run build && npm run typecheck && npm test`
Expected: 全部 PASS，构建纯净检查不报错

- [ ] **Step 3: 提交**

```bash
git add -A src lib tests scripts
git commit -m "client: one entry on the Plugins page, keep-only mode"
```

- [ ] **Step 4: 实机验证（DSH 桌面版，用本地 `lib/` 安装）**

逐项记录结果：

| 场景 | 期望 |
|---|---|
| 开关关，点侧边栏「生态家园」 | 打开插件页并停在「生态家园」标签，无空白页 |
| 开关关，点官方「插件」 | 停在官方「已安装」 |
| 开开关 | 侧边栏只剩「生态家园」；插件页没有官方标题和标签栏；关开关立即恢复 |
| 开关开，点「设置」 | 进入官方该插件页面，不被切走；返回后回到「生态家园」 |
| 开关开，从地址安装 `github:yang051211/dsh-startide#v0.2.1` | 官方对话框打开；装完回到「生态家园」 |
| 停用 / 启用 / 卸载一个第三方插件 | 列表刷新；卸载前有确认 |
| 「更新」按钮 | 打开官方页面里这个插件的页面 |
| Host `pluginManager` 不可用（若无法构造则记录「未验证」） | 目录照常；不在目录里的插件没有更新信息 |
| 停用生态家园 | 官方「插件」入口回来，样式被移除 |

---

### Task 6: 文档、版本、校验

**Files:**
- Modify: `package.json`（`version: "0.3.0"`）、`market/index.json`（经 `npm run directory:build`）
- Modify: `README.md`、`README.en.md`、`src/client/ui/About.tsx` 及相关语言键（入口位置、「已安装」页、开关说明；删掉整页面板的描述）

- [ ] **Step 1: 改版本和文档**，然后跑 `npm run directory:build`

- [ ] **Step 2: 校验**

Run: `git add -A && npm run verify`
Expected: `lib/` 与 `src/` 一致，`directory:check` 通过，全部测试 PASS

- [ ] **Step 3: 提交**

```bash
git commit -m "v0.3.0: Plugins hub"
```

发版（打 tag、推送、清 jsDelivr 缓存）不在本计划内，完成后先向用户报告，等确认。
