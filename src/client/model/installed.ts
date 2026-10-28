/** The installed page's rows: which bundles have a newer version, which are DSH's own, and how changes went. */
import semver from 'semver'
import { isRegistrySpec } from '../../shared/registry-spec.ts'
import type { Catalog, StorePlugin } from './catalog.ts'
import { STORE_PACKAGE, type InstalledBundle } from './install-state.ts'
import { localize } from './localize.ts'

export interface InstalledRow {
  name: string
  title: string
  /** The directory entry, when the plugin is listed. */
  plugin: StorePlugin | null
  /** The directory icon, else the bundle's own; null when neither has one. */
  icon: string | null
  version: string | null
  latest: string | null
  /** Where `latest` comes from; `not-npm` means it cannot be checked. */
  check: 'catalog' | 'registry' | 'not-npm'
  enabled: boolean
  official: boolean
  missing: boolean
  removable: boolean
  /** The switch is locked, as DSH's own page locks it: the bundle is read-only, or it is off because it failed. */
  locked: boolean
  /** What went wrong loading or managing the bundle; null when nothing did. */
  problem: string | null
  /** This store's own row. */
  self: boolean
}

export interface InstalledRows { updates: InstalledRow[]; others: InstalledRow[]; official: InstalledRow[] }

const newer = (latest: string | null, version: string | null): boolean =>
  !!latest && !!version && !!semver.valid(latest) && !!semver.valid(version) && semver.gt(latest, version)

/**
 * Split installed bundles into rows with an update, DSH's own bundles, and the rest; each group sorted by title.
 * The store's own row takes its latest version from `storeLatest`, the release the catalog was published with.
 */
export function buildInstalledRows(
  bundles: InstalledBundle[], catalog: Catalog | null, registryLatest: Record<string, string>, lang: string, storeLatest: string | null = null,
): InstalledRows {
  const rows: InstalledRows = { updates: [], others: [], official: [] }
  for (const b of bundles) {
    if (!b.installed) continue
    const plugin = catalog?.byName.get(b.name) ?? null
    const self = b.name === STORE_PACKAGE
    const check: InstalledRow['check'] = plugin || self ? 'catalog' : isRegistrySpec(b.name, b.source) ? 'registry' : 'not-npm'
    const latest = plugin ? plugin.version : self ? storeLatest : check === 'registry' ? registryLatest[b.name] ?? null : null
    const metaIcon = typeof b.meta?.icon === 'string' && b.meta.icon.startsWith('data:image/') ? b.meta.icon : null
    const row: InstalledRow = {
      name: b.name,
      title: (plugin && localize(plugin.title, lang)) || localize(b.meta?.title, lang) || b.name,
      plugin,
      icon: plugin?.icon ?? metaIcon,
      version: b.version ?? null,
      latest,
      check,
      enabled: b.enabled,
      official: b.official,
      missing: b.availability === 'missing',
      removable: b.removable,
      locked: b.readOnlyReason !== undefined || (!b.enabled && b.error !== undefined),
      problem: b.error !== undefined ? errorText(b.error) : null,
      self,
    }
    const group = b.official ? rows.official : newer(latest, row.version) ? rows.updates : rows.others
    group.push(row)
  }
  for (const group of [rows.updates, rows.others, rows.official]) group.sort((a, b) => a.title.localeCompare(b.title))
  return rows
}

type ChangeResult = { ok: true; value: { application: string; error?: unknown; pendingBuilds?: string[] } } | { ok: false; error: unknown }

/** Why a change did not happen: the text, DSH's error code when it gave one, and packages whose scripts wait for approval. */
export interface ChangeFailure {
  error: string
  /** DSH's error code; the store adds `restored` (an update fell back to the old version) and `lost` (neither installs). */
  code?: string
  pendingBuilds?: string[]
  /** With `restored`: the version that went back. */
  version?: string
}

/** Readable text for an Error, DSH's `{ code, diagnostic }` management error, or anything else. */
export function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const { message, diagnostic, code } = error as { message?: unknown; diagnostic?: unknown; code?: unknown }
    for (const text of [message, diagnostic, code]) if (typeof text === 'string' && text !== '') return text
  }
  return String(error)
}

/** How an enable, disable, remove or update went: applied now, applied after a restart, or why it did not. */
export function changeOutcome(result: ChangeResult): 'applied' | 'restart-required' | ChangeFailure {
  if (!result.ok) return { error: errorText(result.error) }
  const { application, error, pendingBuilds } = result.value
  if (application === 'applied' || application === 'restart-required') return application
  const failure: ChangeFailure = { error: error !== undefined ? errorText(error) : application }
  const code = (error as { code?: unknown } | undefined)?.code
  if (typeof code === 'string') failure.code = code
  if (pendingBuilds && pendingBuilds.length > 0) failure.pendingBuilds = pendingBuilds
  return failure
}

export type ChangeOutcome = ReturnType<typeof changeOutcome>
