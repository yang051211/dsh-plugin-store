/** dsh-plugin-store, Host half. The browser half lives in `./client.ts`. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { createIndexFetch, DEFAULT_INDEX_URL, INDEX_ROUTE } from './host/index-route.ts'

export { createIndexFetch, DEFAULT_INDEX_URL, FETCH_TIMEOUT_MS, INDEX_ROUTE, MAX_INDEX_BYTES } from './host/index-route.ts'

export const name = 'plugin-store'

/**
 * The connection channel, not a raw webServer route: an exact webServer route would win over the `/api` prefix
 * and skip DSH's trust and authentication fence.
 */
export const inject = ['connection']

/** Serve the market index route for the browser half. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.connection.fetch.register({
    path: INDEX_ROUTE,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: createIndexFetch(fetch, DEFAULT_INDEX_URL),
  }), 'plugin-store: index route')
}
