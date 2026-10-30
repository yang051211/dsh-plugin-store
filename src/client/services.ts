/**
 * The store's calls to DSH's plugin manager, through the browser's Remote client. The client checks that a call passes
 * exactly the parameters DSH declares, so an optional one is passed as `undefined` rather than left out.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-plugin-manager/types'
import { installedFrom } from './model/install-state.ts'
import { changeOutcome, type ChangeOutcome } from './model/installed.ts'
import type { ChangeProgress, StoreServices } from './ui/StoreApp.tsx'

type PluginManagerRemote = Context['remote']['pluginManager']

const messageOf = (error: unknown) => String((error as Error)?.message ?? error)

/** One plugin manager change; a call that throws, such as a profile lock that timed out, reads as a failure. */
async function attempt(call: () => Promise<Parameters<typeof changeOutcome>[0]>): Promise<ChangeOutcome> {
  try {
    return changeOutcome(await call())
  } catch (error) {
    return { error: messageOf(error) }
  }
}

/**
 * DSH makes one change to the profile at a time and fails a change that waits too long for its turn, which could
 * strike an update between its uninstall and its install. So the store sends its changes one after another, and
 * tells each caller whether it is waiting behind another or running.
 */
function oneAtATime() {
  let tail: Promise<unknown> = Promise.resolve()
  let ahead = 0
  return <T>(work: () => Promise<T>, progress?: ChangeProgress): Promise<T> => {
    progress?.(ahead > 0 ? 'waiting' : 'running')
    const waited = ahead > 0
    ahead++
    const run = tail.then(() => { if (waited) progress?.('running'); return work() })
    tail = run.then(() => { ahead-- }, () => { ahead-- })
    return run
  }
}

/**
 * What DSH lists for `name` now: its version and enabled state, null when it is not installed, undefined when the
 * list cannot be read. A failed step does not say what it left behind (DSH can fail an uninstall after the package is
 * gone, and a dropped connection can hide an install that went through), so the update looks before it goes on.
 */
async function stateOf(pm: PluginManagerRemote, name: string): Promise<{ version: string; enabled: boolean } | null | undefined> {
  try {
    const found = installedFrom(await pm.listBundles()).find(bundle => bundle.name === name)
    return found ? { version: found.version ?? '', enabled: found.enabled } : null
  } catch {
    return undefined
  }
}

/** The later of two outcomes, needing a restart if either does. */
const thenRestart = (earlier: ChangeOutcome, later: ChangeOutcome): ChangeOutcome => (earlier === 'restart-required' && later === 'applied' ? earlier : later)

/**
 * Install `version` over an installed plugin. DSH's install dialog refuses a name that is already installed, so this
 * goes to the plugin manager directly, keeping the plugin enabled or disabled as it was. With hot reload on, DSH
 * refuses that too; then it does what DSH's own dialog tells people to do: uninstall, install the new version, and
 * put the old one back if the new one will not install. The outcome says `restored` when an earlier version is back,
 * `lost` only when DSH lists no version at all, and `unknown` when the list cannot be read to tell.
 */
async function updateInPlace(pm: PluginManagerRemote, name: string, version: string, from: { current: string; enabled: boolean }): Promise<ChangeOutcome> {
  const options = { enabled: from.enabled }
  const first = await attempt(() => pm.installBundle(`${name}@${version}`, options))
  if (typeof first === 'string' || first.code !== 'already-installed') return first
  const removed = await attempt(() => pm.removeBundle(name))
  if (typeof removed !== 'string') {
    const left = await stateOf(pm, name)
    // DSH disables a plugin before it uninstalls it, and may stop there.
    if (left) return { ...removed, ...(from.enabled && !left.enabled ? { disabled: true } : {}) }
    if (left === undefined) return removed
  }
  const fresh = await attempt(() => pm.installBundle(`${name}@${version}`, options))
  if (typeof fresh === 'string') return thenRestart(removed, fresh)
  const now = await stateOf(pm, name)
  if (now?.version === version) return thenRestart(removed, 'applied')
  if (now) return { ...fresh, code: 'restored', version: now.version }
  const back = await attempt(() => pm.installBundle(`${name}@${from.current}`, options))
  if (typeof back === 'string') return { ...fresh, code: 'restored', version: from.current, ...(back === 'restart-required' || removed === 'restart-required' ? { restart: true } : {}) }
  const after = await stateOf(pm, name)
  if (after) return { ...fresh, code: 'restored', version: after.version }
  return { ...fresh, code: after === null && now === null ? 'lost' : 'unknown' }
}

export function pluginManagerServices(pm: PluginManagerRemote): Pick<StoreServices, 'loadBundles' | 'setEnabled' | 'remove' | 'update' | 'inspect'> {
  const queue = oneAtATime()
  return {
    loadBundles: async () => installedFrom(await pm.listBundles()),
    setEnabled: (name, enabled, progress) => queue(() => attempt(() => pm.setBundleEnabled(name, enabled)), progress),
    remove: (name, progress) => queue(() => attempt(() => pm.removeBundle(name)), progress),
    update: (name, version, from, progress) => queue(() => updateInPlace(pm, name, version, from), progress),
    inspect: async (spec) => {
      try {
        const result = await pm.inspect(spec, undefined)
        if (!result.ok) return { ok: false, reason: messageOf(result.error) }
        const found = result.value
        // A git or path spec may not name its package or version until it is fetched; the dialog shows what it learns.
        return found.status === 'accepted' ? { ok: true, name: found.name ?? spec, version: found.version ?? '' } : { ok: false, reason: found.reason }
      } catch (error) {
        return { ok: false, reason: messageOf(error) }
      }
    },
  }
}
