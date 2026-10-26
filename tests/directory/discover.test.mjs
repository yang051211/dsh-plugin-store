import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeNames, searchPackages } from '../../tools/directory/discover.mjs'

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

test('mergeNames only adds names and keeps them sorted', () => {
  assert.deepEqual(mergeNames(['b', 'd'], ['a', 'b', 'c']), ['a', 'b', 'c', 'd'])
  assert.deepEqual(mergeNames(['z'], []), ['z'])
})
