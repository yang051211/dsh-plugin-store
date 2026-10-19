import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as host from '../lib/index.js'

const { createIndexFetch, MAX_INDEX_BYTES, INDEX_ROUTE } = host
const INDEX_URL = 'https://example.com/index.json'

/** Run a route against a GET request and decode its JSON body. */
async function call(route, reqUrl = `http://127.0.0.1${INDEX_ROUTE}`) {
  const response = await route(new Request(reqUrl))
  return { status: response.status, json: await response.json(), headers: response.headers }
}

test('default index is the published catalog', () => {
  assert.equal(host.DEFAULT_INDEX_URL, 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json')
})

test('registers the route through the authenticated connection channel, GET only', () => {
  const registered = []
  const ctx = {
    connection: { fetch: { register: (route) => { registered.push(route); return async () => {} } } },
    webServer: { register: () => { throw new Error('must not bypass the /api fence') } },
    effect: (fn) => fn(),
  }
  host.apply(ctx)
  assert.deepEqual(host.inject, ['connection'])
  assert.equal(registered.length, 1)
  assert.equal(registered[0].path, INDEX_ROUTE)
  assert.deepEqual(registered[0].methods, ['GET'])
  assert.equal(registered[0].requestBody, 'buffered')
  assert.equal(typeof registered[0].fetch, 'function')
})

test('returns title and plugin count from the index', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: { en: 'X', zh: '某市场' }, plugins: [{}, {}, {}] }))
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.equal(res.status, 200)
  assert.equal(res.json.ok, true)
  assert.equal(res.json.pluginCount, 3)
  assert.deepEqual(res.json.title, { en: 'X', zh: '某市场' })
  assert.equal(typeof res.json.fetchedAt, 'number')
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
})

test('reports a sample plugin with its install version', async () => {
  const plugins = [
    { name: 'other', versions: [{ version: '1.0.0' }] },
    { name: 'dsh-chat-toc', 'dist-tags': { latest: '1.2.0' }, versions: [{ version: '1.1.0' }, { version: '1.2.0' }] },
  ]
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: 'T', plugins }))
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.deepEqual(res.json.sample, { name: 'dsh-chat-toc', version: '1.2.0' })
})

test('falls back to the first plugin and its last listed version', async () => {
  const plugins = [{ name: 'alpha', versions: [{ version: '0.1.0' }, { version: '0.2.0' }] }]
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: 'T', plugins }))
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.deepEqual(res.json.sample, { name: 'alpha', version: '0.2.0' })
})

test('returns 502 when upstream fails', async () => {
  const fetchImpl = async () => { throw new TypeError('fetch failed') }
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.equal(res.status, 502)
  assert.equal(res.json.ok, false)
  assert.match(res.json.error, /fetch failed/)
})

test('returns 502 when upstream answers with an error status', async () => {
  const fetchImpl = async () => new Response('nope', { status: 404 })
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.equal(res.status, 502)
  assert.match(res.json.error, /404/)
})

test('releases the upstream body when the status is an error', async () => {
  let cancelled = false
  const body = new ReadableStream({ pull() {}, cancel() { cancelled = true } })
  const fetchImpl = async () => new Response(body, { status: 500 })
  await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.equal(cancelled, true)
})

test('returns 502 when upstream is not JSON', async () => {
  const fetchImpl = async () => new Response('<html>blocked</html>')
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.equal(res.status, 502)
  assert.equal(res.json.ok, false)
})

test('rejects bodies over the size cap', async () => {
  const fetchImpl = async () => new Response(new Uint8Array(MAX_INDEX_BYTES + 1))
  const res = await call(createIndexFetch(fetchImpl, INDEX_URL))
  assert.equal(res.status, 502)
  assert.match(res.json.error, /too large/)
})

test('never fetches a client-supplied URL', async () => {
  const seen = []
  const fetchImpl = async (url) => { seen.push(String(url)); return new Response(JSON.stringify({ format: 1, title: 'T', plugins: [] })) }
  await call(createIndexFetch(fetchImpl, INDEX_URL), `http://127.0.0.1${INDEX_ROUTE}?url=https://evil.example/x.json`)
  assert.deepEqual(seen, [INDEX_URL])
})
