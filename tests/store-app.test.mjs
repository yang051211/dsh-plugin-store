import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { StoreApp, ErrorBoundary, makeTranslate, navigate, goBack, scrollParentOf } from '../lib/test/ui.js'

const { act } = TestRenderer
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// The confirm dialog listens for Escape on window; Node has no window, so give it an event target.
globalThis.window ??= new EventTarget()
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const zh = read('locale/zh.json').ui
const t = makeTranslate(key => zh[key] ?? key)
const snapshot = () => ({ index: read('market/index.json'), indexUrl: 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json', stale: false, dshVersion: '0.2.1-rc.2', compatibility: {} })

function deferred() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const textOf = root => JSON.stringify(root.toJSON())

function services(overrides = {}) {
  return {
    loadCatalog: async () => snapshot(),
    loadDetail: async name => read(`market/plugins/${name}.json`),
    loadInstalled: async () => new Map(),
    subscribeInstalled: () => () => {},
    ...overrides,
  }
}

test('a handed-over plugin opens the confirmation only when it is not installed', async () => {
  let installs = 0
  const render = async (installed) => {
    let root
    await act(async () => {
      root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadInstalled: async () => installed }), onInstall: () => { installs++ }, onOpenInstalled: () => {}, takePending: () => 'dsh-chat-toc' }))
    })
    await flush()
    return root
  }
  const fresh = await render(new Map())
  assert.ok(textOf(fresh).includes('继续安装'))
  const already = await render(new Map([['dsh-chat-toc', { version: '0.5.1' }]]))
  assert.equal(textOf(already).includes('继续安装'), false)
  assert.ok(textOf(already).includes('已安装'))
  assert.equal(installs, 0)
})

test('install buttons wait for the installed list', async () => {
  const gate = deferred()
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadInstalled: () => gate.promise }), onInstall: () => {}, onOpenInstalled: () => {} }))
  })
  await flush()
  const buttons = root.root.findAll(n => n.type === 'button' && n.props.className?.includes('ps-btn') && n.props.disabled === true)
  assert.ok(buttons.length >= 2, 'install buttons are disabled while the installed list loads')
  await act(async () => { gate.resolve(new Map()) })
  await flush()
  const enabled = root.root.findAll(n => n.type === 'button' && n.props.className?.includes('ps-btn-primary') && !n.props.disabled)
  assert.ok(enabled.length >= 2)
})

test('install buttons recover when the installed list cannot be read', async () => {
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadInstalled: async () => { throw new Error('no profile') } }), onInstall: () => {}, onOpenInstalled: () => {} }))
  })
  await flush()
  const enabled = root.root.findAll(n => n.type === 'button' && n.props.className?.includes('ps-btn-primary') && !n.props.disabled)
  assert.ok(enabled.length >= 2, 'a failed read must not leave every install button disabled forever')
})

test('a failed installed-list read is shown, not silently treated as nothing installed', async () => {
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadInstalled: async () => { throw new Error('no profile') } }), onInstall: () => {}, onOpenInstalled: () => {} }))
  })
  await flush()
  const notice = root.root.findAll(n => n.type === 'div' && n.props.className?.includes('ps-installed-unknown'))
  assert.equal(notice.length, 1, 'the store must say it could not read which plugins are installed')
})

test('retry after a failed load shows the new catalog', async () => {
  const first = deferred()
  const second = deferred()
  const queue = [first, second]
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadCatalog: () => queue.shift().promise }), onInstall: () => {}, onOpenInstalled: () => {} }))
  })
  // First load fails → error view with Retry; retry starts the second load.
  await act(async () => { first.resolve(Promise.reject(new Error('first failed'))) })
  await flush()
  const retry = root.root.find(n => n.type === 'button' && n.children.includes('重试'))
  const newer = snapshot(); newer.index.title = { zh: '新目录' }
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
    assert.ok(textOf(root).includes('商城出了点问题'))
    fail = false
    const retry = root.root.find(n => n.type === 'button' && n.children.includes('重试'))
    await act(async () => { retry.props.onClick() })
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
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadCatalog: withStoreVersion('0.1.4'), loadInstalled: async () => new Map([['dsh-plugin-store', { version: '0.1.3' }]]) }), onInstall: () => {}, onOpenInstalled: () => {}, onSelfUpdate: u => updates.push(u) }))
  })
  await flush()
  const [bar] = selfBar(root)
  assert.ok(bar, 'prompt shown')
  assert.ok(JSON.stringify(bar.children.map(c => c.props?.children ?? c)).includes('0.1.4'))
  await act(async () => { bar.findByType('button').props.onClick() })
  assert.deepEqual(updates, [{ current: '0.1.3', latest: '0.1.4', spec: 'github:yang051211/dsh-plugin-store#v0.1.4' }])
})

test('an up-to-date store shows no update prompt', async () => {
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadCatalog: withStoreVersion('0.1.4'), loadInstalled: async () => new Map([['dsh-plugin-store', { version: '0.1.4' }]]) }), onInstall: () => {}, onOpenInstalled: () => {}, onSelfUpdate: () => {} }))
  })
  await flush()
  assert.equal(selfBar(root).length, 0)
})

test('a self-update handed over from the panel goes straight to the installer in the tab', async () => {
  const updates = []
  let installs = 0
  await act(async () => {
    TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadCatalog: withStoreVersion('0.1.4'), loadInstalled: async () => new Map([['dsh-plugin-store', { version: '0.1.3' }]]) }), onInstall: () => { installs++ }, onOpenInstalled: () => {}, onSelfUpdate: u => updates.push(u), takePending: () => 'dsh-plugin-store' }))
  })
  await flush()
  assert.deepEqual(updates.map(u => u.spec), ['github:yang051211/dsh-plugin-store#v0.1.4'])
  assert.equal(installs, 0)
})

const withUsage = async () => {
  const s = snapshot()
  for (const p of s.index.plugins) p.store.usage = { where: { zh: `${p.name} 的入口` }, try: { zh: '试一句' } }
  return s
}
const installedNotice = root => root.root.findAll(n => n.type === 'div' && n.props.className?.includes('ps-installed-notice'))

test('a plugin installed while the store is open gets a how-to-use notice', async () => {
  let installed = new Map([['dsh-context', { version: '0.73.3' }]])
  let changed
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, { mode: 'tab', lang: 'zh', t, services: services({ loadCatalog: withUsage, loadInstalled: async () => installed, subscribeInstalled: fn => { changed = fn; return () => {} } }), onInstall: () => {}, onSelfUpdate: () => {}, onOpenInstalled: () => {} }))
  })
  await flush()
  assert.equal(installedNotice(root).length, 0, 'plugins already installed when the store opened get no notice')
  installed = new Map([...installed, ['dsh-chat-toc', { version: '0.5.1' }]])
  await act(async () => { changed() })
  await flush()
  const [notice] = installedNotice(root)
  assert.ok(notice, 'notice shown')
  const textIn = node => node.children.map(c => (typeof c === 'string' ? c : textIn(c))).join('')
  const text = textIn(notice)
  assert.ok(text.includes('dsh-chat-toc 的入口') && text.includes('试一句'), text)
  await act(async () => { notice.findByProps({ className: 'ps-link-btn' }).props.onClick() })
  assert.equal(installedNotice(root).length, 0, 'dismissed')
})
