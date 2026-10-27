/** dsh-startide (生态家园), Host half. The browser half lives in `./client.ts`. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { createCatalogCache } from './host/catalog-cache.ts'
import { createDiskCopy, defaultCopyFile } from './host/disk-copy.ts'
import { createDetailFetch, createIndexFetch, DETAIL_ROUTE, INDEX_ROUTE, INDEX_SOURCES } from './host/index-route.ts'
import { createReadmeFetch, README_ROUTE } from './host/readme-route.ts'
import { createVersionReader } from './host/runtime-version.ts'

export const name = 'startide'

/**
 * The connection channel, not a raw webServer route: an exact webServer route would win over the `/api` prefix
 * and skip DSH's trust and authentication fence.
 */
export const inject = ['connection']

/** Serve the catalog and detail routes for the browser half, and start reading the catalog right away. */
export function apply(ctx: Context): void {
  const cache = createCatalogCache({ fetch, sources: INDEX_SOURCES, disk: createDiskCopy(defaultCopyFile()) })
  // Read now so the store opens on a ready catalog; a failure here is answered again when the store asks.
  void cache.index().catch(() => {})
  ctx.effect(() => ctx.connection.fetch.register({
    path: INDEX_ROUTE, methods: ['GET'], requestBody: 'buffered', fetch: createIndexFetch(cache, createVersionReader()),
  }), 'startide: catalog route')
  ctx.effect(() => ctx.connection.fetch.register({
    path: DETAIL_ROUTE, methods: ['GET'], requestBody: 'buffered', fetch: createDetailFetch(cache),
  }), 'startide: detail route')
  ctx.effect(() => ctx.connection.fetch.register({
    path: README_ROUTE, methods: ['GET'], requestBody: 'buffered', fetch: createReadmeFetch(cache, fetch),
  }), 'startide: readme route')
}
