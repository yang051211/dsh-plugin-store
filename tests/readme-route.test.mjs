import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCatalogCache, createReadmeFetch, README_ROUTE, MAX_README_BYTES } from '../lib/test/host.js'

const INDEX_URL = 'https://raw.example/o/r/main/market/index.json'
const entry = (name, version = '1.2.0') => ({ name, 'dist-tags': { latest: version }, versions: [{ version, publishTimestamp: 1, source: { type: 'npm' } }] })
const index = { format: 1, plugins: [entry('dsh-a'), entry('@s/dsh-b', '0.3.0')] }

/** A fetch stand-in: the catalog, plus README bodies keyed by URL; counts README requests. */
function upstream(readmes) {
  const readmeCalls = []
  const fetchImpl = async url => {
    url = String(url)
    if (url === INDEX_URL) return new Response(JSON.stringify(index))
    readmeCalls.push(url)
    return url in readmes ? new Response(readmes[url]) : new Response('not found', { status: 404 })
  }
  return { fetchImpl, readmeCalls }
}

function routeWith(readmes) {
  const { fetchImpl, readmeCalls } = upstream(readmes)
  const cache = createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] })
  return { route: createReadmeFetch(cache, fetchImpl), readmeCalls }
}

const get = async (route, name) => {
  const response = await route(new Request(`http://127.0.0.1${README_ROUTE}?name=${encodeURIComponent(name)}`))
  return { status: response.status, json: await response.json() }
}

test('a listed plugin gets the README of its listed version from jsDelivr, with a base for relative links', async () => {
  const { route, readmeCalls } = routeWith({ 'https://cdn.jsdelivr.net/npm/@s/dsh-b@0.3.0/README.md': '# B' })
  const { status, json } = await get(route, '@s/dsh-b')
  assert.equal(status, 200)
  assert.equal(json.markdown, '# B')
  assert.equal(json.base, 'https://cdn.jsdelivr.net/npm/@s/dsh-b@0.3.0/')
  assert.deepEqual(readmeCalls, ['https://cdn.jsdelivr.net/npm/@s/dsh-b@0.3.0/README.md'])
})

test('a lowercase readme.md is tried next, and no README at all is an empty answer', async () => {
  const lower = routeWith({ 'https://cdn.jsdelivr.net/npm/dsh-a@1.2.0/readme.md': 'lower' })
  assert.equal((await get(lower.route, 'dsh-a')).json.markdown, 'lower')
  const none = routeWith({})
  const { status, json } = await get(none.route, 'dsh-a')
  assert.equal(status, 200)
  assert.equal(json.markdown, '')
})

test('names the catalog does not list are refused without any outside request', async () => {
  for (const name of ['dsh-zzz', '../../evil', 'https://evil.example/x', 'dsh-a/../../x', '']) {
    const { route, readmeCalls } = routeWith({})
    const { status } = await get(route, name)
    assert.equal(status, 404, name)
    assert.deepEqual(readmeCalls, [], name)
  }
})

test('the cache keeps a bounded number of READMEs, dropping the oldest', async () => {
  const { fetchImpl, readmeCalls } = upstream({ 'https://cdn.jsdelivr.net/npm/dsh-a@1.2.0/README.md': 'a', 'https://cdn.jsdelivr.net/npm/@s/dsh-b@0.3.0/README.md': 'b' })
  const route = createReadmeFetch(createCatalogCache({ fetch: fetchImpl, sources: [{ url: INDEX_URL }] }), fetchImpl, Date.now, 1)
  await get(route, 'dsh-a')
  await get(route, '@s/dsh-b')
  await get(route, 'dsh-a')
  assert.equal(readmeCalls.length, 3, 'dsh-a was dropped when dsh-b came in')
})

test('the answer is cached and capped', async () => {
  const { route, readmeCalls } = routeWith({ 'https://cdn.jsdelivr.net/npm/dsh-a@1.2.0/README.md': 'x'.repeat(10) })
  await get(route, 'dsh-a')
  await get(route, 'dsh-a')
  assert.equal(readmeCalls.length, 1)
  const big = routeWith({ 'https://cdn.jsdelivr.net/npm/dsh-a@1.2.0/README.md': 'x'.repeat(MAX_README_BYTES + 1) })
  assert.equal((await get(big.route, 'dsh-a')).status, 502)
})
