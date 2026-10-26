import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { localize, buildCatalog, searchPlugins, sortPlugins, pageOf, installStateOf, installedFrom, selfUpdateOf } from '../lib/test/model.js'

const INDEX_URL = 'https://cdn.example/gh/o/r@main/market/index.json'
const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/directory/index.json', import.meta.url), 'utf8'))
const snapshot = (index = fixture(), compatibility = { 'dsh-qq-bridge': 'incompatible' }) => ({ index, indexUrl: INDEX_URL, stale: false, dshVersion: '0.2.1-rc.2', compatibility })
const names = plugins => plugins.map(p => p.name)

test('localize falls back from the requested language to zh, en, then any', () => {
  assert.equal(localize({ zh: '中', en: 'en' }, 'en-US'), 'en')
  assert.equal(localize({ zh: '中', en: 'en' }, 'ja'), '中')
  assert.equal(localize({ fr: 'fr' }, 'ja'), 'fr')
  assert.equal(localize('plain', 'en'), 'plain')
  assert.equal(localize(null, 'zh'), '')
})

test('plugins carry the directory facts', () => {
  const catalog = buildCatalog(snapshot())
  const context = catalog.byName.get('dsh-context')
  assert.equal(context.title, 'Context')
  assert.equal(context.description, 'See what fills the context window')
  assert.equal(context.version, '1.0.0')
  assert.equal(context.category, 'memory')
  assert.deepEqual(context.stats, { stars: 3600, weeklyDownloads: 42000 })
  assert.deepEqual(context.permissions, { network: true, fileSystem: true, agentTools: false, childProcess: false, installScripts: false })
  assert.equal(context.icon, 'https://cdn.example/gh/o/r@main/market/icons/dsh-context.svg')
  assert.equal(catalog.byName.get('dsh-chat-toc').title, '对话目录')
  assert.equal(catalog.byName.get('dsh-ssh-ops').permissions, null, 'detection of an older version is not shown')
  assert.equal(catalog.byName.get('dsh-qq-bridge').compatibility, 'incompatible')
  assert.ok(catalog.byName.get('dsh-pet').created > 0)
  assert.equal(catalog.byName.get('dsh-pet').opaque, true)
  assert.equal(catalog.byName.get('dsh-cost-meter').scanFailed, true)
  assert.equal(context.opaque, false)
})

test('categories follow the published order, keep "other", and drop empty ones', () => {
  const ids = buildCatalog(snapshot()).categories.map(c => c.id)
  assert.deepEqual(ids, ['im', 'cost', 'memory', 'ops', 'fun', 'ui', 'other'])
})

test('sorting: popular, recently updated, newest, stars; unknown numbers last, name breaks ties', () => {
  const { plugins } = buildCatalog(snapshot())
  assert.deepEqual(names(sortPlugins(plugins, 'popular')).slice(0, 3), ['dsh-context', 'dsh-pet', 'dsh-cost-meter'])
  assert.deepEqual(names(sortPlugins(plugins, 'popular')).slice(-2), ['dsh-mystery', 'dsh-ssh-ops'])
  assert.deepEqual(names(sortPlugins(plugins, 'updated')).slice(0, 2), ['dsh-context', 'dsh-qq-bridge'])
  assert.deepEqual(names(sortPlugins(plugins, 'new')).slice(0, 2), ['dsh-qq-bridge', 'dsh-pet'])
  assert.deepEqual(names(sortPlugins(plugins, 'stars')).slice(0, 2), ['dsh-context', 'dsh-pet'])
  assert.deepEqual(names(sortPlugins(plugins, 'stars')).slice(-2), ['@ann/dsh-theme-night', 'dsh-mystery'])
  assert.notEqual(sortPlugins(plugins, 'new'), plugins, 'returns a new array')
})

test('pageOf cuts pages and clamps the page number', () => {
  const list = Array.from({ length: 65 }, (_, i) => i)
  assert.deepEqual(pageOf(list, 1, 30), { items: list.slice(0, 30), page: 1, pages: 3 })
  assert.deepEqual(pageOf(list, 3, 30).items, list.slice(60))
  assert.equal(pageOf(list, 9, 30).page, 3)
  assert.equal(pageOf(list, 0, 30).page, 1)
  assert.deepEqual(pageOf([], 1, 30), { items: [], page: 1, pages: 1 })
})

test('search matches name, title, description, keywords and author', () => {
  const catalog = buildCatalog(snapshot())
  assert.deepEqual(names(searchPlugins(catalog, '对话目录')), ['dsh-chat-toc'])
  assert.deepEqual(names(searchPlugins(catalog, 'SSH')), ['dsh-ssh-ops'])
  assert.deepEqual(names(searchPlugins(catalog, 'bo')), ['dsh-pet'], 'author')
  assert.ok(names(searchPlugins(catalog, 'token')).includes('dsh-context'), 'keyword')
  assert.equal(searchPlugins(catalog, '  ').length, catalog.plugins.length)
})

test('an index from before the directory still loads', () => {
  const old = { format: 1, title: { zh: '旧' }, metadata: { categories: { ui: { title: { zh: '界面' } } } }, plugins: [{
    name: 'dsh-old', title: { zh: '旧插件' }, description: { zh: '旧描述' }, metadata: { category: 'ui', keywords: [] }, 'dist-tags': { latest: '1.0.0' },
    versions: [{ version: '1.0.0', publishTimestamp: 1, source: { type: 'npm' } }],
    store: { tagline: { zh: '旧卖点' }, review: { version: '1.0.0', date: '2026-10-19' }, stats: { stars: 1, weeklyDownloads: 2, fetchedAt: 'x' }, permissions: { network: true, fileSystem: false, agentTools: false, childProcess: false, installScripts: false } },
  }], store: { sections: [], categoryOrder: ['ui'] } }
  const plugin = buildCatalog(snapshot(old, {})).byName.get('dsh-old')
  assert.equal(localize(plugin.title, 'zh'), '旧插件')
  assert.deepEqual(plugin.stats, { stars: 1, weeklyDownloads: 2 })
  assert.equal(plugin.created, 1, 'falls back to the version time')
})

test('install state', () => {
  const catalog = buildCatalog(snapshot())
  const pet = catalog.byName.get('dsh-pet')
  const qq = catalog.byName.get('dsh-qq-bridge')
  assert.equal(installStateOf(pet, new Map()), 'install')
  assert.equal(installStateOf(pet, new Map([['dsh-pet', { version: '1.0.0' }]])), 'installed')
  assert.equal(installStateOf(pet, new Map([['dsh-pet', { version: '0.9.0' }]])), 'update')
  assert.equal(installStateOf(qq, new Map()), 'incompatible')
})

test('installedFrom unwraps the Remote result and keeps installed bundles only', () => {
  // ctx.remote.pluginManager.listBundles() resolves to { ok, value }, not to the bare array.
  const map = installedFrom({ ok: true, value: [{ name: 'a', installed: true, version: '1.0.0' }, { name: 'b', installed: false }] })
  assert.deepEqual([...map.entries()], [['a', { version: '1.0.0' }]])
  assert.throws(() => installedFrom({ ok: false, error: new Error('plugin manager unavailable') }), /plugin manager unavailable/)
})

test('the store offers its own update only when the installed copy is older', () => {
  const installed = version => new Map([['dsh-plugin-store', version === undefined ? {} : { version }]])
  assert.deepEqual(selfUpdateOf('0.2.0', installed('0.1.8')), { current: '0.1.8', latest: '0.2.0', spec: 'github:yang051211/dsh-plugin-store#v0.2.0' })
  assert.equal(selfUpdateOf('0.2.0', installed('0.2.0')), null)
  assert.equal(selfUpdateOf('0.2.0', installed(undefined)), null)
  assert.equal(selfUpdateOf('0.2.0', new Map()), null)
  assert.equal(selfUpdateOf('0.2.0', null), null)
  assert.equal(selfUpdateOf(null, installed('0.1.8')), null)
  assert.equal(selfUpdateOf('0.2.0#evil', installed('0.1.8')), null)
  assert.equal(buildCatalog(snapshot()).storeVersion, '0.2.0')
})
