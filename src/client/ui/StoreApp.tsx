/**
 * The store, shared by the Plugins-page tab and the full-page panel: loads the catalog and install states, keeps a
 * back stack of views (home → list → detail) with their scroll positions, and routes install clicks. Only the tab
 * can install; it confirms first. The panel hands the install over (see client.ts).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildCatalog, searchPlugins, type Catalog, type CatalogSnapshot, type StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import { installStateOf, selfUpdateOf, STORE_PACKAGE, type InstallState, type Installed, type SelfUpdate } from '../model/install-state.ts'
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
  /** Install a newer release of the store itself through DSH's installer. */
  onSelfUpdate: (update: SelfUpdate) => void
  /** Open an installed plugin's page in the Plugins manager. */
  onOpenInstalled: (plugin: StorePlugin) => void
  /** Tab only: the plugin a panel handed over, if any (taken once). */
  takePending?: () => string | null
}

export type View = { view: 'home' } | { view: 'list'; filter: ListFilter } | { view: 'detail'; name: string }
export type Stack = Array<{ view: View; scroll: number }>

/** Push `view`, remembering where the current view was scrolled. */
export function navigate(stack: Stack, view: View, currentScroll: number): Stack {
  return [...stack.slice(0, -1), { ...stack[stack.length - 1]!, scroll: currentScroll }, { view, scroll: 0 }]
}

/** Pop the current view; `restore` is the scroll position to return to, or null when already at the root. */
export function goBack(stack: Stack): { stack: Stack; restore: number | null } {
  if (stack.length <= 1) return { stack, restore: null }
  const next = stack.slice(0, -1)
  return { stack: next, restore: next[next.length - 1]!.scroll }
}

interface Scrollable { scrollHeight: number; clientHeight: number; parentElement: Scrollable | null }

/** The nearest ancestor (or the element itself) that scrolls: overflow auto/scroll with content taller than it. */
export function scrollParentOf<T extends Scrollable>(element: T | null, overflowOf: (el: T) => string): T | null {
  for (let el: T | null = element; el; el = el.parentElement as T | null) {
    if (/(auto|scroll)/.test(overflowOf(el)) && el.scrollHeight > el.clientHeight) return el
  }
  return null
}

const messageOf = (error: unknown) => String((error as Error)?.message ?? error)

export function StoreApp({ mode, lang, t, services, onInstall, onSelfUpdate, onOpenInstalled, takePending }: StoreAppProps): ReactNode {
  const [catalog, setCatalog] = useState<Load<Catalog>>({ status: 'loading' })
  const [installed, setInstalled] = useState<Installed | null>(null)
  const [installedUnknown, setInstalledUnknown] = useState(false)
  const [stack, setStack] = useState<Stack>([{ view: { view: 'home' }, scroll: 0 }])
  const [details, setDetails] = useState<Record<string, Load<PluginDetail>>>({})
  const [confirming, setConfirming] = useState<StorePlugin | null>(null)
  const root = useRef<HTMLDivElement | null>(null)
  const pendingScroll = useRef<number | null>(null)
  // Each async read carries a sequence number; a response that is no longer the latest is dropped.
  const seq = useRef({ catalog: 0, installed: 0, detail: {} as Record<string, number> })
  const current = stack[stack.length - 1]!.view

  /** The element that actually scrolls: the panel root, or the Plugins page container around the tab. */
  const scroller = useCallback((): HTMLElement | null => {
    const el = root.current
    if (!el) return null
    if (mode === 'panel') return el
    return scrollParentOf<HTMLElement>(el.parentElement, node => getComputedStyle(node).overflowY) ?? (document.scrollingElement as HTMLElement | null)
  }, [mode])

  const load = useCallback((refresh = false) => {
    const id = ++seq.current.catalog
    setCatalog(prev => (prev.status === 'ready' ? prev : { status: 'loading' }))
    services.loadCatalog(refresh).then(
      snapshot => { if (id === seq.current.catalog) setCatalog({ status: 'ready', data: buildCatalog(snapshot) }) },
      (error: unknown) => {
        if (id !== seq.current.catalog) return
        setCatalog(prev => (prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, stale: true } } : { status: 'error', error: messageOf(error) }))
      },
    )
  }, [services])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let live = true
    const refresh = () => {
      const id = ++seq.current.installed
      // A failed read falls back to "nothing installed": buttons stay usable, and DSH's own install dialog still
      // refuses a plugin that is already there. Only the first read in flight keeps the buttons disabled.
      services.loadInstalled().then(
        map => { if (live && id === seq.current.installed) { setInstalled(map); setInstalledUnknown(false) } },
        () => { if (live && id === seq.current.installed) { setInstalled(prev => prev ?? new Map()); setInstalledUnknown(true) } },
      )
    }
    refresh()
    const unsubscribe = services.subscribeInstalled(refresh)
    return () => { live = false; unsubscribe() }
  }, [services])

  const loadDetail = useCallback((name: string) => {
    const id = (seq.current.detail[name] ?? 0) + 1
    seq.current.detail[name] = id
    setDetails(prev => ({ ...prev, [name]: { status: 'loading' } }))
    services.loadDetail(name).then(
      data => { if (seq.current.detail[name] === id) setDetails(prev => ({ ...prev, [name]: { status: 'ready', data } })) },
      (error: unknown) => { if (seq.current.detail[name] === id) setDetails(prev => ({ ...prev, [name]: { status: 'error', error: messageOf(error) } })) },
    )
  }, [services])

  const go = useCallback((view: View) => {
    const scroll = scroller()?.scrollTop ?? 0
    setStack(prev => navigate(prev, view, scroll))
    pendingScroll.current = 0
    if (view.view === 'detail' && !details[view.name]) loadDetail(view.name)
  }, [details, loadDetail, scroller])

  const back = useCallback(() => {
    setStack(prev => {
      const { stack: next, restore } = goBack(prev)
      pendingScroll.current = restore
      return next
    })
  }, [])

  // Apply a scroll change after the new view is committed, so it lands on the right content.
  useLayoutEffect(() => {
    if (pendingScroll.current === null) return
    const top = pendingScroll.current
    pendingScroll.current = null
    const el = scroller()
    if (el) el.scrollTop = top
  }, [stack, scroller])

  // A plugin handed over from the panel: once the catalog and install states are known, show it, and ask for
  // confirmation only if it still needs installing.
  const handedOver = useRef(false)
  useEffect(() => {
    if (handedOver.current || mode !== 'tab' || !takePending || catalog.status !== 'ready' || installed === null) return
    handedOver.current = true
    const name = takePending()
    if (name === STORE_PACKAGE) {
      const update = selfUpdateOf(catalog.data.storeVersion, installed)
      if (update) onSelfUpdate(update)
      return
    }
    const plugin = name ? catalog.data.byName.get(name) : undefined
    if (!plugin) return
    go({ view: 'detail', name: plugin.name })
    if (installStateOf(plugin, installed) === 'install') setConfirming(plugin)
  }, [mode, takePending, catalog, installed, go, onSelfUpdate])

  const onInstallClick = useCallback((plugin: StorePlugin, state: InstallState) => {
    if (state === 'installed' || state === 'update') onOpenInstalled(plugin)
    else if (state === 'install') { if (mode === 'tab') setConfirming(plugin); else onInstall(plugin) }
  }, [mode, onInstall, onOpenInstalled])

  const cancelConfirm = useCallback(() => setConfirming(null), [])
  const acceptConfirm = useCallback(() => {
    setConfirming(plugin => { if (plugin) queueMicrotask(() => onInstall(plugin)); return null })
  }, [onInstall])

  const handlers = useMemo(() => ({
    onOpenPlugin: (name: string) => go({ view: 'detail', name }),
    onOpenList: (filter: ListFilter) => go({ view: 'list', filter }),
    onSearch: (query: string) => go({ view: 'list', filter: { kind: 'search', query } }),
    onInstallClick,
    onBack: back,
  }), [go, onInstallClick, back])

  let body: ReactNode
  if (catalog.status === 'loading') {
    body = <div className="ps-pad ps-muted">{t('loading')}</div>
  } else if (catalog.status === 'error') {
    body = (
      <div className="ps-error ps-pad">
        <span>{t('loadFailed')}：{catalog.error}</span>
        <button type="button" className="ps-btn" onClick={() => load(true)}>{t('retry')}</button>
      </div>
    )
  } else {
    const data = catalog.data
    if (current.view === 'detail') {
      const plugin = data.byName.get(current.name)
      body = plugin
        ? <DetailView key={plugin.name} plugin={plugin} catalog={data} detail={details[plugin.name] ?? { status: 'loading' }} installed={installed} lang={lang} t={t} onRetryDetail={() => loadDetail(plugin.name)} {...handlers} />
        : <ListView title={t('empty')} plugins={[]} installed={installed} lang={lang} t={t} {...handlers} />
    } else if (current.view === 'list') {
      const filter = current.filter
      let title = ''
      let plugins: StorePlugin[] = []
      if (filter.kind === 'search') { title = t('searchResults', { query: filter.query }); plugins = searchPlugins(data, filter.query) }
      else if (filter.kind === 'all') { title = t('allPlugins'); plugins = data.plugins }
      else {
        const group = (filter.kind === 'category' ? data.categories : data.sections).find(g => g.id === filter.id)
        title = group ? localize(group.title, lang) : ''
        plugins = group?.plugins ?? []
      }
      body = <ListView title={title} plugins={plugins} installed={installed} dshVersion={data.dshVersion} lang={lang} t={t} {...handlers} />
    } else {
      body = <Home catalog={data} installed={installed} lang={lang} t={t} {...handlers} />
    }
  }

  const selfUpdate = catalog.status === 'ready' ? selfUpdateOf(catalog.data.storeVersion, installed) : null

  return (
    <div className={`ps-root ps-mode-${mode}`} ref={root}>
      {catalog.status === 'ready' && catalog.data.stale && (
        <div className="ps-notice ps-notice-bar">
          <span>{t('staleNotice')}</span>
          <button type="button" className="ps-link-btn" onClick={() => load(true)}>{t('refresh')}</button>
        </div>
      )}
      {selfUpdate && (
        <div className="ps-notice ps-notice-bar ps-self-update">
          <span>{t('selfUpdate', { latest: selfUpdate.latest, current: selfUpdate.current })}</span>
          <button type="button" className="ps-link-btn" onClick={() => onSelfUpdate(selfUpdate)}>{t('selfUpdateAction')}</button>
        </div>
      )}
      {installedUnknown && (
        <div className="ps-notice ps-notice-bar ps-installed-unknown">
          <span>{t('installedUnknown')}</span>
        </div>
      )}
      {body}
      {confirming && <ConfirmInstall plugin={confirming} lang={lang} t={t} onCancel={cancelConfirm} onConfirm={acceptConfirm} />}
    </div>
  )
}
