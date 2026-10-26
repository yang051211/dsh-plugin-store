/** Small shared pieces of the store UI: translation, formatting, plugin icons, install buttons and cards. */
import { useState, type ReactNode } from 'react'
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

const AVATAR_TONES: Array<[string, string, string]> = [['#c9f2d8', '#8fd6ae', '#1f5c3a'], ['#f6c9d6', '#e79ab3', '#7a2445'], ['#c9e8f6', '#8fc7e6', '#1c5371'], ['#e3d4f6', '#b9a0e8', '#4b2f7f'], ['#f6dfc4', '#e7b47f', '#7a4a17'], ['#d5dae3', '#a9b2c3', '#323a49']]

/** Two letters for a plugin without an icon: the first letters of its package name's words, without scope and dsh- prefix. */
export function initialsOf(name: string): string {
  const words = name.replace(/^@[^/]+\//, '').replace(/^dsh-(?:plugin-)?/, '').split(/[-_.]/).filter(Boolean)
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** The plugin's icon, or its initials on a soft tile picked by name. Icons only ever go through <img>. */
export function PluginIcon({ plugin, size = 38 }: { plugin: StorePlugin; lang?: string; size?: number }): ReactNode {
  const style = { width: size, height: size, borderRadius: Math.round(size / 4.2) }
  if (plugin.icon) return <img className="ps-icon" src={plugin.icon} alt="" style={style} referrerPolicy="no-referrer" loading="lazy" />
  let hash = 0
  for (const ch of plugin.name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const [from, to, ink] = AVATAR_TONES[hash % AVATAR_TONES.length]!
  return (
    <span className="ps-icon ps-icon-letters" style={{ ...style, background: `linear-gradient(145deg, ${from}, ${to})`, color: ink, fontSize: Math.round(size * 0.37) }} aria-hidden="true">
      {initialsOf(plugin.name)}
    </span>
  )
}

export interface InstallButtonProps {
  plugin: StorePlugin
  /** Null while the installed list is still loading or could not be read. */
  installed: Installed | null
  dshVersion: string | null
  t: Translate
  onClick: (plugin: StorePlugin, state: InstallState) => void
  large?: boolean
  /** The page's main action (a plugin page): filled. Everywhere else the button is outlined. */
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

/** Keywords worth showing: the package's own, minus generic ecosystem words. */
export function keywordsOf(plugin: StorePlugin): string[] {
  return plugin.keywords.filter(word => !/dsh|deepseek|harness|cordis|plugin|^agent$|^ai$/i.test(word)).slice(0, 3)
}

/**
 * One plugin as a card, in the directory layout: icon, name and package; category and latest version; the category
 * and a few keywords; three lines on what it does; stars, weekly downloads, and whether it is installed. The whole
 * card opens the plugin; installing happens on its page.
 */
export function PluginCard({ plugin, installed, lang, t, onOpenPlugin, categoryTitle }: CardProps & { categoryTitle: string }): ReactNode {
  const isInstalled = installed?.has(plugin.name) ?? false
  return (
    <button type="button" className="ps-card" onClick={() => onOpenPlugin(plugin.name)}>
      <span className="ps-card-hd">
        <PluginIcon plugin={plugin} />
        <span className="ps-card-id"><b>{localize(plugin.title, lang)}</b><span>{plugin.name}</span></span>
      </span>
      <span className="ps-card-bd">
        <span className="ps-card-tags"><span>#{plugin.category}</span><span>v{plugin.version}</span></span>
        <span className="ps-chips"><span className="ps-chip ps-chip-main">{categoryTitle}</span>{keywordsOf(plugin).map(word => <span key={word} className="ps-chip">{word}</span>)}</span>
        <span className="ps-card-pitch">{localize(plugin.description, lang)}</span>
      </span>
      <span className="ps-card-ft">
        <span title={t('stars')}>☆ {formatCount(plugin.stats.stars)}</span>
        <span title={t('weeklyDownloads')}>↓ {formatCount(plugin.stats.weeklyDownloads)}</span>
        <span className={`ps-card-open ${isInstalled ? 'ps-card-done' : ''}`}>{t(isInstalled ? 'installed' : 'cardView')} ↗</span>
      </span>
    </button>
  )
}

/** A grid of plugin cards; `columns` is the most it uses on a wide page. */
export function PluginGrid({ plugins, columns = 4, catalog, ...card }: Omit<CardProps, 'plugin'> & { plugins: StorePlugin[]; columns?: 3 | 4; catalog: { categories: Array<{ id: string; title: unknown }> } }): ReactNode {
  const titleOf = (id: string) => localize(catalog.categories.find(c => c.id === id)?.title as never, card.lang) || id
  return <div className={`ps-grid ps-grid-${columns}`}>{plugins.map(plugin => <PluginCard key={plugin.name} plugin={plugin} categoryTitle={titleOf(plugin.category)} {...card} />)}</div>
}

/** The page header every view shares: a path-like breadcrumb, a title, one line, and an optional right side. */
export function PageHeader({ crumb, title, intro, children }: { crumb: string; title: string; intro?: string; children?: ReactNode }): ReactNode {
  return (
    <section className={`ps-ph ${children ? 'ps-ph-split' : ''}`}>
      <div>
        <div className="ps-crumb">{crumb}</div>
        <h1 className="ps-ph-title">{title}</h1>
        {intro && <p className="ps-ph-intro">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

const SEARCH_ICON = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>

/** The big search field with its button. */
export function SearchField({ t, onSearch, initial = '' }: { t: Translate; onSearch: (query: string) => void; initial?: string }): ReactNode {
  const [query, setQuery] = useState(initial)
  return (
    <form className="ps-search" role="search" onSubmit={e => { e.preventDefault(); if (query.trim()) onSearch(query.trim()) }}>
      {SEARCH_ICON}
      <input value={query} placeholder={t('searchPlaceholder')} aria-label={t('search')} onChange={e => setQuery(e.target.value)} />
      <button type="submit" className="ps-btn ps-btn-primary">{t('searchButton')}</button>
    </form>
  )
}
