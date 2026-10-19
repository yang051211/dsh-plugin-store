import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandoff, HANDOFF_TTL_MS } from '../lib/test/handoff.js'

test('take returns the requested plugin once', () => {
  const handoff = createHandoff(() => 0)
  handoff.request({ name: 'dsh-context', title: '上下文洞察' })
  assert.deepEqual(handoff.peek(), { name: 'dsh-context', title: '上下文洞察' })
  assert.equal(handoff.take(), 'dsh-context')
  assert.equal(handoff.take(), null)
  assert.equal(handoff.peek(), null)
})

test('pending install expires after 10 minutes', () => {
  let clock = 0
  const handoff = createHandoff(() => clock)
  handoff.request({ name: 'dsh-context', title: 'x' })
  assert.equal(HANDOFF_TTL_MS, 10 * 60 * 1000)
  clock = HANDOFF_TTL_MS + 1
  assert.equal(handoff.peek(), null)
  assert.equal(handoff.take(), null)
})

test('dismiss clears the pending install', () => {
  const handoff = createHandoff(() => 0)
  handoff.request({ name: 'a', title: 'A' })
  handoff.dismiss()
  assert.equal(handoff.take(), null)
})

test('subscribers hear request, take and dismiss', () => {
  const handoff = createHandoff(() => 0)
  let heard = 0
  const stop = handoff.subscribe(() => { heard++ })
  handoff.request({ name: 'a', title: 'A' })
  handoff.take()
  handoff.request({ name: 'b', title: 'B' })
  handoff.dismiss()
  stop()
  handoff.request({ name: 'c', title: 'C' })
  assert.equal(heard, 4)
})

test('peek returns the same object until the state changes', () => {
  const handoff = createHandoff(() => 0)
  handoff.request({ name: 'a', title: 'A' })
  assert.equal(handoff.peek(), handoff.peek())
})
