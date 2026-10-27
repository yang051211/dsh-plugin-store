import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildCatalog, isRegistrySpec, buildInstalledRows, changeOutcome, installedFrom, installedOf } from '../lib/test/model.js'

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/directory/index.json', import.meta.url), 'utf8'))
const catalog = buildCatalog({ index: fixture(), indexUrl: 'https://cdn.example/gh/o/r@main/market/index.json', stale: false, dshVersion: '0.2.1-rc.2', compatibility: {} })
const bundle = (name, version, extra = {}) => ({
  name, version, installed: true, enabled: true, official: false, availability: 'profile', removable: true, source: `${name}@^${version}`, ...extra,
})

test('a registry spec is name@range; git, paths, tarballs and aliases are not', () => {
  assert.equal(isRegistrySpec('dsh-pet', 'dsh-pet@^1.2.0'), true)
  assert.equal(isRegistrySpec('@a/b', '@a/b@1.0.0'), true)
  assert.equal(isRegistrySpec('dsh-pet', 'dsh-pet'), true)
  for (const source of [undefined, 'dsh-pet@', 'github:o/r#v1', 'git+https://x/y.git', 'C:/plugins/pet', '/abs/pet', 'https://x/p.tgz', 'dsh-pet@npm:other@1', 'other@1.0.0'])
    assert.equal(isRegistrySpec('dsh-pet', source), false, String(source))
})

test('rows: updates first, official apart, the rest under others', () => {
  const rows = buildInstalledRows([
    bundle('dsh-pet', '0.9.0'), // the directory lists 1.0.0
    bundle('dsh-context', '9.9.9'), // the directory is older
    bundle('off-catalog', '1.0.0'), // the registry says 2.0.0
    bundle('from-git', '1.0.0', { source: 'github:o/r' }),
    bundle('dsh-builtin', '1.0.0', { official: true }),
  ], catalog, { 'off-catalog': '2.0.0' }, 'zh')
  assert.deepEqual(rows.updates.map(r => [r.name, r.version, r.latest, r.check]), [['off-catalog', '1.0.0', '2.0.0', 'registry'], ['dsh-pet', '0.9.0', '1.0.0', 'catalog']], 'sorted by title: off-catalog, Pet')
  assert.deepEqual(rows.others.map(r => r.name).sort(), ['dsh-context', 'from-git'])
  const git = rows.others.find(r => r.name === 'from-git')
  assert.deepEqual([git.check, git.latest], ['not-npm', null])
  assert.deepEqual(rows.official.map(r => r.name), ['dsh-builtin'])
  assert.equal(rows.updates[1].title, 'Pet', 'the directory title wins')
})

test('a title falls back from the directory to the bundle meta to the package name', () => {
  const rows = buildInstalledRows([
    bundle('meta-only', '1.0.0', { meta: { title: { en: 'Meta Title', zh: '元标题' } } }),
    bundle('bare', '1.0.0'),
  ], catalog, {}, 'zh')
  assert.deepEqual(rows.others.map(r => [r.name, r.title]).sort(), [['bare', 'bare'], ['meta-only', '元标题']])
})

test('a missing or invalid version never counts as an update', () => {
  const rows = buildInstalledRows([bundle('dsh-pet', undefined), bundle('dsh-chat-toc', 'next'), bundle('odd', '1.0.0')], catalog, { odd: 'latest' }, 'zh')
  assert.equal(rows.updates.length, 0)
  assert.equal(rows.others.length, 3)
})

test('the store itself is marked self; uninstalled bundles are dropped', () => {
  const rows = buildInstalledRows([bundle('dsh-startide', '0.3.0'), bundle('gone', '1.0.0', { installed: false })], catalog, {}, 'zh')
  assert.deepEqual([...rows.updates, ...rows.others].map(r => [r.name, r.self]), [['dsh-startide', true]])
})

test('a missing bundle is marked missing', () => {
  const rows = buildInstalledRows([bundle('lost', '1.0.0', { availability: 'missing' })], catalog, {}, 'zh')
  assert.equal(rows.others[0].missing, true)
})

test('installedFrom keeps installed bundles; installedOf maps them by name', () => {
  const bundles = installedFrom({ ok: true, value: [bundle('a', '1.0.0'), bundle('b', '1.0.0', { installed: false }), bundle('c', undefined)] })
  assert.deepEqual(bundles.map(b => b.name), ['a', 'c'])
  assert.deepEqual([...installedOf(bundles).entries()], [['a', { version: '1.0.0' }], ['c', {}]])
  assert.throws(() => installedFrom({ ok: false, error: new Error('plugin manager unavailable') }), /plugin manager unavailable/)
})

test('change outcome: applied, restart required, or the error text', () => {
  assert.equal(changeOutcome({ ok: true, value: { application: 'applied' } }), 'applied')
  assert.equal(changeOutcome({ ok: true, value: { application: 'restart-required' } }), 'restart-required')
  assert.deepEqual(changeOutcome({ ok: true, value: { application: 'failed', error: { message: 'boom' } } }), { error: 'boom' })
  assert.deepEqual(changeOutcome({ ok: true, value: { application: 'cancelled' } }), { error: 'cancelled' })
  assert.deepEqual(changeOutcome({ ok: false, error: new Error('offline') }), { error: 'offline' })
  assert.deepEqual(changeOutcome({ ok: false, error: 'plain' }), { error: 'plain' })
})

test("the store row takes its latest version from the catalog's store release", () => {
  const self = { ...bundle('dsh-startide', '0.2.0'), source: 'github:yang051211/dsh-startide#v0.2.0' }
  const newer = buildInstalledRows([self], catalog, {}, 'zh', '0.3.0')
  assert.deepEqual(newer.updates.map(r => [r.name, r.latest, r.check]), [['dsh-startide', '0.3.0', 'catalog']])
  const same = buildInstalledRows([self], catalog, {}, 'zh', '0.2.0')
  assert.deepEqual(same.others.map(r => [r.name, r.check]), [['dsh-startide', 'catalog']])
  assert.equal(buildInstalledRows([self], catalog, {}, 'zh').others[0].check, 'catalog', 'never "not npm" for the store itself')
})
