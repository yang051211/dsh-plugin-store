/**
 * The store in the Plugins-page tab: loads the directory and the installed bundles, keeps a back stack of views
 * (home → list → detail) with their scroll positions and list settings, and routes install clicks, confirming first.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildCatalog, searchPlugins, type Catalog, type CatalogSnapshot, type SortKey, type StorePlugin } from '../model/catalog.ts'
import { localize } from '../model/localize.ts'
import { installedOf, LEGACY_PACKAGE, selfUpdateOf, type InstallState, type Installed, type InstalledBundle, type SelfUpdate } from '../model/install-state.ts'
import { buildInstalledRows, type ChangeOutcome } from '../model/installed.ts'
import type { Translate } from './common.tsx'
import { ConfirmInstall } from './ConfirmInstall.tsx'
import { DetailView, type Load, type PluginDetail, type Readme } from './DetailView.tsx'
import { Home, type ListFilter } from './Home.tsx'
import { ListView, type ListSettings } from './ListView.tsx'
import { AboutView } from './About.tsx'
import { InstalledView, type Inspection } from './InstalledView.tsx'
import { BRAND_ICON } from './brand-icon.ts'

export interface StoreServices {
  loadCatalog: (refresh?: boolean) => Promise<CatalogSnapshot>
  loadDetail: (name: string) => Promise<PluginDetail>
  loadReadme: (name: string) => Promise<Readme>
  loadBundles: () => Promise<InstalledBundle[]>
  subscribeInstalled: (onChange: () => void) => () => void
  /** Latest versions of unlisted npm plugins; {} when they cannot be asked. */
  loadLatest: () => Promise<Record<string, string>>
  setEnabled: (name: string, enabled: boolean) => Promise<ChangeOutcome>
  remove: (name: string) => Promise<ChangeOutcome>
  /** Install `version` over the installed `from.current`, keeping it enabled or disabled as it was. */
  update: (name: string, version: string, from: { current: string; enabled: boolean }) => Promise<ChangeOutcome>
  inspect: (spec: string) => Promise<Inspection>
}

export interface StoreAppProps {
  lang: string
  t: Translate
  services: StoreServices
  /** Called after the store's confirmation; opens DSH's install dialog. */
  onInstall: (plugin: StorePlugin) => void
  /** Install a newer release of the store itself through DSH's installer. */
  onSelfUpdate: (update: SelfUpdate) => void
  /** Open an installed plugin's own page in the Plugins manager. */
  onOpenPackage: (name: string) => void
  /** Open DSH's install dialog for an address typed on the Installed page. */
  onInstallSpec: (target: { spec: string; title: string; version: string }) => void
  /** The "keep only Startide" preference. */
  keepOnly: { value: boolean; set: (on: boolean) => void }
  /** Kept across remounts; without it the store starts at home each time. */
  memory?: StoreMemory
}

/**
 * What the store keeps when DSH unmounts its tab, which it does whenever it shows its own Installed list (after an
 * install, or for a plugin's own page): the tab to come back to, and the plugins already seen as installed.
 */
export interface StoreMemory { tab: NavTab; installed: Set<string> | null }

export function createStoreMemory(): StoreMemory {
  return { tab: 'home', installed: null }
}

export type View = { view: 'home' } | ({ view: 'list'; filter: ListFilter } & ListSettings) | { view: 'detail'; name: string } | { view: 'installed' } | { view: 'about' }

/** The store's own tabs; each opens its page as a new root, so back never walks across tabs. */
export type NavTab = 'home' | 'all' | 'installed' | 'about'
const TABS: NavTab[] = ['home', 'all', 'installed', 'about']
const TAB_LABELS: Record<NavTab, string> = { home: 'navHome', all: 'navAll', installed: 'navInstalled', about: 'navAbout' }

/** Which tab a view belongs to. */
export function tabOf(view: View): NavTab {
  return view.view === 'home' || view.view === 'about' || view.view === 'installed' ? view.view : 'all'
}

const listView = (filter: ListFilter, sort: SortKey = 'popular'): View => ({ view: 'list', filter, sort, page: 1, compatibleOnly: false })

/** The page a tab opens on. */
const rootOf = (tab: NavTab): View => (tab === 'all' ? listView({ kind: 'all' }) : { view: tab })

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

/** Per-name loads with sequence numbers, so a response that is no longer the latest is dropped. */
function useLoads<T>(load: (name: string) => Promise<T>) {
  const [loads, setLoads] = useState<Record<string, Load<T>>>({})
  const seq = useRef<Record<string, number>>({})
  const start = useCallback((name: string) => {
    const id = (seq.current[name] ?? 0) + 1
    seq.current[name] = id
    setLoads(prev => ({ ...prev, [name]: { status: 'loading' } }))
    load(name).then(
      data => { if (seq.current[name] === id) setLoads(prev => ({ ...prev, [name]: { status: 'ready', data } })) },
      (error: unknown) => { if (seq.current[name] === id) setLoads(prev => ({ ...prev, [name]: { status: 'error', error: messageOf(error) } })) },
    )
  }, [load])
  return [loads, start] as const
}

export function StoreApp({ lang, t, services, onInstall, onSelfUpdate, onOpenPackage, onInstallSpec, keepOnly, memory: given }: StoreAppProps): ReactNode {
  const memory = useRef(given ?? createStoreMemory()).current
  const [catalog, setCatalog] = useState<Load<Catalog>>({ status: 'loading' })
  // Null until the first read answers. A failed read keeps whatever was read before and records why.
  const [bundles, setBundles] = useState<InstalledBundle[] | null>(null)
  const [bundlesError, setBundlesError] = useState<string | null>(null)
  const [latest, setLatest] = useState<Record<string, string>>({})
  const refreshBundles = useRef<() => void>(() => {})
  // The plugin that became installed while the store was open; a notice is shown until dismissed.
  const [justInstalled, setJustInstalled] = useState<string | null>(null)
  const [stack, setStack] = useState<Stack>(() => [{ view: rootOf(memory.tab), scroll: 0 }])
  const [details, loadDetail] = useLoads(services.loadDetail)
  const [readmes, loadReadme] = useLoads(services.loadReadme)
  const [confirming, setConfirming] = useState<StorePlugin | null>(null)
  const root = useRef<HTMLDivElement | null>(null)
  const pendingScroll = useRef<number | null>(null)
  const seq = useRef({ catalog: 0, installed: 0 })
  const current = stack[stack.length - 1]!.view

  /** The element that actually scrolls: the Plugins page container around the tab. */
  const scroller = useCallback((): HTMLElement | null => {
    const el = root.current
    if (!el) return null
    return scrollParentOf<HTMLElement>(el.parentElement, node => getComputedStyle(node).overflowY) ?? (document.scrollingElement as HTMLElement | null)
  }, [])

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
      services.loadBundles().then(
        list => {
          if (!live || id !== seq.current.installed) return
          // Only a change seen after the first read counts: plugins installed before the store opened need no notice.
          const before = memory.installed
          const fresh = before ? list.map(b => b.name).filter(name => !before.has(name)) : []
          if (fresh.length > 0) setJustInstalled(fresh[fresh.length - 1]!)
          memory.installed = new Set(list.map(b => b.name))
          setBundles(list)
          setBundlesError(null)
        },
        (error: unknown) => { if (live && id === seq.current.installed) setBundlesError(messageOf(error)) },
      )
    }
    refreshBundles.current = refresh
    refresh()
    const unsubscribe = services.subscribeInstalled(refresh)
    return () => { live = false; unsubscribe() }
  }, [services])

  const currentTab = tabOf(current)
  useEffect(() => { memory.tab = currentTab }, [memory, currentTab])

  // Unlisted npm plugins' latest versions, asked again whenever the installed list changes.
  useEffect(() => {
    if (!bundles) return
    let live = true
    services.loadLatest().then(found => { if (live) setLatest(found) }, () => {})
    return () => { live = false }
  }, [services, bundles])

  // A failed read falls back to "nothing installed" for the install buttons: they stay usable, and DSH's own install
  // dialog still refuses a plugin that is already there. Only the first read in flight keeps them disabled.
  const installed: Installed | null = useMemo(() => (bundles ? installedOf(bundles) : bundlesError ? new Map() : null), [bundles, bundlesError])
  const catalogData = catalog.status === 'ready' ? catalog.data : null
  const selfUpdate = catalogData ? selfUpdateOf(catalogData.storeVersion, installed) : null
  const rows = useMemo(
    () => (bundles ? buildInstalledRows(bundles, catalogData, latest, lang, catalogData?.storeVersion ?? null) : null),
    [bundles, catalogData, latest, lang],
  )

  const go = useCallback((view: View) => {
    const scroll = scroller()?.scrollTop ?? 0
    setStack(prev => navigate(prev, view, scroll))
    pendingScroll.current = 0
    if (view.view === 'detail') {
      if (!details[view.name]) loadDetail(view.name)
      if (!readmes[view.name]) loadReadme(view.name)
    }
  }, [details, readmes, loadDetail, loadReadme, scroller])

  /** Change the current list's settings in place; a new page starts at the top. */
  const updateList = useCallback((patch: Partial<ListSettings>) => {
    setStack(prev => {
      const top = prev[prev.length - 1]!
      if (top.view.view !== 'list') return prev
      return [...prev.slice(0, -1), { ...top, view: { ...top.view, ...patch } }]
    })
    if (patch.page !== undefined) pendingScroll.current = 0
  }, [])

  /** A tab click starts over at that tab's page. */
  const openTab = useCallback((tab: NavTab) => {
    setStack([{ view: rootOf(tab), scroll: 0 }])
    pendingScroll.current = 0
  }, [])

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

  const onInstallClick = useCallback((plugin: StorePlugin, state: InstallState) => {
    if (state === 'installed' || state === 'update') onOpenPackage(plugin.name)
    else if (state === 'install') setConfirming(plugin)
  }, [onOpenPackage])

  const cancelConfirm = useCallback(() => setConfirming(null), [])
  const acceptConfirm = useCallback(() => {
    setConfirming(plugin => { if (plugin) queueMicrotask(() => onInstall(plugin)); return null })
  }, [onInstall])

  const handlers = useMemo(() => ({
    onOpenPlugin: (name: string) => go({ view: 'detail', name }),
    onOpenList: (filter: ListFilter, sort?: SortKey) => go(listView(filter, sort)),
    onSearch: (query: string) => go(listView({ kind: 'search', query })),
    onInstallClick,
    onBack: back,
  }), [go, onInstallClick, back])

  let body: ReactNode
  if (current.view === 'installed') {
    // The installed list does not wait for the catalog: without it, rows just lack directory titles and versions.
    body = (
      <InstalledView rows={rows} error={bundlesError} selfUpdate={selfUpdate} t={t} keepOnly={keepOnly}
        onRetry={() => refreshBundles.current()} onOpenPackage={onOpenPackage} onSelfUpdate={onSelfUpdate}
        setEnabled={services.setEnabled} remove={services.remove} update={services.update} inspect={services.inspect} onInstallSpec={onInstallSpec} />
    )
  } else if (catalog.status === 'loading') {
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
        ? <DetailView key={plugin.name} plugin={plugin} catalog={data} detail={details[plugin.name] ?? { status: 'loading' }} readme={readmes[plugin.name] ?? { status: 'loading' }} installed={installed} lang={lang} t={t} onRetryDetail={() => loadDetail(plugin.name)} onRetryReadme={() => loadReadme(plugin.name)} {...handlers} />
        : <div className="ps-empty">{t('empty')}</div>
    } else if (current.view === 'list') {
      const { filter } = current
      const plugins = filter.kind === 'search' ? searchPlugins(data, filter.query)
        : filter.kind === 'category' ? data.categories.find(c => c.id === filter.id)?.plugins ?? []
        : data.plugins
      body = <ListView plugins={plugins} catalog={data} filter={filter} sort={current.sort} page={current.page} compatibleOnly={current.compatibleOnly} installed={installed} lang={lang} t={t} onChange={updateList} {...handlers} />
    } else if (current.view === 'about') {
      body = <AboutView t={t} />
    } else {
      body = <Home catalog={data} installed={installed} lang={lang} t={t} {...handlers} />
    }
  }

  const justPlugin = justInstalled && catalog.status === 'ready' ? catalog.data.byName.get(justInstalled) ?? null : null

  return (
    <div className="ps-root ps-mode-tab" ref={root}>
      <nav className="ps-nav" aria-label={t('tab')}>
        <span className="ps-nav-brand"><img className="ps-nav-logo" src={BRAND_ICON} alt="" width={24} height={24} />{t('tab')}</span>
        {TABS.map(tab => (
          <button key={tab} type="button" className={tabOf(current) === tab ? 'ps-nav-on' : ''} aria-current={tabOf(current) === tab ? 'page' : undefined} onClick={() => openTab(tab)}>
            {t(TAB_LABELS[tab])}
            {tab === 'installed' && rows && rows.updates.length > 0 && <span className="ps-badge">{rows.updates.length}</span>}
          </button>
        ))}
      </nav>
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
      {justPlugin && (
        <div className="ps-notice ps-notice-bar ps-installed-notice">
          <div className="ps-installed-notice-body">
            <b>{t('installedNotice', { title: localize(justPlugin.title, lang) || justPlugin.name })}</b>
            <span>{t('installedHint')}</span>
          </div>
          <button type="button" className="ps-link-btn" onClick={() => setJustInstalled(null)}>{t('dismiss')}</button>
        </div>
      )}
      {installed?.has(LEGACY_PACKAGE) && (
        <div className="ps-notice ps-notice-bar ps-legacy-notice">
          <span>{t('legacyInstalled', { name: LEGACY_PACKAGE })}</span>
        </div>
      )}
      {bundlesError && current.view !== 'installed' && (
        <div className="ps-notice ps-notice-bar ps-installed-unknown">
          <span>{t('installedUnknown')}</span>
        </div>
      )}
      {body}
      {confirming && <ConfirmInstall plugin={confirming} lang={lang} t={t} onCancel={cancelConfirm} onConfirm={acceptConfirm} />}
    </div>
  )
}
