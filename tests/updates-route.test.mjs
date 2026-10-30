import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCatalogCache, createUpdatesFetch, UPDATES_ROUTE } from '../lib/test/host.js'

const INDEX_URL = 'https://raw.example/o/r/main/market/index.json'
const index = { format: 1, plugins: [{ name: 'dsh-pet', 'dist-tags': { latest: '1.0.0' }, versions: [{ version: '1.0.0' }] }] }
const bundle = (name, extra = {}) => ({ name, version: '1.0.0', installed: true, official: false, source: `${name}@^1.0.0`, ...extra })
const BUNDLES = [bundle('dsh-pet'), bundle('off-catalog'), bundle('from-git', { source: 'github:o/r' }), bundle('builtin', { official: true }), bundle('gone', { installed: false })]

/** The catalog at INDEX_URL plus packuments by URL; records every packument request with its accept header. */
function setup({ bundles = BUNDLES, registries = { registry: null, resolved: null }, packuments = {}, manager, now } = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    url = String(url)
    if (url === INDEX_URL) return new Response(JSON.stringify(index))
    calls.push({ url, accept: new Headers(init?.headers).get('accept') })
    const body = packuments[url]
    return body === undefined ? new Response('missing', { status: 404 }) : new Response(JSON.stringify(body))
  }
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  manager ??= { listBundles: async () => bundles, registries: async () => ({ fallbackRegistries: [], ...registries }) }
  return { route: createUpdatesFetch({ cache, manager, fetch: fetchImpl, now }), calls }
}

const get = async route => {
  const response = await route(new Request(`http://127.0.0.1${UPDATES_ROUTE}`))
  return { status: response.status, json: await response.json() }
}
const latest = version => ({ 'dist-tags': { latest: version } })

test('asks the configured registry only for npm bundles the catalog does not list', async () => {
  const { route, calls } = setup({
    registries: { registry: 'https://mirror.example/npm/', resolved: 'https://r.example/' },
    packuments: { 'https://mirror.example/npm/off-catalog': latest('2.0.0') },
  })
  assert.deepEqual(await get(route), { status: 200, json: { ok: true, latest: { 'off-catalog': '2.0.0' } } })
  assert.deepEqual(calls, [{ url: 'https://mirror.example/npm/off-catalog', accept: 'application/vnd.npm.install-v1+json' }])
})

test("falls back to pnpm's resolved registry, then to registry.npmjs.org", async () => {
  const resolved = setup({ registries: { registry: null, resolved: 'https://r.example/' } })
  await get(resolved.route)
  assert.deepEqual(resolved.calls.map(c => c.url), ['https://r.example/off-catalog'])
  const npm = setup()
  await get(npm.route)
  assert.deepEqual(npm.calls.map(c => c.url), ['https://registry.npmjs.org/off-catalog'])
})

test('a scoped name keeps its @ and escapes the slash', async () => {
  const { route, calls } = setup({ bundles: [bundle('@a/b')], packuments: { 'https://registry.npmjs.org/@a%2Fb': latest('1.1.0') } })
  assert.deepEqual((await get(route)).json.latest, { '@a/b': '1.1.0' })
  assert.deepEqual(calls.map(c => c.url), ['https://registry.npmjs.org/@a%2Fb'])
})

test('one failed lookup leaves that name out; the rest answer', async () => {
  const { route } = setup({
    bundles: [bundle('a'), bundle('b'), bundle('c'), bundle('d')],
    packuments: { 'https://registry.npmjs.org/a': latest('2.0.0'), 'https://registry.npmjs.org/c': latest('not-semver'), 'https://registry.npmjs.org/d': {} },
  })
  assert.deepEqual(await get(route), { status: 200, json: { ok: true, latest: { a: '2.0.0' } } })
})

test('answers from cache within ten minutes, asks again after', async () => {
  let clock = 1_000_000
  const { route, calls } = setup({ packuments: { 'https://registry.npmjs.org/off-catalog': latest('2.0.0') }, now: () => clock })
  await get(route)
  clock += 599_999
  await get(route)
  assert.equal(calls.length, 1)
  clock += 1
  await get(route)
  assert.equal(calls.length, 2)
})

test('a catalog that cannot be read counts every npm bundle as unlisted', async () => {
  const calls = []
  const fetchImpl = async url => {
    url = String(url)
    if (url === INDEX_URL) return new Response('down', { status: 503 })
    calls.push(url)
    return new Response(JSON.stringify(latest('2.0.0')))
  }
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  const route = createUpdatesFetch({ cache, manager: { listBundles: async () => BUNDLES, registries: async () => ({ registry: null, resolved: null, fallbackRegistries: [] }) }, fetch: fetchImpl })
  assert.deepEqual((await get(route)).json.latest, { 'dsh-pet': '2.0.0', 'off-catalog': '2.0.0' })
})

test('a failing plugin manager answers 502', async () => {
  const { route } = setup({ manager: { listBundles: async () => { throw new Error('profile unreadable') }, registries: async () => ({}) } })
  assert.deepEqual(await get(route), { status: 502, json: { ok: false, error: 'profile unreadable' } })
})

test('with nothing to look up, the plugin manager is not asked for its registries', async () => {
  let asked = 0
  const { route, calls } = setup({ manager: { listBundles: async () => [bundle('dsh-pet'), bundle('from-git', { source: 'github:o/r' })], registries: async () => { asked++; return { registry: null, resolved: null } } } })
  assert.deepEqual(await get(route), { status: 200, json: { ok: true, latest: {} } })
  assert.equal(asked, 0)
  assert.equal(calls.length, 0)
})

test('the registries answer is kept for ten minutes', async () => {
  let asked = 0
  let clock = 1_000_000
  const { route } = setup({ manager: { listBundles: async () => BUNDLES, registries: async () => { asked++; return { registry: null, resolved: null } } }, now: () => clock })
  await get(route)
  await get(route)
  assert.equal(asked, 1)
  clock += 600_000
  await get(route)
  assert.equal(asked, 2)
})

test('a package the registry does not have is not asked again within ten minutes', async () => {
  const { route, calls } = setup()
  await get(route)
  await get(route)
  assert.equal(calls.length, 1, 'the 404 for off-catalog is remembered')
})

test('lookups in flight are shared between requests', async () => {
  const { route, calls } = setup({ packuments: { 'https://registry.npmjs.org/off-catalog': latest('2.0.0') } })
  const [a, b] = await Promise.all([get(route), get(route)])
  assert.deepEqual([a.json.latest, b.json.latest], [{ 'off-catalog': '2.0.0' }, { 'off-catalog': '2.0.0' }])
  assert.equal(calls.length, 1)
})

test('a network failure is not remembered', async () => {
  let fail = true
  const calls = []
  const fetchImpl = async url => {
    url = String(url)
    if (url === INDEX_URL) return new Response(JSON.stringify(index))
    calls.push(url)
    if (fail) throw new TypeError('fetch failed')
    return new Response(JSON.stringify(latest('2.0.0')))
  }
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  const route = createUpdatesFetch({ cache, manager: { listBundles: async () => BUNDLES, registries: async () => ({ registry: null, resolved: null }) }, fetch: fetchImpl })
  assert.deepEqual((await get(route)).json.latest, {})
  fail = false
  assert.deepEqual((await get(route)).json.latest, { 'off-catalog': '2.0.0' })
  assert.equal(calls.length, 2)
})
