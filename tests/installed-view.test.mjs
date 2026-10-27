import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { StoreApp, makeTranslate } from '../lib/test/ui.js'

const { act } = TestRenderer
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.window ??= new EventTarget()
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const zh = read('locale/zh.json').ui
const t = makeTranslate(key => zh[key] ?? key)
const snapshot = (storeVersion) => {
  const index = read('tests/fixtures/directory/index.json')
  if (storeVersion) index.store.self = { version: storeVersion }
  return { index, indexUrl: 'https://cdn.example/gh/o/r@main/market/index.json', stale: false, dshVersion: '0.2.1-rc.2', compatibility: {} }
}
const bundle = (name, version, extra = {}) => ({
  name, version, installed: true, enabled: true, official: false, availability: 'profile', removable: true, source: `${name}@^${version}`, ...extra,
})
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const textIn = node => (typeof node === 'string' ? node : (node.children ?? []).map(textIn).join(''))

/** Mount the store with `bundles` installed and open the Installed tab. */
async function open({ bundles = [], services = {}, storeVersion, ...props } = {}) {
  const calls = { openPackage: [], selfUpdate: [], install: [], installSpec: [], setEnabled: [], remove: [], inspect: [], keepOnly: [] }
  const all = {
    loadCatalog: async () => snapshot(storeVersion),
    loadDetail: async () => ({}),
    loadReadme: async () => ({ markdown: '', base: 'https://x/' }),
    loadBundles: async () => bundles,
    subscribeInstalled: () => () => {},
    loadLatest: async () => ({}),
    setEnabled: async (name, on) => { calls.setEnabled.push([name, on]); return 'applied' },
    remove: async name => { calls.remove.push(name); return 'applied' },
    inspect: async spec => { calls.inspect.push(spec); return { ok: false, reason: 'nope' } },
    ...services,
  }
  let root
  await act(async () => {
    root = TestRenderer.create(createElement(StoreApp, {
      lang: 'zh', t, services: all,
      onInstall: p => calls.install.push(p.name),
      onOpenPackage: name => calls.openPackage.push(name),
      onSelfUpdate: u => calls.selfUpdate.push(u.spec),
      onInstallSpec: target => calls.installSpec.push(target),
      keepOnly: { value: false, set: on => calls.keepOnly.push(on) },
      ...props,
    }))
  })
  await flush()
  await act(async () => { navButton(root).props.onClick() })
  await flush()
  return { root, calls }
}

const navButton = root => root.root.find(n => n.type === 'button' && n.parent?.type === 'nav' && textIn(n).startsWith(zh.navInstalled))
const row = (root, name) => root.root.find(n => n.props['data-name'] === name)
const rows = (root, group) => root.root.find(n => n.props['data-group'] === group).findAll(n => n.props['data-name'] !== undefined).map(n => n.props['data-name'])
const buttonIn = (node, label) => node.find(n => n.type === 'button' && textIn(n) === label)
const buttonsIn = (node, label) => node.findAll(n => n.type === 'button' && textIn(n) === label)
const switchIn = node => node.findAll(n => n.type === 'button' && n.props.role === 'switch')
async function click(node) { await act(async () => { node.props.onClick() }); await flush() }

test('the Installed tab shows a count of available updates, none when zero', async () => {
  const { root } = await open({ bundles: [bundle('dsh-pet', '0.9.0'), bundle('dsh-context', '1.0.0')] })
  assert.equal(textIn(navButton(root)), `${zh.navInstalled}1`)
  const none = await open({ bundles: [bundle('dsh-context', '1.0.0')] })
  assert.equal(textIn(navButton(none.root)), zh.navInstalled)
})

test('an update row shows "0.9.0 → 1.0.0" and its button opens the official page for that plugin', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-pet', '0.9.0')] })
  assert.deepEqual(rows(root, 'updates'), ['dsh-pet'])
  const pet = row(root, 'dsh-pet')
  assert.ok(textIn(pet).includes('0.9.0 → 1.0.0'), textIn(pet))
  await click(buttonIn(pet, zh.updateAction))
  assert.deepEqual(calls.openPackage, ['dsh-pet'])
  assert.deepEqual(calls.install, [])
})

test('an off-catalog npm plugin takes its latest version from the Host lookup', async () => {
  const { root } = await open({ bundles: [bundle('off-catalog', '1.0.0')], services: { loadLatest: async () => ({ 'off-catalog': '1.2.0' }) } })
  assert.deepEqual(rows(root, 'updates'), ['off-catalog'])
  assert.ok(textIn(row(root, 'off-catalog')).includes('1.0.0 → 1.2.0'))
})

test('the store itself has no switch or uninstall; its update button asks for the self-update', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-startide', '0.2.0', { source: 'github:yang051211/dsh-startide#v0.2.0' })], storeVersion: '0.3.0' })
  const self = row(root, 'dsh-startide')
  assert.equal(switchIn(self).length, 0)
  assert.equal(buttonsIn(self, zh.remove).length, 0)
  assert.equal(textIn(self).includes(zh.notNpm), false)
  await click(buttonIn(self, zh.updateAction))
  assert.deepEqual(calls.selfUpdate, ['github:yang051211/dsh-startide#v0.3.0'])
  assert.deepEqual(calls.openPackage, [])
})

test('official plugins are listed apart, with settings only', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-builtin', '1.0.0', { official: true, removable: false })] })
  assert.deepEqual(rows(root, 'official'), ['dsh-builtin'])
  const builtin = row(root, 'dsh-builtin')
  assert.equal(switchIn(builtin).length, 0)
  assert.equal(buttonsIn(builtin, zh.remove).length, 0)
  assert.equal(buttonsIn(builtin, zh.updateAction).length, 0)
  await click(buttonIn(builtin, zh.settings))
  assert.deepEqual(calls.openPackage, ['dsh-builtin'])
})

test('a non-npm plugin says its updates cannot be checked', async () => {
  const { root } = await open({ bundles: [bundle('from-git', '1.0.0', { source: 'github:o/r' })] })
  assert.ok(textIn(row(root, 'from-git')).includes(zh.notNpm))
})

test('a missing plugin offers settings but no switch', async () => {
  const { root } = await open({ bundles: [bundle('lost', '1.0.0', { availability: 'missing' })] })
  assert.equal(switchIn(row(root, 'lost')).length, 0)
  assert.equal(buttonsIn(row(root, 'lost'), zh.settings).length, 1)
})

test('uninstall asks first with the official wording, then calls remove', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-pet', '1.0.0')] })
  await click(buttonIn(row(root, 'dsh-pet'), zh.remove))
  const dialog = root.root.find(n => n.props.role === 'dialog')
  assert.ok(textIn(dialog).includes('卸载「Pet」？'), textIn(dialog))
  assert.ok(textIn(dialog).includes(zh.removeBody))
  await click(buttonIn(dialog, zh.cancel))
  assert.deepEqual(calls.remove, [])
  assert.equal(root.root.findAll(n => n.props.role === 'dialog').length, 0)
  await click(buttonIn(row(root, 'dsh-pet'), zh.remove))
  await click(buttonIn(root.root.find(n => n.props.role === 'dialog'), zh.remove))
  assert.deepEqual(calls.remove, ['dsh-pet'])
})

test('a restart-required change says so; a failed one shows the error text', async () => {
  const { root } = await open({
    bundles: [bundle('dsh-pet', '1.0.0'), bundle('dsh-context', '1.0.0')],
    services: { setEnabled: async name => (name === 'dsh-pet' ? 'restart-required' : { error: 'profile locked' }) },
  })
  await click(switchIn(row(root, 'dsh-pet'))[0])
  assert.ok(textIn(row(root, 'dsh-pet')).includes(zh.restartRequired))
  await click(switchIn(row(root, 'dsh-context'))[0])
  assert.ok(textIn(row(root, 'dsh-context')).includes('profile locked'))
})

test('the switch calls setEnabled with the new state', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-pet', '1.0.0'), bundle('dsh-context', '1.0.0', { enabled: false })] })
  const [pet] = switchIn(row(root, 'dsh-pet'))
  assert.equal(pet.props['aria-checked'], true)
  await click(pet)
  await click(switchIn(row(root, 'dsh-context'))[0])
  assert.deepEqual(calls.setEnabled, [['dsh-pet', false], ['dsh-context', true]])
})

test('keep-only switch reflects and changes the preference', async () => {
  const off = await open()
  const toggle = off.root.root.find(n => n.props.className?.includes('ps-keep-only') && n.props.role === 'switch')
  assert.equal(toggle.props['aria-checked'], false)
  assert.ok(textIn(off.root.toJSON()).includes(zh.keepOnlyHint) || JSON.stringify(off.root.toJSON()).includes(zh.keepOnlyHint))
  await click(toggle)
  assert.deepEqual(off.calls.keepOnly, [true])
  const on = await open({ keepOnly: { value: true, set: () => {} } })
  assert.equal(on.root.root.find(n => n.props.className?.includes('ps-keep-only') && n.props.role === 'switch').props['aria-checked'], true)
})

const specInput = root => root.root.findAll(n => n.type === 'input' && n.props.className === 'ps-spec-input')

test('the address box shows only with keep-only on; it inspects, then installs with the inspected name and version', async () => {
  const off = await open()
  assert.equal(specInput(off.root).length, 0)
  const { root, calls } = await open({
    keepOnly: { value: true, set: () => {} },
    services: { inspect: async spec => { calls.inspect.push(spec); return { ok: true, name: 'dsh-x', version: '2.1.0' } } },
  })
  const [input] = specInput(root)
  await act(async () => { input.props.onChange({ target: { value: '  github:o/dsh-x  ' } }) })
  await click(buttonIn(root.root, zh.installFromSpecAction))
  assert.deepEqual(calls.inspect, ['github:o/dsh-x'])
  assert.deepEqual(calls.installSpec, [{ spec: 'github:o/dsh-x', title: 'dsh-x', version: '2.1.0' }])
})

test('a refused address shows the reason and does not install', async () => {
  const { root, calls } = await open({ keepOnly: { value: true, set: () => {} } })
  await act(async () => { specInput(root)[0].props.onChange({ target: { value: 'nope-pkg' } }) })
  await click(buttonIn(root.root, zh.installFromSpecAction))
  assert.deepEqual(calls.installSpec, [])
  assert.ok(JSON.stringify(root.toJSON()).includes('nope'))
})

test('a failed installed-list read shows the error and a retry, not an empty list', async () => {
  let fail = true
  const { root } = await open({ services: { loadBundles: async () => { if (fail) throw new Error('no profile'); return [bundle('dsh-pet', '1.0.0')] } } })
  const text = JSON.stringify(root.toJSON())
  assert.ok(text.includes(zh.bundlesFailed) && text.includes('no profile'), text)
  assert.equal(root.root.findAll(n => n.props['data-group'] !== undefined).length, 0)
  assert.equal(text.includes(zh.installedEmpty), false)
  fail = false
  await click(buttonIn(root.root, zh.retry))
  assert.deepEqual(rows(root, 'others'), ['dsh-pet'])
})
