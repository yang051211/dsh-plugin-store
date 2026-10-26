import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { StoreApp, ErrorBoundary, makeTranslate, navigate, goBack, scrollParentOf, tabOf } from '../lib/test/ui.js'

const { act } = TestRenderer
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// The confirm dialog listens for Escape on window; Node has no window, so give it an event target.
globalThis.window ??= new EventTarget()
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const zh = read('locale/zh.json').ui
const t = makeTranslate(key => zh[key] ?? key)
const snapshot = () => ({ index: read('tests/fixtures/directory/index.json'), indexUrl: 'https://cdn.example/gh/o/r@main/market/index.json', stale: false, dshVersion: '0.2.1-rc.2', compatibility: {} })

function deferred() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const textOf = root => JSON.stringify(root.toJSON())

function services(overrides = {}) {
  return {
    loadCatalog: async () => snapshot(),
    loadDetail: async name => read(`tests/fixtures/directory/plugins/${name.replace('@', '').replace('/', '__')}.json`),
    loadReadme: async name => ({ markdown: `# ${name} readme`, base: 'https://cdn.example/npm/x@1.0.0/' }),
    loadInstalled: async () => new Map(),
    subscribeInstalled: () => () => {},
    ...overrides,
  }
}
async function mount(props = {}) {
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services(props.services), onInstall: () => {}, onOpenInstalled: () => {}, onSelfUpdate: () => {}, ...props, services: services(props.services) }))
  })
  await flush()
  return root
}

const cards = root => root.root.findAll(n => n.type === 'button' && n.props.className === 'ps-card')
const installButtons = root => root.root.findAll(n => n.type === 'button' && n.props.className?.includes('ps-btn') && [zh.install, zh.installed].includes(n.children.join('')))
const tab = (root, label) => root.root.find(n => n.type === 'button' && n.parent?.type === 'nav' && n.parent.props.className === 'ps-nav' && n.children.join('') === label)
const currentTab = root => root.root.find(n => n.type === 'button' && n.props['aria-current'] === 'page').children.join('')
async function click(node) { await act(async () => { node.props.onClick() }); await flush() }

test('a handed-over plugin opens the confirmation only when it is not installed', async () => {
  let installs = 0
  const fresh = await mount({ onInstall: () => { installs++ }, takePending: () => 'dsh-pet' })
  assert.ok(textOf(fresh).includes('继续安装'))
  const already = await mount({ services: { loadInstalled: async () => new Map([['dsh-pet', { version: '1.0.0' }]]) }, takePending: () => 'dsh-pet' })
  assert.equal(textOf(already).includes('继续安装'), false)
  assert.equal(installs, 0)
})

test('cards have no install buttons; the plugin page has one, disabled until the installed list arrives', async () => {
  const gate = deferred()
  const root = await mount({ services: { loadInstalled: () => gate.promise } })
  assert.ok(cards(root).length >= 8)
  assert.equal(installButtons(root).length, 0)
  await click(cards(root)[0])
  const [waiting] = installButtons(root)
  assert.equal(waiting.props.disabled, true)
  await act(async () => { gate.resolve(new Map()) })
  await flush()
  assert.equal(installButtons(root)[0].props.disabled, false)
})

test('the install button recovers when the installed list cannot be read, and the failure is shown', async () => {
  const root = await mount({ services: { loadInstalled: async () => { throw new Error('no profile') } } })
  assert.equal(root.root.findAll(n => n.type === 'div' && n.props.className?.includes('ps-installed-unknown')).length, 1)
  await click(cards(root)[0])
  const [button] = installButtons(root)
  assert.equal(button.children.join(''), zh.install)
  assert.equal(button.props.disabled, false)
})

test('the plugin page loads its README through the services', async () => {
  const asked = []
  const root = await mount({ services: { loadReadme: async name => { asked.push(name); return { markdown: '# Hi from readme', base: 'https://x/' } } } })
  await click(cards(root)[0])
  assert.deepEqual(asked, ['dsh-context'])
  assert.ok(textOf(root).includes('Hi from readme'))
})

test('the nav has home, all plugins and about, and each tab starts its page over', async () => {
  const root = await mount()
  const labels = root.root.find(n => n.type === 'nav' && n.props.className === 'ps-nav').findAllByType('button').map(b => b.children.join(''))
  assert.deepEqual(labels, [zh.navHome, zh.navAll, zh.navAbout])
  assert.equal(currentTab(root), zh.navHome)
  await click(tab(root, zh.navAll))
  assert.ok(textOf(root).includes('ps-side'))
  await click(tab(root, zh.navAbout))
  assert.ok(textOf(root).includes(zh.faqWhat))
  assert.equal(currentTab(root), zh.navAbout)
})

test('"see all" from a home section opens the list with that order', async () => {
  const root = await mount()
  const [, updatedMore] = root.root.findAll(n => n.type === 'button' && n.props.className === 'ps-more')
  await click(updatedMore)
  const select = root.root.find(n => n.type === 'select')
  assert.equal(select.props.value, 'updated')
  assert.equal(currentTab(root), zh.navAll)
})

test('list sort, page and "compatible only" survive opening a plugin and coming back', async () => {
  const root = await mount()
  await click(tab(root, zh.navAll))
  await act(async () => { root.root.find(n => n.type === 'select').props.onChange({ target: { value: 'new' } }) })
  await act(async () => { root.root.find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } }) })
  await click(cards(root)[0])
  await click(root.root.find(n => n.type === 'button' && n.props.className === 'ps-back'))
  assert.equal(root.root.find(n => n.type === 'select').props.value, 'new')
  assert.equal(root.root.find(n => n.type === 'input' && n.props.type === 'checkbox').props.checked, true)
})

test('tabOf files every view under its tab', () => {
  assert.equal(tabOf({ view: 'home' }), 'home')
  assert.equal(tabOf({ view: 'about' }), 'about')
  assert.equal(tabOf({ view: 'list', filter: { kind: 'category', id: 'ui' } }), 'all')
  assert.equal(tabOf({ view: 'list', filter: { kind: 'search', query: 'x' } }), 'all')
  assert.equal(tabOf({ view: 'detail', name: 'x' }), 'all')
})

test('retry after a failed load shows the new catalog', async () => {
  const first = deferred()
  const second = deferred()
  const queue = [first, second]
  const root = await mount({ services: { loadCatalog: () => queue.shift().promise } })
  await act(async () => { first.resolve(Promise.reject(new Error('first failed'))) })
  await flush()
  const retry = root.root.find(n => n.type === 'button' && n.children.includes('重试'))
  const newer = snapshot(); for (const plugin of newer.index.plugins) plugin.title = '新目录'
  await act(async () => { retry.props.onClick() })
  await act(async () => { second.resolve(newer) })
  await flush()
  assert.ok(textOf(root).includes('新目录'))
})

test('error boundary retry renders the children again', async () => {
  let fail = true
  const Child = () => { if (fail) throw new Error('boom'); return createElement('p', null, 'recovered') }
  const original = console.error
  console.error = () => {}
  let root
  try {
    await act(async () => { root = TestRenderer.create(createElement(ErrorBoundary, { t, children: createElement(Child) })) })
    assert.ok(textOf(root).includes('生态家园出了点问题'))
    fail = false
    await act(async () => { root.root.find(n => n.type === 'button' && n.children.includes('重试')).props.onClick() })
    assert.ok(textOf(root).includes('recovered'))
  } finally {
    console.error = original
  }
})

test('navigate remembers the scroll position and back restores it', () => {
  let stack = [{ view: { view: 'home' }, scroll: 0 }]
  stack = navigate(stack, { view: 'detail', name: 'a' }, 480)
  assert.deepEqual(stack.map(s => s.scroll), [480, 0])
  const { stack: after, restore } = goBack(stack)
  assert.equal(after.length, 1)
  assert.equal(restore, 480)
  assert.deepEqual(goBack(after), { stack: after, restore: null })
})

test('scrollParentOf finds the nearest scrolling ancestor', () => {
  const page = { scrollHeight: 2000, clientHeight: 800, parentElement: null }
  const wrapper = { scrollHeight: 2000, clientHeight: 2000, parentElement: page }
  const root = { scrollHeight: 2000, clientHeight: 2000, parentElement: wrapper }
  const styles = new Map([[page, 'auto'], [wrapper, 'visible'], [root, 'visible']])
  assert.equal(scrollParentOf(root, el => styles.get(el)), page)
  assert.equal(scrollParentOf({ scrollHeight: 10, clientHeight: 10, parentElement: null }, () => 'visible'), null)
})

const withStoreVersion = version => async () => { const s = snapshot(); s.index.store.self = { version }; return s }
const selfBar = root => root.root.findAll(n => n.type === 'div' && n.props.className?.includes('ps-self-update'))

test('an older installed store shows the update prompt, and its button asks for the new version', async () => {
  const updates = []
  const root = await mount({ services: { loadCatalog: withStoreVersion('0.2.0'), loadInstalled: async () => new Map([['dsh-plugin-store', { version: '0.1.8' }]]) }, onSelfUpdate: u => updates.push(u) })
  const [bar] = selfBar(root)
  assert.ok(bar)
  await act(async () => { bar.findByType('button').props.onClick() })
  assert.deepEqual(updates, [{ current: '0.1.8', latest: '0.2.0', spec: 'github:yang051211/dsh-plugin-store#v0.2.0' }])
  const upToDate = await mount({ services: { loadCatalog: withStoreVersion('0.2.0'), loadInstalled: async () => new Map([['dsh-plugin-store', { version: '0.2.0' }]]) } })
  assert.equal(selfBar(upToDate).length, 0)
})

test('a self-update handed over from the panel goes straight to the installer in the tab', async () => {
  const updates = []
  let installs = 0
  await mount({ services: { loadCatalog: withStoreVersion('0.2.0'), loadInstalled: async () => new Map([['dsh-plugin-store', { version: '0.1.8' }]]) }, onInstall: () => { installs++ }, onSelfUpdate: u => updates.push(u), takePending: () => 'dsh-plugin-store' })
  assert.deepEqual(updates.map(u => u.spec), ['github:yang051211/dsh-plugin-store#v0.2.0'])
  assert.equal(installs, 0)
})

const installedNotice = root => root.root.findAll(n => n.type === 'div' && n.props.className?.includes('ps-installed-notice'))

test('a plugin installed while the store is open gets a notice pointing to the Plugins page', async () => {
  let installed = new Map([['dsh-context', { version: '1.0.0' }]])
  let changed
  const root = await mount({ services: { loadInstalled: async () => installed, subscribeInstalled: fn => { changed = fn; return () => {} } } })
  assert.equal(installedNotice(root).length, 0, 'plugins installed before the store opened get no notice')
  installed = new Map([...installed, ['dsh-pet', { version: '1.0.0' }]])
  await act(async () => { changed() })
  await flush()
  const [notice] = installedNotice(root)
  assert.ok(notice)
  const textIn = node => node.children.map(c => (typeof c === 'string' ? c : textIn(c))).join('')
  const text = textIn(notice)
  assert.ok(text.includes('Pet') && text.includes(zh.installedHint), text)
  await act(async () => { notice.findByProps({ className: 'ps-link-btn' }).props.onClick() })
  assert.equal(installedNotice(root).length, 0)
})
