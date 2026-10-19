import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanPackage } from '../../tools/catalog/scan.mjs'

const pkg = (files) => new Map(Object.entries({ 'package.json': JSON.stringify({ name: 'x' }), ...files }).map(([k, v]) => [k, Buffer.from(v)]))

const CASES = {
  network: { hit: 'const r = await fetch(url)', miss: 'const fetcher = 1' },
  fileSystem: { hit: "import { readFile } from 'node:fs/promises'", miss: 'const profile = 1' },
  agentTools: { hit: "export const inject = ['tools', 'locale']", miss: "export const inject = ['locale']" },
  childProcess: { hit: "const { spawn } = require('child_process')", miss: 'const processed = 1' },
}

for (const [kind, { hit, miss }] of Object.entries(CASES)) {
  test(`${kind}: detects evidence`, () => {
    const result = scanPackage(pkg({ 'lib/index.js': `// header\n${hit}\n` }))
    assert.equal(result[kind].hit, true)
    assert.deepEqual(result[kind].evidence[0], { file: 'lib/index.js', line: 2, text: hit })
  })
  test(`${kind}: stays quiet without evidence`, () => {
    const result = scanPackage(pkg({ 'lib/index.js': miss }))
    assert.equal(result[kind].hit, false)
    assert.deepEqual(result[kind].evidence, [])
  })
}

test('installScripts: reads lifecycle scripts from package.json', () => {
  const withScript = new Map([['package.json', Buffer.from(JSON.stringify({ scripts: { postinstall: 'node setup.js', test: 'x' } }))]])
  const result = scanPackage(withScript)
  assert.equal(result.installScripts.hit, true)
  assert.deepEqual(result.installScripts.evidence, [{ file: 'package.json', line: 0, text: 'scripts.postinstall: node setup.js' }])
  assert.equal(scanPackage(pkg({})).installScripts.hit, false)
})

test('counts runtime dependencies', () => {
  const files = new Map([['package.json', Buffer.from(JSON.stringify({ dependencies: { a: '1', b: '2' }, devDependencies: { c: '3' } }))]])
  assert.equal(scanPackage(files).dependencies, 2)
})

test('keeps at most five evidence lines and truncates long ones', () => {
  const body = Array.from({ length: 8 }, (_, i) => `fetch('/a${i}') ${'x'.repeat(300)}`).join('\n')
  const result = scanPackage(pkg({ 'lib/a.js': body }))
  assert.equal(result.network.evidence.length, 5)
  assert.ok(result.network.evidence.every(e => e.text.length <= 160))
})

test('evidence from a long line shows the matched part', () => {
  const line = `${'a'.repeat(5000)}await fetch('https://api.example.com/v1')${'b'.repeat(5000)}`
  const [evidence] = scanPackage(pkg({ 'lib/min.js': line })).network.evidence
  assert.ok(evidence.text.length <= 160)
  assert.match(evidence.text, /fetch\('https:\/\/api\.example\.com/)
})

test('flags minified files with very long lines', () => {
  const result = scanPackage(pkg({ 'lib/min.js': 'a'.repeat(6000), 'lib/ok.js': 'short' }))
  assert.deepEqual(result.minifiedFiles, ['lib/min.js'])
})

test('binding.gyp counts as an install script', () => {
  const result = scanPackage(pkg({ 'binding.gyp': '{}' }))
  assert.equal(result.installScripts.hit, true)
  assert.match(result.installScripts.evidence[0].text, /binding\.gyp/)
})

test('scans .mts, .cts and .jsx sources too', () => {
  for (const file of ['lib/a.mts', 'lib/a.cts', 'lib/a.jsx']) {
    assert.equal(scanPackage(pkg({ [file]: 'await fetch(url)' })).network.hit, true, file)
  }
})

test('lists native and wasm binaries it cannot read', () => {
  const result = scanPackage(pkg({ 'build/addon.node': 'bin', 'lib/core.wasm': 'bin', 'lib/a.js': 'x' }))
  assert.deepEqual(result.binaryFiles, ['build/addon.node', 'lib/core.wasm'])
})

test('ignores declaration files, source maps and node_modules', () => {
  const result = scanPackage(pkg({
    'lib/types.d.ts': 'declare function fetch(url: string): void',
    'lib/index.js.map': '{"mappings":"fetch("}',
    'node_modules/dep/index.js': 'fetch(url)',
  }))
  assert.equal(result.network.hit, false)
})
