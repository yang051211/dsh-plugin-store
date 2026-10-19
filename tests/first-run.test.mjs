import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldAutoOpen } from '../lib/test/first-run.js'

test('auto-opens exactly once', () => {
  const store = new Map()
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  assert.equal(shouldAutoOpen(storage), true)
  assert.equal(shouldAutoOpen(storage), false)
})

test('does not auto-open when storage throws', () => {
  const storage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.equal(shouldAutoOpen(storage), false)
})
