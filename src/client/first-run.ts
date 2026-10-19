/** First-run marker: the store opens itself once, right after it is installed. */

/** localStorage key recording that the first run already happened. */
export const FIRST_RUN_KEY = 'dsh-plugin-store:first-run-done'

/**
 * Whether this load is the first one since install; records the answer so later loads say no.
 * Storage that throws (private mode, blocked site data) answers no, so the store never opens itself repeatedly.
 * @param storage - browser storage, or a stand-in.
 */
export function shouldAutoOpen(storage: Pick<Storage, 'getItem' | 'setItem'>): boolean {
  try {
    if (storage.getItem(FIRST_RUN_KEY) !== null) return false
    storage.setItem(FIRST_RUN_KEY, '1')
    return true
  } catch {
    return false
  }
}
