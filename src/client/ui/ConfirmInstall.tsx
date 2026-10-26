/** The store's own confirmation before handing an install to DSH's install dialog. */
import { useEffect, useRef, type ReactNode } from 'react'
import type { StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import { PluginIcon, type Translate } from './common.tsx'

export interface ConfirmInstallProps {
  plugin: StorePlugin
  lang: string
  t: Translate
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmInstall({ plugin, lang, t, onCancel, onConfirm }: ConfirmInstallProps): ReactNode {
  const confirmButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    confirmButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="ps-modal-backdrop" onClick={onCancel}>
      <div className="ps-modal" role="dialog" aria-modal="true" aria-label={t('confirmTitle')} onClick={e => e.stopPropagation()}>
        <h3>{t('confirmTitle')}</h3>
        <div className="ps-modal-plugin">
          <PluginIcon plugin={plugin} lang={lang} size={48} />
          <div>
            <div className="ps-row-title">{localize(plugin.title, lang)}</div>
            <div className="ps-muted">{plugin.name}</div>
          </div>
        </div>
        <dl className="ps-facts">
          <dt>{t('confirmVersion')}</dt><dd>v{plugin.version}</dd>
          <dt>{t('confirmSource')}</dt><dd>npm</dd>
          <dt>{t('review')}</dt><dd>{plugin.review.date ? t('reviewed', { date: plugin.review.date }) : t('reviewedPlain')}</dd>
        </dl>
        <p className="ps-trust">{t('confirmTrust')}</p>
        <div className="ps-modal-actions">
          <button type="button" className="ps-btn" onClick={onCancel}>{t('cancel')}</button>
          <button type="button" className="ps-btn ps-btn-primary" ref={confirmButton} onClick={onConfirm}>{t('continue')}</button>
        </div>
      </div>
    </div>
  )
}
