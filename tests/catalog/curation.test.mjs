import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { slugOf } from '../../tools/catalog/slug.mjs'
import { loadCuration, CurationError } from '../../tools/catalog/curation.mjs'

const VALID = new URL('../fixtures/catalog/valid.yaml', import.meta.url)

/** Write a variant of the valid fixture and return its path. */
function variant(mutate) {
  const doc = parse(readFileSync(VALID, 'utf8'))
  mutate(doc)
  const dir = mkdtempSync(join(tmpdir(), 'curation-'))
  const file = join(dir, 'catalog.yaml')
  writeFileSync(file, stringify(doc))
  return file
}

/** Assert loading `file` throws a CurationError whose message matches `pattern`. */
function rejects(file, pattern) {
  assert.throws(() => loadCuration(file), (error) => error instanceof CurationError && pattern.test(error.message))
}

test('slugOf flattens scoped names and keeps plain ones', () => {
  assert.equal(slugOf('@scope/pkg'), 'scope__pkg')
  assert.equal(slugOf('dsh-chat-toc'), 'dsh-chat-toc')
})

test('loads a valid curation file', () => {
  const curation = loadCuration(VALID)
  assert.equal(curation.plugins.length, 2)
  assert.equal(curation.plugins[1].name, '@scope/beta')
  assert.deepEqual(curation.categories.map(c => c.id), ['ui', 'tools'])
})

test('the repository catalog loads', () => {
  const curation = loadCuration(new URL('../../catalog/catalog.yaml', import.meta.url))
  assert.deepEqual(curation.plugins.map(p => p.name), ['dsh-chat-toc', 'dsh-context'])
})

test('rejects duplicate category ids', () => {
  rejects(variant(d => { d.categories[1].id = 'ui' }), /categories\[1\]\.id/)
})

test('rejects an undeclared plugin category', () => {
  rejects(variant(d => { d.plugins[0].category = 'nope' }), /plugins\[0\]\.category/)
})

test('rejects a featured plugin that is not curated', () => {
  rejects(variant(d => { d.featured.plugin = 'ghost' }), /featured\.plugin/)
})

test('rejects a section plugin that is not curated', () => {
  rejects(variant(d => { d.sections[0].plugins = ['ghost'] }), /sections\[0\]\.plugins\[0\]/)
})

test('requires English title and tagline', () => {
  rejects(variant(d => { delete d.plugins[0].title.en }), /plugins\[0\]\.title\.en/)
  rejects(variant(d => { delete d.plugins[0].tagline.en }), /plugins\[0\]\.tagline\.en/)
})

test('rejects an unknown review status', () => {
  rejects(variant(d => { d.plugins[0].review.status = 'maybe' }), /plugins\[0\]\.review\.status/)
})

test('approved reviews need version, date, reviewer and permissions', () => {
  for (const key of ['version', 'date', 'reviewer', 'permissions']) {
    rejects(variant(d => { delete d.plugins[0].review[key] }), new RegExp(`plugins\\[0\\]\\.review\\.${key}`))
  }
})

test('features need three to five entries', () => {
  rejects(variant(d => { d.plugins[0].features.zh = ['只有一条'] }), /plugins\[0\]\.features\.zh/)
  rejects(variant(d => { d.plugins[0].features.zh = ['1', '2', '3', '4', '5', '6'] }), /plugins\[0\]\.features\.zh/)
})

test('curation file is never written by tools', () => {
  const dir = new URL('../../tools/catalog/', import.meta.url)
  for (const file of readdirSync(dir).filter(f => f.endsWith('.mjs'))) {
    const source = readFileSync(new URL(file, dir), 'utf8')
    for (const call of source.matchAll(/(writeFile\w*|appendFile\w*|createWriteStream)\(([^)]*)\)/g)) {
      assert.equal(call[2].includes('catalog.yaml'), false, `${file} writes catalog.yaml: ${call[0]}`)
      assert.equal(/\bcurationPath\b/.test(call[2]), false, `${file} writes the curation path: ${call[0]}`)
    }
  }
})
