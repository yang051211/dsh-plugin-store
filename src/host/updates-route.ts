/**
 * Latest versions of installed npm plugins the catalog does not list, asked of the registry the user set in DSH.
 * Listed plugins take their latest version from the catalog in the browser, so they are never asked here.
 */
import semver from 'semver'
import { isRegistrySpec } from '../shared/registry-spec.ts'
import type { CatalogCache } from './catalog-cache.ts'
import { fetchJson, HttpStatusError, json } from './http.ts'

export const UPDATES_ROUTE = '/api/startide/updates'
export const UPDATE_TTL_MS = 600_000
export const LOOKUP_TIMEOUT_MS = 15_000
/** The abbreviated packument of a package with thousands of versions stays well under this. */
export const MAX_PACKUMENT_BYTES = 8 * 1024 * 1024
const CONCURRENCY = 4
const NPM_REGISTRY = 'https://registry.npmjs.org/'

export interface HostBundle { name: string; installed: boolean; official: boolean; source?: string }

export interface UpdatesDeps {
  cache: CatalogCache
  manager: {
    listBundles(): Promise<HostBundle[]>
    registries(): Promise<{ registry: string | null; resolved: string | null }>
  }
  fetch: typeof fetch
  now?: () => number
}

/** `@scope/name` keeps its `@` and escapes the slash, as registries expect. */
const packumentUrl = (registry: string, name: string): string =>
  `${registry.endsWith('/') ? registry : `${registry}/`}${name.replace('/', '%2F')}`

/** Answer `{ ok: true, latest }` for the unlisted npm bundles; a lookup that fails leaves its name out. */
export function createUpdatesFetch({ cache, manager, fetch: fetchImpl, now = Date.now }: UpdatesDeps): (request: Request) => Promise<Response> {
  const known = new Map<string, { at: number; latest: string | null }>()
  const inFlight = new Map<string, Promise<string | null>>()
  let registryAnswer: { at: number; registry: string } | null = null

  /** The registry to ask; `registries()` runs pnpm, so its answer is kept as long as the lookups are. */
  async function registryOf(): Promise<string> {
    if (registryAnswer && now() - registryAnswer.at < UPDATE_TTL_MS) return registryAnswer.registry
    const registries = await manager.registries()
    const registry = registries.registry ?? registries.resolved ?? NPM_REGISTRY
    registryAnswer = { at: now(), registry }
    return registry
  }

  async function ask(key: string, registry: string, name: string): Promise<string | null> {
    let latest: string | null = null
    try {
      const doc = await fetchJson(fetchImpl, packumentUrl(registry, name), MAX_PACKUMENT_BYTES, LOOKUP_TIMEOUT_MS, `${name} packument`, undefined,
        { accept: 'application/vnd.npm.install-v1+json' }) as { 'dist-tags'?: { latest?: unknown } }
      const tag = doc?.['dist-tags']?.latest
      latest = typeof tag === 'string' && semver.valid(tag) === tag ? tag : null
    } catch (error) {
      // The registry said it does not have it: remember that. Anything else may pass, so the next visit asks again.
      if (!(error instanceof HttpStatusError && error.status >= 400 && error.status < 500)) return null
    }
    known.set(key, { at: now(), latest })
    return latest
  }

  /** The latest version from the cache, from a lookup already running, or from a new one. */
  function lookup(registry: string, name: string): Promise<string | null> {
    const key = `${registry} ${name}`
    const hit = known.get(key)
    if (hit && now() - hit.at < UPDATE_TTL_MS) return Promise.resolve(hit.latest)
    let running = inFlight.get(key)
    if (!running) {
      running = ask(key, registry, name).finally(() => inFlight.delete(key))
      inFlight.set(key, running)
    }
    return running
  }

  return async () => {
    let bundles: HostBundle[]
    try {
      bundles = await manager.listBundles()
    } catch (error) {
      return json(502, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    const listed = await cache.index().then(s => new Set(s.index.plugins.map(p => p.name)), () => new Set<string>())
    const names = bundles.filter(b => b.installed && !b.official && !listed.has(b.name) && isRegistrySpec(b.name, b.source)).map(b => b.name)
    if (names.length === 0) return json(200, { ok: true, latest: {} })
    let registry: string
    try {
      registry = await registryOf()
    } catch (error) {
      return json(502, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    const latest: Record<string, string> = {}
    let next = 0
    const worker = async () => {
      while (next < names.length) {
        const name = names[next++]!
        const version = await lookup(registry, name)
        if (version) latest[name] = version
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, names.length) }, worker))
    return json(200, { ok: true, latest })
  }
}
