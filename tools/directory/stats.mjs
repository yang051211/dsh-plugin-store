/**
 * Popularity: npm weekly downloads for every listed package each run, GitHub stars for a rotating slice (the API
 * budget does not cover thousands of repositories a day). Any failure reads as "unknown" (null), never as zero.
 */
import { get } from './npm.mjs'
import { runPool } from './pool.mjs'

/** The downloads API takes at most this many unscoped names per request; scoped names are not batchable. */
export const BULK_SIZE = 128
const DOWNLOADS = 'https://api.npmjs.org/downloads/point/last-week/'

const countOf = entry => (typeof entry?.downloads === 'number' ? entry.downloads : null)

async function readJson(io, url) {
  try {
    const response = await get(io, url, { headers: { accept: 'application/json' } })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

/** Weekly downloads per name; null where unknown. */
export async function weeklyDownloads(io, names, { concurrency = 8 } = {}) {
  const result = new Map(names.map(name => [name, null]))
  const plain = names.filter(name => !name.startsWith('@'))
  const batches = []
  for (let i = 0; i < plain.length; i += BULK_SIZE) batches.push(plain.slice(i, i + BULK_SIZE))
  await runPool(batches, concurrency, async batch => {
    const body = await readJson(io, DOWNLOADS + batch.join(','))
    // One name in a "batch" gets the flat single-package answer.
    if (batch.length === 1) result.set(batch[0], countOf(body))
    else for (const name of batch) result.set(name, countOf(body?.[name]))
  })
  await runPool(names.filter(name => name.startsWith('@')), concurrency, async name => {
    result.set(name, countOf(await readJson(io, DOWNLOADS + name)))
  })
  return result
}

/** Names whose stars to refresh this run: never fetched first, then the oldest fetch, at most `limit`. */
export function pickStarRefresh(names, stats, limit) {
  const at = name => stats[name]?.starsAt ?? ''
  return [...names].sort((a, b) => (at(a) < at(b) ? -1 : at(a) > at(b) ? 1 : a < b ? -1 : 1)).slice(0, Math.max(0, limit))
}

/** Stars of a GitHub repository web URL, or null. */
export async function fetchStars(io, repositoryUrl) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(repositoryUrl ?? '')
  if (!match) return null
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'dsh-plugin-store-directory' }
  if (io.githubToken) headers.authorization = `Bearer ${io.githubToken}`
  try {
    const response = await get(io, `https://api.github.com/repos/${match[1]}/${match[2]}`, { headers })
    if (!response.ok) return null
    const body = await response.json()
    return typeof body.stargazers_count === 'number' ? body.stargazers_count : null
  } catch {
    return null
  }
}
