/** What a plugin's install button should offer, given what the profile already has. */
import semver from 'semver'
import type { StorePlugin } from './catalog.ts'

export type InstallState = 'install' | 'installed' | 'update' | 'incompatible'
export type Installed = Map<string, { version?: string }>

/** Installed bundles by name, from the Plugin manager's `listBundles()`. */
export function installedFrom(bundles: Array<{ name: string; installed: boolean; version?: string }>): Installed {
  return new Map(bundles.filter(b => b.installed).map(b => [b.name, b.version !== undefined ? { version: b.version } : {}]))
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
