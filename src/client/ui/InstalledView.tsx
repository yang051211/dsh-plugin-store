/**
 * The Installed page: plugins with a newer version first, then the rest, then DSH's own. Updates and settings open
 * DSH's page for that plugin; only the store's own update goes straight to the installer. Enable and disable apply
 * at once, uninstall asks first, and the keep-only switch lives in the top right corner.
 */
import { useCallback, useState, type ReactNode } from 'react'
import type { ChangeOutcome, InstalledRow, InstalledRows } from '../model/installed.ts'
import type { SelfUpdate } from '../model/install-state.ts'
import { PageHeader, PluginIcon, type Translate } from './common.tsx'
import { ConfirmSpec } from './ConfirmInstall.tsx'
import { ConfirmRemove } from './ConfirmRemove.tsx'

export type Inspection = { ok: true; name: string; version: string } | { ok: false; reason: string }

export interface InstalledViewProps {
  /** Null while the first read is in flight. */
  rows: InstalledRows | null
  /** Why the installed list could not be read; the list is not shown then. */
  error: string | null
  selfUpdate: SelfUpdate | null
  t: Translate
  keepOnly: { value: boolean; set: (on: boolean) => void }
  onRetry: () => void
  onOpenPackage: (name: string) => void
  onSelfUpdate: (update: SelfUpdate) => void
  setEnabled: (name: string, enabled: boolean) => Promise<ChangeOutcome>
  remove: (name: string) => Promise<ChangeOutcome>
  inspect: (spec: string) => Promise<Inspection>
  onInstallSpec: (target: { spec: string; title: string; version: string }) => void
}

const messageOf = (error: unknown) => String((error as Error)?.message ?? error)

function Switch({ on, label, className = '', disabled, onChange }: { on: boolean; label: string; className?: string; disabled?: boolean; onChange: (on: boolean) => void }): ReactNode {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`ps-switch ${on ? 'ps-switch-on' : ''} ${className}`} disabled={disabled} onClick={() => onChange(!on)}>
      <span className="ps-switch-knob" />
    </button>
  )
}

/** The address box shown while keep-only hides DSH's own "Add plugin". */
function SpecInstall({ t, inspect, onInstallSpec }: Pick<InstalledViewProps, 't' | 'inspect' | 'onInstallSpec'>): ReactNode {
  const [spec, setSpec] = useState('')
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<{ spec: string; name: string; version: string } | null>(null)
  const cancel = useCallback(() => setConfirming(null), [])
  const submit = async () => {
    const value = spec.trim()
    if (!value || busy) return
    setBusy(true)
    setReason(null)
    try {
      const result = await inspect(value)
      // DSH's dialog installs a tab's request without asking again, so the store asks first, as it does for listed plugins.
      if (result.ok) setConfirming({ spec: value, name: result.name, version: result.version })
      else setReason(result.reason)
    } catch (error) {
      setReason(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="ps-spec" onSubmit={e => { e.preventDefault(); void submit() }}>
      <label className="ps-spec-label">{t('installFromSpec')}</label>
      <div className="ps-spec-field">
        <input className="ps-spec-input" value={spec} placeholder={t('installFromSpecPlaceholder')} spellCheck={false} onChange={e => setSpec(e.target.value)} />
        <button type="button" className="ps-btn ps-btn-primary" disabled={busy || !spec.trim()} onClick={() => void submit()}>{t('installFromSpecAction')}</button>
      </div>
      {reason && <div className="ps-row-note ps-row-error">{reason}</div>}
      {confirming && (
        <ConfirmSpec {...confirming} t={t} onCancel={cancel}
          onConfirm={() => { setConfirming(null); onInstallSpec({ spec: confirming.spec, title: confirming.name, version: confirming.version }) }} />
      )}
    </form>
  )
}

export function InstalledView(props: InstalledViewProps): ReactNode {
  const { rows, error, selfUpdate, t, keepOnly, onRetry, onOpenPackage, onSelfUpdate, setEnabled, remove } = props
  // Notes keep the row's title, so an outcome outlives a row that a refresh removed.
  const [notes, setNotes] = useState<Record<string, { title: string; text: string; error: boolean }>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [removing, setRemoving] = useState<InstalledRow | null>(null)

  /** Run one change for `name`; a restart or a failure is noted under its row, an applied change shows on refresh. */
  const change = useCallback(async ({ name, title }: InstalledRow, run: () => Promise<ChangeOutcome>) => {
    setBusy(prev => ({ ...prev, [name]: true }))
    setNotes(prev => { const { [name]: _, ...rest } = prev; return rest })
    let outcome: ChangeOutcome
    try {
      outcome = await run()
    } catch (error) {
      outcome = { error: messageOf(error) }
    }
    setBusy(prev => ({ ...prev, [name]: false }))
    if (outcome === 'restart-required') setNotes(prev => ({ ...prev, [name]: { title, text: t('restartRequired'), error: false } }))
    else if (outcome !== 'applied') setNotes(prev => ({ ...prev, [name]: { title, text: outcome.error, error: true } }))
  }, [t])

  const cancelRemove = useCallback(() => setRemoving(null), [])
  const acceptRemove = useCallback(() => {
    const row = removing
    setRemoving(null)
    if (row) void change(row, () => remove(row.name))
  }, [removing, change, remove])

  const renderRow = (row: InstalledRow) => {
    const hasUpdate = row.latest !== null && row.version !== null && rows?.updates.includes(row)
    const manageable = !row.official && !row.self
    const note = notes[row.name]
    return (
      <li key={row.name} className="ps-inst-row" data-name={row.name}>
        <PluginIcon plugin={{ name: row.name, icon: row.icon }} size={36} />
        <div className="ps-inst-main">
          <div className="ps-row-title">{row.title}</div>
          <div className="ps-inst-meta">
            <span>{row.name}</span>
            {row.version && <span>v{row.version}</span>}
            {hasUpdate && <span className="ps-inst-arrow">{t('updateArrow', { current: row.version!, latest: row.latest! })}</span>}
            {row.check === 'not-npm' && !row.official && <span className="ps-muted">{t('notNpm')}</span>}
          </div>
          {row.problem && <div className="ps-row-note ps-row-error">{row.problem}</div>}
          {note && <div className={`ps-row-note ${note.error ? 'ps-row-error' : ''}`}>{note.text}</div>}
        </div>
        <div className="ps-inst-actions">
          {hasUpdate && (
            <button type="button" className="ps-btn ps-btn-primary" disabled={row.self && !selfUpdate}
              onClick={() => (row.self ? selfUpdate && onSelfUpdate(selfUpdate) : onOpenPackage(row.name))}>
              {t('updateAction')}
            </button>
          )}
          {manageable && !row.missing && (
            <Switch on={row.enabled} label={t('enabledLabel')} disabled={busy[row.name] || row.locked} onChange={on => void change(row, () => setEnabled(row.name, on))} />
          )}
          {manageable && row.removable && !row.missing && (
            <button type="button" className="ps-btn ps-btn-quiet" disabled={busy[row.name]} onClick={() => setRemoving(row)}>{t('remove')}</button>
          )}
          <button type="button" className="ps-btn" onClick={() => onOpenPackage(row.name)}>{t('settings')}</button>
        </div>
      </li>
    )
  }

  const group = (id: keyof InstalledRows, titleKey: string) =>
    rows && rows[id].length > 0 && (
      <section className="ps-inst-group" data-group={id} key={id}>
        <h2 className="ps-inst-group-title">{t(titleKey)} <span className="ps-muted">{rows[id].length}</span></h2>
        <ul className="ps-inst-list">{rows[id].map(renderRow)}</ul>
      </section>
    )

  let body: ReactNode
  if (error) {
    body = (
      <div className="ps-error ps-pad">
        <span>{t('bundlesFailed')}：{error}</span>
        <button type="button" className="ps-btn" onClick={onRetry}>{t('retry')}</button>
      </div>
    )
  } else if (!rows) {
    body = <div className="ps-pad ps-muted">{t('loading')}</div>
  } else if (rows.updates.length + rows.others.length + rows.official.length === 0) {
    body = <div className="ps-empty">{t('installedEmpty')}</div>
  } else {
    body = <>{group('updates', 'groupUpdates')}{group('others', 'groupOthers')}{group('official', 'groupOfficial')}</>
  }

  // Outcomes whose row is gone, such as an uninstall that takes effect after a restart.
  const listed = new Set(rows ? [...rows.updates, ...rows.others, ...rows.official].map(r => r.name) : [])
  const orphans = Object.entries(notes).filter(([name]) => !listed.has(name))

  return (
    <div className="ps-installed">
      <PageHeader crumb={t('installedCrumb')} title={t('installedTitle')} intro={t('installedIntro')}>
        <div className="ps-keep">
          <div className="ps-keep-row">
            <span className="ps-row-title">{t('keepOnly')}</span>
            <Switch on={keepOnly.value} label={t('keepOnly')} className="ps-keep-only" onChange={keepOnly.set} />
          </div>
          <p className="ps-fine">{t('keepOnlyHint')}</p>
        </div>
      </PageHeader>
      {orphans.map(([name, note]) => (
        <div key={name} className={`ps-notice ps-notice-bar ${note.error ? 'ps-row-error' : ''}`}>
          <span>{note.title}：{note.text}</span>
          <button type="button" className="ps-link-btn" onClick={() => setNotes(prev => { const { [name]: _, ...rest } = prev; return rest })}>{t('dismiss')}</button>
        </div>
      ))}
      {keepOnly.value && <SpecInstall t={t} inspect={props.inspect} onInstallSpec={props.onInstallSpec} />}
      {body}
      {removing && <ConfirmRemove title={removing.title} t={t} onCancel={cancelRemove} onConfirm={acceptRemove} />}
    </div>
  )
}
