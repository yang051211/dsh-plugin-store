/** Small shared pieces of the store UI: translation, formatting, plugin icons, install buttons and cards. */
import type { ReactNode } from 'react'
import type { Permissions, PluginUsage, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import { installStateOf, type InstallState, type Installed } from '../model/install-state.ts'

export type Translate = (key: string, params?: Record<string, string>) => string

/** Wrap a plain key lookup with `{name}` interpolation. */
export function makeTranslate(lookup: (key: string) => string): Translate {
  return (key, params) => {
    const text = lookup(key)
    return params ? text.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? `{${name}}`) : text
  }
}

/** `YYYY-MM-DD` for a Unix time in seconds or an ISO string; '' when unknown. */
export function formatDate(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || value === 0) return ''
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10)
}

/** Compact count: 1234 → 1.2k; null → —. */
export function formatCount(value: number | null): string {
  if (value === null) return '—'
  return value >= 10_000 ? `${(value / 1000).toFixed(0)}k` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
}

/** The plugin's icon, or a plain tile with its first letter in DSH's own neutral colors. Icons only ever go through <img>. */
export function PluginIcon({ plugin, lang, size = 40 }: { plugin: StorePlugin; lang: string; size?: number }): ReactNode {
  const style = { width: size, height: size, borderRadius: Math.round(size / 4.5) }
  if (plugin.icon) return <img className="ps-icon" src={plugin.icon} alt="" style={style} referrerPolicy="no-referrer" loading="lazy" />
  const letter = Array.from(localize(plugin.title, lang) || plugin.name)[0] ?? '?'
  return (
    <span className="ps-icon ps-icon-letter" style={{ ...style, fontSize: Math.round(size * 0.44) }} aria-hidden="true">
      {letter}
    </span>
  )
}

const PERMISSION_LABELS: Array<[keyof Permissions, string]> = [['network', 'permNetwork'], ['fileSystem', 'permFileSystem'], ['childProcess', 'permChildProcess'], ['agentTools', 'permAgentTools']]

/** What the reviewer found the plugin may do, in a few words; nothing at all is worth saying too. */
export function PermissionLine({ permissions, t }: { permissions: Permissions | null; t: Translate }): ReactNode {
  if (!permissions) return null
  const on = PERMISSION_LABELS.filter(([key]) => permissions[key]).map(([, label]) => t(label))
  return on.length > 0
    ? <span className="ps-perm-line">{on.join(t('listSeparator'))}</span>
    : <span className="ps-perm-line ps-perm-none">{t('touchesNothing')}</span>
}

/** Permissions, the reviewed version and (where it is the point) weekly downloads, on one quiet line. */
export function PluginMeta({ plugin, t, downloads }: { plugin: StorePlugin; t: Translate; downloads?: boolean }): ReactNode {
  const parts: ReactNode[] = []
  if (plugin.permissions) parts.push(<PermissionLine key="perm" permissions={plugin.permissions} t={t} />)
  parts.push(<span key="rev">{t('reviewedVersion', { version: plugin.review.version })}</span>)
  if (downloads && plugin.stats.weeklyDownloads !== null) parts.push(<span key="dl">{t('weeklyDownloadsShort', { count: formatCount(plugin.stats.weeklyDownloads) })}</span>)
  return <div className="ps-meta">{parts.flatMap((part, i) => (i === 0 ? [part] : [<span key={`dot${i}`} className="ps-dot" aria-hidden="true">·</span>, part]))}</div>
}

export interface InstallButtonProps {
  plugin: StorePlugin
  /** Null while the installed list is still loading or could not be read. */
  installed: Installed | null
  dshVersion: string | null
  t: Translate
  onClick: (plugin: StorePlugin, state: InstallState) => void
  large?: boolean
  /** The page's main action (the weekly pick, a detail page): filled. Everywhere else the button is outlined. */
  primary?: boolean
}

/** Why a plugin cannot be installed on the running DSH. */
export function incompatibleReason(plugin: StorePlugin, dshVersion: string | null, t: Translate): string {
  return t('incompatibleHint', { range: plugin.enginesDsh ?? '', version: dshVersion ?? '?' })
}

/**
 * Install / Installed / Update available / Incompatible (disabled, reason as a tooltip). While the installed list
 * is unknown the button is disabled, so an installed plugin never briefly offers "Install".
 */
export function InstallButton({ plugin, installed, dshVersion, t, onClick, large, primary }: InstallButtonProps): ReactNode {
  const state = installed ? installStateOf(plugin, installed) : null
  const label = t(state ?? 'install')
  const hint = state === 'incompatible' ? incompatibleReason(plugin, dshVersion, t) : undefined
  const look = state === 'installed' ? 'ps-btn-quiet' : primary && state === 'install' ? 'ps-btn-primary' : ''
  return (
    <button
      type="button"
      className={`ps-btn ${look} ${large ? 'ps-btn-large' : ''}`}
      disabled={state === null || state === 'incompatible'}
      title={hint}
      onClick={event => { event.stopPropagation(); if (state) onClick(plugin, state) }}
    >
      {label}
    </button>
  )
}

export interface CardProps {
  plugin: StorePlugin
  installed: Installed | null
  dshVersion: string | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

/** One plugin in a list: icon, name and package, one line on what it does, what it may do, and its install button. */
export function PluginRow({ plugin, installed, dshVersion, lang, t, onOpenPlugin, onInstallClick, downloads }: CardProps & { downloads?: boolean }): ReactNode {
  return (
    <li className="ps-row" role="button" tabIndex={0} onClick={() => onOpenPlugin(plugin.name)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpenPlugin(plugin.name) } }}>
      <PluginIcon plugin={plugin} lang={lang} />
      <div className="ps-row-main">
        <div className="ps-row-head"><span className="ps-row-title">{localize(plugin.title, lang)}</span><span className="ps-row-name">{plugin.name}</span></div>
        <p className="ps-row-pitch">{localize(plugin.tagline, lang)}</p>
        <PluginMeta plugin={plugin} t={t} downloads={downloads} />
      </div>
      <InstallButton plugin={plugin} installed={installed} dshVersion={dshVersion} t={t} onClick={onInstallClick} />
    </li>
  )
}

/** A list of plugin rows; two columns where there is room. */
export function PluginRows({ plugins, downloads, ...card }: Omit<CardProps, 'plugin'> & { plugins: StorePlugin[]; downloads?: boolean }): ReactNode {
  return <ul className="ps-rows">{plugins.map(plugin => <PluginRow key={plugin.name} plugin={plugin} downloads={downloads} {...card} />)}</ul>
}

/** Where to find an installed plugin and what to try, with any step it still needs called out. */
export function UsageGuide({ usage, lang, t }: { usage: PluginUsage; lang: string; t: Translate }): ReactNode {
  return (
    <dl className="ps-usage">
      <dt>{t('usageWhere')}</dt><dd>{localize(usage.where, lang)}</dd>
      <dt>{t('usageTry')}</dt><dd>{localize(usage.try, lang)}</dd>
      {usage.setup && <><dt className="ps-usage-setup">⚠ {t('usageSetup')}</dt><dd className="ps-usage-setup">{localize(usage.setup, lang)}</dd></>}
    </dl>
  )
}
