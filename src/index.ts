/** dsh-plugin-store, Host half. The browser half lives in `./client.ts`. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { createIndexHandler, DEFAULT_INDEX_URL, INDEX_ROUTE } from './host/index-route.ts'

export { createIndexHandler, DEFAULT_INDEX_URL, FETCH_TIMEOUT_MS, INDEX_ROUTE, MAX_INDEX_BYTES } from './host/index-route.ts'

export const name = 'plugin-store'

export const inject = ['webServer']

/** Serve the market index route for the browser half. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: INDEX_ROUTE,
    handler: createIndexHandler(fetch, DEFAULT_INDEX_URL),
  }), 'plugin-store: index route')
}
