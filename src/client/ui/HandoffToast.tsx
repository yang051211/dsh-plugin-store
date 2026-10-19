/** Frame-wide notice while a hand-over waits: tells the user to open the Store tab. */
import { useSyncExternalStore, type ReactNode } from 'react'
import type { Handoff } from '../handoff.ts'
import type { Translate } from './common.tsx'

export function HandoffToast({ handoff, t }: { handoff: Handoff; t: Translate }): ReactNode {
  const pending = useSyncExternalStore(handoff.subscribe, handoff.peek, () => null)
  if (!pending) return null
  return (
    <div className="ps-toast" role="status">
      <span>{t('handoff', { name: pending.title })}</span>
      <button type="button" className="ps-link-btn" onClick={() => handoff.dismiss()}>{t('dismiss')}</button>
    </div>
  )
}
