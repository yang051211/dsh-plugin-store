/** dsh-plugin-store, browser half. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import zh from '../locale/zh.json'
import en from '../locale/en.json'

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

export const inject = ['locale']

/** Register the plugin's copy. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh.ui, en: en.ui }), 'plugin-store: dictionaries')
}
