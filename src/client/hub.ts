/**
 * The store as the single plugins entry: the "keep only Startide" preference, the style that hides the official
 * heading and tab bar while it is on, and switching the Plugins page to the store's tab.
 */

/** Where the preference lives; '1' means on. Each computer keeps its own. */
export const KEEP_ONLY_KEY = 'dsh-startide:keep-only'

/** The Plugins page's own panel id. */
export const PLUGINS_PANEL_ID = 'plugins'

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

/** The preference, read and written through `getStorage`; any storage failure reads as off and is otherwise ignored. */
export function createKeepOnly(getStorage: () => PreferenceStorage) {
  const listeners = new Set<() => void>()
  return {
    get(): boolean {
      try {
        return getStorage().getItem(KEEP_ONLY_KEY) === '1'
      } catch {
        return false
      }
    },
    set(on: boolean): void {
      try {
        getStorage().setItem(KEEP_ONLY_KEY, on ? '1' : '0')
      } catch {
        // Not remembered; it still applies until DSH restarts.
      }
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type KeepOnly = ReturnType<typeof createKeepOnly>

/**
 * The official heading and tab bar, only on a page that holds the store (`.ps-root`). DSH's class names carry a
 * per-version prefix, so they are matched by suffix; when none match, nothing is hidden. Hidden tabs stay in the
 * DOM, so selectTabByLabel can still click them.
 */
export const HIDE_CSS =
  ':is([class$="_page"],[class*="_page "]):has(.ps-root) ' +
  ':is([class$="_pageHeading"],[class*="_pageHeading "],[class$="_pageTabs"],[class*="_pageTabs "]){display:none!important}'

/** Add the hide style once; the disposer of the call that added it removes it. */
export function injectHideStyle(doc: Document = document): () => void {
  if (doc.querySelector('style[data-plugin="dsh-startide-hide"]')) return () => {}
  const tag = doc.createElement('style')
  tag.dataset.plugin = 'dsh-startide-hide'
  tag.textContent = HIDE_CSS
  doc.head.appendChild(tag)
  return () => tag.remove()
}

interface TabLike { textContent: string | null; getAttribute(name: string): string | null; click(): void }
interface TabRoot { querySelectorAll(selector: string): ArrayLike<TabLike> | Iterable<TabLike> }

/**
 * Select the Plugins-page tab labelled `label` by clicking it, as a user would. DSH exposes no API to switch the
 * Plugins page to a contributed tab, but the tab bar uses role="tab" and the label is ours. Returns false when the
 * tab is not on the page.
 */
export function selectTabByLabel(root: TabRoot, label: string): boolean {
  const tab = Array.from(root.querySelectorAll('[role="tab"]') as Iterable<TabLike>).find(el => el.textContent?.trim() === label)
  if (!tab) return false
  if (tab.getAttribute('aria-selected') !== 'true') tab.click()
  return true
}

/** Retry selectTabByLabel while the Plugins page renders; resolves whether the tab was selected. */
export async function selectTabWhenReady(root: () => TabRoot, label: string, { tries = 20, delayMs = 50 } = {}): Promise<boolean> {
  for (let attempt = 0; attempt < tries; attempt++) {
    if (selectTabByLabel(root(), label)) return true
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}
