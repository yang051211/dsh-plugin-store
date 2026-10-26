/** The store's front page: a directory header with the big search, then trending and two scenes as card grids. */
import type { ReactNode } from 'react'
import type { Catalog, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PageHeader, PluginGrid, SearchField, type Translate } from './common.tsx'

export type ListFilter = { kind: 'all' } | { kind: 'category'; id: string } | { kind: 'section'; id: string } | { kind: 'search'; query: string }

export interface HomeProps {
  catalog: Catalog
  installed: Installed | null
  lang: string
  t: Translate
  onOpenPlugin: (name: string) => void
  onOpenList: (filter: ListFilter) => void
  onOpenScenes: () => void
  onSearch: (query: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

const RECOMMEND_URL = 'https://github.com/yang051211/dsh-plugin-store/issues'
const icon = (d: ReactNode) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const GRID = icon(<><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>)
export const LAYERS = icon(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>)
const PLUS = icon(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>)

/** How many curated scenes follow the trending section on the home page. */
const HOME_SCENES = 2

export function Home({ catalog, installed, lang, t, onOpenPlugin, onOpenList, onOpenScenes, onSearch, onInstallClick }: HomeProps): ReactNode {
  const card = { installed, dshVersion: catalog.dshVersion, lang, t, onOpenPlugin, onInstallClick, catalog }
  const hot = catalog.sections.find(s => s.id === 'hot')
  const scenes = catalog.sections.filter(s => s.id !== 'hot').slice(0, HOME_SCENES)
  const block = (crumb: string, id: string, title: string, plugins: StorePlugin[]) => (
    <section key={id} className="ps-section">
      <div className="ps-section-head">
        <div><div className="ps-crumb">{crumb}</div><h2>{title}</h2></div>
        <button type="button" className="ps-more" onClick={() => onOpenList({ kind: 'section', id })}>{t('seeAllArrow')}</button>
      </div>
      <PluginGrid plugins={plugins.slice(0, 4)} {...card} />
    </section>
  )
  return (
    <div className="ps-home">
      <PageHeader crumb={t('homeCrumb')} title={t('homeTitle')} intro={t('homeIntro', { count: String(catalog.plugins.length) })}>
        <div>
          <SearchField t={t} onSearch={onSearch} />
          <nav className="ps-search-links" aria-label={t('browseCategories')}>
            <button type="button" onClick={() => onOpenList({ kind: 'all' })}>{GRID}{t('linkBrowseAll')}</button>
            <button type="button" onClick={onOpenScenes}>{LAYERS}{t('linkScenes')}</button>
            <a href={RECOMMEND_URL} target="_blank" rel="noopener noreferrer">{PLUS}{t('linkRecommend')}</a>
          </nav>
        </div>
      </PageHeader>
      {hot && block(t('crumbWeekly'), hot.id, localize(hot.title, lang), hot.plugins)}
      {scenes.map(scene => block(t('crumbScene'), scene.id, localize(scene.title, lang), scene.plugins))}
    </div>
  )
}
