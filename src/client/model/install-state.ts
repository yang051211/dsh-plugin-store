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
  /** Why DSH will not let this bundle be changed here. */
  readOnlyReason?: string
  /** DSH's `{ code, diagnostic }` for a bundle that failed to load or be managed. */
  error?: { code: string; diagnostic?: string }
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
/**
 * Where a release of this plugin is downloaded from: its npm tarball, about 200 KB. A GitHub tag would fetch the whole
 * repository, directory data included, which is tens of times larger; and DSH refuses the bare package name of a
 * plugin that is already installed, so the update names the tarball itself.
 */
const storeTarball = (version: string) => `https://registry.npmjs.org/${STORE_PACKAGE}/-/${STORE_PACKAGE}-${version}.tgz`

export interface SelfUpdate { current: string; latest: string; spec: string }

/**
 * The store's own update, offered when the installed copy is older than the published release. It is installed
 * through DSH's own installer like any plugin, never by the store replacing its files.
 */
export function selfUpdateOf(latest: string | null, installed: Installed | null): SelfUpdate | null {
  const current = installed?.get(STORE_PACKAGE)?.version
  if (!current || !latest || semver.valid(current) !== current || semver.valid(latest) !== latest) return null
  return semver.lt(current, latest) ? { current, latest, spec: storeTarball(latest) } : null
}
