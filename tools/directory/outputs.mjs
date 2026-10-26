/**
 * What market/ must contain, and what in it is left over. market/ is published as is, so only the build decides
 * its contents: the index, one detail file per listed plugin, and the icons of listed plugins — nothing else.
 */
import { slugOf } from './slug.mjs'

/** Stable JSON for committed files. */
export const toJson = value => `${JSON.stringify(value, null, 2)}\n`

/**
 * Every file market/ should hold, keyed by its path inside market/.
 * @param index - the built index.
 * @param details - plugin name → detail document.
 * @param readIcon - icon file name → contents from the icon cache, or null when absent.
 */
export function plannedMarketFiles(index, details, readIcon) {
  const planned = new Map([['index.json', toJson(index)]])
  for (const [name, detail] of details) planned.set(`plugins/${slugOf(name)}.json`, toJson(detail))
  for (const plugin of index.plugins) {
    if (!plugin.icon) continue
    const file = plugin.icon.replace(/^icons\//, '')
    const data = readIcon(file)
    if (!data) throw new Error(`${plugin.name}: icon ${file} is missing from the icon cache (run catalog:fetch)`)
    planned.set(`icons/${file}`, data)
  }
  return planned
}

/** Paths under plugins/ and icons/ that exist but are no longer planned, sorted. */
export function staleMarketFiles(existing, planned) {
  return existing.filter(path => /^(?:plugins|icons)\//.test(path) && !planned.has(path)).sort()
}

/**
 * Popularity stats after a fetch: a value the fetch could not get keeps the previous one instead of turning null.
 * @returns the merged stats and a warning per kept value.
 */
/** Most popularity snapshots kept per plugin: about a year of weekly fetches. */
const MAX_HISTORY = 52

/** Append one day's stars and weekly downloads; a second fetch the same day replaces that day's snapshot. */
export function appendStatsHistory(history, stats, at) {
  const date = String(at).slice(0, 10)
  const kept = (Array.isArray(history) ? history : []).filter(entry => entry.date !== date)
  return [...kept, { date, stars: stats.stars ?? null, weeklyDownloads: stats.weeklyDownloads ?? null }].slice(-MAX_HISTORY)
}

export function mergeStats(previous, next) {
  const stats = { ...next }
  const warnings = []
  for (const key of Object.keys(next)) {
    if (next[key] === null && typeof previous?.[key] === 'number') {
      stats[key] = previous[key]
      warnings.push(`${key}: fetch failed, kept the previous value ${previous[key]}`)
    }
  }
  return { stats, warnings }
}
