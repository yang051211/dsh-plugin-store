/** Host routes the browser half reads: the catalog with compatibility, and one plugin's detail document. */
import semver from 'semver'
import type { CatalogCache, IndexDocument } from './catalog-cache.ts'
import { NotListedError } from './catalog-cache.ts'
import { json } from './http.ts'

export const INDEX_ROUTE = '/api/plugin-store/index'
export const DETAIL_ROUTE = '/api/plugin-store/detail'

/** The store's own hand-reviewed catalog, published from market/ in this repository through jsDelivr. */
export const DEFAULT_INDEX_URL = 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json'

export type Compatibility = 'compatible' | 'incompatible' | 'unknown'

/** Whether each plugin's listed version admits the running DSH; the rule DSH applies at install time. */
export function compatibilityOf(index: IndexDocument, dshVersion: string | null): Record<string, Compatibility> {
  const result: Record<string, Compatibility> = {}
  for (const plugin of index.plugins) {
    const latest = plugin['dist-tags']?.latest
    const listed = plugin.versions.find(v => v.version === latest) ?? plugin.versions[0]
    const range = listed?.engines?.dsh?.trim()
    if (!range) result[plugin.name] = 'compatible'
    else if (!dshVersion || !semver.validRange(range)) result[plugin.name] = 'unknown'
    else result[plugin.name] = semver.satisfies(dshVersion, range, { includePrerelease: true }) ? 'compatible' : 'incompatible'
  }
  return result
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** GET /api/plugin-store/index[?refresh=1] */
export function createIndexFetch(cache: CatalogCache, versionOf: () => Promise<string | null>): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const refresh = new URL(request.url).searchParams.get('refresh') === '1'
      const [snapshot, dshVersion] = await Promise.all([cache.index(refresh), versionOf()])
      return json(200, {
        ok: true,
        index: snapshot.index,
        fetchedAt: snapshot.fetchedAt,
        stale: snapshot.stale,
        dshVersion,
        compatibility: compatibilityOf(snapshot.index, dshVersion),
      })
    } catch (error) {
      return json(502, { ok: false, error: message(error) })
    }
  }
}

/** GET /api/plugin-store/detail?name=<package> */
export function createDetailFetch(cache: CatalogCache): (request: Request) => Promise<Response> {
  return async (request) => {
    const name = new URL(request.url).searchParams.get('name') ?? ''
    try {
      return json(200, { ok: true, detail: await cache.detail(name) })
    } catch (error) {
      return json(error instanceof NotListedError ? 404 : 502, { ok: false, error: message(error) })
    }
  }
}
