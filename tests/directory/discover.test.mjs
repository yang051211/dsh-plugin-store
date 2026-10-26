import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeNames, namesFromIndex, searchPackages } from '../../tools/directory/discover.mjs'

const hit = (name, version = '1.0.0') => ({ package: { name, version, date: '2026-10-01T00:00:00.000Z' } })

function fakeRegistry(pages) {
  const calls = []
  const fetch = async url => {
    calls.push(url)
    const query = new URL(url).searchParams
    const list = pages[query.get('text')] ?? []
    const from = Number(query.get('from'))
    const size = Number(query.get('size'))
    if (list === 'fail') return new Response('down', { status: 503 })
    return new Response(JSON.stringify({ objects: list.slice(from, from + size), total: list.length }))
  }
  return { io: { fetch, registry: 'https://registry.example/' }, calls }
}

test('searchPackages pages through each keyword until a short page', async () => {
  const many = Array.from({ length: 5 }, (_, i) => hit(`p${i}`))
  const { io, calls } = fakeRegistry({ 'keywords:dsh-plugin': many })
  const found = await searchPackages(io, ['dsh-plugin'], { pageSize: 2 })
  assert.deepEqual([...found.keys()], ['p0', 'p1', 'p2', 'p3', 'p4'])
  assert.equal(calls.length, 3, 'pages of 2, 2 and 1')
  assert.ok(calls[0].startsWith('https://registry.example/-/v1/search?'))
})

test('results from several keywords are merged, keeping the newest version seen', async () => {
  const { io } = fakeRegistry({ 'keywords:a': [hit('x', '1.0.0'), hit('y')], 'keywords:b': [hit('x', '1.2.0')] })
  const found = await searchPackages(io, ['a', 'b'], { pageSize: 10 })
  assert.deepEqual([...found.keys()].sort(), ['x', 'y'])
  assert.equal(found.get('x').version, '1.2.0')
})

test('a failed search fails the whole discovery instead of returning a partial list', async () => {
  const { io } = fakeRegistry({ 'keywords:a': [hit('x')], 'keywords:b': 'fail' })
  await assert.rejects(searchPackages(io, ['a', 'b'], { pageSize: 10 }), /503/)
})

test('a rate-limited page is retried after the server-given delay', async () => {
  let calls = 0
  const waits = []
  const fetch = async () => {
    calls++
    if (calls <= 2) return new Response('slow down', { status: 429, headers: { 'retry-after': '3' } })
    return new Response(JSON.stringify({ objects: [hit('x')] }))
  }
  const found = await searchPackages({ fetch, registry: 'https://r/' }, ['a'], { pageSize: 10, sleep: async ms => { waits.push(ms) } })
  assert.deepEqual([...found.keys()], ['x'])
  assert.deepEqual(waits, [3000, 3000])
})

test('a page still rate-limited after the retries fails discovery', async () => {
  const fetch = async () => new Response('slow down', { status: 429 })
  await assert.rejects(searchPackages({ fetch, registry: 'https://r/' }, ['a'], { pageSize: 10, sleep: async () => {} }), /429/)
})

test('another format-1 index only proposes names, and a failure proposes none', async () => {
  const ok = { fetch: async () => new Response(JSON.stringify({ format: 1, plugins: [{ name: 'a' }, { name: 'b' }, { name: 42 }, {}] })) }
  assert.deepEqual(await namesFromIndex(ok, 'https://seed/index.json'), ['a', 'b'])
  const down = { fetch: async () => new Response('', { status: 500 }) }
  assert.deepEqual(await namesFromIndex(down, 'https://seed/index.json'), [])
  const garbage = { fetch: async () => new Response('not json') }
  assert.deepEqual(await namesFromIndex(garbage, 'https://seed/index.json'), [])
})

test('mergeNames only adds names and keeps them sorted', () => {
  assert.deepEqual(mergeNames(['b', 'd'], ['a', 'b', 'c']), ['a', 'b', 'c', 'd'])
  assert.deepEqual(mergeNames(['z'], []), ['z'])
})
