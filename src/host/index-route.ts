/**
 * Host route that reads the configured market index and reports what the store needs from it.
 * Only the configured URL is ever fetched; the request's own query string is ignored.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Path the browser half reads. */
export const INDEX_ROUTE = '/api/plugin-store/index'

/** Index read until the store ships its own (spike default; the user added it in Discover before). */
export const DEFAULT_INDEX_URL = 'https://raw.githubusercontent.com/fareyuu-ops/dsh-plugin-market/main/index.json'

/** Largest index body accepted. */
export const MAX_INDEX_BYTES = 8 * 1024 * 1024

/** Deadline for one index fetch, matching the official Discover default. */
export const FETCH_TIMEOUT_MS = 15_000

/** Read a response body, aborting once it exceeds `limit` bytes. */
async function readCapped(response: Response, limit: number): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      throw new Error(`index too large (over ${limit} bytes)`)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Name of the plugin the spike's install check prefers. */
export const SAMPLE_PLUGIN = 'dsh-chat-toc'

interface IndexPlugin {
  name?: unknown
  'dist-tags'?: { latest?: unknown }
  versions?: Array<{ version?: unknown }>
}

/** Pick the plugin and version the install check offers: the preferred plugin, else the first one. */
function pickSample(plugins: IndexPlugin[]): { name: string; version: string } | null {
  const plugin = plugins.find(entry => entry?.name === SAMPLE_PLUGIN) ?? plugins[0]
  if (!plugin || typeof plugin.name !== 'string') return null
  const latest = plugin['dist-tags']?.latest
  const last = Array.isArray(plugin.versions) ? plugin.versions.at(-1)?.version : undefined
  const version = typeof latest === 'string' ? latest : typeof last === 'string' ? last : null
  return version ? { name: plugin.name, version } : null
}

/** Send a JSON body with the given status. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/**
 * Build the route handler.
 * @param fetchImpl - fetch to use (injected for tests).
 * @param indexUrl - the only URL this handler reads.
 */
export function createIndexHandler(fetchImpl: typeof fetch, indexUrl: string): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (_req, res) => {
    try {
      const response = await fetchImpl(indexUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!response.ok) throw new Error(`index answered HTTP ${response.status}`)
      const text = await readCapped(response, MAX_INDEX_BYTES)
      let index: { title?: unknown; plugins?: unknown }
      try {
        index = JSON.parse(text)
      } catch {
        throw new Error('index is not valid JSON')
      }
      const plugins: IndexPlugin[] = Array.isArray(index.plugins) ? index.plugins : []
      sendJson(res, 200, {
        ok: true,
        title: index.title ?? null,
        pluginCount: plugins.length,
        sample: pickSample(plugins),
        fetchedAt: Date.now(),
      })
    } catch (error) {
      sendJson(res, 502, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
}
