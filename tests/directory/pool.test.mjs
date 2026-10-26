import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runPool } from '../../tools/directory/pool.mjs'

const tick = ms => new Promise(resolve => setTimeout(resolve, ms))

test('runPool never runs more workers at once than the limit', async () => {
  let running = 0
  let peak = 0
  await runPool([1, 2, 3, 4, 5, 6, 7], 3, async n => {
    running++
    peak = Math.max(peak, running)
    await tick(5 + (n % 3))
    running--
    return n
  })
  assert.equal(peak, 3)
})

test('a failing worker does not stop the others, and results keep the input order', async () => {
  const results = await runPool(['a', 'b', 'c'], 2, async item => {
    await tick(item === 'a' ? 10 : 1)
    if (item === 'b') throw new Error('boom')
    return item.toUpperCase()
  })
  assert.deepEqual(results.map(r => r.item), ['a', 'b', 'c'])
  assert.deepEqual(results.map(r => r.ok), [true, false, true])
  assert.equal(results[0].value, 'A')
  assert.equal(results[1].error.message, 'boom')
})

test('an empty list resolves to no results', async () => {
  assert.deepEqual(await runPool([], 4, async () => 1), [])
})
