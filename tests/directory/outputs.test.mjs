import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plannedMarketFiles } from '../../tools/directory/outputs.mjs'

test('the index is written without indentation, so store 0.1.x (which refuses an index over 8 MB) can still read it', () => {
  const index = { format: 1, plugins: [{ name: 'a', version: '1.0.0' }] }
  const text = plannedMarketFiles(index, new Map(), () => null).get('index.json')
  assert.equal(text, `${JSON.stringify(index)}\n`)
})
