/**
 * Run `worker` over `items` with at most `limit` running at once. Every item gets a result, in input order: a failing
 * worker is recorded as `{ ok: false, error }` and never stops the others.
 * @returns `Array<{ item, ok: true, value } | { item, ok: false, error }>`
 */
export async function runPool(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  async function lane() {
    while (next < items.length) {
      const at = next++
      const item = items[at]
      try {
        results[at] = { item, ok: true, value: await worker(item, at) }
      } catch (error) {
        results[at] = { item, ok: false, error }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, lane))
  return results
}
