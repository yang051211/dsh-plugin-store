/**
 * The store, shared by the Plugins-page tab and the full-page panel: loads the catalog and install states, keeps a
 * back stack of views (home → list → detail) with their scroll positions, and routes install clicks. Only the tab
 * can install; it confirms first. The panel hands the install over (see client.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildCatalog, searchPlugins, type Catalog, type CatalogSnapshot, type StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import type { InstallState, Installed } from '../model/install-state.ts'
import type { Translate } from './common.tsx'
import { ConfirmInstall } from './ConfirmInstall.tsx'
import { DetailView, type Load, type PluginDetail } from './DetailView.tsx'
import { Home, type ListFilter } from './Home.tsx'
import { ListView } from './ListView.tsx'

export interface StoreServices {
  loadCatalog: (refresh?: boolean) => Promise<CatalogSnapshot>
  loadDetail: (name: string) => Promise<PluginDetail>
  loadInstalled: () => Promise<Installed>
  subscribeInstalled: (onChange: () => void) => () => void
}

export interface StoreAppProps {
  mode: 'tab' | 'panel'
  lang: string
  t: Translate
  services: StoreServices
  /** Tab: called after the store's confirmation. Panel: starts the hand-over to the tab. */
  onInstall: (plugin: StorePlugin) => void
  /** Open an installed plugin's page in the Plugins manager. */
  onOpenInstalled: (plugin: StorePlugin) => void
  /** Tab only: the plugin a panel handed over, if any (taken once). */
  takePending?: () => string | null
}

type View = { view: 'home' } | { view: 'list'; filter: ListFilter } | { view: 'detail'; name: string }

export function StoreApp({ mode, lang, t, services, onInstall, onOpenInstalled, takePending }: StoreAppProps): ReactNode {
  const [catalog, setCatalog] = useState<Load<Catalog>>({ status: 'loading' })
  const [installed, setInstalled] = useState<Installed>(new Map())
  const [stack, setStack] = useState<Array<{ view: View; scroll: number }>>([{ view: { view: 'home' }, scroll: 0 }])
  const [details, setDetails] = useState<Record<string, Load<PluginDetail>>>({})
  const [confirming, setConfirming] = useState<StorePlugin | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const current = stack[stack.length - 1]!.view

  const load = useCallback((refresh = false) => {
    setCatalog(prev => (prev.status === 'ready' ? prev : { status: 'loading' }))
    services.loadCatalog(refresh)
      .then(snapshot => setCatalog({ status: 'ready', data: buildCatalog(snapshot) }))
      .catch((error: unknown) => setCatalog(prev => (prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, stale: true } } : { status: 'error', error: String((error as Error)?.message ?? error) })))
  }, [services])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let live = true
    const refresh = () => { services.loadInstalled().then(map => { if (live) setInstalled(map) }).catch(() => {}) }
    refresh()
    const unsubscribe = services.subscribeInstalled(refresh)
    return () => { live = false; unsubscribe() }
  }, [services])

  const loadDetail = useCallback((name: string) => {
    setDetails(prev => ({ ...prev, [name]: { status: 'loading' } }))
    services.loadDetail(name)
      .then(data => setDetails(prev => ({ ...prev, [name]: { status: 'ready', data } })))
      .catch((error: unknown) => setDetails(prev => ({ ...prev, [name]: { status: 'error', error: String((error as Error)?.message ?? error) } })))
  }, [services])

  const go = useCallback((view: View) => {
    const scroll = scroller.current?.scrollTop ?? 0
    setStack(prev => [...prev.slice(0, -1), { ...prev[prev.length - 1]!, scroll }, { view, scroll: 0 }])
    if (view.view === 'detail' && !details[view.name]) loadDetail(view.name)
    scroller.current?.scrollTo?.({ top: 0 })
  }, [details, loadDetail])

  const back = useCallback(() => {
    setStack(prev => {
      if (prev.length <= 1) return prev
      const next = prev.slice(0, -1)
      const restore = next[next.length - 1]!.scroll
      queueMicrotask(() => scroller.current?.scrollTo?.({ top: restore }))
      return next
    })
  }, [])

  // A plugin handed over from the panel: show it and ask for confirmation once the catalog is here.
  useEffect(() => {
    if (mode !== 'tab' || catalog.status !== 'ready' || !takePending) return
    const name = takePending()
    const plugin = name ? catalog.data.byName.get(name) : undefined
    if (plugin) { go({ view: 'detail', name: plugin.name }); setConfirming(plugin) }
  }, [mode, catalog.status, takePending]) // eslint-disable-line react-hooks/exhaustive-deps

  const onInstallClick = useCallback((plugin: StorePlugin, state: InstallState) => {
    if (state === 'installed' || state === 'update') onOpenInstalled(plugin)
    else if (state === 'install') { if (mode === 'tab') setConfirming(plugin); else onInstall(plugin) }
  }, [mode, onInstall, onOpenInstalled])

  const handlers = {
    onOpenPlugin: (name: string) => go({ view: 'detail', name }),
    onOpenList: (filter: ListFilter) => go({ view: 'list', filter }),
    onSearch: (query: string) => go({ view: 'list', filter: { kind: 'search', query } }),
    onInstallClick,
    onBack: back,
  }

  const body = useMemo(() => {
    if (catalog.status === 'loading') return <div className="ps-pad ps-muted">{t('loading')}</div>
    if (catalog.status === 'error') {
      return (
        <div className="ps-error ps-pad">
          <span>{t('loadFailed')}：{catalog.error}</span>
          <button type="button" className="ps-btn" onClick={() => load(true)}>{t('retry')}</button>
        </div>
      )
    }
    const data = catalog.data
    if (current.view === 'detail') {
      const plugin = data.byName.get(current.name)
      if (!plugin) return <ListView title={t('empty')} plugins={[]} installed={installed} lang={lang} t={t} {...handlers} />
      return <DetailView plugin={plugin} catalog={data} detail={details[plugin.name] ?? { status: 'loading' }} installed={installed} lang={lang} t={t} onRetryDetail={() => loadDetail(plugin.name)} {...handlers} />
    }
    if (current.view === 'list') {
      const filter = current.filter
      const { title, plugins } = filter.kind === 'search'
        ? { title: t('searchResults', { query: filter.query }), plugins: searchPlugins(data, filter.query) }
        : filter.kind === 'all'
          ? { title: t('allPlugins'), plugins: data.plugins }
          : (() => {
              const group = (filter.kind === 'category' ? data.categories : data.sections).find(g => g.id === filter.id)
              return { title: group ? localize(group.title, lang) : '', plugins: group?.plugins ?? [] }
            })()
      return <ListView title={title} plugins={plugins} installed={installed} dshVersion={data.dshVersion} lang={lang} t={t} {...handlers} />
    }
    return <Home catalog={data} installed={installed} lang={lang} t={t} {...handlers} />
  }, [catalog, current, details, installed, lang, t]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`ps-root ps-mode-${mode}`} ref={scroller}>
      {catalog.status === 'ready' && catalog.data.stale && (
        <div className="ps-notice ps-notice-bar">
          <span>{t('staleNotice')}</span>
          <button type="button" className="ps-link-btn" onClick={() => load(true)}>{t('refresh')}</button>
        </div>
      )}
      {body}
      {confirming && (
        <ConfirmInstall plugin={confirming} lang={lang} t={t} onCancel={() => setConfirming(null)} onConfirm={() => { const plugin = confirming; setConfirming(null); onInstall(plugin) }} />
      )}
    </div>
  )
}
