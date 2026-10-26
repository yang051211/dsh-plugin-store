/** Scenes: every curated section as a card, and one scene's own page with its plugins. */
import type { ReactNode } from 'react'
import type { Catalog, Grouping, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PageHeader, PluginGrid, type Translate } from './common.tsx'
import { LAYERS, type ListFilter } from './Home.tsx'

/** The curated scenes, without the generated trending section. */
export const scenesOf = (catalog: Pick<Catalog, 'sections'>): Grouping[] => catalog.sections.filter(s => s.id !== 'hot')

export function ScenesView({ catalog, lang, t, onOpenScene }: { catalog: Catalog; lang: string; t: Translate; onOpenScene: (id: string) => void }): ReactNode {
  return (
    <div className="ps-scenes">
      <PageHeader crumb={t('scenesCrumb')} title={t('scenesTitle')} intro={t('scenesIntro')} />
      <div className="ps-grid ps-grid-3">
        {scenesOf(catalog).map(scene => (
          <button key={scene.id} type="button" className="ps-scene" onClick={() => onOpenScene(scene.id)}>
            <span className="ps-scene-icon">{LAYERS}</span>
            <b>{localize(scene.title, lang)}</b>
            {localize(scene.description, lang) && <span className="ps-scene-note">{localize(scene.description, lang)}</span>}
            <em>{t('scenePlugins', { count: String(scene.plugins.length) })}</em>
          </button>
        ))}
      </div>
    </div>
  )
}

export interface SceneViewProps {
  scene: Grouping
  catalog: Catalog
  installed: Installed | null
  lang: string
  t: Translate
  onBack: () => void
  onOpenList: (filter: ListFilter) => void
  onOpenPlugin: (name: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

export function SceneView({ scene, catalog, installed, lang, t, onBack, onOpenList, onOpenPlugin, onInstallClick }: SceneViewProps): ReactNode {
  return (
    <div className="ps-scene-page">
      <button type="button" className="ps-back" onClick={onBack}>{t('back')}</button>
      <PageHeader crumb={t('sceneCrumb')} title={localize(scene.title, lang)} intro={localize(scene.description, lang) || undefined} />
      <div className="ps-bar-note">
        <span>{LAYERS} {t('sceneCount', { count: String(scene.plugins.length) })}</span>
        <button type="button" className="ps-btn" onClick={() => onOpenList({ kind: 'all' })}>{t('browseAllArrow')}</button>
      </div>
      <PluginGrid plugins={scene.plugins} catalog={catalog} installed={installed} dshVersion={catalog.dshVersion} lang={lang} t={t} onOpenPlugin={onOpenPlugin} onInstallClick={onInstallClick} />
    </div>
  )
}
