/** Host routes the browser half reads: the catalog with compatibility, and one plugin's detail document. */
import semver from 'semver'
import type { CatalogCache, CatalogSource, IndexDocument } from './catalog-cache.ts'
import { NotListedError } from './catalog-cache.ts'
import { json } from './http.ts'

export const INDEX_ROUTE = '/api/startide/index'
export const DETAIL_ROUTE = '/api/startide/detail'

/**
 * Where the published catalog is read from, in order. GitHub serves a push within minutes; jsDelivr's `@main` can
 * keep resolving the branch to an older commit for hours, so it is the fallback for networks that cannot reach GitHub.
 */
export const INDEX_SOURCES: CatalogSource[] = [
  { url: 'https://raw.githubusercontent.com/yang051211/dsh-startide/main/market/index.json', timeoutMs: 5_000 },
  { url: 'https://cdn.jsdelivr.net/gh/yang051211/dsh-startide@main/market/index.json', timeoutMs: 15_000 },
]

export type Compatibility = 'compatible' | 'incompatible' | 'unknown'

/** Whether each plugin's listed version admits the running DSH; the rule DSH applies at install time. */
export function compatibilityOf(index: IndexDocument, dshVersion: string | null): Record<string, Compatibility> {
  const result: Record<string, Compatibility> = {}
  for (const plugin of index.plugins) {
    const latest = plugin['dist-tags']?.latest
    const listed = plugin.versions.find(v => v.version === latest) ?? plugin.versions[0]
    const declared = listed?.engines?.dsh
    // DSH refuses a declared range that is blank or invalid, so the store does too; no declaration admits any version.
    if (declared === undefined) result[plugin.name] = 'compatible'
    else if (declared.trim() === '' || !semver.validRange(declared.trim())) result[plugin.name] = 'incompatible'
    else if (!dshVersion) result[plugin.name] = 'unknown'
    else result[plugin.name] = semver.satisfies(dshVersion, declared.trim(), { includePrerelease: true }) ? 'compatible' : 'incompatible'
  }
  return result
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** GET /api/startide/index[?refresh=1] */
export function createIndexFetch(cache: CatalogCache, versionOf: () => Promise<string | null>): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const refresh = new URL(request.url).searchParams.get('refresh') === '1'
      const [snapshot, dshVersion] = await Promise.all([cache.index(refresh), versionOf()])
      return json(200, {
        ok: true,
        index: snapshot.index,
        indexUrl: snapshot.indexUrl,
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

/** GET /api/startide/detail?name=<package> */
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
