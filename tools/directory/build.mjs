/**
 * The published directory: a format-1 index (one entry per listed package, latest version only, store extras for
 * stats and automatic detection) and one small detail document per package. Built only from the committed state, so
 * the same state always gives the same files.
 */
import { categorize } from './categorize.mjs'
import { qualifies } from './packages.mjs'
import { slugOf } from './slug.mjs'

export const INDEX_PUBLIC_URL = 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json'
export const DETECTION_KEYS = ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']
/** Evidence lines kept per detection kind in a detail document. */
const MAX_EVIDENCE = 5

const capitalize = word => word.charAt(0).toUpperCase() + word.slice(1)

/** The author's display name, else the package name without scope and the ecosystem words, in title case. */
export function titleOf(facts) {
  if (facts.displayName) return facts.displayName
  const bare = facts.name.replace(/^@[^/]+\//, '')
  const words = bare.split(/[-_.]+/).filter(word => word && !['dsh', 'plugin'].includes(word.toLowerCase()))
  return (words.length > 0 ? words : [bare]).map(capitalize).join(' ')
}

function entryOf(facts, { stats, scan, icon, config }) {
  // The listing rule judged facts.enginesDsh, so the entry publishes that same range.
  const latest = { version: facts.latest, publishTimestamp: facts.published, enginesDsh: facts.enginesDsh }
  const detected = scan?.version === facts.latest
  return {
    name: facts.name,
    title: titleOf(facts),
    description: facts.description,
    ...(icon ? { icon: `icons/${icon}` } : {}),
    ...(facts.author ? { author: facts.author } : {}),
    ...(facts.homepage ? { homepage: facts.homepage } : {}),
    ...(facts.repository ? { repository: facts.repository } : {}),
    metadata: { category: categorize(facts, config.categories), keywords: facts.keywords },
    'dist-tags': { latest: facts.latest },
    versions: [{ version: latest.version, publishTimestamp: latest.publishTimestamp, source: { type: 'npm' }, ...(latest.enginesDsh ? { engines: { dsh: latest.enginesDsh } } : {}) }],
    store: {
      created: facts.created,
      stats: { stars: stats?.stars ?? null, weeklyDownloads: stats?.weeklyDownloads ?? null },
      permissions: detected ? Object.fromEntries(DETECTION_KEYS.map(k => [k, Boolean(scan[k]?.hit)])) : null,
      scannedVersion: detected ? scan.version : null,
      detail: `plugins/${slugOf(facts.name)}.json`,
    },
  }
}

function detailOf(facts, scan) {
  const detected = scan?.version === facts.latest
  return {
    schema: 2,
    name: facts.name,
    versions: facts.versions,
    scan: detected
      ? {
          version: scan.version,
          scannedAt: scan.scannedAt,
          dependencies: scan.dependencies,
          minified: (scan.minifiedFiles ?? []).length > 0,
          binaryFiles: scan.binaryFiles ?? [],
          evidence: Object.fromEntries(DETECTION_KEYS.map(k => [k, (scan[k]?.evidence ?? []).slice(0, MAX_EVIDENCE).map(e => ({ file: e.file, line: e.line }))])),
        }
      : null,
  }
}

/**
 * @param state - `{ facts: PackageFacts[], stats: {[name]: {stars?, weeklyDownloads?}}, scans: Map<name, scan>,
 *   icons: Map<name, file>, config, storeVersion, now }`
 * @returns `{ index, details: Map<name, detail> }`
 */
export function buildDirectory({ facts, stats, scans, icons, config, storeVersion, now }) {
  const listed = facts.filter(f => qualifies(f, config, now).ok)
  const downloads = name => stats[name]?.weeklyDownloads ?? -1
  listed.sort((a, b) => downloads(b.name) - downloads(a.name) || (a.name < b.name ? -1 : 1))
  const plugins = listed.map(f => entryOf(f, { stats: stats[f.name], scan: scans.get(f.name), icon: icons.get(f.name), config }))
  const details = new Map(listed.map(f => [f.name, detailOf(f, scans.get(f.name))]))
  const index = {
    format: 1,
    title: { zh: '生态家园', en: 'Plugin Home' },
    description: { zh: 'npm 上的 DeepSeek Harness 插件目录，每天自动更新', en: 'DeepSeek Harness plugins on npm, refreshed daily' },
    metadata: { categories: Object.fromEntries(config.categories.map(c => [c.id, { title: c.title }])) },
    plugins,
    store: {
      schema: 2,
      generatedAt: new Date(now).toISOString(),
      dshVersion: config.dshVersion,
      ...(storeVersion ? { self: { version: storeVersion } } : {}),
      categoryOrder: config.categories.map(c => c.id),
    },
  }
  return { index, details }
}
