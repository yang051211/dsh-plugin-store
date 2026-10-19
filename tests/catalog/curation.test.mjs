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
  const names = curation.plugins.map(p => p.name)
  assert.ok(names.includes('dsh-chat-toc') && names.includes('dsh-context'))
})

test('rejects duplicate category ids', () => {
  rejects(variant(d => { d.categories[1].id = 'ui' }), /categories\[1\]\.id/)
})

test('rejects an undeclared plugin category', () => {
  rejects(variant(d => { d.plugins[0].category = 'nope' }), /plugins\[0\]\.category/)
})

test('rejects a featured plugin that is not curated', () => {
  rejects(variant(d => { d.featured[1].plugin = 'ghost' }), /featured\[1\]\.plugin/)
})

test('rejects a featured banner that is not a non-empty list', () => {
  rejects(variant(d => { d.featured = d.featured[0] }), /^featured: must be a non-empty list/)
  rejects(variant(d => { d.featured = [] }), /^featured: must be a non-empty list/)
})

test('rejects a plugin featured twice', () => {
  rejects(variant(d => { d.featured.push({ ...d.featured[0] }) }), /featured\[2\]\.plugin: duplicates "alpha"/)
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

test('rejects duplicate plugin names', () => {
  rejects(variant(d => { d.plugins[1].name = 'alpha' }), /plugins\[1\]\.name/)
})

test('rejects duplicate section ids', () => {
  rejects(variant(d => { d.sections[1].id = 'ui-better' }), /sections\[1\]\.id/)
})

test('review.version must be an exact version string', () => {
  rejects(variant(d => { d.plugins[0].review.version = 1.0 }), /plugins\[0\]\.review\.version.*exact version/)
  rejects(variant(d => { d.plugins[0].review.version = '^1.0.0' }), /plugins\[0\]\.review\.version.*exact version/)
})

/** Write calls whose target is not one of the tool-owned directories (catalog.yaml is never among them). */
const WRITE_CALL = /\b(writeFileSync|writeFile|appendFile\w*|createWriteStream|rmSync|unlinkSync|renameSync|copyFileSync)\(\s*/g
const OWNED_TARGET = /^join\(\s*(UPSTREAM_DIR|SCAN_DIR|MARKET_DIR|ICON_CACHE_DIR)\b/
function unsafeWrites(source) {
  return [...source.matchAll(WRITE_CALL)]
    .map(call => source.slice(call.index + call[0].length, call.index + call[0].length + 120))
    .filter(target => !OWNED_TARGET.test(target))
}

test('the write guard flags writes outside tool-owned directories', () => {
  assert.equal(unsafeWrites("writeFileSync(CURATION_FILE, 'x')").length, 1)
  assert.equal(unsafeWrites("writeFileSync(join(ROOT, 'catalog', 'catalog.yaml'), x)").length, 1)
  assert.equal(unsafeWrites("writeFileSync(join(MARKET_DIR, 'index.json'), x)").length, 0)
})

test('curation file is never written by tools', () => {
  const dir = new URL('../../tools/catalog/', import.meta.url)
  for (const file of readdirSync(dir).filter(f => f.endsWith('.mjs'))) {
    assert.deepEqual(unsafeWrites(readFileSync(new URL(file, dir), 'utf8')), [], `${file} writes outside tool-owned directories`)
  }
})
