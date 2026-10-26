/** The store's front page: a directory header with the big search, then trending, recently updated and new plugins. */
import type { ReactNode } from 'react'
import { sortPlugins, type Catalog, type SortKey, type StorePlugin } from '../model/catalog.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PageHeader, PluginGrid, SearchField, type Translate } from './common.tsx'

export type ListFilter = { kind: 'all' } | { kind: 'category'; id: string } | { kind: 'search'; query: string }

export interface HomeProps {
  catalog: Catalog
  installed: Installed | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onOpenList: (filter: ListFilter, sort?: SortKey) => void
  onSearch: (query: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

export const ISSUES_URL = 'https://github.com/yang051211/dsh-plugin-store/issues'
const icon = (d: ReactNode) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const GRID = icon(<><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>)
const NOTE = icon(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /></>)

/** Cards per home section. */
const HOME_CARDS = 8
const SECTIONS: Array<{ sort: SortKey; title: string; crumb: string }> = [
  { sort: 'popular', title: 'sectionPopular', crumb: 'crumbPopular' },
  { sort: 'updated', title: 'sectionUpdated', crumb: 'crumbUpdated' },
  { sort: 'new', title: 'sectionNew', crumb: 'crumbNew' },
]

export function Home({ catalog, installed, lang, t, onOpenPlugin, onOpenList, onSearch, onInstallClick }: HomeProps): ReactNode {
  const card = { installed, dshVersion: catalog.dshVersion, lang, t, onOpenPlugin, onInstallClick, catalog }
  return (
    <div className="ps-home">
      <PageHeader crumb={t('homeCrumb')} title={t('homeTitle')} intro={t('homeIntro', { count: String(catalog.plugins.length) })}>
        <div>
          <SearchField t={t} onSearch={onSearch} />
          <nav className="ps-search-links" aria-label={t('browseCategories')}>
            <button type="button" onClick={() => onOpenList({ kind: 'all' })}>{GRID}{t('linkBrowseAll')}</button>
            <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">{NOTE}{t('linkRecommend')}</a>
          </nav>
        </div>
      </PageHeader>
      {SECTIONS.map(section => (
        <section key={section.sort} className="ps-section">
          <div className="ps-section-head">
            <div><div className="ps-crumb">{t(section.crumb)}</div><h2>{t(section.title)}</h2></div>
            <button type="button" className="ps-more" onClick={() => onOpenList({ kind: 'all' }, section.sort)}>{t('seeAllArrow')}</button>
          </div>
          <PluginGrid plugins={sortPlugins(catalog.plugins, section.sort).slice(0, HOME_CARDS)} {...card} />
        </section>
      ))}
    </div>
  )
}
