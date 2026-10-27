/** What a plugin's install button should offer, given what the profile already has. */
import semver from 'semver'
import type { StorePlugin } from './catalog.ts'

export type InstallState = 'install' | 'installed' | 'update' | 'incompatible'
export type Installed = Map<string, { version?: string }>

/** An installed bundle as `listBundles()` reports it, keeping only what the store reads. */
export interface InstalledBundle {
  name: string
  version?: string
  enabled: boolean
  installed: boolean
  official: boolean
  availability: 'installation' | 'profile' | 'missing'
  /** The spec the bundle was installed from, as `pnpm add` accepts it. */
  source?: string
  removable: boolean
  meta?: { title?: string | Record<string, string>; icon?: string }
}

/**
 * Installed bundles, from `ctx.remote.pluginManager.listBundles()`. The Remote call resolves to `{ ok, value }`
 * rather than the bare array; a failed call throws so the store can say it does not know.
 */
export function installedFrom(result: { ok: true; value: InstalledBundle[] } | { ok: false; error: unknown }): InstalledBundle[] {
  if (!result.ok) throw result.error
  return result.value.filter(b => b.installed)
}

/** Installed versions by name. */
export function installedOf(bundles: InstalledBundle[]): Installed {
  return new Map(bundles.map(b => [b.name, b.version !== undefined ? { version: b.version } : {}]))
}

/** Install, installed, update available, or incompatible with the running DSH. */
export function installStateOf(plugin: StorePlugin, installed: Installed): InstallState {
  const have = installed.get(plugin.name)
  if (have) {
    const older = have.version && semver.valid(have.version) && semver.valid(plugin.version) && semver.lt(have.version, plugin.version)
    return older ? 'update' : 'installed'
  }
  return plugin.compatibility === 'incompatible' ? 'incompatible' : 'install'
}

/** This plugin's own package name, as DSH lists it. */
export const STORE_PACKAGE = 'dsh-startide'
/** The store's name before 0.2.0. Updating from it installs this package beside it, so the old one is left to remove. */
export const LEGACY_PACKAGE = 'dsh-plugin-store'
/** Where this plugin is installed from; a release is the tag `v<version>`. */
const STORE_REPO = 'github:yang051211/dsh-startide'

export interface SelfUpdate { current: string; latest: string; spec: string }

/**
 * The store's own update, offered when the installed copy is older than the published release. It is installed
 * through DSH's own installer like any plugin, never by the store replacing its files.
 */
export function selfUpdateOf(latest: string | null, installed: Installed | null): SelfUpdate | null {
  const current = installed?.get(STORE_PACKAGE)?.version
  if (!current || !latest || semver.valid(current) !== current || semver.valid(latest) !== latest) return null
  return semver.lt(current, latest) ? { current, latest, spec: `${STORE_REPO}#v${latest}` } : null
}
