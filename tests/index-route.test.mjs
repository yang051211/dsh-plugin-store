import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createIndexHandler, MAX_INDEX_BYTES, INDEX_ROUTE } from '../lib/index.js'

const INDEX_URL = 'https://example.com/index.json'

/** Run a handler against a fake request and a recording response. */
async function call(handler, reqUrl = INDEX_ROUTE) {
  const res = {
    statusCode: 0, headers: {}, body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    writeHead(status, headers = {}) { this.statusCode = status; for (const [k, v] of Object.entries(headers)) this.setHeader(k, v); return this },
    end(chunk = '') { this.body += chunk },
  }
  await handler({ method: 'GET', url: reqUrl, headers: {} }, res)
  if (!res.statusCode) res.statusCode = 200
  return { ...res, json: JSON.parse(res.body) }
}

test('returns title and plugin count from the index', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: { en: 'X', zh: '某市场' }, plugins: [{}, {}, {}] }))
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.ok, true)
  assert.equal(res.json.pluginCount, 3)
  assert.deepEqual(res.json.title, { en: 'X', zh: '某市场' })
  assert.equal(typeof res.json.fetchedAt, 'number')
})

test('reports a sample plugin with its install version', async () => {
  const plugins = [
    { name: 'other', versions: [{ version: '1.0.0' }] },
    { name: 'dsh-chat-toc', 'dist-tags': { latest: '1.2.0' }, versions: [{ version: '1.1.0' }, { version: '1.2.0' }] },
  ]
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: 'T', plugins }))
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.deepEqual(res.json.sample, { name: 'dsh-chat-toc', version: '1.2.0' })
})

test('falls back to the first plugin and its last listed version', async () => {
  const plugins = [{ name: 'alpha', versions: [{ version: '0.1.0' }, { version: '0.2.0' }] }]
  const fetchImpl = async () => new Response(JSON.stringify({ format: 1, title: 'T', plugins }))
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.deepEqual(res.json.sample, { name: 'alpha', version: '0.2.0' })
})

test('returns 502 when upstream fails', async () => {
  const fetchImpl = async () => { throw new TypeError('fetch failed') }
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.equal(res.statusCode, 502)
  assert.equal(res.json.ok, false)
  assert.match(res.json.error, /fetch failed/)
})

test('returns 502 when upstream answers with an error status', async () => {
  const fetchImpl = async () => new Response('nope', { status: 404 })
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.equal(res.statusCode, 502)
  assert.match(res.json.error, /404/)
})

test('returns 502 when upstream is not JSON', async () => {
  const fetchImpl = async () => new Response('<html>blocked</html>')
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.equal(res.statusCode, 502)
  assert.equal(res.json.ok, false)
})

test('rejects bodies over the size cap', async () => {
  const fetchImpl = async () => new Response(new Uint8Array(MAX_INDEX_BYTES + 1))
  const res = await call(createIndexHandler(fetchImpl, INDEX_URL))
  assert.equal(res.statusCode, 502)
  assert.match(res.json.error, /too large/)
})

test('never fetches a client-supplied URL', async () => {
  const seen = []
  const fetchImpl = async (url) => { seen.push(String(url)); return new Response(JSON.stringify({ format: 1, title: 'T', plugins: [] })) }
  await call(createIndexHandler(fetchImpl, INDEX_URL), `${INDEX_ROUTE}?url=https://evil.example/x.json`)
  assert.deepEqual(seen, [INDEX_URL])
})
