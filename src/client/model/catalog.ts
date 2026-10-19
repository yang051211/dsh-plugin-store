/** The store's view of the catalog: plugins with their store facts, categories, sections and the featured banner. */
import type { LocalizedText } from './localize.ts'
import { localize } from './localize.ts'

export type Compatibility = 'compatible' | 'incompatible' | 'unknown'

/** What the Host catalog route answers. */
export interface CatalogSnapshot {
  index: any
  indexUrl: string
  stale: boolean
  dshVersion: string | null
  compatibility: Record<string, Compatibility>
}

export interface StorePlugin {
  name: string
  title: LocalizedText
  tagline: LocalizedText
  /** Absolute icon URL, or null. */
  icon: string | null
  author: string | null
  category: string
  keywords: string[]
  version: string
  publishTimestamp: number
  enginesDsh: string | null
  stats: { stars: number | null; weeklyDownloads: number | null; fetchedAt: string | null }
  review: { version: string; date: string }
  upstreamLatest: string | null
  compatibility: Compatibility
  repository: { url: string; directory?: string } | null
  homepage: string | null
}

export interface Grouping { id: string; title: LocalizedText; plugins: StorePlugin[] }

export interface Catalog {
  title: LocalizedText
  plugins: StorePlugin[]
  byName: Map<string, StorePlugin>
  categories: Grouping[]
  sections: Grouping[]
  featured: { plugin: StorePlugin; title: LocalizedText; subtitle: LocalizedText; gradient: [string, string] } | null
  stale: boolean
  dshVersion: string | null
}

/** Banner colors used when the catalog gives none or invalid ones. */
export const DEFAULT_GRADIENT: [string, string] = ['#4338ca', '#db2777']
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

const absolute = (ref: unknown, base: string): string | null => {
  if (typeof ref !== 'string' || ref === '') return null
  try {
    const url = new URL(ref, base)
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'data:' ? url.href : null
  } catch {
    return null
  }
}

function toPlugin(entry: any, snapshot: CatalogSnapshot): StorePlugin {
  const latest = entry['dist-tags']?.latest
  const listed = entry.versions.find((v: any) => v.version === latest) ?? entry.versions[0]
  const store = entry.store ?? {}
  return {
    name: entry.name,
    title: entry.title ?? entry.name,
    tagline: store.tagline ?? entry.description ?? '',
    icon: absolute(entry.icon, snapshot.indexUrl),
    author: typeof entry.author === 'string' ? entry.author : null,
    category: entry.metadata?.category ?? '',
    keywords: Array.isArray(entry.metadata?.keywords) ? entry.metadata.keywords : [],
    version: listed.version,
    publishTimestamp: listed.publishTimestamp ?? 0,
    enginesDsh: listed.engines?.dsh ?? null,
    stats: {
      stars: store.stats?.stars ?? null,
      weeklyDownloads: store.stats?.weeklyDownloads ?? null,
      fetchedAt: store.stats?.fetchedAt ?? null,
    },
    review: { version: store.review?.version ?? listed.version, date: store.review?.date ?? '' },
    upstreamLatest: store.upstreamLatest ?? null,
    compatibility: snapshot.compatibility[entry.name] ?? 'unknown',
    repository: entry.repository ?? null,
    homepage: entry.homepage ?? null,
  }
}

const DAY_MS = 86_400_000
/** Monday 1970-01-05, the first day of week 0. */
const FIRST_MONDAY = Date.UTC(1970, 0, 5)

/** Whole weeks since Monday 1970-01-05 on the local calendar, so the banner turns over at local Monday midnight. */
function weekNumber(now: Date): number {
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - FIRST_MONDAY) / DAY_MS / 7)
}

/** Build the store's catalog from the Host snapshot; `now` picks this week's featured banner. */
export function buildCatalog(snapshot: CatalogSnapshot, now: Date = new Date()): Catalog {
  const doc = snapshot.index
  const plugins: StorePlugin[] = doc.plugins.map((entry: any) => toPlugin(entry, snapshot))
  const byName = new Map(plugins.map(p => [p.name, p]))
  const declared: Record<string, { title: LocalizedText }> = doc.metadata?.categories ?? {}
  const order: string[] = Array.isArray(doc.store?.categoryOrder) ? doc.store.categoryOrder : Object.keys(declared)
  const ids = [...new Set([...order, ...Object.keys(declared)])]
  const categories = ids
    .map(id => ({ id, title: declared[id]?.title ?? id, plugins: plugins.filter(p => p.category === id) }))
    .filter(c => c.plugins.length > 0)
  const sections = (Array.isArray(doc.store?.sections) ? doc.store.sections : [])
    .map((s: any) => ({ id: s.id, title: s.title ?? s.id, plugins: (s.plugins ?? []).map((n: string) => byName.get(n)).filter(Boolean) }))
    .filter((s: Grouping) => s.plugins.length > 0)
  const banner = (raw: any): Catalog['featured'] => {
    const plugin = raw ? byName.get(raw.plugin) : undefined
    if (!plugin) return null
    const gradient: [string, string] = Array.isArray(raw.gradient) && raw.gradient.length === 2 && raw.gradient.every((c: unknown) => typeof c === 'string' && HEX_COLOR.test(c))
      ? [raw.gradient[0], raw.gradient[1]]
      : DEFAULT_GRADIENT
    return { plugin, title: raw.title ?? '', subtitle: raw.subtitle ?? '', gradient }
  }
  const rotation = (Array.isArray(doc.store?.featuredRotation) ? doc.store.featuredRotation : []).map(banner).filter(Boolean)
  return {
    title: doc.title,
    plugins,
    byName,
    categories,
    sections,
    featured: rotation.length > 0 ? rotation[weekNumber(now) % rotation.length] : banner(doc.store?.featured),
    stale: snapshot.stale,
    dshVersion: snapshot.dshVersion,
  }
}

/** Plugins whose name, title, pitch (any language) or keywords contain the query, case-insensitively. */
export function searchPlugins(catalog: Catalog, query: string): StorePlugin[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return catalog.plugins
  const texts = (text: LocalizedText) => (typeof text === 'string' ? [text] : Object.values(text))
  return catalog.plugins.filter(p => [p.name, ...texts(p.title), ...texts(p.tagline), ...p.keywords]
    .some(value => typeof value === 'string' && value.toLowerCase().includes(needle)))
}

export { localize }
