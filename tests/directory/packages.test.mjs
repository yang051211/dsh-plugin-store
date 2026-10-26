import { test } from 'node:test'
import assert from 'node:assert/strict'
import { factsOf, qualifies } from '../../tools/directory/packages.mjs'

const NOW = Date.parse('2026-10-26T00:00:00Z')
const config = { dshVersion: '0.2.1-rc.2', recentDays: 90 }
const iso = days => new Date(NOW - days * 86_400_000).toISOString()

function packument({ latest = '1.1.0', manifest = {}, older = {}, time = {} } = {}) {
  const bundle = { dsh: { bundle: { patch: './cordis.patch.yml' } } }
  return {
    name: 'dsh-demo',
    'dist-tags': { latest },
    versions: {
      '1.0.0': { name: 'dsh-demo', version: '1.0.0', ...bundle, ...older },
      [latest]: { name: 'dsh-demo', version: latest, description: 'A demo', author: 'Ann <a@x>', keywords: ['dsh', 'theme'], repository: 'git+https://github.com/ann/dsh-demo.git', ...bundle, ...manifest },
    },
    time: { created: iso(200), modified: iso(1), '1.0.0': iso(200), [latest]: iso(10), ...time },
  }
}

test('facts carry the latest manifest summary and the bundle versions, newest first', () => {
  const facts = factsOf(packument(), NOW)
  assert.equal(facts.latest, '1.1.0')
  assert.equal(facts.description, 'A demo')
  assert.equal(facts.author, 'Ann')
  assert.deepEqual(facts.repository, { url: 'https://github.com/ann/dsh-demo' })
  assert.deepEqual(facts.versions.map(v => v.version), ['1.1.0', '1.0.0'])
  assert.equal(facts.created, Math.floor(Date.parse(iso(200)) / 1000))
  assert.equal(facts.published, Math.floor(Date.parse(iso(10)) / 1000))
  assert.equal(qualifies(facts, config, NOW).ok, true)
})

test('at most 30 versions are kept', () => {
  const doc = packument()
  for (let i = 0; i < 40; i++) {
    doc.versions[`0.0.${i}`] = { name: 'dsh-demo', version: `0.0.${i}`, dsh: { bundle: { patch: 'x' } } }
    doc.time[`0.0.${i}`] = iso(300 - i)
  }
  assert.equal(factsOf(doc, NOW).versions.length, 30)
})

test('each listing rule names its reason', () => {
  const reason = doc => qualifies(factsOf(doc, NOW), config, NOW).reason
  assert.equal(reason(packument({ manifest: { dsh: undefined } })), 'not-bundle')
  assert.equal(reason(packument({ manifest: { deprecated: 'use x' } })), 'deprecated')
  assert.equal(reason(packument({ manifest: { repository: undefined, homepage: 'not a url' } })), 'no-source')
  assert.equal(reason(packument({ manifest: { engines: { dsh: '>=0.3.0' } } })), 'engines')
  assert.equal(reason(packument({ manifest: { engines: { dsh: 'nonsense range' } } })), 'engines')
  assert.equal(reason(packument({ time: { '1.1.0': iso(91) } })), 'stale')
  assert.equal(qualifies(factsOf(packument({ manifest: { repository: undefined, homepage: 'https://x.dev' } }), NOW), config, NOW).ok, true)
})

test('a package that stopped being a DSH plugin in its latest version is not listed', () => {
  const doc = packument({ manifest: { dsh: undefined } })
  assert.equal(factsOf(doc, NOW).isBundle, false)
  assert.equal(qualifies(factsOf(doc, NOW), config, NOW).reason, 'not-bundle')
})

test('malformed packuments give an error record instead of throwing', () => {
  const noTime = packument(); delete noTime.time
  const missingLatest = packument(); missingLatest['dist-tags'].latest = '9.9.9'
  for (const doc of [noTime, missingLatest, { name: 'x' }]) {
    const facts = factsOf(doc, NOW)
    assert.equal(typeof facts.error, 'string', JSON.stringify(doc).slice(0, 60))
    assert.equal(qualifies(facts, config, NOW).ok, false)
  }
})

test('odd field types are tolerated: a non-string description becomes empty', () => {
  const facts = factsOf(packument({ manifest: { description: { zh: '对象' }, keywords: 'theme', author: 42 } }), NOW)
  assert.equal(facts.description, '')
  assert.deepEqual(facts.keywords, [])
  assert.equal(facts.author, null)
})
