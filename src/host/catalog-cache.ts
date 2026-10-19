/**
 * The catalog as the Host last read it: cached for a while, one upstream fetch for concurrent readers, and the last
 * good copy kept when a refresh fails. Detail documents are read only for plugins the catalog lists, and only from
 * under the catalog's own directory, so a browser request can never make the Host fetch an arbitrary URL.
 */
import { fetchJson } from './http.ts'

/** Largest catalog document accepted. */
export const MAX_INDEX_BYTES = 8 * 1024 * 1024
/** Largest detail document accepted. */
export const MAX_DETAIL_BYTES = 4 * 1024 * 1024
/** Deadline for one upstream fetch, matching the official Discover default. */
export const FETCH_TIMEOUT_MS = 15_000
/** How long a successful read is reused. */
export const CACHE_TTL_MS = 600_000
/** After a failed refresh, how long the stale copy is served before upstream is tried again. */
export const RETRY_DELAY_MS = 60_000

export interface IndexPlugin {
  name: string
  'dist-tags'?: { latest?: string }
  versions: Array<{ version: string; engines?: { dsh?: string } }>
  store?: { detail?: string }
}
export interface IndexDocument {
  format: 1
  plugins: IndexPlugin[]
  [key: string]: unknown
}
export interface CatalogSnapshot {
  index: IndexDocument
  fetchedAt: number
  /** True when this copy is served because a refresh failed. */
  stale: boolean
}

/** A catalog document's minimal shape; throws on anything the store cannot read. */
export function checkIndexShape(doc: unknown): asserts doc is IndexDocument {
  const value = doc as { format?: unknown; plugins?: unknown }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) throw new Error('catalog is not an object')
  if (value.format !== 1) throw new Error(`catalog format ${String(value.format)} is not supported`)
  if (!Array.isArray(value.plugins)) throw new Error('catalog has no plugins list')
  value.plugins.forEach((plugin: { name?: unknown; versions?: unknown }, i: number) => {
    if (typeof plugin?.name !== 'string' || plugin.name === '') throw new Error(`plugins[${i}].name is missing`)
    if (!Array.isArray(plugin.versions) || plugin.versions.length === 0) throw new Error(`plugins[${i}].versions is empty`)
  })
}

/** A plugin name the catalog does not list. */
export class NotListedError extends Error {}

export interface CatalogCacheOptions {
  fetch: typeof fetch
  indexUrl: string
  ttlMs?: number
  now?: () => number
}

export function createCatalogCache({ fetch: fetchImpl, indexUrl, ttlMs = CACHE_TTL_MS, now = Date.now }: CatalogCacheOptions) {
  let good: CatalogSnapshot | null = null
  let failedAt: number | null = null
  let inflight: Promise<CatalogSnapshot> | null = null
  const details = new Map<string, { at: number; doc: unknown }>()
  const detailFlights = new Map<string, Promise<unknown>>()
  const indexDir = new URL('./', indexUrl)

  async function read(): Promise<CatalogSnapshot> {
    const doc = await fetchJson(fetchImpl, indexUrl, MAX_INDEX_BYTES, FETCH_TIMEOUT_MS, 'catalog')
    checkIndexShape(doc)
    good = { index: doc, fetchedAt: now(), stale: false }
    failedAt = null
    details.clear()
    return good
  }

  /** The catalog; `refresh` skips the cache. A failed read falls back to the last good copy, marked stale. */
  async function index(refresh = false): Promise<CatalogSnapshot> {
    if (!refresh && good && now() - good.fetchedAt < ttlMs) return good
    // While upstream is down, answer from the stale copy instead of making every request wait for a timeout.
    if (!refresh && good && failedAt !== null && now() - failedAt < RETRY_DELAY_MS) return { ...good, stale: true }
    inflight ??= read().finally(() => { inflight = null })
    try {
      return await inflight
    } catch (error) {
      failedAt = now()
      if (good) return { ...good, stale: true }
      throw error
    }
  }

  /** The detail document of a listed plugin. */
  async function detail(name: string): Promise<unknown> {
    const cached = details.get(name)
    if (cached && now() - cached.at < ttlMs) return cached.doc
    let flight = detailFlights.get(name)
    if (!flight) {
      flight = readDetail(name).finally(() => { detailFlights.delete(name) })
      detailFlights.set(name, flight)
    }
    return flight
  }

  async function readDetail(name: string): Promise<unknown> {
    const plugin = (await index()).index.plugins.find(p => p.name === name)
    if (!plugin) throw new NotListedError(`${name} is not in the catalog`)
    const target = new URL(plugin.store?.detail ?? '', indexUrl)
    if (target.origin !== indexDir.origin || !target.pathname.startsWith(indexDir.pathname) || target.href === indexUrl) {
      throw new Error(`${name}: detail location is outside the catalog`)
    }
    const doc = await fetchJson(fetchImpl, target.href, MAX_DETAIL_BYTES, FETCH_TIMEOUT_MS, `detail of ${name}`)
    details.set(name, { at: now(), doc })
    return doc
  }

  return { index, detail, indexUrl }
}

export type CatalogCache = ReturnType<typeof createCatalogCache>
