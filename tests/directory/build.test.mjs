import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { buildDirectory, INDEX_PUBLIC_URL, titleOf } from '../../tools/directory/build.mjs'

const NOW = Date.parse('2026-10-26T00:00:00Z')
const config = {
  dshVersion: '0.2.1-rc.2',
  recentDays: 90,
  categories: [{ id: 'ui', title: { zh: '界面', en: 'UI' }, match: ['theme'] }, { id: 'other', title: { zh: '其他', en: 'Other' }, match: [] }],
}
const fact = (name, overrides = {}) => ({
  name, latest: '1.0.0', published: NOW / 1000 - 86_400, created: NOW / 1000 - 864_000, modified: null, displayName: null,
  description: `${name} does things`, author: 'Ann', keywords: ['theme'], repository: { url: `https://github.com/ann/${name}` }, homepage: null,
  enginesDsh: null, isBundle: true, deprecated: false,
  versions: [{ version: '1.0.0', publishTimestamp: NOW / 1000 - 86_400, enginesDsh: null }],
  ...overrides,
})
const scan = version => ({
  version, scannedAt: '2026-10-26T00:00:00Z', dependencies: 1, minifiedFiles: [], binaryFiles: [],
  network: { hit: true, evidence: [{ file: 'lib/a.js', line: 3, text: 'fetch(x)' }] },
  fileSystem: { hit: false, evidence: [] }, agentTools: { hit: false, evidence: [] }, childProcess: { hit: false, evidence: [] }, installScripts: { hit: false, evidence: [] },
})

function build(facts, extra = {}) {
  return buildDirectory({ facts, stats: {}, scans: new Map(), icons: new Map(), config, storeVersion: '0.2.0', now: NOW, ...extra })
}

test('only qualifying packages are listed, ordered by weekly downloads then name', () => {
  const facts = [fact('dsh-b'), fact('dsh-a'), fact('dsh-c'), fact('dsh-old', { published: NOW / 1000 - 100 * 86_400 }), { name: 'broken', error: 'x' }]
  const { index } = build(facts, { stats: { 'dsh-c': { weeklyDownloads: 50 }, 'dsh-a': { weeklyDownloads: 10 } } })
  assert.deepEqual(index.plugins.map(p => p.name), ['dsh-c', 'dsh-a', 'dsh-b'])
})

test('the output does not depend on the input order', () => {
  const facts = [fact('dsh-a'), fact('dsh-b'), fact('dsh-c')]
  assert.deepEqual(build(facts).index, build([...facts].reverse()).index)
})

test('each entry carries category, stats, the latest version only, and the detail path', () => {
  const { index, details } = build([fact('@ann/dsh-theme-x', { enginesDsh: '>=0.2.0-0' })], { stats: { '@ann/dsh-theme-x': { weeklyDownloads: 4, stars: 2 } } })
  const [entry] = index.plugins
  assert.equal(entry.metadata.category, 'ui')
  assert.deepEqual(entry.versions, [{ version: '1.0.0', publishTimestamp: NOW / 1000 - 86_400, source: { type: 'npm' }, engines: { dsh: '>=0.2.0-0' } }])
  assert.deepEqual(entry.store.stats, { stars: 2, weeklyDownloads: 4 })
  assert.equal(entry.store.detail, 'plugins/ann__dsh-theme-x.json')
  assert.equal(entry.store.created, NOW / 1000 - 864_000)
  assert.equal(details.get('@ann/dsh-theme-x').versions.length, 1)
  assert.equal(index.store.self.version, '0.2.0')
  assert.deepEqual(index.store.categoryOrder, ['ui', 'other'])
})

test('detection results are published only for the version they were taken from', () => {
  const current = build([fact('dsh-a')], { scans: new Map([['dsh-a', scan('1.0.0')]]) })
  assert.deepEqual(current.index.plugins[0].store.permissions, { network: true, fileSystem: false, agentTools: false, childProcess: false, installScripts: false })
  assert.equal(current.index.plugins[0].store.scannedVersion, '1.0.0')
  assert.deepEqual(current.details.get('dsh-a').scan.evidence.network, [{ file: 'lib/a.js', line: 3 }])
  const outdated = build([fact('dsh-a')], { scans: new Map([['dsh-a', scan('0.9.0')]]) })
  assert.equal(outdated.index.plugins[0].store.permissions, null)
  assert.equal(outdated.details.get('dsh-a').scan, null)
})

test('an icon found by the scan is referenced from the entry', () => {
  const { index } = build([fact('dsh-a')], { icons: new Map([['dsh-a', 'dsh-a.png']]) })
  assert.equal(index.plugins[0].icon, 'icons/dsh-a.png')
})

test('the index passes the official reader and makes no review claims', () => {
  const { index, details } = build([fact('dsh-a'), fact('dsh-b')], { scans: new Map([['dsh-a', scan('1.0.0')]]) })
  parseMarketIndex(structuredClone(index), INDEX_PUBLIC_URL)
  const text = JSON.stringify(index) + JSON.stringify([...details.values()])
  for (const word of ['审', 'review']) assert.equal(text.includes(word), false, word)
})

test('titles come from displayName, else a readable package name', () => {
  assert.equal(titleOf(fact('x', { displayName: '对话目录' })), '对话目录')
  assert.equal(titleOf(fact('dsh-chat-toc')), 'Chat Toc')
  assert.equal(titleOf(fact('@ann/dsh-plugin-tts')), 'Tts')
  assert.equal(titleOf(fact('acryl-dsh-editor-plugin')), 'Acryl Editor')
  assert.equal(titleOf(fact('dsh')), 'Dsh')
})
