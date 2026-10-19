/**
 * Install hand-over from the full-page panel to the Plugins-page tab: only the tab can open DSH's install dialog,
 * so the panel records the plugin, switches to the Plugins page, and the tab takes it when it next mounts. A
 * request expires after ten minutes, so an abandoned hand-over never pops up a stale confirmation later.
 */

/** How long a hand-over waits for the Store tab. */
export const HANDOFF_TTL_MS = 10 * 60 * 1000

export interface PendingInstall { name: string; title: string }

export function createHandoff(now: () => number = Date.now) {
  // `view` is created once per request so peek() returns the same object until the state changes
  // (useSyncExternalStore requires a stable snapshot).
  let pending: { view: PendingInstall; at: number } | null = null
  const listeners = new Set<() => void>()
  const notify = () => { for (const listener of listeners) listener() }
  const live = () => {
    if (pending && now() - pending.at > HANDOFF_TTL_MS) pending = null
    return pending
  }
  return {
    /** Record the plugin to install once the Store tab opens. */
    request(plugin: PendingInstall): void {
      pending = { view: { name: plugin.name, title: plugin.title }, at: now() }
      notify()
    },
    /** The pending plugin's name, taken once; null when none or expired. */
    take(): string | null {
      const current = live()
      if (!current) return null
      pending = null
      notify()
      return current.view.name
    },
    /** The pending plugin without taking it (for the notice); the same object until the state changes. */
    peek(): PendingInstall | null {
      return live()?.view ?? null
    },
    dismiss(): void {
      if (!pending) return
      pending = null
      notify()
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type Handoff = ReturnType<typeof createHandoff>
