/** Localized catalog text, as the official index format writes it: a plain string or a language → text map. */
export type LocalizedText = string | Record<string, string>

/** The text for `lang` (`zh-CN` → `zh`), then Chinese, then English, then any language; '' when there is none. */
export function localize(text: LocalizedText | undefined | null, lang: string): string {
  if (typeof text === 'string') return text
  if (!text || typeof text !== 'object') return ''
  const base = lang.toLowerCase().split('-')[0] ?? ''
  for (const key of [lang, base, 'zh', 'en']) {
    const value = text[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return Object.values(text).find(v => typeof v === 'string' && v !== '') ?? ''
}
