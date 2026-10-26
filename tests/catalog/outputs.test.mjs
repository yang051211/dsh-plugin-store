import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendStatsHistory, mergeStats, plannedMarketFiles, staleMarketFiles } from '../../tools/directory/outputs.mjs'

const index = {
  plugins: [
    { name: 'alpha', icon: 'icons/alpha.svg' },
    { name: '@scope/beta' },
  ],
}
const details = new Map([['alpha', { name: 'alpha' }], ['@scope/beta', { name: '@scope/beta' }]])

test('market/ holds the index, one detail per listed plugin, and only listed icons', () => {
  const planned = plannedMarketFiles(index, details, file => Buffer.from(`icon:${file}`))
  assert.deepEqual([...planned.keys()].sort(), ['icons/alpha.svg', 'index.json', 'plugins/alpha.json', 'plugins/scope__beta.json'])
  assert.equal(planned.get('icons/alpha.svg').toString(), 'icon:alpha.svg')
})

test('a listed icon missing from the cache is an error', () => {
  assert.throws(() => plannedMarketFiles(index, details, () => null), /alpha\.svg.*catalog:fetch/)
})

test('files left over from delisted plugins are stale', () => {
  const planned = plannedMarketFiles(index, details, () => Buffer.from('x'))
  const existing = ['index.json', 'plugins/alpha.json', 'plugins/gone.json', 'icons/alpha.svg', 'icons/pending.png']
  assert.deepEqual(staleMarketFiles(existing, planned), ['icons/pending.png', 'plugins/gone.json'])
})

test('stats keep the previous value when a fetch comes back empty', () => {
  const { stats, warnings } = mergeStats({ stars: 7, weeklyDownloads: 100 }, { stars: null, weeklyDownloads: 120 })
  assert.deepEqual(stats, { stars: 7, weeklyDownloads: 120 })
  assert.deepEqual(warnings, ['stars: fetch failed, kept the previous value 7'])
  assert.deepEqual(mergeStats(undefined, { stars: null, weeklyDownloads: null }).stats, { stars: null, weeklyDownloads: null })
})

test('appendStatsHistory keeps one snapshot per day, newest last, at most 52', () => {
  const day = d => `2026-10-${String(d).padStart(2, '0')}T08:00:00.000Z`
  let history = appendStatsHistory(undefined, { stars: 1, weeklyDownloads: 10 }, day(1))
  history = appendStatsHistory(history, { stars: 2, weeklyDownloads: 12 }, day(8))
  assert.deepEqual(history, [{ date: '2026-10-01', stars: 1, weeklyDownloads: 10 }, { date: '2026-10-08', stars: 2, weeklyDownloads: 12 }])
  history = appendStatsHistory(history, { stars: 3, weeklyDownloads: 13 }, '2026-10-08T20:00:00.000Z')
  assert.deepEqual(history.at(-1), { date: '2026-10-08', stars: 3, weeklyDownloads: 13 }, 'a second fetch the same day replaces that day')
  assert.equal(history.length, 2)
  let long = []
  for (let i = 0; i < 60; i++) long = appendStatsHistory(long, { stars: i, weeklyDownloads: i }, new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString())
  assert.equal(long.length, 52)
  assert.equal(long.at(-1).stars, 59)
})
