import { test } from 'node:test'
import assert from 'node:assert/strict'
import REMOTE from '@deepseek-ai/dsh-plugin-manager/remote'
import { pluginManagerServices } from '../lib/test/services.js'

const ANSWERS = {
  listBundles: { ok: true, value: [{ name: 'dsh-pet', installed: true, enabled: true, official: false, availability: 'profile', removable: true }] },
  setBundleEnabled: { ok: true, value: { application: 'restart-required' } },
  removeBundle: { ok: true, value: { application: 'applied' } },
  installBundle: { ok: true, value: { application: 'restart-required' } },
  inspect: { ok: true, value: { status: 'accepted', kind: 'git', name: 'dsh-x', version: '2.1.0', bundle: true, registry: null } },
}

/**
 * The browser's plugin manager as DSH's API gateway checks it: every call must pass exactly the declared parameters
 * (an optional trailing AbortSignal where the method takes one), whatever the TypeScript types mark optional.
 */
function strictManager(calls) {
  return new Proxy({}, {
    get: (_, method) => (...args) => {
      const endpoint = `pluginManager/${String(method)}`
      const descriptor = REMOTE.spec.methods[endpoint]
      assert.ok(descriptor, `${endpoint} is a declared method`)
      const expected = descriptor.parameters.length
      const withSignal = descriptor.cancellation !== undefined && args.length === expected + 1
      if (args.length !== expected && !withSignal) throw new Error(`client api: ${endpoint} expected ${expected} argument(s), got ${args.length}`)
      calls.push([String(method), ...args])
      return Promise.resolve(ANSWERS[method])
    },
  })
}

test('every plugin manager call passes the argument count DSH declares', async () => {
  const calls = []
  const services = pluginManagerServices(strictManager(calls))
  assert.deepEqual((await services.loadBundles()).map(b => b.name), ['dsh-pet'])
  assert.equal(await services.setEnabled('dsh-pet', false), 'restart-required')
  assert.equal(await services.remove('dsh-pet'), 'applied')
  assert.equal(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), 'restart-required')
  assert.deepEqual(await services.inspect('github:o/dsh-x'), { ok: true, name: 'dsh-x', version: '2.1.0' })
  assert.deepEqual(calls.map(c => c[0]), ['listBundles', 'setBundleEnabled', 'removeBundle', 'installBundle', 'inspect'])
  assert.equal(calls.find(c => c[0] === 'installBundle')[1], 'dsh-pet@1.1.0')
})

test('a refused or failing inspection reads as a reason', async () => {
  const refused = pluginManagerServices({ inspect: async () => ({ ok: true, value: { status: 'refused', problem: 'not-found', reason: 'no such package' } }) })
  assert.deepEqual(await refused.inspect('nope'), { ok: false, reason: 'no such package' })
  const down = pluginManagerServices({ inspect: async () => { throw new Error('offline') } })
  assert.deepEqual(await down.inspect('x'), { ok: false, reason: 'offline' })
})

/** A strict manager scripted per call: `script[method]` is a list of answers taken in order. */
function scripted(script, calls) {
  const strict = strictManager(calls)
  return new Proxy({}, {
    get: (_, method) => async (...args) => {
      await strict[method](...args)
      const queue = script[method]
      return queue && queue.length > 0 ? queue.shift() : ANSWERS[method]
    },
  })
}
const failed = (code, extra = {}) => ({ ok: true, value: { application: 'failed', error: { code, diagnostic: `${code} said so` }, ...extra } })
const done = application => ({ ok: true, value: { application } })

test('under hot reload an update uninstalls the old version, then installs the new one in the same enabled state', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), done('applied')], removeBundle: [done('applied')] }, calls))
  assert.equal(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: false }), 'applied')
  assert.deepEqual(calls.map(c => c.slice(0, 2)), [['installBundle', 'dsh-pet@1.1.0'], ['removeBundle', 'dsh-pet'], ['installBundle', 'dsh-pet@1.1.0']])
  assert.deepEqual(calls[2][2], { enabled: false })
})

test('when the new version will not install after the uninstall, the old one goes back', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), failed('operation-error'), done('applied')], removeBundle: [done('applied')] }, calls))
  assert.deepEqual(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), { error: 'operation-error said so', code: 'restored', version: '1.0.0' })
  assert.deepEqual(calls.at(-1).slice(0, 3), ['installBundle', 'dsh-pet@1.0.0', { enabled: true }])
})

test('when neither version installs after the uninstall, the plugin is reported missing', async () => {
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), failed('operation-error'), failed('operation-error')], removeBundle: [done('applied')] }, []))
  const outcome = await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true })
  assert.equal(outcome.code, 'lost')
})

test('an uninstall DSH refuses leaves the old version in place and says why', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed')], removeBundle: [failed('bundle-in-use')] }, calls))
  assert.deepEqual(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), { error: 'bundle-in-use said so', code: 'bundle-in-use' })
  assert.deepEqual(calls.map(c => c[0]), ['installBundle', 'removeBundle'])
})
