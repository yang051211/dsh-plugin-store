/** First-run marker: the store opens itself once, right after it is installed. */

/** localStorage key recording that the first run already happened. */
export const FIRST_RUN_KEY = 'dsh-startide:first-run-done'

/**
 * Whether this load is the first one since install; records the answer so later loads say no.
 * Storage that throws answers no, so the store never opens itself repeatedly. That includes the storage getter
 * itself: with site data blocked, reading `window.localStorage` throws a SecurityError.
 * @param getStorage - returns browser storage, or a stand-in; called inside the guard.
 */
export function shouldAutoOpen(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>): boolean {
  try {
    const storage = getStorage()
    if (storage.getItem(FIRST_RUN_KEY) !== null) return false
    storage.setItem(FIRST_RUN_KEY, '1')
    return true
  } catch {
    return false
  }
}
