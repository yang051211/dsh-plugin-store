/** Confirmation before uninstalling, worded as DSH's own Plugins page words it. */
import { useEffect, useRef, type ReactNode } from 'react'
import type { Translate } from './common.tsx'

export interface ConfirmRemoveProps {
  title: string
  t: Translate
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmRemove({ title, t, onCancel, onConfirm }: ConfirmRemoveProps): ReactNode {
  const cancelButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    // Focus the safe choice: Enter right after opening must not uninstall.
    cancelButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  const heading = t('removeTitle', { name: title })
  return (
    <div className="ps-modal-backdrop" onClick={onCancel}>
      <div className="ps-modal" role="dialog" aria-modal="true" aria-label={heading} onClick={e => e.stopPropagation()}>
        <h3>{heading}</h3>
        <p className="ps-muted">{t('removeBody')}</p>
        <div className="ps-modal-actions">
          <button type="button" className="ps-btn" ref={cancelButton} onClick={onCancel}>{t('cancel')}</button>
          <button type="button" className="ps-btn ps-btn-danger" onClick={onConfirm}>{t('remove')}</button>
        </div>
      </div>
    </div>
  )
}
