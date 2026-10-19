import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandoff, HANDOFF_TTL_MS, openInstalledFrom } from '../lib/test/handoff.js'

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

test('subscribers hear the expiry, so the notice goes away', () => {
  let clock = 0
  const timers = []
  const handoff = createHandoff(() => clock, { setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length }, clearTimer: () => {} })
  let heard = 0
  handoff.subscribe(() => { heard++ })
  handoff.request({ name: 'a', title: 'A' })
  assert.equal(timers.at(-1).ms, HANDOFF_TTL_MS + 1)
  clock = HANDOFF_TTL_MS + 1
  timers.at(-1).fn()
  assert.equal(handoff.peek(), null)
  assert.equal(heard, 2)
})

test('taking an expired request also tells subscribers', () => {
  let clock = 0
  const handoff = createHandoff(() => clock, { setTimer: () => 0, clearTimer: () => {} })
  let heard = 0
  handoff.request({ name: 'a', title: 'A' })
  handoff.subscribe(() => { heard++ })
  clock = HANDOFF_TTL_MS + 1
  assert.equal(handoff.take(), null)
  assert.equal(heard, 1)
})

test('installed pages open through plugin navigation when it is available', () => {
  const calls = []
  const open = openInstalledFrom({ navigation: () => ({ openBundle: name => calls.push(['bundle', name]) }), selectPanel: id => calls.push(['panel', id]) })
  open('dsh-context')
  const fallback = openInstalledFrom({ navigation: () => undefined, selectPanel: id => calls.push(['panel', id]) })
  fallback('dsh-context')
  assert.deepEqual(calls, [['bundle', 'dsh-context'], ['panel', 'plugins']])
})
