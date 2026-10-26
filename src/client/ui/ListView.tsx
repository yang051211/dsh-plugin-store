/**
 * All plugins, one category, or search results: the directory header with the search field, a category sidebar with
 * counts, sort and "compatible only" controls, and a card grid paged 30 at a time.
 */
import type { ReactNode } from 'react'
import { pageOf, SORT_KEYS, sortPlugins, type Catalog, type SortKey, type StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PageHeader, PluginGrid, SearchField, type Translate } from './common.tsx'
import type { ListFilter } from './Home.tsx'

/** The list's own settings, kept with the view so coming back from a plugin restores them. */
export interface ListSettings { sort: SortKey; page: number; compatibleOnly: boolean }

export interface ListViewProps extends ListSettings {
  /** The plugins the filter selects, before sorting and paging. */
  plugins: StorePlugin[]
  catalog: Pick<Catalog, 'plugins' | 'categories' | 'dshVersion'>
  filter: ListFilter
  installed: Installed | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onOpenList: (filter: ListFilter, sort?: SortKey) => void
  onSearch: (query: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
  onChange: (patch: Partial<ListSettings>) => void
}

const SORT_LABEL: Record<SortKey, string> = { popular: 'sortPopular', updated: 'sortUpdated', new: 'sortNew', stars: 'sortStars' }

export function ListView(props: ListViewProps): ReactNode {
  const { plugins, catalog, filter, sort, page, compatibleOnly, installed, lang, t, onOpenPlugin, onOpenList, onSearch, onInstallClick, onChange } = props
  const active = filter.kind === 'category' ? filter.id : filter.kind === 'all' ? 'all' : null
  const shown = sortPlugins(compatibleOnly ? plugins.filter(p => p.compatibility !== 'incompatible') : plugins, sort)
  const current = pageOf(shown, page)
  const title = filter.kind === 'search' ? t('searchResults', { query: filter.query })
    : filter.kind === 'category' ? localize(catalog.categories.find(c => c.id === filter.id)?.title, lang) || filter.id
    : t('allPlugins')
  const to = (next: number) => () => onChange({ page: next })
  return (
    <div className="ps-list">
      <PageHeader crumb={t('listCrumb')} title={t('allPlugins')} intro={t('listIntro')}>
        <div><SearchField key={filter.kind === 'search' ? filter.query : ''} t={t} onSearch={onSearch} initial={filter.kind === 'search' ? filter.query : ''} /></div>
      </PageHeader>
      <div className="ps-with-side">
        <nav className="ps-side" aria-label={t('browseCategories')}>
          <div className="ps-side-head">{t('sideCategories')}</div>
          <button type="button" className={active === 'all' ? 'ps-side-on' : ''} aria-current={active === 'all'} onClick={() => onOpenList({ kind: 'all' }, sort)}>
            {t('allPlugins')}<i>{catalog.plugins.length}</i>
          </button>
          {catalog.categories.map(category => (
            <button key={category.id} type="button" className={active === category.id ? 'ps-side-on' : ''} aria-current={active === category.id} onClick={() => onOpenList({ kind: 'category', id: category.id }, sort)}>
              {localize(category.title, lang)}<i>{category.plugins.length}</i>
            </button>
          ))}
        </nav>
        <div className="ps-list-main">
          <div className="ps-count-line">
            <h2 className="ps-list-title">{title}<small>{t('countSuffix', { count: String(shown.length) })}</small></h2>
            <div className="ps-list-tools">
              <label className="ps-check">
                <input type="checkbox" checked={compatibleOnly} onChange={e => onChange({ compatibleOnly: e.target.checked, page: 1 })} />
                {t('compatibleOnly')}
              </label>
              <label className="ps-sort">
                {t('sortLabel')}
                <select value={sort} onChange={e => onChange({ sort: e.target.value as SortKey, page: 1 })}>
                  {SORT_KEYS.map(key => <option key={key} value={key}>{t(SORT_LABEL[key])}</option>)}
                </select>
              </label>
              <span className="ps-muted">{shown.length} / {catalog.plugins.length}</span>
            </div>
          </div>
          {shown.length === 0
            ? <div className="ps-empty">{t('empty')}</div>
            : <PluginGrid plugins={current.items} columns={3} catalog={catalog} installed={installed} dshVersion={catalog.dshVersion} lang={lang} t={t} onOpenPlugin={onOpenPlugin} onInstallClick={onInstallClick} />}
          {current.pages > 1 && (
            <div className="ps-pager">
              <button type="button" className="ps-btn" disabled={current.page <= 1} onClick={to(current.page - 1)}>{t('pagePrev')}</button>
              <span>{t('pageOf', { page: String(current.page), pages: String(current.pages) })}</span>
              <button type="button" className="ps-btn" disabled={current.page >= current.pages} onClick={to(current.page + 1)}>{t('pageNext')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
