/**
 * dsh-startide (生态家园), browser half: the Store tab on the Plugins page (the only place that can open DSH's install
 * dialog), a full-page Store panel with its own sidebar entry, a frame-wide notice for installs handed over from
 * the panel to the tab, and a first-run jump to the panel so a fresh install shows where the store lives.
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
import { createHandoff, openInstalledFrom, selectTabWhenReady } from './client/handoff.ts'
import { loadCatalog, loadDetail, loadReadme } from './client/model/api.ts'
import { installedFrom, installedOf, STORE_PACKAGE, type SelfUpdate } from './client/model/install-state.ts'
import { localize } from './client/model/localize.ts'
import type { StorePlugin } from './client/model/catalog.ts'
import { makeTranslate } from './client/ui/common.tsx'
import { ErrorBoundary } from './client/ui/ErrorBoundary.tsx'
import { HandoffToast } from './client/ui/HandoffToast.tsx'
import { StoreApp, type StoreServices } from './client/ui/StoreApp.tsx'
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

/** Main panel and sidebar entry id. */
export const PANEL_ID = 'startide' as MainPanelId
/** The Plugins page's own panel id. */
const PLUGINS_PANEL_ID = 'plugins' as MainPanelId

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

/** Register the store's surfaces. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh.ui, en: en.ui }), 'startide: dictionaries')
  ctx.effect(() => injectStyles(), 'startide: styles')
  const t = ctx.locale.bind(NS)
  const handoff = createHandoff()

  const services: StoreServices = {
    loadCatalog,
    loadDetail,
    loadReadme,
    loadInstalled: async () => installedOf(installedFrom(await ctx.remote.pluginManager.listBundles())),
    subscribeInstalled: (onChange) => {
      // A reconnect may have missed change events, so it also triggers a fresh read (as the official Discover does).
      const stops = [ctx.remote.$on('plugin-manager/changed', () => onChange()), ctx.on('connection/reset', () => onChange())]
      return () => { for (const stop of stops) stop() }
    },
  }
  const titleOf = (plugin: StorePlugin, lang: string) => localize(plugin.title, lang) || plugin.name
  // The Plugins page provides `pluginNavigation` while it is mounted; read it when needed, never require it.
  const openInstalled = openInstalledFrom({
    navigation: () => {
      try {
        return ctx.get('pluginNavigation') as { openBundle: (name: string) => void } | undefined
      } catch {
        return undefined
      }
    },
    selectPanel: id => ctx.layout.selectPanel(id as MainPanelId),
  })

  /** The panel cannot install; record the request and move to the Plugins page, whose tab takes it. */
  function handOver(pending: { name: string; title: string }): void {
    handoff.request(pending)
    ctx.layout.selectPanel(PLUGINS_PANEL_ID)
    // Switch the Plugins page to our tab ourselves; if that fails, the notice asks the user to click it.
    void selectTabWhenReady(() => document, t('tab'))
  }

  function StoreTab(props: PropsRuntime<'plugins.tab'> & LocaleProps): ReactNode {
    const { lang, t: tr } = useCopy(props, ctx.locale)
    return createElement(ErrorBoundary, { t: tr, children: createElement(StoreApp, {
      mode: 'tab',
      lang,
      t: tr,
      services,
      onInstall: (plugin: StorePlugin) => props.install({ spec: `${plugin.name}@${plugin.version}`, title: titleOf(plugin, lang), version: plugin.version }),
      onSelfUpdate: (update: SelfUpdate) => props.install({ spec: update.spec, title: tr('selfUpdateTitle'), version: update.latest }),
      onOpenInstalled: (plugin: StorePlugin) => props.openPackage(plugin.name),
      takePending: handoff.take,
    }) })
  }

  function StorePanel(props: LocaleProps): ReactNode {
    const { lang, t: tr } = useCopy(props, ctx.locale)
    return createElement(ErrorBoundary, { t: tr, children: createElement(StoreApp, {
      mode: 'panel',
      lang,
      t: tr,
      services,
      onInstall: (plugin: StorePlugin) => handOver({ name: plugin.name, title: titleOf(plugin, lang) }),
      onSelfUpdate: () => handOver({ name: STORE_PACKAGE, title: tr('selfUpdateTitle') }),
      onOpenInstalled: (plugin: StorePlugin) => openInstalled(plugin.name),
    }) })
  }

  function Notice(props: LocaleProps): ReactNode {
    const { t: tr } = useCopy(props, ctx.locale)
    return createElement(HandoffToast, { handoff, t: tr })
  }

  ctx.slots.inject('plugins.tab', () => ctx.slots.register({ name: 'plugins.tab', id: 'store', label: () => t('tab'), locale: NS }, StoreTab))
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, StorePanel))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 1, label: () => t('tab'), locale: NS }, StoreIcon))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'startide.handoff', locale: NS }, Notice))
  if (shouldAutoOpen(() => window.localStorage)) ctx.layout.selectPanel(PANEL_ID)
}
