/** A grid of plugins: one category, one section, everything, or search results. */
import type { ReactNode } from 'react'
import type { StorePlugin } from '../model/catalog.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { PluginCard, type Translate } from './common.tsx'

export interface ListViewProps {
  title: string
  plugins: StorePlugin[]
  installed: Installed
  dshVersion?: string | null
  lang: string
  t: Translate
  onBack: () => void
  onOpenPlugin: (name: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
}

export function ListView({ title, plugins, installed, dshVersion = null, lang, t, onBack, onOpenPlugin, onInstallClick }: ListViewProps): ReactNode {
  return (
    <div className="ps-list">
      <button type="button" className="ps-link-btn ps-back" onClick={onBack}>{t('back')}</button>
      <h2 className="ps-list-title">{title}</h2>
      {plugins.length === 0
        ? <div className="ps-empty">{t('empty')}</div>
        : (
            <div className="ps-grid">
              {plugins.map(plugin => (
                <PluginCard key={plugin.name} plugin={plugin} installed={installed} dshVersion={dshVersion} lang={lang} t={t} onOpenPlugin={onOpenPlugin} onInstallClick={onInstallClick} />
              ))}
            </div>
          )}
    </div>
  )
}
