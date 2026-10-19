import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as host from '../lib/index.js'
import { createCatalogCache, createIndexFetch, createDetailFetch, compatibilityOf, runtimeVersion, createVersionReader, INDEX_ROUTE, DETAIL_ROUTE, INDEX_SOURCES, MAX_DETAIL_BYTES } from '../lib/test/host.js'

const INDEX_URL = 'https://cdn.example/gh/o/r@main/market/index.json'

const doc = (plugins = [plugin('alpha', '>=0.2.0 <0.3.0-0'), plugin('beta', '>=0.3.0')]) => ({ format: 1, title: { en: 'T', zh: '市场' }, plugins, store: { schema: 1 } })
function plugin(name, dsh) {
  return { name, 'dist-tags': { latest: '1.0.0' }, versions: [{ version: '1.0.0', publishTimestamp: 1, source: { type: 'npm' }, engines: dsh ? { dsh } : {} }], store: { detail: `plugins/${name}.json` } }
}

/** A fetch stand-in serving `routes` (url → body or function) and counting calls. */
function upstream(routes) {
  const calls = []
  const fetchImpl = async (url) => {
    url = String(url); calls.push(url)
    const route = routes[url]
    if (route === undefined) return new Response('nope', { status: 404 })
    const body = typeof route === 'function' ? route() : route
    return body instanceof Response ? body : new Response(typeof body === 'string' ? body : JSON.stringify(body))
  }
  return { fetchImpl, calls }
}

const get = async (route, url) => {
  const response = await route(new Request(`http://127.0.0.1${url}`))
  return { status: response.status, json: await response.json() }
}

test('the published catalog is read from GitHub first, then jsDelivr', () => {
  assert.deepEqual(INDEX_SOURCES.map(source => source.url), [
    'https://raw.githubusercontent.com/yang051211/dsh-plugin-store/main/market/index.json',
    'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json',
  ])
  // A blocked GitHub must not hold the store up for the full deadline before jsDelivr is tried.
  assert.ok(INDEX_SOURCES[0].timeoutMs < INDEX_SOURCES[1].timeoutMs)
})

const PRIMARY = 'https://raw.example/o/r/main/market/index.json'
const MIRROR = 'https://cdn.example/gh/o/r@main/market/index.json'
const SOURCES = [{ url: PRIMARY }, { url: MIRROR }]
const detailOf = (indexUrl, name) => new URL(`plugins/${name}.json`, indexUrl).href

test('the first source that answers serves the catalog, and the route says which one', async () => {
  const { fetchImpl, calls } = upstream({ [PRIMARY]: doc(), [MIRROR]: doc([plugin('stale', null)]) })
  const { json } = await get(createIndexFetch(createCatalogCache({ fetch: fetchImpl, sources: SOURCES }), async () => null), INDEX_ROUTE)
  assert.equal(json.indexUrl, PRIMARY)
  assert.deepEqual(json.index.plugins.map(p => p.name), ['alpha', 'beta'])
  assert.deepEqual(calls, [PRIMARY])
})

test('a failed source falls through to the next one', async () => {
  for (const broken of [() => new Response('down', { status: 503 }), () => { throw new TypeError('fetch failed') }, 'not json']) {
    const { fetchImpl } = upstream({ [PRIMARY]: broken, [MIRROR]: doc() })
    const { status, json } = await get(createIndexFetch(createCatalogCache({ fetch: fetchImpl, sources: SOURCES }), async () => null), INDEX_ROUTE)
    assert.equal(status, 200)
    assert.equal(json.indexUrl, MIRROR)
    assert.equal(json.stale, false)
  }
})

test('when every source fails the error names each of them', async () => {
  const { fetchImpl } = upstream({})
  const { status, json } = await get(createIndexFetch(createCatalogCache({ fetch: fetchImpl, sources: SOURCES }), async () => null), INDEX_ROUTE)
  assert.equal(status, 502)
  assert.ok(json.error.includes(PRIMARY) && json.error.includes(MIRROR), json.error)
})

test('details come from the source that served the catalog', async () => {
  const { fetchImpl, calls } = upstream({ [MIRROR]: doc(), [detailOf(PRIMARY, 'alpha')]: { name: 'wrong' }, [detailOf(MIRROR, 'alpha')]: { name: 'alpha' } })
  const { json } = await get(createDetailFetch(createCatalogCache({ fetch: fetchImpl, sources: SOURCES })), `${DETAIL_ROUTE}?name=alpha`)
  assert.equal(json.detail.name, 'alpha')
  assert.equal(calls.includes(detailOf(PRIMARY, 'alpha')), false)
})

test('a detail the serving source cannot give is read from the other source', async () => {
  const { fetchImpl } = upstream({ [PRIMARY]: doc(), [detailOf(MIRROR, 'alpha')]: { name: 'alpha' } })
  const { status, json } = await get(createDetailFetch(createCatalogCache({ fetch: fetchImpl, sources: SOURCES })), `${DETAIL_ROUTE}?name=alpha`)
  assert.equal(status, 200)
  assert.equal(json.detail.name, 'alpha')
})

test('registers both routes through the authenticated connection channel, GET only', () => {
  const registered = []
  const ctx = {
    connection: { fetch: { register: (route) => { registered.push(route); return async () => {} } } },
    webServer: { register: () => { throw new Error('must not bypass the /api fence') } },
    effect: (fn) => fn(),
  }
  host.apply(ctx)
  assert.deepEqual(host.inject, ['connection'])
  assert.deepEqual(registered.map(r => r.path).sort(), [DETAIL_ROUTE, INDEX_ROUTE].sort())
  for (const route of registered) {
    assert.deepEqual(route.methods, ['GET'])
    assert.equal(route.requestBody, 'buffered')
  }
})

test('the host module exports only what DSH loads', () => {
  assert.deepEqual(Object.keys(host).sort(), ['apply', 'inject', 'name'])
})

test('index route returns the raw catalog with store extensions', async () => {
  const { fetchImpl } = upstream({ [INDEX_URL]: doc() })
  const route = createIndexFetch(createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] }), async () => '0.2.1-rc.2')
  const { status, json } = await get(route, INDEX_ROUTE)
  assert.equal(status, 200)
  assert.equal(json.ok, true)
  assert.deepEqual(json.index.store, { schema: 1 })
  assert.equal(json.dshVersion, '0.2.1-rc.2')
  assert.equal(json.indexUrl, INDEX_URL)
  assert.equal(json.stale, false)
  assert.equal(typeof json.fetchedAt, 'number')
})

test('rejects a document that is not format 1', async () => {
  for (const bad of [{ format: 2, plugins: [] }, { format: 1 }, { format: 1, plugins: [{ name: 'x', versions: [] }] }, [1, 2]]) {
    const { fetchImpl } = upstream({ [INDEX_URL]: bad })
    const route = createIndexFetch(createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] }), async () => null)
    const { status, json } = await get(route, INDEX_ROUTE)
    assert.equal(status, 502, JSON.stringify(bad))
    assert.equal(json.ok, false)
  }
})

test('serves the last good index when a refresh fails', async () => {
  let fail = false
  const { fetchImpl } = upstream({ [INDEX_URL]: () => (fail ? new Response('down', { status: 503 }) : new Response(JSON.stringify(doc()))) })
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  await cache.index()
  fail = true
  const snapshot = await cache.index(true)
  assert.equal(snapshot.stale, true)
  assert.equal(snapshot.index.plugins.length, 2)
})

test('concurrent requests share one upstream fetch', async () => {
  const { fetchImpl, calls } = upstream({ [INDEX_URL]: doc() })
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  await Promise.all([cache.index(), cache.index(), cache.index()])
  assert.equal(calls.length, 1)
})

test('cache expires after ttl', async () => {
  let clock = 0
  const { fetchImpl, calls } = upstream({ [INDEX_URL]: doc() })
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }], ttlMs: 1000, now: () => clock })
  await cache.index()
  clock = 999
  await cache.index()
  assert.equal(calls.length, 1)
  clock = 1001
  await cache.index()
  assert.equal(calls.length, 2)
})

test('compatibility per plugin', () => {
  const index = doc([plugin('fits', '>=0.2.0 <0.3.0-0'), plugin('too-new', '>=0.3.0'), plugin('open', null)])
  assert.deepEqual(compatibilityOf(index, '0.2.1-rc.2'), { fits: 'compatible', 'too-new': 'incompatible', open: 'compatible' })
  assert.deepEqual(compatibilityOf(index, null), { fits: 'unknown', 'too-new': 'unknown', open: 'compatible' })
})

test('a blank or invalid engines range is incompatible, as DSH treats it', () => {
  const index = doc([plugin('blank', ' '), plugin('broken', 'not a range')])
  index.plugins[0].versions[0].engines = { dsh: ' ' }
  assert.deepEqual(compatibilityOf(index, '0.2.1-rc.2'), { blank: 'incompatible', broken: 'incompatible' })
})

test('after a failed refresh the stale copy is served without hitting upstream again for a while', async () => {
  let clock = 0
  let fail = false
  const { fetchImpl, calls } = upstream({ [INDEX_URL]: () => (fail ? new Response('down', { status: 503 }) : new Response(JSON.stringify(doc()))) })
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }], ttlMs: 1000, now: () => clock })
  await cache.index()
  fail = true
  clock = 2000
  assert.equal((await cache.index()).stale, true)
  assert.equal(calls.length, 2)
  clock = 2500
  assert.equal((await cache.index()).stale, true)
  assert.equal(calls.length, 2, 'no second upstream attempt within the retry delay')
})

test('concurrent detail requests share one upstream fetch', async () => {
  const detailUrl = 'https://cdn.example/gh/o/r@main/market/plugins/alpha.json'
  const { fetchImpl, calls } = upstream({ [INDEX_URL]: doc(), [detailUrl]: { schema: 1, name: 'alpha' } })
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  await cache.index()
  await Promise.all([cache.detail('alpha'), cache.detail('alpha'), cache.detail('alpha')])
  assert.equal(calls.filter(url => url === detailUrl).length, 1)
})

test('the DSH version is read once', async () => {
  let loads = 0
  const versionOf = createVersionReader(async () => { loads++; return { getDshRuntimeVersion: () => '0.2.1-rc.2' } })
  assert.equal(await versionOf(), '0.2.1-rc.2')
  assert.equal(await versionOf(), '0.2.1-rc.2')
  assert.equal(loads, 1)
})

test('runtimeVersion is null when app-boot cannot load', async () => {
  assert.equal(await runtimeVersion(async () => { throw new Error('not found') }), null)
  assert.equal(await runtimeVersion(async () => ({ getDshRuntimeVersion: () => '0.2.1-rc.2' })), '0.2.1-rc.2')
})

test('detail route serves only listed plugins', async () => {
  const detailUrl = 'https://cdn.example/gh/o/r@main/market/plugins/alpha.json'
  const { fetchImpl, calls } = upstream({ [INDEX_URL]: doc(), [detailUrl]: { schema: 1, name: 'alpha' } })
  const route = createDetailFetch(createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] }))
  const ok = await get(route, `${DETAIL_ROUTE}?name=alpha`)
  assert.equal(ok.status, 200)
  assert.equal(ok.json.detail.name, 'alpha')
  const missing = await get(route, `${DETAIL_ROUTE}?name=${encodeURIComponent('https://evil.example')}`)
  assert.equal(missing.status, 404)
  assert.equal(calls.some(url => url.includes('evil')), false)
})

test('detail url must stay under the index directory', async () => {
  const sneaky = doc([{ ...plugin('alpha', null), store: { detail: '../../secrets.json' } }])
  const { fetchImpl, calls } = upstream({ [INDEX_URL]: sneaky })
  const route = createDetailFetch(createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] }))
  const { status } = await get(route, `${DETAIL_ROUTE}?name=alpha`)
  assert.equal(status, 502)
  assert.equal(calls.length, 1)
})

test('detail body over 4 MiB is rejected', async () => {
  const detailUrl = 'https://cdn.example/gh/o/r@main/market/plugins/alpha.json'
  const { fetchImpl } = upstream({ [INDEX_URL]: doc(), [detailUrl]: () => new Response(new Uint8Array(MAX_DETAIL_BYTES + 1)) })
  const route = createDetailFetch(createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] }))
  const { status, json } = await get(route, `${DETAIL_ROUTE}?name=alpha`)
  assert.equal(status, 502)
  assert.match(json.error, /too large/)
})
