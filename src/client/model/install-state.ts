/** What a plugin's install button should offer, given what the profile already has. */
import semver from 'semver'
import type { StorePlugin } from './catalog.ts'

export type InstallState = 'install' | 'installed' | 'update' | 'incompatible'
export type Installed = Map<string, { version?: string }>

type Bundle = { name: string; installed: boolean; version?: string }

/**
 * Installed bundles by name, from `ctx.remote.pluginManager.listBundles()`. The Remote call resolves to
 * `{ ok, value }` rather than the bare array; a failed call throws so the store can say it does not know.
 */
export function installedFrom(result: { ok: true; value: Bundle[] } | { ok: false; error: unknown }): Installed {
  if (!result.ok) throw result.error
  return new Map(result.value.filter(b => b.installed).map(b => [b.name, b.version !== undefined ? { version: b.version } : {}]))
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
