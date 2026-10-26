/** The store's front page: title and search, categories, the weekly pick, and theme sections as plugin rows. */
import { useState, type ReactNode } from 'react'
import type { Catalog, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { InstallButton, PluginIcon, PluginMeta, PluginRows, type Translate } from './common.tsx'

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

      <nav className="ps-cats" aria-label={t('browseCategories')}>
        <button type="button" className="ps-cat" onClick={() => onOpenList({ kind: 'all' })}>{t('allPlugins')} <i>{catalog.plugins.length}</i></button>
        {catalog.categories.map(category => (
          <button key={category.id} type="button" className="ps-cat" onClick={() => onOpenList({ kind: 'category', id: category.id })}>
            {localize(category.title, lang)} <i>{category.plugins.length}</i>
          </button>
        ))}
      </nav>

      {featured && (
        <section className="ps-pick">
          <div className="ps-pick-label">{t('featured')}</div>
          <div className="ps-pick-body">
            <PluginIcon plugin={featured.plugin} lang={lang} size={56} />
            <div className="ps-pick-text">
              <div className="ps-row-head"><span className="ps-pick-title">{localize(featured.plugin.title, lang)}</span><span className="ps-row-name">{featured.plugin.name}</span></div>
              <p className="ps-pick-why">{localize(featured.subtitle, lang) || localize(featured.plugin.tagline, lang)}</p>
              <PluginMeta plugin={featured.plugin} t={t} />
              <div className="ps-pick-actions">
                <InstallButton plugin={featured.plugin} installed={installed} dshVersion={catalog.dshVersion} t={t} onClick={onInstallClick} primary />
                <button type="button" className="ps-link-btn" onClick={() => onOpenPlugin(featured.plugin.name)}>{t('viewDetails')}</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {catalog.sections.map(section => (
        <section key={section.id} className="ps-section">
          <div className="ps-section-head">
            <h3>{localize(section.title, lang)}</h3>
            {section.id === 'hot' && <span className="ps-section-note">{t('hotNote')}</span>}
            <button type="button" className="ps-link-btn ps-more" onClick={() => onOpenList({ kind: 'section', id: section.id })}>{t('seeAllCount', { count: String(section.plugins.length) })}</button>
          </div>
          <PluginRows plugins={section.plugins.slice(0, 6)} downloads={section.id === 'hot'} {...card} />
        </section>
      ))}
    </div>
  )
}
