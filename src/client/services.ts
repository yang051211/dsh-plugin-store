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
 * Install `version` over an installed plugin. DSH's install dialog refuses a name that is already installed, so this
 * goes to the plugin manager directly. With hot reload on, DSH refuses that too; then it does what DSH's own dialog
 * tells people to do: uninstall, install the new version in the same enabled state, and put the old one back if the
 * new one will not install.
 */
async function updateInPlace(pm: PluginManagerRemote, name: string, version: string, from: { current: string; enabled: boolean }): Promise<ChangeOutcome> {
  const first = await attempt(() => pm.installBundle(`${name}@${version}`, undefined))
  if (typeof first === 'string' || first.code !== 'already-installed') return first
  const removed = await attempt(() => pm.removeBundle(name))
  if (typeof removed !== 'string') return removed
  const options = { enabled: from.enabled }
  const fresh = await attempt(() => pm.installBundle(`${name}@${version}`, options))
  if (typeof fresh === 'string') return fresh
  const back = await attempt(() => pm.installBundle(`${name}@${from.current}`, options))
  const failure = { ...fresh, ...(typeof back === 'string' ? { code: 'restored', version: from.current } : { code: 'lost' }) }
  return failure
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
