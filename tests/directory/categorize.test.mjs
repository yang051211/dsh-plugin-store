import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { categorize } from '../../tools/directory/categorize.mjs'

const categories = [
  { id: 'memory', match: ['memory', '记忆'] },
  { id: 'ui', match: ['ui', 'theme'] },
  { id: 'fun', match: ['theme', 'pet'] },
]
const facts = (keywords, description = '', name = 'dsh-x') => ({ name, keywords, description })

test('the first category with a matching word wins, in configured order', () => {
  assert.equal(categorize(facts(['theme']), categories), 'ui')
  assert.equal(categorize(facts(['pet', 'memory']), categories), 'memory')
})

test('ASCII words match whole words only; CJK words match inside text', () => {
  assert.equal(categorize(facts([], 'build tools for guidance'), categories), 'other', '"ui" inside "build" or "guidance" is not a match')
  assert.equal(categorize(facts([], 'A UI tweak'), categories), 'ui')
  assert.equal(categorize(facts([], '长期记忆插件'), categories), 'memory')
  assert.equal(categorize(facts([], '', 'dsh-pet-cat'), categories), 'fun', 'name words count')
})

test('nothing matching falls back to other', () => {
  assert.equal(categorize(facts(['dsh']), categories), 'other')
})

test('the shipped config defines other last and every category has words', () => {
  const config = JSON.parse(readFileSync(new URL('../../directory/config.json', import.meta.url), 'utf8'))
  const ids = config.categories.map(c => c.id)
  assert.equal(ids.at(-1), 'other')
  assert.equal(new Set(ids).size, ids.length)
  for (const c of config.categories) {
    assert.ok(c.title?.zh && c.title?.en, c.id)
    if (c.id !== 'other') assert.ok(c.match.length > 0, c.id)
  }
})
