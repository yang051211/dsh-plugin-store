/**
 * A listed plugin's README, read from jsDelivr's copy of exactly the version the catalog lists. Only names the catalog
 * lists are looked up, and the URL is built here from that entry, so a browser request never chooses what the Host fetches.
 */
import type { CatalogCache } from './catalog-cache.ts'
import { CACHE_TTL_MS, FETCH_TIMEOUT_MS } from './catalog-cache.ts'
import { json, readCapped } from './http.ts'

export const README_ROUTE = '/api/plugin-store/readme'
/** Largest README accepted. */
export const MAX_README_BYTES = 1024 * 1024
const NPM_CDN = 'https://cdn.jsdelivr.net/npm/'
/** READMEs kept in memory; the oldest goes first. */
export const MAX_README_ENTRIES = 50
/** Tried in order; jsDelivr paths are case-sensitive. */
const README_NAMES = ['README.md', 'readme.md', 'Readme.md']

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** GET /api/plugin-store/readme?name=<package> → `{ ok, markdown, base }`; `markdown` is '' when the package has none. */
export function createReadmeFetch(cache: CatalogCache, fetchImpl: typeof fetch, now: () => number = Date.now, maxEntries: number = MAX_README_ENTRIES): (request: Request) => Promise<Response> {
  const cached = new Map<string, { at: number; markdown: string }>()
  return async (request) => {
    const name = new URL(request.url).searchParams.get('name') ?? ''
    try {
      const snapshot = await cache.index()
      const plugin = snapshot.index.plugins.find(p => p.name === name)
      const version = plugin?.['dist-tags']?.latest ?? plugin?.versions[0]?.version
      if (!plugin || !version) return json(404, { ok: false, error: `${name} is not in the catalog` })
      const base = `${NPM_CDN}${plugin.name}@${version}/`
      const key = base
      const hit = cached.get(key)
      if (hit && now() - hit.at < CACHE_TTL_MS) return json(200, { ok: true, markdown: hit.markdown, base })
      let markdown = ''
      for (const file of README_NAMES) {
        const response = await fetchImpl(base + file, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        if (response.status === 404) { await response.body?.cancel(); continue }
        if (!response.ok) { await response.body?.cancel(); throw new Error(`README of ${name} answered HTTP ${response.status}`) }
        markdown = await readCapped(response, MAX_README_BYTES, `README of ${name}`)
        break
      }
      cached.delete(key)
      cached.set(key, { at: now(), markdown })
      while (cached.size > maxEntries) cached.delete(cached.keys().next().value!)
      return json(200, { ok: true, markdown, base })
    } catch (error) {
      return json(502, { ok: false, error: message(error) })
    }
  }
}
