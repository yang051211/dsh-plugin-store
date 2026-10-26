// Regenerate the small directory the client tests read: `node tests/fixtures/directory/make.mjs`.
// It goes through the real builder, so the fixture always has the published shape.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { buildDirectory } from '../../../tools/directory/build.mjs'
import { toJson } from '../../../tools/directory/outputs.mjs'
import { slugOf } from '../../../tools/directory/slug.mjs'

const here = new URL('./', import.meta.url)
const config = JSON.parse(readFileSync(new URL('../../../directory/config.json', import.meta.url), 'utf8'))
const NOW = Date.parse('2026-10-26T00:00:00Z')
const day = 86_400
const at = days => NOW / 1000 - days * day

function fact(name, { description, keywords = [], published = 1, created = 100, enginesDsh = null, author = 'Ann', displayName = null }) {
  return {
    name, latest: '1.0.0', published: at(published), created: at(created), modified: null, displayName,
    description, author, keywords, repository: { url: `https://github.com/ann/${slugOf(name)}` }, homepage: null,
    enginesDsh, isBundle: true, deprecated: false,
    versions: [{ version: '1.0.0', publishTimestamp: at(published), enginesDsh }, { version: '0.9.0', publishTimestamp: at(published + 20), enginesDsh }],
  }
}
const scan = (version, hits) => ({
  version, scannedAt: '2026-10-25T00:00:00Z', dependencies: 1, minifiedFiles: [], binaryFiles: [], icon: null,
  ...Object.fromEntries(['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts'].map(k => [k, { hit: hits.includes(k), evidence: hits.includes(k) ? [{ file: 'lib/index.js', line: 7, text: k }] : [] }])),
})

const facts = [
  fact('dsh-chat-toc', { description: '把对话右侧的消息刻度变成能预览、搜索和收藏的目录', keywords: ['toc', 'outline'], published: 3, created: 60, displayName: '对话目录' }),
  fact('dsh-context', { description: 'See what fills the context window', keywords: ['context', 'token'], published: 1, created: 300 }),
  fact('@ann/dsh-theme-night', { description: 'A dark theme', keywords: ['theme'], published: 40, created: 45 }),
  fact('dsh-pet', { description: '住在 DSH 里的桌宠', keywords: ['pet'], published: 10, created: 2, author: 'Bo' }),
  fact('dsh-ssh-ops', { description: 'Run commands on your servers over SSH', keywords: ['ssh'], published: 5, created: 30 }),
  fact('dsh-cost-meter', { description: '本会话花了多少钱', keywords: ['cost'], published: 7, created: 200 }),
  fact('dsh-qq-bridge', { description: '把 DSH 接到 QQ 群', keywords: ['qq'], published: 2, created: 1, enginesDsh: '>=0.2.0-0' }),
  fact('dsh-mystery', { description: 'Does something unusual', keywords: [], published: 20, created: 25 }),
]
const stats = {
  'dsh-chat-toc': { weeklyDownloads: 332, stars: 3 },
  'dsh-context': { weeklyDownloads: 42000, stars: 3600 },
  '@ann/dsh-theme-night': { weeklyDownloads: 15, stars: null },
  'dsh-pet': { weeklyDownloads: 28000, stars: 2400 },
  'dsh-ssh-ops': { weeklyDownloads: null, stars: 5 },
  'dsh-cost-meter': { weeklyDownloads: 26000, stars: 477 },
  'dsh-qq-bridge': { weeklyDownloads: 4400, stars: 12 },
}
const scans = new Map([
  ['dsh-chat-toc', scan('1.0.0', [])],
  ['dsh-context', scan('1.0.0', ['network', 'fileSystem'])],
  ['dsh-ssh-ops', scan('0.9.0', ['childProcess'])],
])
const icons = new Map([['dsh-context', 'dsh-context.svg']])

const { index, details } = buildDirectory({ facts, stats, scans, icons, config, storeVersion: '0.2.0', now: NOW })
rmSync(new URL('plugins/', here), { recursive: true, force: true })
mkdirSync(new URL('plugins/', here), { recursive: true })
writeFileSync(new URL('index.json', here), toJson(index))
for (const [name, detail] of details) writeFileSync(new URL(`plugins/${slugOf(name)}.json`, here), toJson(detail))
console.log(`fixture: ${index.plugins.length} plugins`)
