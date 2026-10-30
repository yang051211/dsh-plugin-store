/** Small HTTP helpers shared by the Host routes. */

/** The server answered, but not with 2xx. */
export class HttpStatusError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/** Read a response body as text, refusing more than `limit` bytes (announced or actual). */
export async function readCapped(response: Response, limit: number, what: string): Promise<string> {
  const announced = Number(response.headers.get('content-length'))
  if (Number.isFinite(announced) && announced > limit) {
    await response.body?.cancel()
    throw new Error(`${what} too large (${announced} bytes announced)`)
  }
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
      throw new Error(`${what} too large (over ${limit} bytes)`)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Fetch `url` as JSON under a size cap and a deadline; non-2xx and invalid JSON become errors. `cancel` stops it early;
 * `headers` go with the request.
 */
export async function fetchJson(
  fetchImpl: typeof fetch, url: string, limit: number, timeoutMs: number, what: string, cancel?: AbortSignal, headers?: Record<string, string>,
): Promise<unknown> {
  const deadline = AbortSignal.timeout(timeoutMs)
  const response = await fetchImpl(url, { signal: cancel ? AbortSignal.any([deadline, cancel]) : deadline, ...(headers && { headers }) })
  if (!response.ok) {
    await response.body?.cancel()
    throw new HttpStatusError(`${what} answered HTTP ${response.status}`, response.status)
  }
  const text = await readCapped(response, limit, what)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${what} is not valid JSON`)
  }
}

/** A JSON response with the given status. */
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
