import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeStats, plannedMarketFiles, staleMarketFiles } from '../../tools/catalog/outputs.mjs'

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
