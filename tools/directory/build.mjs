/**
 * The published directory: a format-1 index (one entry per listed package, latest version only, store extras for
 * stats and automatic detection) and one small detail document per package. Built only from the committed state, so
 * the same state always gives the same files. Each entry is checked with the official reader on its own: one package
 * the reader refuses is left out and reported, never allowed to stop the whole directory.
 */
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { categorize } from './categorize.mjs'
import { qualifies } from './packages.mjs'
import { slugOf } from './slug.mjs'

export const INDEX_PUBLIC_URL = 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json'
export const DETECTION_KEYS = ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']
/** Evidence lines kept per detection kind in a detail document. */
const MAX_EVIDENCE = 5
/** Text limits, so a single package cannot bloat the index everyone downloads. */
const MAX_DESCRIPTION = 300
const MAX_TITLE = 80
const MAX_KEYWORDS = 12
const MAX_KEYWORD = 40
const INDEX_TITLE = { zh: '生态家园', en: 'Plugin Home' }
/** Failed scans of one version are retried this many times (network errors pass); after that the store says so. */
export const SCAN_ATTEMPTS = 3

const capitalize = word => word.charAt(0).toUpperCase() + word.slice(1)
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** The author's display name, else the package name without scope and the ecosystem words, in title case. */
export function titleOf(facts) {
  if (facts.displayName?.trim()) return clip(facts.displayName.trim(), MAX_TITLE)
  const bare = facts.name.replace(/^@[^/]+\//, '')
  const words = bare.split(/[-_.]+/).filter(word => word && !['dsh', 'plugin'].includes(word.toLowerCase()))
  return (words.length > 0 ? words : [bare]).map(capitalize).join(' ')
}

/** Detection is shown only for the version it was taken from, and only when it succeeded. */
const detectedScan = (facts, scan) => (scan?.version === facts.latest && !scan.error ? scan : null)

function entryOf(facts, { stats, scan, icon, config }) {
  const detected = detectedScan(facts, scan)
  const description = facts.description.trim()
  return {
    name: facts.name,
    title: titleOf(facts),
    ...(description ? { description: clip(description, MAX_DESCRIPTION) } : {}),
    ...(icon ? { icon: `icons/${icon}` } : {}),
    ...(facts.author ? { author: facts.author } : {}),
    ...(facts.homepage ? { homepage: facts.homepage } : {}),
    ...(facts.repository ? { repository: facts.repository } : {}),
    metadata: {
      category: categorize(facts, config.categories),
      keywords: facts.keywords.filter(k => k.trim()).slice(0, MAX_KEYWORDS).map(k => clip(k.trim(), MAX_KEYWORD)),
    },
    'dist-tags': { latest: facts.latest },
    // The listing rule judged facts.enginesDsh, so the entry publishes that same range.
    versions: [{ version: facts.latest, publishTimestamp: facts.published, source: { type: 'npm' }, ...(facts.enginesDsh ? { engines: { dsh: facts.enginesDsh } } : {}) }],
    store: {
      created: facts.created,
      stats: { stars: stats?.stars ?? null, weeklyDownloads: stats?.weeklyDownloads ?? null },
      permissions: detected ? Object.fromEntries(DETECTION_KEYS.map(k => [k, Boolean(detected[k]?.hit)])) : null,
      scannedVersion: detected ? detected.version : null,
      // Binaries and minified bundles hide what detection looks for, so a "no" there means less.
      ...(detected ? { opaque: (detected.binaryFiles ?? []).length > 0 || (detected.minifiedFiles ?? []).length > 0 } : {}),
      ...(scan?.version === facts.latest && scan.error && (scan.attempts ?? 1) >= SCAN_ATTEMPTS ? { scanFailed: true } : {}),
      detail: `plugins/${slugOf(facts.name)}.json`,
    },
  }
}

function detailOf(facts, scan) {
  const detected = detectedScan(facts, scan)
  return {
    schema: 2,
    name: facts.name,
    versions: facts.versions,
    scan: detected
      ? {
          version: detected.version,
          scannedAt: detected.scannedAt,
          dependencies: detected.dependencies,
          minified: (detected.minifiedFiles ?? []).length > 0,
          binaryFiles: detected.binaryFiles ?? [],
          evidence: Object.fromEntries(DETECTION_KEYS.map(k => [k, (detected[k]?.evidence ?? []).slice(0, MAX_EVIDENCE).map(e => ({ file: e.file, line: e.line }))])),
        }
      : null,
  }
}

/** Whether the official reader accepts this one entry, next to the categories it may reference. */
function readerError(entry, metadata) {
  try {
    parseMarketIndex({ format: 1, title: INDEX_TITLE, metadata: structuredClone(metadata), plugins: [structuredClone(entry)] }, INDEX_PUBLIC_URL)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/**
 * @param state - `{ facts: PackageFacts[], stats: {[name]: {stars?, weeklyDownloads?}}, scans: Map<name, scan>,
 *   icons: Map<name, file>, config, storeVersion, now }`
 * @returns `{ index, details: Map<name, detail>, rejected: Array<{ name, error }> }`
 */
export function buildDirectory({ facts, stats, scans, icons, config, storeVersion, now }) {
  const listed = facts.filter(f => qualifies(f, config, now).ok)
  const downloads = name => stats[name]?.weeklyDownloads ?? -1
  listed.sort((a, b) => downloads(b.name) - downloads(a.name) || (a.name < b.name ? -1 : 1))
  const plugins = []
  const details = new Map()
  const rejected = []
  const metadata = { categories: Object.fromEntries(config.categories.map(c => [c.id, { title: c.title }])) }
  for (const f of listed) {
    const entry = entryOf(f, { stats: stats[f.name], scan: scans.get(f.name), icon: icons.get(f.name), config })
    const error = readerError(entry, metadata)
    if (error) { rejected.push({ name: f.name, error }); continue }
    plugins.push(entry)
    details.set(f.name, detailOf(f, scans.get(f.name)))
  }
  const index = {
    format: 1,
    title: INDEX_TITLE,
    description: { zh: 'npm 上的 DeepSeek Harness 插件目录，每天自动更新', en: 'DeepSeek Harness plugins on npm, refreshed daily' },
    metadata,
    plugins,
    store: {
      schema: 2,
      dshVersion: config.dshVersion,
      ...(storeVersion ? { self: { version: storeVersion } } : {}),
      categoryOrder: config.categories.map(c => c.id),
    },
  }
  return { index, details, rejected }
}
