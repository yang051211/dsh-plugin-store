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
  const calls = { openPackage: [], selfUpdate: [], install: [], installSpec: [], setEnabled: [], remove: [], inspect: [], keepOnly: [], update: [] }
  const all = {
    loadCatalog: async () => snapshot(storeVersion),
    loadDetail: async () => ({}),
    loadReadme: async () => ({ markdown: '', base: 'https://x/' }),
    loadBundles: async () => bundles,
    subscribeInstalled: () => () => {},
    loadLatest: async () => ({}),
    setEnabled: async (name, on) => { calls.setEnabled.push([name, on]); return 'applied' },
    remove: async name => { calls.remove.push(name); return 'applied' },
    update: async (name, version) => { calls.update.push([name, version]); return 'restart-required' },
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

const tabButton = (root, label) => root.root.find(n => n.type === 'button' && n.parent?.type === 'nav' && textIn(n).startsWith(label))
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

test('an update row shows "0.9.0 → 1.0.0"; its button asks first, then updates in the store', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-pet', '0.9.0')] })
  assert.deepEqual(rows(root, 'updates'), ['dsh-pet'])
  const pet = row(root, 'dsh-pet')
  assert.ok(textIn(pet).includes('0.9.0 → 1.0.0'), textIn(pet))
  await click(buttonIn(pet, zh.updateAction))
  const dialog = root.root.find(n => n.props.role === 'dialog')
  for (const part of ['更新「Pet」', '0.9.0 → 1.0.0', zh.confirmTrust]) assert.ok(textIn(dialog).includes(part), part)
  await click(buttonIn(dialog, zh.cancel))
  assert.deepEqual(calls.update, [])
  await click(buttonIn(row(root, 'dsh-pet'), zh.updateAction))
  await click(buttonIn(root.root.find(n => n.props.role === 'dialog'), zh.updateConfirm))
  assert.deepEqual(calls.update, [['dsh-pet', '1.0.0']])
  assert.deepEqual([calls.openPackage, calls.install], [[], []], 'neither the official page nor the install dialog')
  assert.ok(textIn(row(root, 'dsh-pet')).includes('已装好 v1.0.0，重启 DSH 后生效'), textIn(row(root, 'dsh-pet')))
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
  assert.deepEqual(calls.selfUpdate, ['https://registry.npmjs.org/dsh-startide/-/dsh-startide-0.3.0.tgz'])
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
  assert.deepEqual(calls.installSpec, [], 'nothing installs before the confirmation')
  const dialog = root.root.find(n => n.props.role === 'dialog')
  const text = textIn(dialog)
  for (const part of ['dsh-x', '2.1.0', 'github:o/dsh-x', zh.confirmTrust]) assert.ok(text.includes(part), part)
  await click(buttonIn(dialog, zh.cancel))
  assert.deepEqual(calls.installSpec, [])
  await click(buttonIn(root.root, zh.installFromSpecAction))
  await click(buttonIn(root.root.find(n => n.props.role === 'dialog'), zh.continue))
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

test('an uninstall that needs a restart says so even after its row is gone', async () => {
  let list = [bundle('dsh-pet', '1.0.0')]
  let changed = () => {}
  const { root } = await open({
    services: {
      loadBundles: async () => list,
      subscribeInstalled: fn => { changed = fn; return () => {} },
      remove: async () => { list = []; changed(); return 'restart-required' },
    },
  })
  await click(buttonIn(row(root, 'dsh-pet'), zh.remove))
  await click(buttonIn(root.root.find(n => n.props.role === 'dialog'), zh.remove))
  assert.equal(root.root.findAll(n => n.props['data-name'] === 'dsh-pet').length, 0)
  const text = JSON.stringify(root.toJSON())
  assert.ok(text.includes('Pet') && text.includes(zh.restartRequired), text)
})

test('a read-only or failed bundle has its switch locked and shows its problem', async () => {
  const { root } = await open({ bundles: [
    bundle('locked', '1.0.0', { readOnlyReason: 'management-required' }),
    bundle('broken', '1.0.0', { enabled: false, error: { code: 'operation-error', diagnostic: 'load failed' } }),
  ] })
  assert.equal(switchIn(row(root, 'locked'))[0].props.disabled, true)
  assert.equal(switchIn(row(root, 'broken'))[0].props.disabled, true)
  assert.ok(textIn(row(root, 'broken')).includes('load failed'))
})

test('a missing plugin is left to DSH: settings only, no uninstall', async () => {
  const { root } = await open({ bundles: [bundle('lost', '1.0.0', { availability: 'missing' })] })
  assert.equal(buttonsIn(row(root, 'lost'), zh.remove).length, 0)
})

const confirmUpdate = async root => {
  await click(buttonIn(row(root, 'dsh-pet'), zh.updateAction))
  await click(buttonIn(root.root.find(n => n.props.role === 'dialog'), zh.updateConfirm))
}

test('an update that left the plugin disabled says so; one that put the old version back and needs a restart says that too', async () => {
  const disabled = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: async () => ({ error: 'in use', code: 'bundle-in-use', disabled: true }) } })
  await confirmUpdate(disabled.root)
  assert.ok(textIn(row(disabled.root, 'dsh-pet')).includes(zh.updateLeftDisabled), textIn(row(disabled.root, 'dsh-pet')))
  const restart = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: async () => ({ error: 'no such version', code: 'restored', version: '0.9.0', restart: true }) } })
  await confirmUpdate(restart.root)
  assert.ok(textIn(row(restart.root, 'dsh-pet')).includes(zh.restartRequired), textIn(row(restart.root, 'dsh-pet')))
})

test('an update whose outcome is unknown says to check the Plugins page', async () => {
  const { root } = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: async () => ({ error: 'gone', code: 'unknown' }) } })
  await confirmUpdate(root)
  assert.ok(textIn(row(root, 'dsh-pet')).includes(zh.updateUnknown.split('{')[0]), textIn(row(root, 'dsh-pet')))
})

test('an update keeps its state across a tab switch: it shows as running, cannot start twice, and its outcome still shows', async () => {
  let finish
  const { root, calls } = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: (...args) => { calls.update.push(args); return new Promise(resolve => { finish = resolve }) } } })
  await confirmUpdate(root)
  await click(tabButton(root, zh.navHome))
  await click(tabButton(root, zh.navInstalled))
  const button = buttonIn(row(root, 'dsh-pet'), zh.updating)
  assert.equal(button.props.disabled, true)
  await click(tabButton(root, zh.navHome))
  await act(async () => { finish({ error: 'registry down', code: 'lost' }) })
  await click(tabButton(root, zh.navInstalled))
  assert.equal(calls.update.length, 1)
  assert.ok(textIn(root.root).includes('请到插件页重新安装'), 'the outcome shows after the page comes back')
})

test('an update whose new version needs install scripts approved names them', async () => {
  const { root } = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: async () => ({ error: 'pnpm said a lot', code: 'operation-error', pendingBuilds: ['esbuild', 'sharp'] }) } })
  await confirmUpdate(root)
  const text = textIn(row(root, 'dsh-pet'))
  assert.ok(text.includes('esbuild、sharp') && !text.includes('pnpm said a lot'), text)
})

test('a long failure is cut short under its row', async () => {
  const { root } = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: async () => ({ error: 'x'.repeat(2000) }) } })
  await confirmUpdate(root)
  assert.ok(textIn(row(root, 'dsh-pet')).length < 600)
})

test('an uninstall DSH refuses while the plugin runs says how to get there', async () => {
  const { root } = await open({ bundles: [bundle('dsh-pet', '1.0.0')], services: { remove: async () => ({ error: 'stop-profile', code: 'stop-profile' }) } })
  await click(buttonIn(row(root, 'dsh-pet'), zh.remove))
  await click(buttonIn(root.root.find(n => n.props.role === 'dialog'), zh.remove))
  assert.ok(textIn(row(root, 'dsh-pet')).includes(zh.removeNeedsStop))
})

test('an update that fell back to the old version says so, with the reason', async () => {
  const { root, calls } = await open({ bundles: [bundle('dsh-pet', '0.9.0', { enabled: false })], services: { update: async (...args) => { calls.update.push(args); return { error: 'no such version', code: 'restored', version: '0.9.0' } } } })
  await confirmUpdate(root)
  assert.deepEqual(calls.update[0].slice(0, 3), ['dsh-pet', '1.0.0', { current: '0.9.0', enabled: false }])
  const text = textIn(row(root, 'dsh-pet'))
  assert.ok(text.includes('已装回 v0.9.0') && text.includes('no such version'), text)
})

test('an update that lost the plugin says to reinstall it', async () => {
  const { root } = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: async () => ({ error: 'registry down', code: 'lost' }) } })
  await confirmUpdate(root)
  assert.ok(textIn(row(root, 'dsh-pet')).includes('请到插件页重新安装'))
})

test('a row stays put while its update uninstalls and reinstalls it', async () => {
  let list = [bundle('dsh-pet', '0.9.0')]
  let changed = () => {}
  let finish
  const { root } = await open({
    services: {
      loadBundles: async () => list,
      subscribeInstalled: fn => { changed = fn; return () => {} },
      update: () => { list = []; changed(); return new Promise(resolve => { finish = resolve }) },
    },
  })
  await confirmUpdate(root)
  const pet = row(root, 'dsh-pet')
  assert.ok(textIn(pet).includes(zh.updating), textIn(pet))
  list = [bundle('dsh-pet', '1.0.0')]
  await act(async () => { changed(); finish('applied') })
  await flush()
  assert.ok(textIn(row(root, 'dsh-pet')).includes('v1.0.0'))
})

test('an update behind another says it is waiting, then updating once its turn comes', async () => {
  let progress
  const { root } = await open({ bundles: [bundle('dsh-pet', '0.9.0')], services: { update: (name, version, from, report) => { progress = report; report('waiting'); return new Promise(() => {}) } } })
  await confirmUpdate(root)
  assert.ok(textIn(row(root, 'dsh-pet')).includes(zh.updateQueued), textIn(row(root, 'dsh-pet')))
  await act(async () => { progress('running') })
  assert.ok(textIn(row(root, 'dsh-pet')).includes(zh.updating))
})

test('an update under hot reload, which uninstalls and reinstalls, is not announced as a new install', async () => {
  let list = [bundle('dsh-pet', '0.9.0')]
  let changed = () => {}
  const { root } = await open({
    services: {
      loadBundles: async () => list,
      subscribeInstalled: fn => { changed = fn; return () => {} },
      update: async () => {
        list = []; changed(); await new Promise(r => setTimeout(r, 0))
        list = [bundle('dsh-pet', '1.0.0')]; changed(); await new Promise(r => setTimeout(r, 0))
        return 'applied'
      },
    },
  })
  await confirmUpdate(root)
  await flush()
  assert.ok(!textIn(root.root).includes(zh.installedHint), textIn(root.root))
})
