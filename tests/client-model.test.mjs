import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localize, buildCatalog, searchPlugins, installStateOf, installedFrom, selfUpdateOf } from '../lib/test/model.js'

const INDEX_URL = 'https://cdn.example/gh/o/r@main/market/index.json'

function entry(name, overrides = {}) {
  return {
    name,
    title: { zh: `${name}-中文`, en: `${name}-en` },
    description: { zh: `${name} 卖点`, en: `${name} pitch` },
    author: 'Ann',
    metadata: { category: 'ui', keywords: ['toc'] },
    'dist-tags': { latest: '1.0.0' },
    versions: [{ version: '1.0.0', publishTimestamp: 1790000000, source: { type: 'npm' }, engines: { dsh: '>=0.2.0' } }],
    store: { tagline: { zh: `${name} 卖点`, en: `${name} pitch` }, detail: `plugins/${name}.json`, review: { version: '1.0.0', date: '2026-10-19' }, stats: { stars: 3, weeklyDownloads: 10, fetchedAt: '2026-10-19T00:00:00Z' } },
    ...overrides,
  }
}

function snapshot(overrides = {}) {
  return {
    indexUrl: INDEX_URL,
    stale: false,
    dshVersion: '0.2.1-rc.2',
    compatibility: { alpha: 'compatible', beta: 'incompatible' },
    index: {
      format: 1,
      title: { zh: '精选插件商城', en: 'Curated' },
      metadata: { categories: { ui: { title: { zh: '界面与体验', en: 'UI' } }, tools: { title: { zh: '工具与能力', en: 'Tools' } }, empty: { title: { en: 'Empty' } } } },
      plugins: [entry('alpha', { icon: 'icons/alpha.svg' }), entry('beta', { metadata: { category: 'tools', keywords: ['context', '上下文'] } })],
      store: {
        featured: { plugin: 'alpha', title: { zh: '精选' }, subtitle: { zh: '副标题' }, gradient: ['#123456', '#abc'] },
        sections: [{ id: 's1', title: { zh: '分区一' }, plugins: ['alpha', 'ghost'] }],
        categoryOrder: ['tools', 'ui', 'empty'],
      },
      ...overrides,
    },
  }
}

test('localize falls back from the requested language to zh, en, then any', () => {
  assert.equal(localize({ zh: '中', en: 'en' }, 'zh-CN'), '中')
  assert.equal(localize({ zh: '中', en: 'en' }, 'en-US'), 'en')
  assert.equal(localize({ en: 'en' }, 'zh'), 'en')
  assert.equal(localize({ fr: 'fr' }, 'zh'), 'fr')
  assert.equal(localize('plain', 'zh'), 'plain')
  assert.equal(localize(undefined, 'zh'), '')
})

test('categories follow the store order and drop empty ones', () => {
  const catalog = buildCatalog(snapshot())
  assert.deepEqual(catalog.categories.map(c => c.id), ['tools', 'ui'])
  assert.deepEqual(catalog.categories[0].plugins.map(p => p.name), ['beta'])
})

test('sections skip names the catalog does not list', () => {
  const catalog = buildCatalog(snapshot())
  assert.deepEqual(catalog.sections[0].plugins.map(p => p.name), ['alpha'])
})

test('featured resolves its plugin and keeps valid colors', () => {
  const { featured } = buildCatalog(snapshot())
  assert.equal(featured.plugin.name, 'alpha')
  assert.deepEqual(featured.gradient, ['#123456', '#abc'])
})

test('invalid gradient colors fall back to the default', () => {
  const doc = snapshot()
  doc.index.store.featured.gradient = ['red; background:url(x)', '#fff']
  assert.deepEqual(buildCatalog(doc).featured.gradient, ['#4338ca', '#db2777'])
})

const rotation = () => [
  { plugin: 'alpha', title: { zh: '甲周' }, subtitle: { zh: '甲' }, gradient: ['#111111', '#222222'] },
  { plugin: 'beta', title: { zh: '乙周' }, subtitle: { zh: '乙' }, gradient: ['#333333', '#444444'] },
]
const withRotation = entries => { const doc = snapshot(); doc.index.store.featuredRotation = entries; return doc }
/** The featured plugin on a local calendar day (month is 1-based). */
const pick = (doc, year, month, day) => buildCatalog(doc, new Date(year, month - 1, day, 10)).featured.plugin.name

test('featured rotates once a week, Monday to Sunday', () => {
  const doc = withRotation(rotation())
  const monday = pick(doc, 2026, 10, 19)
  for (let day = 20; day <= 25; day++) assert.equal(pick(doc, 2026, 10, day), monday, `2026-10-${day} is the same week`)
  assert.notEqual(pick(doc, 2026, 10, 26), monday, 'the next Monday moves on')
  assert.notEqual(pick(doc, 2026, 10, 18), monday, 'the Sunday before belongs to the previous week')
  assert.equal(pick(doc, 2026, 11, 2), monday, 'two entries repeat every two weeks')
})

test('the rotation carries on across a year boundary', () => {
  const doc = withRotation(rotation())
  const names = [[2026, 12, 21], [2026, 12, 28], [2027, 1, 4], [2027, 1, 11]].map(d => pick(doc, ...d))
  assert.notEqual(names[0], names[1])
  assert.deepEqual(names, [names[0], names[1], names[0], names[1]])
})

test('the rotation entry supplies the banner text and colors', () => {
  const { featured } = buildCatalog(withRotation(rotation()), new Date(2026, 9, 19, 10))
  const own = rotation().find(r => r.plugin === featured.plugin.name)
  assert.deepEqual(featured.title, own.title)
  assert.deepEqual(featured.gradient, own.gradient)
})

test('the rotation skips unlisted plugins and falls back to the single featured entry', () => {
  const ghost = withRotation([{ plugin: 'ghost' }, rotation()[1]])
  for (const day of [19, 26]) assert.equal(pick(ghost, 2026, 10, day), 'beta')
  assert.equal(pick(withRotation([]), 2026, 10, 19), 'alpha')
  assert.equal(pick(withRotation([{ plugin: 'ghost' }]), 2026, 10, 19), 'alpha')
})

test('featured is null when the catalog has none or it is unlisted', () => {
  const none = snapshot()
  none.index.store.featured = null
  assert.equal(buildCatalog(none).featured, null)
  const ghost = snapshot()
  ghost.index.store.featured.plugin = 'ghost'
  assert.equal(buildCatalog(ghost).featured, null)
})

test('relative icons resolve against the catalog URL', () => {
  const catalog = buildCatalog(snapshot())
  assert.equal(catalog.byName.get('alpha').icon, 'https://cdn.example/gh/o/r@main/market/icons/alpha.svg')
  assert.equal(catalog.byName.get('beta').icon, null)
})

test('plugins carry version, compatibility and review facts', () => {
  const beta = buildCatalog(snapshot()).byName.get('beta')
  assert.equal(beta.version, '1.0.0')
  assert.equal(beta.enginesDsh, '>=0.2.0')
  assert.equal(beta.compatibility, 'incompatible')
  assert.deepEqual(beta.review, { version: '1.0.0', date: '2026-10-19' })
  assert.equal(beta.upstreamLatest, null)
})

test('search matches names, both languages and keywords', () => {
  const catalog = buildCatalog(snapshot())
  assert.deepEqual(searchPlugins(catalog, 'ALPHA-EN').map(p => p.name), ['alpha'])
  assert.deepEqual(searchPlugins(catalog, '中文').map(p => p.name), ['alpha', 'beta'])
  assert.deepEqual(searchPlugins(catalog, '上下文').map(p => p.name), ['beta'])
  assert.deepEqual(searchPlugins(catalog, '  ').length, 2)
})

test('install state', () => {
  const catalog = buildCatalog(snapshot())
  const alpha = catalog.byName.get('alpha')
  const beta = catalog.byName.get('beta')
  assert.equal(installStateOf(alpha, new Map()), 'install')
  assert.equal(installStateOf(alpha, new Map([['alpha', { version: '1.0.0' }]])), 'installed')
  assert.equal(installStateOf(alpha, new Map([['alpha', { version: '0.9.0' }]])), 'update')
  assert.equal(installStateOf(beta, new Map()), 'incompatible')
  assert.equal(installStateOf(beta, new Map([['beta', { version: '1.0.0' }]])), 'installed')
})

test('installedFrom unwraps the Remote result and keeps installed bundles only', () => {
  // ctx.remote.pluginManager.listBundles() resolves to { ok, value }, not to the bare array.
  const map = installedFrom({ ok: true, value: [{ name: 'a', installed: true, version: '1.0.0' }, { name: 'b', installed: false }] })
  assert.deepEqual([...map.entries()], [['a', { version: '1.0.0' }]])
})

test('installedFrom throws the Remote error instead of reporting nothing installed', () => {
  assert.throws(() => installedFrom({ ok: false, error: new Error('plugin manager unavailable') }), /plugin manager unavailable/)
})

test('the store offers its own update only when the installed copy is older', () => {
  const installed = version => new Map([['dsh-plugin-store', version === undefined ? {} : { version }]])
  assert.deepEqual(selfUpdateOf('0.1.4', installed('0.1.3')), { current: '0.1.3', latest: '0.1.4', spec: 'github:yang051211/dsh-plugin-store#v0.1.4' })
  assert.equal(selfUpdateOf('0.1.4', installed('0.1.4')), null)
  assert.equal(selfUpdateOf('0.1.3', installed('0.1.4')), null)
  assert.equal(selfUpdateOf('0.1.4', installed(undefined)), null, 'no installed version, nothing to compare')
  assert.equal(selfUpdateOf('0.1.4', new Map()), null, 'not installed through DSH (a development link), no prompt')
  assert.equal(selfUpdateOf('0.1.4', null), null, 'installed list still loading')
  assert.equal(selfUpdateOf(null, installed('0.1.3')), null, 'catalog without the store version')
  assert.equal(selfUpdateOf('0.1.4#evil', installed('0.1.3')), null, 'only an exact version becomes an install spec')
})

test('the catalog carries the published store version', () => {
  const doc = snapshot()
  doc.index.store.self = { version: '0.1.4' }
  assert.equal(buildCatalog(doc).storeVersion, '0.1.4')
  assert.equal(buildCatalog(snapshot()).storeVersion, null)
})

test('plugins carry their usage guide, null when the catalog has none', () => {
  const doc = snapshot()
  doc.index.plugins[0].store.usage = { where: { zh: '右侧' }, try: { zh: '试试' }, setup: { zh: '先装' } }
  const catalog = buildCatalog(doc)
  assert.deepEqual(catalog.byName.get('alpha').usage, { where: { zh: '右侧' }, try: { zh: '试试' }, setup: { zh: '先装' } })
  assert.equal(catalog.byName.get('beta').usage, null)
})
