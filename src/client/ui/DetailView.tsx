/**
 * One plugin's page: header with badges, stats and install button; screenshots; what it does; permissions
 * (reviewer verdict beside the scan result); the review; overview / changelog / versions / source tabs; related
 * plugins. Everything from the detail document is third-party text and goes through safe rendering.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { Catalog, StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import { Markdown } from '../safe/markdown.tsx'
import { npmFileBase, safeUrl } from '../safe/urls.ts'
import { formatCount, formatDate, incompatibleReason, InstallButton, PluginIcon, PluginRows, UsageGuide, type Translate } from './common.tsx'

export type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }

export interface PluginDetail {
  features?: Record<string, string[]>
  screenshots?: Array<{ url: string; caption?: Record<string, string> }>
  permissions?: Record<string, boolean>
  scanSummary?: Record<string, unknown> | null
  review?: { version?: string; date?: string; reviewer?: string; notes?: Record<string, string> }
  readme?: string
  changelog?: string | null
  related?: string[]
}

type Tab = 'readme' | 'changelog' | 'versions' | 'source'

const PERMISSIONS: Array<[string, string]> = [
  ['network', 'permNetwork'], ['fileSystem', 'permFileSystem'], ['agentTools', 'permAgentTools'],
  ['childProcess', 'permChildProcess'], ['installScripts', 'permInstallScripts'],
]

export interface DetailViewProps {
  plugin: StorePlugin
  catalog: Catalog
  detail: Load<PluginDetail>
  installed: Installed | null
  lang: string
  t: Translate
  onBack: () => void
  onOpenPlugin: (name: string) => void
  onInstallClick: (plugin: StorePlugin, state: InstallState) => void
  onRetryDetail: () => void
  initialTab?: Tab
}

function localizedList(list: Record<string, string[]> | undefined, lang: string): string[] {
  if (!list) return []
  const base = lang.split('-')[0] ?? ''
  return list[lang] ?? list[base] ?? list.zh ?? list.en ?? Object.values(list)[0] ?? []
}

function ExternalLink({ href, children }: { href: string | null; children: ReactNode }): ReactNode {
  const url = href ? safeUrl(href, null) : null
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <>{children}</>
}

export function DetailView(props: DetailViewProps): ReactNode {
  const { plugin, catalog, detail, installed, lang, t, onBack, onOpenPlugin, onInstallClick, onRetryDetail } = props
  const [tab, setTab] = useState<Tab>(props.initialTab ?? 'readme')
  const [zoom, setZoom] = useState<string | null>(null)
  useEffect(() => {
    if (!zoom) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setZoom(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])
  const data = detail.status === 'ready' ? detail.data : null
  const compat = plugin.compatibility === 'compatible' ? 'compatible' : plugin.compatibility === 'incompatible' ? 'compatNo' : 'compatUnknown'
  const features = localizedList(data?.features, lang)
  const screenshots = (data?.screenshots ?? []).map(s => ({ url: safeUrl(s.url, null), caption: localize(s.caption, lang) })).filter(s => s.url) as Array<{ url: string; caption: string }>
  // Related plugins come from the catalog build (same category, then same author); shown once the detail is here.
  const related = (data?.related ?? []).map(name => catalog.byName.get(name)).filter((p): p is StorePlugin => Boolean(p))
  const docsBase = npmFileBase(plugin.name, plugin.version)

  return (
    <div className="ps-detail">
      <button type="button" className="ps-link-btn ps-back" onClick={onBack}>{t('back')}</button>

      <header className="ps-detail-head">
        <PluginIcon plugin={plugin} lang={lang} size={72} />
        <div className="ps-detail-title">
          <h2>{localize(plugin.title, lang)} <span className="ps-muted ps-detail-name">{plugin.name}</span></h2>
          <p className="ps-detail-pitch">{localize(plugin.tagline, lang)}</p>
          <div className="ps-badges">
            <span className="ps-badge ps-badge-ok">{plugin.review.date ? t('reviewed', { date: plugin.review.date }) : t('reviewedPlain')}</span>
            <span className={`ps-badge ${plugin.compatibility === 'incompatible' ? 'ps-badge-warn' : plugin.compatibility === 'compatible' ? 'ps-badge-ok' : ''}`}>{t(compat)}</span>
          </div>
        </div>
        <div className="ps-detail-action">
          <InstallButton plugin={plugin} installed={installed} dshVersion={catalog.dshVersion} t={t} onClick={onInstallClick} large primary />
          <div className="ps-muted">v{plugin.version}</div>
        </div>
      </header>
      {plugin.compatibility === 'incompatible' && <p className="ps-reason">{incompatibleReason(plugin, catalog.dshVersion, t)}</p>}

      <div className="ps-stats">
        <div><b>{formatCount(plugin.stats.stars)}</b><span>{t('stars')}</span></div>
        <div><b>{formatCount(plugin.stats.weeklyDownloads)}</b><span>{t('weeklyDownloads')}</span></div>
        <div><b>{formatDate(plugin.publishTimestamp) || '—'}</b><span>{t('published')}</span></div>
        {plugin.stats.fetchedAt && <div className="ps-stats-asof ps-muted">{t('statsAsOf', { date: formatDate(plugin.stats.fetchedAt) })}</div>}
      </div>

      {plugin.upstreamLatest && <div className="ps-notice">{t('upstreamPending', { version: plugin.upstreamLatest })}</div>}

      {plugin.usage && (
        <section className="ps-block ps-usage-block">
          <h3>{t('usageTitle')}</h3>
          <UsageGuide usage={plugin.usage} lang={lang} t={t} />
        </section>
      )}

      {detail.status === 'loading' && <div className="ps-muted ps-pad">{t('loading')}</div>}
      {detail.status === 'error' && (
        <div className="ps-error">
          <span>{t('detailFailed')}：{detail.error}</span>
          <button type="button" className="ps-btn" onClick={onRetryDetail}>{t('retry')}</button>
        </div>
      )}

      {data && (
        <>
          {screenshots.length > 0 && (
            <section className="ps-block">
              <h3>{t('screenshots')}</h3>
              <div className="ps-shots">
                {screenshots.map(shot => (
                  <figure key={shot.url} className="ps-shot">
                    <button type="button" className="ps-shot-btn" onClick={() => setZoom(shot.url)} aria-label={shot.caption || t('screenshots')}>
                      <img src={shot.url} alt={shot.caption} referrerPolicy="no-referrer" loading="lazy" />
                    </button>
                    {shot.caption && <figcaption>{shot.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          <div className="ps-columns">
            {features.length > 0 && (
              <section className="ps-block">
                <h3>{t('whatItDoes')}</h3>
                <ul className="ps-features">{features.map(item => <li key={item}>{item}</li>)}</ul>
              </section>
            )}

            <section className="ps-block">
              <h3>{t('permissions')}</h3>
              <table className="ps-perms">
                <thead><tr><th /><th>{t('verdict')}</th><th>{t('scanResult')}</th></tr></thead>
                <tbody>
                  {PERMISSIONS.map(([key, label]) => {
                    const verdict = data.permissions?.[key]
                    const scanned = data.scanSummary ? Boolean(data.scanSummary[key]) : undefined
                    return (
                      <tr key={key}>
                        <td>{t(label)}</td>
                        <td className={verdict ? 'ps-perm-yes' : 'ps-perm-no'}>{verdict === undefined ? '—' : t(verdict ? 'yes' : 'no')}</td>
                        <td className="ps-muted">
                          {scanned === undefined ? '—' : t(scanned ? 'yes' : 'no')}
                          {scanned && verdict === false && <div className="ps-perm-note">{t('scanDisagrees', { verdict: t('no') })}</div>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="ps-fine">{t('scanNote')}</p>
            </section>

            <section className="ps-block">
              <h3>{t('review')}</h3>
              <dl className="ps-facts">
                <dt>{t('reviewer')}</dt><dd>{data.review?.reviewer ?? '—'}</dd>
                <dt>{t('reviewDate')}</dt><dd>{data.review?.date || plugin.review.date || '—'}</dd>
                <dt>{t('reviewedVersion')}</dt><dd>{data.review?.version ?? plugin.review.version}</dd>
              </dl>
              {localize(data.review?.notes, lang) && <p className="ps-review-notes">{localize(data.review?.notes, lang)}</p>}
            </section>
          </div>

          <section className="ps-block">
            <div className="ps-tabs" role="tablist">
              {(['readme', 'changelog', 'versions', 'source'] as Tab[]).map(id => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ps-tab ${tab === id ? 'ps-tab-on' : ''}`} onClick={() => setTab(id)}>
                  {t({ readme: 'tabReadme', changelog: 'tabChangelog', versions: 'tabVersions', source: 'tabSource' }[id])}
                </button>
              ))}
            </div>
            <div className="ps-tab-body">
              {tab === 'readme' && (data.readme ? <Markdown source={data.readme} base={docsBase} /> : <p className="ps-muted">{t('noReadme')}</p>)}
              {tab === 'changelog' && (data.changelog ? <Markdown source={data.changelog} base={docsBase} /> : <p className="ps-muted">{t('noChangelog')}</p>)}
              {tab === 'versions' && (
                <dl className="ps-facts">
                  <dt>{t('confirmVersion')}</dt><dd>v{plugin.version} · {formatDate(plugin.publishTimestamp)}</dd>
                  <dt>{t('enginesDsh')}</dt><dd>{plugin.enginesDsh ?? t('anyVersion')}</dd>
                  {plugin.upstreamLatest && <><dt /><dd>{t('upstreamPending', { version: plugin.upstreamLatest })}</dd></>}
                </dl>
              )}
              {tab === 'source' && (
                <dl className="ps-facts">
                  <dt>{t('author')}</dt><dd>{plugin.author ?? '—'}</dd>
                  <dt>{t('homepage')}</dt><dd>{plugin.homepage ? <ExternalLink href={plugin.homepage}>{plugin.homepage}</ExternalLink> : '—'}</dd>
                  <dt>{t('repository')}</dt><dd>{plugin.repository ? <ExternalLink href={plugin.repository.url}>{plugin.repository.url}{plugin.repository.directory ? ` / ${plugin.repository.directory}` : ''}</ExternalLink> : '—'}</dd>
                  <dt>{t('npmPackage')}</dt><dd><ExternalLink href={`https://www.npmjs.com/package/${plugin.name}/v/${plugin.version}`}>{plugin.name}@{plugin.version}</ExternalLink></dd>
                </dl>
              )}
            </div>
          </section>
        </>
      )}

      {related.length > 0 && (
        <section className="ps-block">
          <h3>{t('related')}</h3>
          <PluginRows plugins={related.slice(0, 6)} installed={installed} dshVersion={catalog.dshVersion} lang={lang} t={t} onOpenPlugin={onOpenPlugin} onInstallClick={onInstallClick} />
        </section>
      )}

      {zoom && (
        <div className="ps-zoom" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <button type="button" className="ps-zoom-close" aria-label={t('close')} autoFocus onClick={() => setZoom(null)}>×</button>
          <img src={zoom} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  )
}
