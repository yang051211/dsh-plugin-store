/**
 * Install hand-over from the full-page panel to the Plugins-page tab: only the tab can open DSH's install dialog,
 * so the panel records the plugin, switches to the Plugins page, and the tab takes it when it next mounts. A
 * request expires after ten minutes — subscribers hear the expiry, so the notice disappears with it — and an
 * abandoned hand-over never pops up a stale confirmation later.
 */

/** How long a hand-over waits for the Store tab. */
export const HANDOFF_TTL_MS = 10 * 60 * 1000

export interface PendingInstall { name: string; title: string }

interface Timers {
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
}

const realTimers: Timers = {
  setTimer: (fn, ms) => {
    const handle = setTimeout(fn, ms)
    // Node (tests) only: an expiry timer must never keep the process alive. Browsers have no unref.
    ;(handle as { unref?: () => void }).unref?.()
    return handle
  },
  clearTimer: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export function createHandoff(now: () => number = Date.now, timers: Timers = realTimers) {
  // `view` is created once per request so peek() returns the same object until the state changes
  // (useSyncExternalStore requires a stable snapshot).
  let pending: { view: PendingInstall; at: number } | null = null
  let timer: unknown = null
  const listeners = new Set<() => void>()
  const notify = () => { for (const listener of listeners) listener() }
  const expired = () => pending !== null && now() - pending.at > HANDOFF_TTL_MS
  const clear = () => {
    if (timer !== null) timers.clearTimer(timer)
    timer = null
    pending = null
  }
  return {
    /** Record the plugin to install once the Store tab opens. */
    request(plugin: PendingInstall): void {
      clear()
      pending = { view: { name: plugin.name, title: plugin.title }, at: now() }
      timer = timers.setTimer(() => { if (expired()) { clear(); notify() } }, HANDOFF_TTL_MS + 1)
      notify()
    },
    /** The pending plugin's name, taken once; null when none or expired. */
    take(): string | null {
      if (!pending) return null
      const name = expired() ? null : pending.view.name
      clear()
      notify()
      return name
    },
    /** The pending plugin without taking it (for the notice); the same object until the state changes. */
    peek(): PendingInstall | null {
      return pending && !expired() ? pending.view : null
    },
    dismiss(): void {
      if (!pending) return
      clear()
      notify()
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type Handoff = ReturnType<typeof createHandoff>

/** The Plugins page's own panel id. */
export const PLUGINS_PANEL_ID = 'plugins'

/**
 * Open a plugin's installed page from outside the Plugins page: through DSH's `pluginNavigation` when the Plugins
 * page provides it, else by switching to the Plugins page.
 */
export function openInstalledFrom(deps: {
  navigation: () => { openBundle: (name: string) => void } | undefined
  selectPanel: (id: string) => void
}): (name: string) => void {
  return (name) => {
    const navigation = deps.navigation()
    if (navigation) navigation.openBundle(name)
    else deps.selectPanel(PLUGINS_PANEL_ID)
  }
}
