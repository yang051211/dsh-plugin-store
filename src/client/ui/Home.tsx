/** The store's front page: search, the featured banner, categories, and theme sections. */
import { useState, type ReactNode } from 'react'
import type { Catalog, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PluginCard, PluginIcon, type Translate } from './common.tsx'

export type ListFilter = { kind: 'all' } | { kind: 'category'; id: string } | { kind: 'section'; id: string } | { kind: 'search'; query: string }

export interface HomeProps {
  catalog: Catalog
  installed: Installed | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onOpenList: (filter: ListFilter) => void
  onSearch: (query: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

export function SearchBox({ t, onSearch, initial = '' }: { t: Translate; onSearch: (query: string) => void; initial?: string }): ReactNode {
  const [query, setQuery] = useState(initial)
  return (
    <form className="ps-search" onSubmit={e => { e.preventDefault(); onSearch(query) }}>
      <span className="ps-search-icon" aria-hidden="true">⌕</span>
      <input value={query} placeholder={t('search')} aria-label={t('search')} onChange={e => setQuery(e.target.value)} />
    </form>
  )
}

export function Home({ catalog, installed, lang, t, onOpenPlugin, onOpenList, onSearch, onInstallClick }: HomeProps): ReactNode {
  const featured = catalog.featured
  const card = { installed, dshVersion: catalog.dshVersion, lang, t, onOpenPlugin, onInstallClick }
  return (
    <div className="ps-home">
      <div className="ps-toolbar">
        <h2 className="ps-store-title">{localize(catalog.title, lang)}</h2>
        <SearchBox t={t} onSearch={onSearch} />
      </div>

      {featured && (
        <div className="ps-banner" style={{ background: `linear-gradient(135deg, ${featured.gradient[0]}, ${featured.gradient[1]})` }}>
          <div className="ps-banner-text">
            <div className="ps-banner-kicker">{t('featured')}</div>
            <div className="ps-banner-title">{localize(featured.title, lang) || localize(featured.plugin.title, lang)}</div>
            <div className="ps-banner-subtitle">{localize(featured.subtitle, lang) || localize(featured.plugin.tagline, lang)}</div>
            <button type="button" className="ps-banner-btn" onClick={() => onOpenPlugin(featured.plugin.name)}>{t('viewDetails')}</button>
          </div>
          <PluginIcon plugin={featured.plugin} lang={lang} size={96} />
        </div>
      )}

      <section className="ps-section">
        <div className="ps-section-head"><h3>{t('browseCategories')}</h3></div>
        <nav className="ps-chips" aria-label={t('browseCategories')}>
          <button type="button" className="ps-chip" onClick={() => onOpenList({ kind: 'all' })}>{t('allPlugins')} · {catalog.plugins.length}</button>
          {catalog.categories.map(category => (
            <button key={category.id} type="button" className="ps-chip" onClick={() => onOpenList({ kind: 'category', id: category.id })}>
              {localize(category.title, lang)} · {category.plugins.length}
            </button>
          ))}
        </nav>
      </section>

      {catalog.sections.map(section => (
        <section key={section.id} className="ps-section">
          <div className="ps-section-head">
            <h3>{localize(section.title, lang)}</h3>
            <button type="button" className="ps-link-btn" onClick={() => onOpenList({ kind: 'section', id: section.id })}>{t('seeAll')}</button>
          </div>
          <div className="ps-row">
            {section.plugins.slice(0, 6).map(plugin => <PluginCard key={plugin.name} plugin={plugin} {...card} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
