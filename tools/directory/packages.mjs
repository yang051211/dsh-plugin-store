/**
 * One package's facts from its packument, and whether the directory lists it. Only the latest version decides:
 * a package whose latest release stopped being a DSH bundle, or went stale, drops out until it qualifies again.
 */
import semver from 'semver'
import { authorName, enginesDshOf, repositoryOf } from './npm.mjs'

/** Versions kept per package for the detail page. */
export const MAX_VERSIONS = 30

const seconds = iso => Math.floor(Date.parse(iso) / 1000)
const isBundle = manifest => Boolean(manifest?.dsh?.bundle?.patch)
const httpUrl = value => (typeof value === 'string' && /^https?:\/\//.test(value) ? value : null)

/**
 * @returns the facts, or `{ name, error }` when the packument cannot be read (never throws).
 */
export function factsOf(packument, now = Date.now()) {
  const name = typeof packument?.name === 'string' ? packument.name : String(packument?.name ?? '')
  try {
    const latest = packument['dist-tags']?.latest
    const manifest = packument.versions?.[latest]
    const time = packument.time
    if (!manifest) throw new Error(`latest ${latest} is not among the versions`)
    if (!time?.[latest]) throw new Error('no publish time for the latest version')
    const versions = Object.entries(packument.versions)
      .filter(([version, m]) => isBundle(m) && !m.deprecated && time[version])
      .map(([version, m]) => ({ version, publishTimestamp: seconds(time[version]), enginesDsh: enginesDshOf(m) }))
      .sort((a, b) => b.publishTimestamp - a.publishTimestamp || (a.version < b.version ? 1 : -1))
      .slice(0, MAX_VERSIONS)
    const times = Object.entries(time).filter(([k]) => k !== 'created' && k !== 'modified').map(([, v]) => seconds(v)).filter(Number.isFinite)
    return {
      name,
      latest,
      published: seconds(time[latest]),
      created: time.created ? seconds(time.created) : Math.min(...times),
      modified: time.modified ?? null,
      displayName: typeof manifest.displayName === 'string' ? manifest.displayName : null,
      description: typeof manifest.description === 'string' ? manifest.description : '',
      author: authorName(manifest.author ?? packument.author),
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords.filter(k => typeof k === 'string') : [],
      repository: repositoryOf(manifest.repository ?? packument.repository),
      homepage: httpUrl(manifest.homepage),
      enginesDsh: enginesDshOf(manifest),
      isBundle: isBundle(manifest),
      deprecated: Boolean(manifest.deprecated),
      versions,
    }
  } catch (error) {
    return { name, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Whether the directory lists a package, and why not.
 * @returns `{ ok: true }` or `{ ok: false, reason: 'error'|'not-bundle'|'deprecated'|'no-source'|'engines'|'stale' }`
 */
export function qualifies(facts, config, now = Date.now()) {
  if (facts.error) return { ok: false, reason: 'error' }
  if (!facts.isBundle) return { ok: false, reason: 'not-bundle' }
  if (facts.deprecated) return { ok: false, reason: 'deprecated' }
  if (!facts.repository && !facts.homepage) return { ok: false, reason: 'no-source' }
  if (facts.enginesDsh !== null) {
    const range = semver.validRange(facts.enginesDsh)
    if (!range || !semver.satisfies(config.dshVersion, range, { includePrerelease: true })) return { ok: false, reason: 'engines' }
  }
  if (now / 1000 - facts.published > config.recentDays * 86_400) return { ok: false, reason: 'stale' }
  return { ok: true }
}
