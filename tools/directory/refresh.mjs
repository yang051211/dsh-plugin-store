/**
 * Which packuments a run re-reads. A search hint only says a new version exists; it never says a package was
 * deprecated, unpublished, or stopped being a DSH plugin, and search may stop returning such packages at all. So
 * besides new and moved packages, every known package is rechecked once it is older than `recheckDays`, oldest first.
 */

/**
 * @param state - `{ hints: {[name]: version|null}, latest: Map<name, version>, checked: {[name]: iso},
 *   now, recheckDays, recheckLimit }`
 * @returns names to re-read: new and moved ones first, then up to `recheckLimit` of the stalest.
 */
export function pickRefresh({ hints, latest, checked, now, recheckDays, recheckLimit }) {
  const must = []
  const rest = []
  for (const [name, hint] of Object.entries(hints)) {
    if (!latest.has(name) || (hint !== null && hint !== latest.get(name))) must.push(name)
    else rest.push(name)
  }
  const at = name => (checked[name] ? Date.parse(checked[name]) : 0)
  const due = rest
    .filter(name => now - at(name) >= recheckDays * 86_400_000)
    .sort((a, b) => at(a) - at(b) || (a < b ? -1 : 1))
    .slice(0, Math.max(0, recheckLimit))
  return [...must, ...due]
}
