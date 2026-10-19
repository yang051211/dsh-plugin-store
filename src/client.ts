/**
 * dsh-plugin-store, browser half (spike): a Store tab on the Plugins page, a full-page Store panel with its own
 * sidebar entry, and a first-run jump to that panel so a fresh install shows where the store lives.
 */
import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import zh from '../locale/zh.json'
import en from '../locale/en.json'
import { shouldAutoOpen } from './client/first-run.ts'
import { SpikeStore, StoreIcon } from './client/SpikeStore.tsx'

/** Keys of this plugin's dictionary. */
export type StoreLocaleKey = keyof typeof zh.ui

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Plugin store copy. */
    'pluginStore': StoreLocaleKey
  }
}

export const name = 'plugin-store'

/** Dictionary namespace owned by this plugin. */
export const NS = 'pluginStore'

/** Main panel and sidebar entry id. */
export const PANEL_ID = 'plugin-store' as MainPanelId

export const inject = ['slots', 'locale', 'layout']

/** Store tab on the Plugins page; it alone receives the page's install action. */
function StoreTab(props: PropsRuntime<'plugins.tab'>) {
  return createElement(SpikeStore, { mode: 'tab', install: props.install })
}

/** Full-page Store panel opened from the sidebar. */
function StorePanel() {
  return createElement(SpikeStore, { mode: 'panel' })
}

/** Register the store's surfaces. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh.ui, en: en.ui }), 'plugin-store: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('plugins.tab', () => ctx.slots.register({
    name: 'plugins.tab', id: 'store', label: () => t('tab'), locale: NS,
  }, StoreTab))
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NS,
  }, StorePanel))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 1, label: () => t('tab'), locale: NS,
  }, StoreIcon))
  if (shouldAutoOpen(window.localStorage)) ctx.layout.selectPanel(PANEL_ID)
}
