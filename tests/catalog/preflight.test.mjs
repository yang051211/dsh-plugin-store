import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preflightIssues, servicesProvidedBy } from '../../tools/catalog/preflight.mjs'

const DSH = { dshVersion: '0.2.1-rc.2', services: ['connection', 'remote', 'slots', 'tools', 'webServer'] }
const scanned = (overrides = {}) => ({ requiredServices: [], setupHints: [], ...overrides })
const plugin = (overrides = {}) => ({ name: 'p', usage: { where: { zh: 'a' }, try: { zh: 'b' } }, review: { status: 'approved' }, ...overrides })

test('servicesProvidedBy reads provide() and super(ctx, name) registrations', () => {
  const files = new Map([
    ['dsh-host-webserver/lib/index.js', "class W extends Service { constructor(ctx) { super(ctx, 'webServer') } }"],
    ['dsh-tools/lib/index.js', "ctx.provide('tools'); ctx.provide(\"skills\", impl)"],
    ['dsh-x/lib/index.js', 'const unrelated = provideLater("nope")'],
    ['dsh-web-app/lib/startup.js', 'const WEB_STARTUP_SERVICE = "webStartup";\nfunction apply(ctx) { ctx.provide(WEB_STARTUP_SERVICE, {}) }'],
  ])
  assert.deepEqual(servicesProvidedBy(files), ['skills', 'tools', 'webServer', 'webStartup'])
})

test('a required service DSH does not provide is an issue, naming the service and the DSH version', () => {
  const issues = preflightIssues(plugin(), scanned({ requiredServices: ['webServer', 'webRuntime'] }), DSH)
  assert.equal(issues.length, 1)
  assert.equal(issues[0].id, 'services')
  assert.match(issues[0].message, /webRuntime/)
  assert.match(issues[0].message, /0\.2\.1-rc\.2/)
})

test('setup hints need a usage.setup step', () => {
  const hints = [{ file: 'README.md', line: 3, text: 'pip install pyghidra' }]
  assert.deepEqual(preflightIssues(plugin(), scanned({ setupHints: hints }), DSH).map(i => i.id), ['setup'])
  const withSetup = plugin({ usage: { where: { zh: 'a' }, try: { zh: 'b' }, setup: { zh: '先装 pyghidra' } } })
  assert.deepEqual(preflightIssues(withSetup, scanned({ setupHints: hints }), DSH), [])
})

test('a reviewer note in review.preflight resolves an issue', () => {
  const resolved = plugin({ review: { status: 'approved', preflight: { services: 'webRuntime is optional at runtime (checked lib/index.js)' } } })
  assert.deepEqual(preflightIssues(resolved, scanned({ requiredServices: ['webRuntime'] }), DSH), [])
})

test('a scan made before the preflight existed asks for a re-scan', () => {
  assert.deepEqual(preflightIssues(plugin(), { network: { hit: false } }, DSH).map(i => i.id), ['rescan'])
  assert.deepEqual(preflightIssues(plugin(), undefined, DSH).map(i => i.id), ['rescan'])
})

test('without a DSH service list the service check is skipped, not passed silently', () => {
  assert.deepEqual(preflightIssues(plugin(), scanned({ requiredServices: ['webRuntime'] }), null).map(i => i.id), ['services-unknown'])
})
