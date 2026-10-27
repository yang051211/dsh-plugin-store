/**
 * dsh-startide (生态家园), browser half. The whole store lives in its tab on the Plugins page, the only place that can
 * open DSH's install dialog. The sidebar gets a 生态家园 entry that opens that tab; with "keep only Startide" on, the
 * entry takes over the official Plugins entry instead, the official heading and tab bar are hidden, and the page
 * switches back to the store whenever DSH shows its own plugin list. A first run opens the store once.
 */
import { createElement, useSyncExternalStore, type ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-plugin-manager/types'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import zh from '../locale/zh.json'
import en from '../locale/en.json'
import { shouldAutoOpen } from './client/first-run.ts'
import { createKeepOnly, injectHideStyle, PLUGINS_PANEL_ID as PLUGINS_PANEL, selectTabByLabel, selectTabWhenReady } from './client/hub.ts'
import { loadCatalog, loadDetail, loadLatest, loadReadme } from './client/model/api.ts'
import { installedFrom, type SelfUpdate } from './client/model/install-state.ts'
import { changeOutcome } from './client/model/installed.ts'
import { localize } from './client/model/localize.ts'
import type { StorePlugin } from './client/model/catalog.ts'
import { makeTranslate } from './client/ui/common.tsx'
import { ErrorBoundary } from './client/ui/ErrorBoundary.tsx'
import { createStoreMemory, StoreApp, type StoreServices } from './client/ui/StoreApp.tsx'
import { BRAND_ICON } from './client/ui/brand-icon.ts'
import { injectStyles } from './client/ui/styles.ts'

/** Keys of this plugin's dictionary. */
export type StoreLocaleKey = keyof typeof zh.ui

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Plugin store copy. */
    'startide': StoreLocaleKey
  }
}

export const name = 'startide'

/** Dictionary namespace owned by this plugin. */
export const NS = 'startide'

/** The sidebar entry's id, and the empty main panel it selects on its way to the Plugins page. */
export const PANEL_ID = 'startide' as MainPanelId
/** The Plugins page's own panel id. */
const PLUGINS_PANEL_ID = PLUGINS_PANEL as MainPanelId

export const inject = ['slots', 'locale', 'layout', 'remote', 'remote.pluginManager']

type LocaleProps = PropsLocale<'startide'>

/** The active UI language (re-rendering on switches) and a translator with `{name}` interpolation. */
function useCopy(props: LocaleProps, locale: Context['locale']) {
  const lang = useSyncExternalStore(listener => locale.subscribe(listener), () => String(locale.getSnapshot().active))
  const t = makeTranslate(key => props.t(key as StoreLocaleKey))
  return { lang, t }
}

/** The brand picture as the sidebar entry's icon. */
function StoreIcon({ size }: { size: number }): ReactNode {
  return createElement('img', { src: BRAND_ICON, width: size, height: size, alt: '', style: { borderRadius: Math.round(size / 4), objectFit: 'cover', display: 'block' } })
}

const messageOf = (error: unknown) => String((error as Error)?.message ?? error)

/** Register the store's surfaces. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh.ui, en: en.ui }), 'startide: dictionaries')
  ctx.effect(() => injectStyles(), 'startide: styles')
  const t = ctx.locale.bind(NS)
  const keepOnly = createKeepOnly(() => window.localStorage)
  const pm = ctx.remote.pluginManager
  // DSH unmounts the store's tab whenever it shows its own Installed list; this brings the store back where it was.
  const memory = createStoreMemory()

  const services: StoreServices = {
    loadCatalog,
    loadDetail,
    loadReadme,
    loadBundles: async () => installedFrom(await pm.listBundles()),
    subscribeInstalled: (onChange) => {
      // A reconnect may have missed change events, so it also triggers a fresh read (as the official Discover does).
      const stops = [ctx.remote.$on('plugin-manager/changed', () => onChange()), ctx.on('connection/reset', () => onChange())]
      return () => { for (const stop of stops) stop() }
    },
    loadLatest,
    setEnabled: async (name, enabled) => changeOutcome(await pm.setBundleEnabled(name, enabled)),
    remove: async (name) => changeOutcome(await pm.removeBundle(name)),
    // DSH's install dialog refuses a name that is already installed, so an update goes to the plugin manager directly.
    update: async (name, version) => changeOutcome(await pm.installBundle(`${name}@${version}`)),
    inspect: async (spec) => {
      try {
        const result = await pm.inspect(spec)
        if (!result.ok) return { ok: false, reason: messageOf(result.error) }
        const found = result.value
        // A git or path spec may not name its package or version until it is fetched; the dialog shows what it learns.
        return found.status === 'accepted' ? { ok: true, name: found.name ?? spec, version: found.version ?? '' } : { ok: false, reason: found.reason }
      } catch (error) {
        return { ok: false, reason: messageOf(error) }
      }
    },
  }
  const titleOf = (plugin: StorePlugin, lang: string) => localize(plugin.title, lang) || plugin.name

  function StoreTab(props: PropsRuntime<'plugins.tab'> & LocaleProps): ReactNode {
    const { lang, t: tr } = useCopy(props, ctx.locale)
    const keepOnlyOn = useSyncExternalStore(keepOnly.subscribe, keepOnly.get)
    return createElement(ErrorBoundary, { t: tr, children: createElement(StoreApp, {
      lang,
      t: tr,
      services,
      onInstall: (plugin: StorePlugin) => props.install({ spec: `${plugin.name}@${plugin.version}`, title: titleOf(plugin, lang), version: plugin.version }),
      onSelfUpdate: (update: SelfUpdate) => props.install({ spec: update.spec, title: tr('selfUpdateTitle'), version: update.latest }),
      onOpenPackage: (name: string) => props.openPackage(name),
      onInstallSpec: target => props.install(target),
      keepOnly: { value: keepOnlyOn, set: keepOnly.set },
      memory,
    }) })
  }

  /** Open the Plugins page on the store's tab. */
  const openStore = () => {
    ctx.layout.selectPanel(PLUGINS_PANEL_ID)
    void selectTabWhenReady(() => document, t('tab'))
  }

  /** Run `on()` while keep-only is on and `off()` while it is off, swapping at each change; the result stops both. */
  const followKeepOnly = (on: () => () => void, off: () => () => void) => () => {
    let stop = keepOnly.get() ? on() : off()
    const unsubscribe = keepOnly.subscribe(() => { stop(); stop = keepOnly.get() ? on() : off() })
    return () => { unsubscribe(); stop() }
  }

  /**
   * While keep-only is on and the Plugins page is shown, select the store's tab whenever DSH shows its own list (it
   * does after an install, and when coming back from a plugin's page). The tab bar is rendered only with the list,
   * so a plugin's own page is left alone. Mutations are folded into one check per frame.
   */
  const returnToStore = () => {
    let frame = 0
    const check = () => {
      frame = 0
      if (ctx.layout.panelInfo.getSnapshot().activePanelId === PLUGINS_PANEL_ID) selectTabByLabel(document, t('tab'))
    }
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(check) })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected'] })
    check()
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }

  ctx.effect(followKeepOnly(() => {
    const stops = [injectHideStyle(), returnToStore()]
    return () => { for (const stop of stops) stop() }
  }, () => () => {}), 'startide: keep-only page')

  ctx.slots.inject('plugins.tab', () => ctx.slots.register({ name: 'plugins.tab', id: 'store', label: () => t('tab'), locale: NS }, StoreTab))
  // An empty panel the sidebar entry selects; selecting it moves straight on to the Plugins page.
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, () => null))
  ctx.effect(() => {
    const onPanel = () => {
      if (ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID) queueMicrotask(openStore)
    }
    onPanel()
    return ctx.layout.panelInfo.subscribe(onPanel)
  }, 'startide: sidebar entry opens the store tab')
  ctx.slots.inject('sidebar.panellist', followKeepOnly(
    // Shadows the official Plugins entry (same id, lower priority); removing it brings the official one back.
    () => ctx.slots.register({ name: 'sidebar.panellist', id: PLUGINS_PANEL_ID, order: 0, priority: -1, label: () => t('tab'), locale: NS }, StoreIcon),
    () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 1, label: () => t('tab'), locale: NS }, StoreIcon),
  ))
  if (shouldAutoOpen(() => window.localStorage)) ctx.layout.selectPanel(PANEL_ID)
}
