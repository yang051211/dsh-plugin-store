/** The store's view of the directory: plugins with their stats and automatic detection, categories, sorting and pages. */
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

export const PERMISSION_KEYS = ['network', 'fileSystem', 'childProcess', 'agentTools', 'installScripts'] as const
/** What automatic detection found in the listed version's files; a hint, not a review. */
export type Permissions = Record<(typeof PERMISSION_KEYS)[number], boolean>

export interface StorePlugin {
  name: string
  title: LocalizedText
  description: LocalizedText
  /** Absolute icon URL, or null. */
  icon: string | null
  author: string | null
  category: string
  keywords: string[]
  version: string
  /** Unix seconds the listed version was published. */
  publishTimestamp: number
  /** Unix seconds the package first appeared on npm. */
  created: number
  enginesDsh: string | null
  stats: { stars: number | null; weeklyDownloads: number | null }
  /** Null until the listed version has been scanned. */
  permissions: Permissions | null
  /** The package ships binaries or minified code, which detection cannot look into. */
  opaque: boolean
  /** Detection could not read this version (too large, unreadable); it is tried again for the next version. */
  scanFailed: boolean
  compatibility: Compatibility
  repository: { url: string; directory?: string } | null
  homepage: string | null
}

export interface Grouping { id: string; title: LocalizedText; plugins: StorePlugin[] }

export interface Catalog {
  plugins: StorePlugin[]
  byName: Map<string, StorePlugin>
  categories: Grouping[]
  /** The store release the directory was published with; null when it does not say. */
  storeVersion: string | null
  stale: boolean
  dshVersion: string | null
}

export type SortKey = 'popular' | 'updated' | 'new' | 'stars'
export const SORT_KEYS: SortKey[] = ['popular', 'updated', 'new', 'stars']
export const PAGE_SIZE = 30

const absolute = (ref: unknown, base: string): string | null => {
  if (typeof ref !== 'string' || ref === '') return null
  try {
    const url = new URL(ref, base)
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'data:' ? url.href : null
  } catch {
    return null
  }
}

function permissionsOf(raw: any): Permissions | null {
  if (!raw || typeof raw !== 'object') return null
  const out = {} as Permissions
  for (const key of PERMISSION_KEYS) {
    if (typeof raw[key] !== 'boolean') return null
    out[key] = raw[key]
  }
  return out
}

const count = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function toPlugin(entry: any, snapshot: CatalogSnapshot): StorePlugin {
  const latest = entry['dist-tags']?.latest
  const listed = entry.versions.find((v: any) => v.version === latest) ?? entry.versions[0]
  const store = entry.store ?? {}
  const published = listed.publishTimestamp ?? 0
  return {
    name: entry.name,
    title: entry.title ?? entry.name,
    // Indexes from before the directory kept the pitch in store.tagline.
    description: store.tagline ?? entry.description ?? '',
    icon: absolute(entry.icon, snapshot.indexUrl),
    author: typeof entry.author === 'string' ? entry.author : null,
    category: entry.metadata?.category ?? 'other',
    keywords: Array.isArray(entry.metadata?.keywords) ? entry.metadata.keywords : [],
    version: listed.version,
    publishTimestamp: published,
    created: count(store.created) ?? published,
    enginesDsh: listed.engines?.dsh ?? null,
    stats: { stars: count(store.stats?.stars), weeklyDownloads: count(store.stats?.weeklyDownloads) },
    permissions: permissionsOf(store.permissions),
    opaque: store.opaque === true,
    scanFailed: store.scanFailed === true,
    compatibility: snapshot.compatibility[entry.name] ?? 'unknown',
    repository: entry.repository ?? null,
    homepage: entry.homepage ?? null,
  }
}

/** Build the store's catalog from the Host snapshot. */
export function buildCatalog(snapshot: CatalogSnapshot): Catalog {
  const doc = snapshot.index
  const plugins: StorePlugin[] = doc.plugins.map((entry: any) => toPlugin(entry, snapshot))
  const declared: Record<string, { title: LocalizedText }> = doc.metadata?.categories ?? {}
  const order: string[] = Array.isArray(doc.store?.categoryOrder) ? doc.store.categoryOrder : Object.keys(declared)
  const categories = [...new Set([...order, ...Object.keys(declared)])]
    .map(id => ({ id, title: declared[id]?.title ?? id, plugins: plugins.filter(p => p.category === id) }))
    .filter(c => c.plugins.length > 0)
  return {
    plugins,
    byName: new Map(plugins.map(p => [p.name, p])),
    categories,
    storeVersion: typeof doc.store?.self?.version === 'string' ? doc.store.self.version : null,
    stale: snapshot.stale,
    dshVersion: snapshot.dshVersion,
  }
}

const KEY_OF: Record<SortKey, (p: StorePlugin) => number | null> = {
  popular: p => p.stats.weeklyDownloads,
  updated: p => p.publishTimestamp || null,
  new: p => p.created || null,
  stars: p => p.stats.stars,
}

/** A sorted copy: largest first, unknown values last, package name breaking ties. */
export function sortPlugins(plugins: StorePlugin[], key: SortKey): StorePlugin[] {
  const of = KEY_OF[key]
  return [...plugins].sort((a, b) => {
    const x = of(a), y = of(b)
    if (x !== y) return x === null ? 1 : y === null ? -1 : y - x
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })
}

/** One page of a list; the page number is clamped to the pages there are. */
export function pageOf<T>(list: T[], page: number, size: number = PAGE_SIZE): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(list.length / size))
  const at = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: list.slice((at - 1) * size, at * size), page: at, pages }
}

/** Plugins whose name, title, description (any language), keywords or author contain the query, case-insensitively. */
export function searchPlugins(catalog: Catalog, query: string): StorePlugin[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return catalog.plugins
  const texts = (text: LocalizedText) => (typeof text === 'string' ? [text] : Object.values(text))
  return catalog.plugins.filter(p => [p.name, ...texts(p.title), ...texts(p.description), ...p.keywords, p.author ?? '']
    .some(value => typeof value === 'string' && value.toLowerCase().includes(needle)))
}

export { localize }
