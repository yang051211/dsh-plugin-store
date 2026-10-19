/** Small shared pieces of the store UI: translation, formatting, plugin icons, install buttons and cards. */
import type { ReactNode } from 'react'
import type { StorePlugin } from '../model/catalog.ts'
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

const TILE_COLORS = [['#6366f1', '#8b5cf6'], ['#0ea5e9', '#22d3ee'], ['#f59e0b', '#f97316'], ['#10b981', '#34d399'], ['#ec4899', '#f43f5e'], ['#64748b', '#94a3b8']]

/** The plugin's icon, or a colored tile with its first letter. Icons only ever go through <img>. */
export function PluginIcon({ plugin, lang, size = 44 }: { plugin: StorePlugin; lang: string; size?: number }): ReactNode {
  const style = { width: size, height: size, borderRadius: Math.round(size / 4.5) }
  if (plugin.icon) return <img className="ps-icon" src={plugin.icon} alt="" style={style} referrerPolicy="no-referrer" loading="lazy" />
  let hash = 0
  for (const ch of plugin.name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const [from, to] = TILE_COLORS[hash % TILE_COLORS.length] as [string, string]
  const letter = Array.from(localize(plugin.title, lang) || plugin.name)[0] ?? '?'
  return (
    <span className="ps-icon ps-icon-tile" style={{ ...style, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {letter}
    </span>
  )
}

export interface InstallButtonProps {
  plugin: StorePlugin
  installed: Installed
  dshVersion: string | null
  t: Translate
  onClick: (plugin: StorePlugin, state: InstallState) => void
  large?: boolean
}

/** Install / Installed / Update available / Incompatible (disabled, with the reason as a tooltip). */
export function InstallButton({ plugin, installed, dshVersion, t, onClick, large }: InstallButtonProps): ReactNode {
  const state = installStateOf(plugin, installed)
  const label = t(state)
  const hint = state === 'incompatible' ? t('incompatibleHint', { range: plugin.enginesDsh ?? '', version: dshVersion ?? '?' }) : undefined
  return (
    <button
      type="button"
      className={`ps-btn ${state === 'install' ? 'ps-btn-primary' : ''} ${large ? 'ps-btn-large' : ''}`}
      disabled={state === 'incompatible'}
      title={hint}
      onClick={event => { event.stopPropagation(); onClick(plugin, state) }}
    >
      {label}
    </button>
  )
}

export interface CardProps {
  plugin: StorePlugin
  installed: Installed
  dshVersion: string | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

/** A plugin card: icon, name, pitch, version · author · stars, and its install button. */
export function PluginCard({ plugin, installed, dshVersion, lang, t, onOpenPlugin, onInstallClick }: CardProps): ReactNode {
  return (
    <div className="ps-card" role="button" tabIndex={0} onClick={() => onOpenPlugin(plugin.name)} onKeyDown={e => { if (e.key === 'Enter') onOpenPlugin(plugin.name) }}>
      <div className="ps-card-head">
        <PluginIcon plugin={plugin} lang={lang} />
        <div className="ps-card-text">
          <div className="ps-card-title">{localize(plugin.title, lang)}</div>
          <div className="ps-card-name">{plugin.name}</div>
        </div>
      </div>
      <div className="ps-card-pitch">{localize(plugin.tagline, lang)}</div>
      <div className="ps-card-foot">
        <span className="ps-muted">v{plugin.version}{plugin.author ? ` · ${plugin.author}` : ''}{plugin.stats.stars !== null ? ` · ★ ${formatCount(plugin.stats.stars)}` : ''}</span>
        <InstallButton plugin={plugin} installed={installed} dshVersion={dshVersion} t={t} onClick={onInstallClick} />
      </div>
    </div>
  )
}
