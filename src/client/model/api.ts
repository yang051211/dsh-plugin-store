/** Calls to the store's Host routes. */
import type { CatalogSnapshot } from './catalog.ts'

/** Same-origin paths served by the Host half (src/host/index-route.ts); literals because the browser never imports Host code. */
const INDEX_ROUTE = '/api/plugin-store/index'
const DETAIL_ROUTE = '/api/plugin-store/detail'
const README_ROUTE = '/api/plugin-store/readme'

async function call<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  let body: any
  try {
    body = await response.json()
  } catch {
    throw new Error(`HTTP ${response.status}`)
  }
  if (!response.ok || body?.ok !== true) throw new Error(body?.error ?? `HTTP ${response.status}`)
  return body
}

/** The catalog snapshot; `refresh` asks the Host to skip its cache. */
export function loadCatalog(refresh = false): Promise<CatalogSnapshot> {
  return call<CatalogSnapshot>(refresh ? `${INDEX_ROUTE}?refresh=1` : INDEX_ROUTE)
}

/** One plugin's detail document. */
export async function loadDetail(name: string): Promise<any> {
  return (await call<{ detail: unknown }>(`${DETAIL_ROUTE}?name=${encodeURIComponent(name)}`)).detail
}

/** A listed plugin's README (markdown, '' when it has none) and the base its relative links resolve against. */
export function loadReadme(name: string): Promise<{ markdown: string; base: string }> {
  return call<{ markdown: string; base: string }>(`${README_ROUTE}?name=${encodeURIComponent(name)}`)
}
