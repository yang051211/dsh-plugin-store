/**
 * One plugin's page, in the directory layout: a hero card with a stats bar; the main column with the README, versions
 * and source tabs; a side column with the install panel, automatic detection (a hint, not a review) and similar
 * plugins. The README and everything from the detail document are third-party text and go through safe rendering.
 */
import { useState, type ReactNode } from 'react'
import { sortPlugins, type Catalog, type Permissions, type StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { Markdown } from '../safe/markdown.tsx'
import { safeUrl } from '../safe/urls.ts'
import { formatCount, formatDate, incompatibleReason, InstallButton, PluginGrid, PluginIcon, type Translate } from './common.tsx'

export type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }

export interface PluginDetail {
  versions?: Array<{ version: string; publishTimestamp: number; enginesDsh: string | null }>
  scan?: { version: string; evidence?: Record<string, Array<{ file: string; line: number }>> } | null
}

export interface Readme { markdown: string; base: string }

type Tab = 'readme' | 'versions' | 'source'

const DETECTION: Array<[keyof Permissions, string]> = [
  ['network', 'permNetwork'], ['fileSystem', 'permFileSystem'], ['agentTools', 'permAgentTools'],
  ['childProcess', 'permChildProcess'], ['installScripts', 'permInstallScripts'],
]
/** Similar plugins shown beside a plugin. */
const RELATED = 3

export interface DetailViewProps {
  plugin: StorePlugin
  catalog: Catalog
  detail: Load<PluginDetail>
  readme: Load<Readme>
  installed: Installed | null
  lang: string
  t: Translate
  onBack: () => void
  onOpenPlugin: (name: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
  onRetryDetail: () => void
  onRetryReadme: () => void
  initialTab?: Tab
}

function ExternalLink({ href, children }: { href: string | null; children: ReactNode }): ReactNode {
  const url = href ? safeUrl(href, null) : null
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <>{children}</>
}

export function DetailView(props: DetailViewProps): ReactNode {
  const { plugin, catalog, detail, readme, installed, lang, t, onBack, onOpenPlugin, onInstallClick, onRetryDetail, onRetryReadme } = props
  const [tab, setTab] = useState<Tab>(props.initialTab ?? 'readme')
  const [copied, setCopied] = useState(false)
  const data = detail.status === 'ready' ? detail.data : null
  const compat = plugin.compatibility === 'compatible' ? 'compatible' : plugin.compatibility === 'incompatible' ? 'compatNo' : 'compatUnknown'
  const related = sortPlugins(catalog.plugins.filter(p => p.category === plugin.category && p.name !== plugin.name), 'popular').slice(0, RELATED)
  const versions = data?.versions?.length ? data.versions : [{ version: plugin.version, publishTimestamp: plugin.publishTimestamp, enginesDsh: plugin.enginesDsh }]
  const spec = `${plugin.name}@${plugin.version}`
  const repoUrl = plugin.repository?.url ?? plugin.homepage ?? null
  const repoHref = repoUrl ? safeUrl(repoUrl, null) : null
  const categoryTitle = localize(catalog.categories.find(c => c.id === plugin.category)?.title, lang) || plugin.category
  const copySpec = () => {
    navigator.clipboard?.writeText(spec).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => {})
  }

  return (
    <div className="ps-detail">
      <button type="button" className="ps-back" onClick={onBack}>{t('back')}</button>

      <header className="ps-hero">
        <div className="ps-hero-top">
          <PluginIcon plugin={plugin} size={64} />
          <div className="ps-hero-text">
            <div className="ps-crumb">#{plugin.category} · {categoryTitle}{plugin.author ? ` · ${plugin.author}` : ''}</div>
            <h1 className="ps-hero-title">{localize(plugin.title, lang)}</h1>
            <p className="ps-hero-pitch">{localize(plugin.description, lang)}</p>
            <div className="ps-badges">
              <span className={`ps-badge ${plugin.compatibility === 'incompatible' ? 'ps-badge-warn' : plugin.compatibility === 'compatible' ? 'ps-badge-ok' : ''}`}>{t(compat)}</span>
            </div>
          </div>
        </div>
        <div className="ps-stats">
          <span>☆ {t('stars')} <b>{formatCount(plugin.stats.stars)}</b></span>
          <span>↓ {t('weeklyDownloads')} <b>{formatCount(plugin.stats.weeklyDownloads)}</b></span>
          <span>{t('latestVersion')} <b>v{plugin.version}</b></span>
          <span>{t('published')} <b>{formatDate(plugin.publishTimestamp) || '—'}</b></span>
          <span>{t('npmPackage')} <b>{plugin.name}</b></span>
        </div>
      </header>

      <div className="ps-detail-grid">
        <div className="ps-detail-main">
          {plugin.compatibility === 'incompatible' && <p className="ps-reason">{incompatibleReason(plugin, catalog.dshVersion, t)}</p>}
          <section className="ps-block">
            <div className="ps-tabs" role="tablist">
              {(['readme', 'versions', 'source'] as Tab[]).map(id => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ps-tab ${tab === id ? 'ps-tab-on' : ''}`} onClick={() => setTab(id)}>
                  {t({ readme: 'tabReadme', versions: 'tabVersions', source: 'tabSource' }[id])}
                </button>
              ))}
            </div>
            <div className="ps-tab-body">
              {tab === 'readme' && (
                readme.status === 'loading' ? <p className="ps-muted">{t('loading')}</p>
                  : readme.status === 'error' ? (
                    <div className="ps-error">
                      <span>{t('readmeFailed')}：{readme.error}</span>
                      <button type="button" className="ps-btn" onClick={onRetryReadme}>{t('retry')}</button>
                    </div>
                  )
                  : readme.data.markdown ? <Markdown source={readme.data.markdown} base={readme.data.base} />
                  : <p className="ps-muted">{t('noReadme')}</p>
              )}
              {tab === 'versions' && (
                <>
                  {detail.status === 'error' && (
                    <div className="ps-error">
                      <span>{t('detailFailed')}：{detail.error}</span>
                      <button type="button" className="ps-btn" onClick={onRetryDetail}>{t('retry')}</button>
                    </div>
                  )}
                  <table className="ps-versions">
                    <tbody>
                      {versions.map(v => (
                        <tr key={v.version}><td>v{v.version}</td><td className="ps-muted">{formatDate(v.publishTimestamp)}</td><td className="ps-muted">{v.enginesDsh ?? t('anyVersion')}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {tab === 'source' && (
                <dl className="ps-facts">
                  <dt>{t('author')}</dt><dd>{plugin.author ?? '—'}</dd>
                  <dt>{t('homepage')}</dt><dd>{plugin.homepage ? <ExternalLink href={plugin.homepage}>{plugin.homepage}</ExternalLink> : '—'}</dd>
                  <dt>{t('repository')}</dt><dd>{plugin.repository ? <ExternalLink href={plugin.repository.url}>{plugin.repository.url}{plugin.repository.directory ? ` / ${plugin.repository.directory}` : ''}</ExternalLink> : '—'}</dd>
                  <dt>{t('npmPackage')}</dt><dd><ExternalLink href={`https://www.npmjs.com/package/${plugin.name}/v/${plugin.version}`}>{spec}</ExternalLink></dd>
                </dl>
              )}
            </div>
          </section>
        </div>

        <aside className="ps-detail-side">
          <section className="ps-panel">
            <div className="ps-panel-label">{t('panelInstall')}</div>
            <InstallButton plugin={plugin} installed={installed} dshVersion={catalog.dshVersion} t={t} onClick={onInstallClick} large primary />
            <p className="ps-fine">{t('installHint')}</p>
            <div className="ps-cmd">
              <div className="ps-cmd-head"><span>{t('orAddPlugin')}</span><button type="button" onClick={copySpec}>{t(copied ? 'copied' : 'copy')}</button></div>
              <code>{spec}</code>
            </div>
            {repoHref && <a className="ps-btn ps-btn-block" href={repoHref} target="_blank" rel="noopener noreferrer">{t('viewOnGitHub')}</a>}
          </section>

          <section className="ps-panel">
            <h3>{t('detection')}</h3>
            {plugin.permissions ? (
              <table className="ps-perms">
                <tbody>
                  {DETECTION.map(([key, label]) => {
                    const hit = plugin.permissions![key]
                    const where = data?.scan?.evidence?.[key]?.[0]
                    return (
                      <tr key={key}>
                        <td>{t(label)}</td>
                        <td className={hit ? 'ps-perm-yes' : 'ps-perm-no'}>{t(hit ? 'yes' : 'no')}</td>
                        <td className="ps-muted ps-perm-where">{hit && where ? `${where.file}:${where.line}` : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <p className="ps-muted">{t(plugin.scanFailed ? 'scanFailed' : 'notScanned')}</p>}
            {plugin.permissions && plugin.opaque && <p className="ps-notice ps-detect-opaque">{t('detectionOpaque')}</p>}
            <p className="ps-fine">{t('detectionNote')}</p>
          </section>

          {related.length > 0 && (
            <section className="ps-related">
              <div className="ps-panel-label">{t('related')}</div>
              <PluginGrid plugins={related} columns={3} catalog={catalog} installed={installed} dshVersion={catalog.dshVersion} lang={lang} t={t} onOpenPlugin={onOpenPlugin} onInstallClick={onInstallClick} />
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
