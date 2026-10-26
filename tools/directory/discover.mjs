/**
 * Discovery: which npm packages might be DSH plugins. The registry's search is paged and fuzzy, so it only proposes
 * names; whether a package is listed is decided later from its own manifest (packages.mjs).
 */
import semver from 'semver'
import { get } from './npm.mjs'

/** The registry refuses larger pages. */
export const MAX_PAGE_SIZE = 250
/** Stop paging a keyword after this many pages, whatever the registry claims. */
const MAX_PAGES = 200

const newer = (a, b) => (semver.valid(a) && semver.valid(b) ? semver.gt(a, b) : a > b)
/** The search API rate-limits quickly; a 429 is waited out this many times before discovery gives up. */
const RATE_LIMIT_RETRIES = 5
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

/** One search page, waiting out 429s: the server's Retry-After when given, else 2, 4, 8… seconds. */
async function page(io, url, sleep) {
  for (let attempt = 0; ; attempt++) {
    const response = await get(io, url, { headers: { accept: 'application/json' } })
    if (response.status !== 429 || attempt >= RATE_LIMIT_RETRIES) return response
    const retryAfter = Number(response.headers.get('retry-after'))
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt)
  }
}

/**
 * Search every keyword and page through its results until a short page.
 * @returns `Map<name, { version, date }>` with the newest version seen per name.
 * @throws when any search request fails, so a partial result never looks like a complete one.
 */
export async function searchPackages(io, keywords, { pageSize = MAX_PAGE_SIZE, sleep = wait } = {}) {
  const registry = io.registry.endsWith('/') ? io.registry : `${io.registry}/`
  const found = new Map()
  for (const keyword of keywords) {
    for (let at = 0; at < MAX_PAGES; at++) {
      const query = new URLSearchParams({ text: `keywords:${keyword}`, size: String(pageSize), from: String(at * pageSize) })
      const response = await page(io, `${registry}-/v1/search?${query}`, sleep)
      if (!response.ok) throw new Error(`search "${keyword}" page ${at} answered HTTP ${response.status}`)
      const objects = (await response.json()).objects ?? []
      for (const { package: pkg } of objects) {
        if (typeof pkg?.name !== 'string') continue
        const seen = found.get(pkg.name)
        if (!seen || newer(String(pkg.version), seen.version)) found.set(pkg.name, { version: String(pkg.version), date: pkg.date ?? null })
      }
      if (objects.length < pageSize) break
    }
  }
  return found
}

/**
 * Names listed by another format-1 index. npm search returns at most about 10,000 fuzzy matches per query, so real
 * plugins fall outside it; other indexes fill that gap. They only propose names — listing is still decided from each
 * package's own manifest — and an unreachable or malformed index proposes none.
 */
export async function namesFromIndex(io, url) {
  try {
    const response = await get(io, url, { headers: { accept: 'application/json' } }, 120_000)
    if (!response.ok) return []
    const plugins = (await response.json())?.plugins
    return Array.isArray(plugins) ? plugins.map(p => p?.name).filter(name => typeof name === 'string' && name !== '') : []
  } catch {
    return []
  }
}

/** Known names only grow: a package missing from one search is still checked, and dropped only by its manifest. */
export function mergeNames(known, found) {
  return [...new Set([...known, ...found])].sort()
}
