/** The store's own confirmations before handing an install to DSH's install dialog, which then installs at once. */
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

/** Focus the confirm button on open; Escape cancels. */
function useDialog(onCancel: () => void) {
  const confirmButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    confirmButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return confirmButton
}

export function ConfirmInstall({ plugin, lang, t, onCancel, onConfirm }: ConfirmInstallProps): ReactNode {
  const confirmButton = useDialog(onCancel)
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
          {plugin.author && <><dt>{t('author')}</dt><dd>{plugin.author}</dd></>}
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

export interface ConfirmUpdateProps {
  title: string
  current: string
  latest: string
  t: Translate
  onCancel: () => void
  onConfirm: () => void
}

/** Before updating an installed plugin in place: the store installs the new version itself, so it asks here. */
export function ConfirmUpdate({ title, current, latest, t, onCancel, onConfirm }: ConfirmUpdateProps): ReactNode {
  const confirmButton = useDialog(onCancel)
  const heading = t('updateTitle', { name: title })
  return (
    <div className="ps-modal-backdrop" onClick={onCancel}>
      <div className="ps-modal" role="dialog" aria-modal="true" aria-label={heading} onClick={e => e.stopPropagation()}>
        <h3>{heading}</h3>
        <dl className="ps-facts">
          <dt>{t('confirmVersion')}</dt><dd>{t('updateArrow', { current, latest })}</dd>
          <dt>{t('confirmSource')}</dt><dd>npm</dd>
        </dl>
        <p className="ps-fine">{t('updateHint')}</p>
        <p className="ps-trust">{t('confirmTrust')}</p>
        <div className="ps-modal-actions">
          <button type="button" className="ps-btn" onClick={onCancel}>{t('cancel')}</button>
          <button type="button" className="ps-btn ps-btn-primary" ref={confirmButton} onClick={onConfirm}>{t('updateConfirm')}</button>
        </div>
      </div>
    </div>
  )
}

export interface ConfirmSpecProps {
  spec: string
  name: string
  version: string
  t: Translate
  onCancel: () => void
  onConfirm: () => void
}

/** The same confirmation for an address typed on the Installed page: what DSH read from it, and the address itself. */
export function ConfirmSpec({ spec, name, version, t, onCancel, onConfirm }: ConfirmSpecProps): ReactNode {
  const confirmButton = useDialog(onCancel)
  return (
    <div className="ps-modal-backdrop" onClick={onCancel}>
      <div className="ps-modal" role="dialog" aria-modal="true" aria-label={t('confirmTitle')} onClick={e => e.stopPropagation()}>
        <h3>{t('confirmTitle')}</h3>
        <div className="ps-modal-plugin">
          <PluginIcon plugin={{ name, icon: null }} size={48} />
          <div className="ps-row-title">{name}</div>
        </div>
        <dl className="ps-facts">
          {version && <><dt>{t('confirmVersion')}</dt><dd>v{version}</dd></>}
          <dt>{t('confirmSource')}</dt><dd className="ps-spec-text">{spec}</dd>
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
