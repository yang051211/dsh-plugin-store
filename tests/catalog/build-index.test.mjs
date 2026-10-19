import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { loadCuration } from '../../tools/catalog/curation.mjs'
import { buildIndex, INDEX_PUBLIC_URL } from '../../tools/catalog/build-index.mjs'

const NOW = new Date('2026-10-19T12:00:00Z')
const curation = () => loadCuration(new URL('../fixtures/catalog/valid.yaml', import.meta.url))

/** Upstream records for the fixture's plugins: alpha has 1.0.0 (reviewed) and a newer 1.1.0. */
function upstream(overrides = {}) {
  const alpha = {
    name: 'alpha', fetchedAt: '2026-10-19T08:00:00.000Z', latest: '1.1.0',
    versions: { '1.0.0': { publishTimestamp: 1790000000, enginesDsh: '>=0.2.0 <0.3.0-0' }, '1.1.0': { publishTimestamp: 1791000000, enginesDsh: null } },
    reviewed: {
      version: '1.0.0',
      description: 'Upstream description that must not be used', author: 'Ann', homepage: 'https://alpha.example',
      repository: { url: 'https://github.com/ann/alpha' }, keywords: ['toc'], icon: { file: 'alpha.svg', bytes: 100 },
      readme: '# Alpha', changelog: null,
    },
    stats: { stars: 5, weeklyDownloads: 10 },
    ...overrides,
  }
  const beta = { ...alpha, name: '@scope/beta', latest: '0.2.0', versions: { '0.2.0': { publishTimestamp: 1789000000, enginesDsh: null } } }
  return new Map([['alpha', alpha], ['@scope/beta', beta]])
}

const scans = new Map([['alpha', { network: { hit: false }, fileSystem: { hit: true }, agentTools: { hit: false }, childProcess: { hit: false }, installScripts: { hit: false }, dependencies: 1, minifiedFiles: [] }]])

test('pending plugins are left out', () => {
  const { index } = buildIndex(curation(), upstream(), scans, NOW)
  assert.deepEqual(index.plugins.map(p => p.name), ['alpha'])
})

test('sections and the banner only name listed plugins', () => {
  const { index } = buildIndex(curation(), upstream(), scans, NOW)
  assert.deepEqual(index.store.sections.map(s => s.id), ['ui-better'])
  assert.equal(index.store.featured.plugin, 'alpha')
  // beta is still pending, so the rotation keeps alpha only.
  assert.deepEqual(index.store.featuredRotation.map(f => f.plugin), ['alpha'])
  assert.deepEqual(index.store.featuredRotation[0].gradient, ['#4338ca', '#db2777'])
})

test('only reviewed versions are listed', () => {
  const { index } = buildIndex(curation(), upstream(), scans, NOW)
  const [alpha] = index.plugins
  assert.deepEqual(alpha.versions.map(v => v.version), ['1.0.0'])
  assert.deepEqual(alpha['dist-tags'], { latest: '1.0.0' })
  assert.equal(alpha.store.upstreamLatest, '1.1.0')
  assert.deepEqual(alpha.versions[0].engines, { dsh: '>=0.2.0 <0.3.0-0' })
})

test('fails when the reviewed version is missing upstream', () => {
  const missing = upstream({ versions: { '1.1.0': { publishTimestamp: 1791000000, enginesDsh: null } }, reviewed: null })
  assert.throws(() => buildIndex(curation(), missing, scans, NOW), /alpha@1\.0\.0/)
})

test('fails when the upstream facts describe another version than the reviewed one', () => {
  const stale = upstream()
  stale.get('alpha').reviewed = { ...stale.get('alpha').reviewed, version: '0.9.0' }
  assert.throws(() => buildIndex(curation(), stale, scans, NOW), /alpha.*1\.0\.0.*0\.9\.0.*catalog:fetch/)
})

test('fails when an approved plugin has no scan of its reviewed version', () => {
  assert.throws(() => buildIndex(curation(), upstream(), new Map(), NOW), /alpha@1\.0\.0.*catalog:scan/)
})

test('build reads human fields only from catalog.yaml', () => {
  const { index } = buildIndex(curation(), upstream(), scans, NOW)
  assert.deepEqual(index.plugins[0].description, { zh: '一句话卖点', en: 'One-line pitch' })
  assert.deepEqual(index.plugins[0].title, { zh: '阿尔法', en: 'Alpha' })
})

test('index passes the official validator', () => {
  const { index } = buildIndex(curation(), upstream(), scans, NOW)
  const parsed = parseMarketIndex(structuredClone(index), INDEX_PUBLIC_URL)
  assert.equal(parsed.plugins[0].title.zh, '阿尔法')
  assert.equal(parsed.plugins[0].icon, 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/icons/alpha.svg')
})

test('extension members survive in the raw document', () => {
  const { index } = buildIndex(curation(), upstream(), scans, NOW)
  assert.equal(index.store.schema, 1)
  assert.equal(index.store.generatedAt, NOW.toISOString())
  assert.deepEqual(index.plugins[0].store.review, { version: '1.0.0', date: '2026-10-19' })
  assert.deepEqual(index.plugins[0].store.stats, { stars: 5, weeklyDownloads: 10, fetchedAt: '2026-10-19T08:00:00.000Z' })
  assert.equal(index.plugins[0].store.detail, 'plugins/alpha.json')
})

test('detail files carry the reviewer-facing content', () => {
  const { details } = buildIndex(curation(), upstream(), scans, NOW)
  const detail = details.get('alpha')
  assert.deepEqual(detail.features, { zh: ['要点一', '要点二', '要点三'] })
  assert.equal(detail.permissions.fileSystem, false)
  assert.equal(detail.scanSummary.fileSystem, true)
  assert.equal(detail.readme, '# Alpha')
  assert.equal(detail.review.reviewer, 'yang051211')
})

test('output is deterministic', () => {
  const a = buildIndex(curation(), upstream(), scans, NOW)
  const b = buildIndex(curation(), upstream(), scans, NOW)
  assert.equal(JSON.stringify(a.index), JSON.stringify(b.index))
  assert.equal(JSON.stringify([...a.details]), JSON.stringify([...b.details]))
})
