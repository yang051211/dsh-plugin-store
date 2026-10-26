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

/**
 * Search every keyword and page through its results until a short page.
 * @returns `Map<name, { version, date }>` with the newest version seen per name.
 * @throws when any search request fails, so a partial result never looks like a complete one.
 */
export async function searchPackages(io, keywords, { pageSize = MAX_PAGE_SIZE } = {}) {
  const registry = io.registry.endsWith('/') ? io.registry : `${io.registry}/`
  const found = new Map()
  for (const keyword of keywords) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = new URLSearchParams({ text: `keywords:${keyword}`, size: String(pageSize), from: String(page * pageSize) })
      const response = await get(io, `${registry}-/v1/search?${query}`, { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`search "${keyword}" page ${page} answered HTTP ${response.status}`)
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

/** Known names only grow: a package missing from one search is still checked, and dropped only by its manifest. */
export function mergeNames(known, found) {
  return [...new Set([...known, ...found])].sort()
}
