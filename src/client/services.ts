/**
 * The store's calls to DSH's plugin manager, through the browser's Remote client. The client checks that a call passes
 * exactly the parameters DSH declares, so an optional one is passed as `undefined` rather than left out.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-plugin-manager/types'
import { installedFrom } from './model/install-state.ts'
import { changeOutcome } from './model/installed.ts'
import type { StoreServices } from './ui/StoreApp.tsx'

type PluginManagerRemote = Context['remote']['pluginManager']

const messageOf = (error: unknown) => String((error as Error)?.message ?? error)

export function pluginManagerServices(pm: PluginManagerRemote): Pick<StoreServices, 'loadBundles' | 'setEnabled' | 'remove' | 'update' | 'inspect'> {
  return {
    loadBundles: async () => installedFrom(await pm.listBundles()),
    setEnabled: async (name, enabled) => changeOutcome(await pm.setBundleEnabled(name, enabled)),
    remove: async (name) => changeOutcome(await pm.removeBundle(name)),
    // DSH's install dialog refuses a name that is already installed, so an update goes to the plugin manager directly.
    update: async (name, version) => changeOutcome(await pm.installBundle(`${name}@${version}`, undefined)),
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
