import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BULK_SIZE, fetchStars, pickStarRefresh, weeklyDownloads } from '../../tools/directory/stats.mjs'

function fakeApi(table, { failBulk = false } = {}) {
  const calls = []
  const fetch = async url => {
    calls.push(url)
    const path = decodeURIComponent(new URL(url).pathname.replace('/downloads/point/last-week/', ''))
    const names = path.startsWith('@') ? [path] : path.split(',')
    if (names.length > 1) {
      if (failBulk) return new Response('x', { status: 500 })
      return new Response(JSON.stringify(Object.fromEntries(names.filter(n => n in table).map(n => [n, table[n] === null ? null : { downloads: table[n], package: n }]))))
    }
    if (!(names[0] in table)) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    return new Response(JSON.stringify({ downloads: table[names[0]], package: names[0] }))
  }
  return { io: { fetch }, calls }
}

test('unscoped names go in batches, scoped names one by one', async () => {
  const names = Array.from({ length: BULK_SIZE + 2 }, (_, i) => `p${i}`).concat(['@s/a'])
  const table = Object.fromEntries(names.map((n, i) => [n, i]))
  const { io, calls } = fakeApi(table)
  const result = await weeklyDownloads(io, names)
  assert.equal(calls.length, 3, 'two batches and one scoped call')
  assert.equal(result.get('p5'), 5)
  assert.equal(result.get('@s/a'), BULK_SIZE + 2)
})

test('a name missing from a batch, a null entry, a 404 or a failed batch gives null', async () => {
  const { io } = fakeApi({ a: 3, b: null, c: 1 })
  const result = await weeklyDownloads(io, ['a', 'b', 'c', 'gone', '@s/missing'])
  assert.equal(result.get('a'), 3)
  assert.equal(result.get('b'), null)
  assert.equal(result.get('gone'), null)
  assert.equal(result.get('@s/missing'), null)
  const failing = await weeklyDownloads(fakeApi({ a: 1, b: 2 }, { failBulk: true }).io, ['a', 'b'])
  assert.deepEqual([...failing.values()], [null, null])
})

test('a rate-limited answer is retried after a growing pause instead of becoming unknown', async () => {
  let calls = 0
  const waits = []
  const io = { fetch: async () => (++calls <= 2 ? new Response('slow down', { status: 429, headers: { 'retry-after': '0' } }) : new Response(JSON.stringify({ downloads: 7, package: '@s/a' }))) }
  const result = await weeklyDownloads(io, ['@s/a'], { sleep: async ms => { waits.push(ms) } })
  assert.equal(result.get('@s/a'), 7)
  assert.deepEqual(waits, [2000, 4000])
})

test('a single unscoped name still reads the flat answer', async () => {
  const { io } = fakeApi({ solo: 9 })
  assert.equal((await weeklyDownloads(io, ['solo'])).get('solo'), 9)
})

test('star refresh picks never-fetched names first, then the oldest, up to the limit', () => {
  const stats = { a: { starsAt: '2026-10-20' }, b: { starsAt: '2026-10-01' }, c: {} }
  assert.deepEqual(pickStarRefresh(['a', 'b', 'c', 'd'], stats, 3), ['c', 'd', 'b'])
  assert.deepEqual(pickStarRefresh(['a'], stats, 0), [])
})

test('a recent failed attempt counts like a recent fetch, so dead repositories do not hold the front of the queue', () => {
  const stats = { dead: { starsTriedAt: '2026-10-25' }, old: { starsAt: '2026-10-01', starsTriedAt: '2026-10-01' }, never: {} }
  assert.deepEqual(pickStarRefresh(['dead', 'old', 'never'], stats, 2), ['never', 'old'])
})

test('fetchStars reads GitHub repositories only, and null on failure', async () => {
  const io = { fetch: async url => (url.endsWith('/ann/x') ? new Response(JSON.stringify({ stargazers_count: 7 })) : new Response('', { status: 404 })) }
  assert.equal(await fetchStars(io, 'https://github.com/ann/x'), 7)
  assert.equal(await fetchStars(io, 'https://github.com/ann/missing'), null)
  assert.equal(await fetchStars(io, 'https://gitlab.com/ann/x'), null)
  assert.equal(await fetchStars(io, null), null)
})
