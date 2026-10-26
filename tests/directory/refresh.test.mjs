import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickRefresh } from '../../tools/directory/refresh.mjs'

const NOW = Date.parse('2026-10-26T00:00:00Z')
const ago = days => new Date(NOW - days * 86_400_000).toISOString()

test('unknown packages and ones whose search version moved are always refreshed', () => {
  const picked = pickRefresh({
    hints: { fresh: null, moved: '2.0.0', same: '1.0.0', seedOnly: null },
    latest: new Map([['moved', '1.0.0'], ['same', '1.0.0'], ['seedOnly', '1.0.0']]),
    checked: { moved: ago(1), same: ago(1), seedOnly: ago(1) },
    now: NOW, recheckDays: 7, recheckLimit: 0,
  })
  assert.deepEqual(picked.sort(), ['fresh', 'moved'], 'a seed-only name with a known package is not re-read every run')
})

test('known packages are rechecked once they are older than recheckDays, oldest first, up to the limit', () => {
  const picked = pickRefresh({
    hints: { a: '1.0.0', b: '1.0.0', c: '1.0.0', d: null, e: '1.0.0' },
    latest: new Map(['a', 'b', 'c', 'd', 'e'].map(n => [n, '1.0.0'])),
    checked: { a: ago(8), b: ago(30), c: ago(2), e: ago(9) },
    now: NOW, recheckDays: 7, recheckLimit: 3,
  })
  // d was never checked (oldest possible), then b (30 days), then e (9 days); a waits for the next run.
  assert.deepEqual(picked, ['d', 'b', 'e'])
})

test('a package search no longer finds is still rechecked by age, so it can be delisted', () => {
  const picked = pickRefresh({
    hints: { gone: '1.0.0' },
    latest: new Map([['gone', '1.0.0']]),
    checked: { gone: ago(10) },
    now: NOW, recheckDays: 7, recheckLimit: 10,
  })
  assert.deepEqual(picked, ['gone'])
})
