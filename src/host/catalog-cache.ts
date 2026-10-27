/**
 * The catalog as the Host last read it: cached for a while, one upstream fetch for concurrent readers, and the last
 * good copy kept when a refresh fails. The catalog is published in several places; they are tried in order and the
 * first that answers serves the catalog and its details. Detail documents are read only for plugins the catalog lists, and only from
 * under the catalog's own directory, so a browser request can never make the Host fetch an arbitrary URL.
 */
import type { DiskCopy } from './disk-copy.ts'
import { fetchJson } from './http.ts'

/** Largest catalog document accepted. */
export const MAX_INDEX_BYTES = 16 * 1024 * 1024
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
  /** The source that served this copy; relative detail and icon paths resolve against it. */
  indexUrl: string
}

/** One place the catalog is published. */
export interface CatalogSource {
  url: string
  /** Deadline for one fetch from this source; defaults to FETCH_TIMEOUT_MS. */
  timeoutMs?: number
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
  /** Most preferred first. All are asked at once: the first answer serves, and a more preferred later answer replaces it. */
  sources: CatalogSource[]
  /** The last catalog read, kept across restarts. */
  disk?: DiskCopy
  ttlMs?: number
  now?: () => number
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function createCatalogCache({ fetch: fetchImpl, sources, disk, ttlMs = CACHE_TTL_MS, now = Date.now }: CatalogCacheOptions) {
  let good: CatalogSnapshot | null = null
  let failedAt: number | null = null
  let inflight: Promise<CatalogSnapshot> | null = null
  let loaded: Promise<void> | null = null
  const details = new Map<string, { at: number; doc: unknown }>()
  const detailFlights = new Map<string, Promise<unknown>>()

  function accept(doc: IndexDocument, indexUrl: string): CatalogSnapshot {
    good = { index: doc, fetchedAt: now(), stale: false, indexUrl }
    failedAt = null
    details.clear()
    void disk?.save({ index: doc, indexUrl, savedAt: good.fetchedAt })
    return good
  }

  /** Ask every source at once; settles with the first answer, while a more preferred source may still replace it. */
  function read(): Promise<CatalogSnapshot> {
    return new Promise((resolve, reject) => {
      const cancels = sources.map(() => new AbortController())
      const failures: string[] = []
      let best = sources.length
      let pending = sources.length
      let settled = false
      sources.forEach((source, rank) => {
        fetchJson(fetchImpl, source.url, MAX_INDEX_BYTES, source.timeoutMs ?? FETCH_TIMEOUT_MS, 'catalog', cancels[rank].signal)
          .then(doc => {
            checkIndexShape(doc)
            if (rank > best) return
            best = rank
            const snapshot = accept(doc, source.url)
            // Less preferred sources can no longer change anything; stop their downloads.
            for (const cancel of cancels.slice(rank + 1)) cancel.abort()
            if (!settled) { settled = true; resolve(snapshot) }
          })
          .catch(error => { failures[rank] = `${source.url}: ${message(error)}` })
          .finally(() => {
            if (--pending === 0 && !settled) reject(new Error(`no catalog source answered (${failures.filter(Boolean).join('; ')})`))
          })
      })
    })
  }

  /** Start a read unless one is under way; a failure is remembered so the copy is marked stale. */
  function startRead(): Promise<CatalogSnapshot> {
    if (!inflight) {
      inflight = read().finally(() => { inflight = null })
      inflight.catch(() => { failedAt = now() })
    }
    return inflight
  }

  /**
   * The catalog. Any copy held (in memory, or on disk from an earlier run) is served at once, and an expired one is
   * refreshed behind it; only the very first read, and `refresh`, wait for upstream. A failed read falls back to the
   * last good copy, marked stale.
   */
  async function index(refresh = false): Promise<CatalogSnapshot> {
    loaded ??= (async () => {
      const copy = await disk?.load()
      if (copy && !good) good = { index: copy.index, fetchedAt: copy.savedAt, stale: false, indexUrl: copy.indexUrl }
    })()
    await loaded
    if (!refresh && good) {
      // While upstream is down, answer from the stale copy instead of trying again on every request.
      const failing = failedAt !== null && now() - failedAt < RETRY_DELAY_MS
      if (now() - good.fetchedAt >= ttlMs && !failing) void startRead().catch(() => {})
      return failedAt !== null ? { ...good, stale: true } : good
    }
    try {
      return await startRead()
    } catch (error) {
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

  /** Where `plugin`'s detail lives under the catalog at `indexUrl`; refuses anything outside that directory. */
  function detailUrl(plugin: IndexPlugin, indexUrl: string): string {
    const indexDir = new URL('./', indexUrl)
    const target = new URL(plugin.store?.detail ?? '', indexUrl)
    if (target.origin !== indexDir.origin || !target.pathname.startsWith(indexDir.pathname) || target.href === indexUrl) {
      throw new Error(`${plugin.name}: detail location is outside the catalog`)
    }
    return target.href
  }

  async function readDetail(name: string): Promise<unknown> {
    const snapshot = await index()
    const plugin = snapshot.index.plugins.find(p => p.name === name)
    if (!plugin) throw new NotListedError(`${name} is not in the catalog`)
    // The source that served the catalog first, so the detail matches it; the others only if it cannot answer.
    const ordered = [...sources].sort((a, b) => Number(b.url === snapshot.indexUrl) - Number(a.url === snapshot.indexUrl))
    const failures: string[] = []
    for (const source of ordered) {
      const target = detailUrl(plugin, source.url)
      try {
        const doc = await fetchJson(fetchImpl, target, MAX_DETAIL_BYTES, source.timeoutMs ?? FETCH_TIMEOUT_MS, `detail of ${name}`)
        details.set(name, { at: now(), doc })
        return doc
      } catch (error) {
        failures.push(`${target}: ${message(error)}`)
      }
    }
    throw new Error(`${name}: no source gave its detail (${failures.join('; ')})`)
  }

  return { index, detail }
}

export type CatalogCache = ReturnType<typeof createCatalogCache>
