/**
 * All plugins, one category, or search results: the directory header with the search field, a category sidebar with
 * counts, and a card grid with "shown / total". A scene opens its own page (Scenes.tsx).
 */
import type { ReactNode } from 'react'
import type { Catalog, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PageHeader, PluginGrid, SearchField, type Translate } from './common.tsx'
import type { ListFilter } from './Home.tsx'

export interface ListViewProps {
  title: string
  plugins: StorePlugin[]
  catalog: Pick<Catalog, 'plugins' | 'categories' | 'dshVersion'>
  filter: ListFilter
  installed: Installed | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onOpenList: (filter: ListFilter) => void
  onSearch: (query: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

export function ListView({ title, plugins, catalog, filter, installed, lang, t, onOpenPlugin, onOpenList, onSearch, onInstallClick }: ListViewProps): ReactNode {
  const active = filter.kind === 'category' ? filter.id : filter.kind === 'all' ? 'all' : null
  return (
    <div className="ps-list">
      <PageHeader crumb={t('listCrumb')} title={t('allPlugins')} intro={t('listIntro')}>
        <div><SearchField key={filter.kind === 'search' ? filter.query : ''} t={t} onSearch={onSearch} initial={filter.kind === 'search' ? filter.query : ''} /></div>
      </PageHeader>
      <div className="ps-with-side">
        <nav className="ps-side" aria-label={t('browseCategories')}>
          <div className="ps-side-head">{t('sideCategories')}</div>
          <button type="button" className={active === 'all' ? 'ps-side-on' : ''} aria-current={active === 'all'} onClick={() => onOpenList({ kind: 'all' })}>
            {t('allPlugins')}<i>{catalog.plugins.length}</i>
          </button>
          {catalog.categories.map(category => (
            <button key={category.id} type="button" className={active === category.id ? 'ps-side-on' : ''} aria-current={active === category.id} onClick={() => onOpenList({ kind: 'category', id: category.id })}>
              {localize(category.title, lang)}<i>{category.plugins.length}</i>
            </button>
          ))}
        </nav>
        <div className="ps-list-main">
          <div className="ps-count-line">
            <h2 className="ps-list-title">{title}<small>{t('countSuffix', { count: String(plugins.length) })}</small></h2>
            <span>{plugins.length} / {catalog.plugins.length}</span>
          </div>
          {plugins.length === 0
            ? <div className="ps-empty">{t('empty')}</div>
            : <PluginGrid plugins={plugins} columns={3} catalog={catalog} installed={installed} dshVersion={catalog.dshVersion} lang={lang} t={t} onOpenPlugin={onOpenPlugin} onInstallClick={onInstallClick} />}
        </div>
      </div>
    </div>
  )
}
