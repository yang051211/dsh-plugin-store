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
  assert.equal(await services.update('dsh-pet', '1.1.0'), 'restart-required')
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
