import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const client = () => readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const host = () => readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
const pkg = () => JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('client bundle is wrapped for the web module loader', () => {
  assert.ok(client().startsWith('window.__ModuleLoader__.load({ id: "dsh-plugin-store"'))
  assert.ok(client().trimEnd().endsWith('return module.exports; } });'))
})

test('client bundle carries no @deepseek-ai runtime code', () => {
  assert.equal(client().includes('@deepseek-ai/'), false)
})

test('host bundle is ESM and exports apply', () => {
  assert.match(host(), /export\s*\{[^}]*apply/)
})

test('manifest declares the bundle, the client half, and no prepare script', () => {
  const manifest = pkg()
  assert.equal(manifest.name, 'dsh-plugin-store')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  // `-0` keeps 0.3.0 prereleases out: DSH checks engines with includePrerelease.
  assert.equal(manifest.engines.dsh, '>=0.2.1-rc.2 <0.3.0-0')
  assert.equal(manifest.scripts?.prepare, undefined)
  assert.deepEqual(manifest.exports['./client'], './lib/client.js')
})
