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
      const answer = queue && queue.length > 0 ? queue.shift() : ANSWERS[method]
      if (answer instanceof Error) throw answer
      return answer
    },
  })
}
const failed = (code, extra = {}) => ({ ok: true, value: { application: 'failed', error: { code, diagnostic: `${code} said so` }, ...extra } })
const done = application => ({ ok: true, value: { application } })
/** A listBundles answer: `pet` is dsh-pet's { version, enabled }, or null when it is not installed. */
const listed = pet => ({ ok: true, value: pet ? [{ name: 'dsh-pet', installed: true, official: false, availability: 'profile', removable: true, ...pet }] : [] })

test('under hot reload an update uninstalls the old version, then installs the new one in the same enabled state', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), done('applied')], removeBundle: [done('applied')] }, calls))
  assert.equal(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: false }), 'applied')
  assert.deepEqual(calls.map(c => c.slice(0, 2)), [['installBundle', 'dsh-pet@1.1.0'], ['removeBundle', 'dsh-pet'], ['installBundle', 'dsh-pet@1.1.0']])
  assert.deepEqual(calls[0][2], { enabled: false }, 'without hot reload DSH enables any install not told otherwise, even of an installed name')
  assert.deepEqual(calls[2][2], { enabled: false })
})

test('when the new version will not install after the uninstall, the old one goes back', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), failed('operation-error'), done('applied')], removeBundle: [done('applied')], listBundles: [listed(null), listed({ version: '1.0.0', enabled: true })] }, calls))
  assert.deepEqual(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), { error: 'operation-error said so', code: 'restored', version: '1.0.0' })
  assert.deepEqual(calls.at(-1).slice(0, 3), ['installBundle', 'dsh-pet@1.0.0', { enabled: true }])
})

test('when neither version installs after the uninstall, the plugin is reported missing', async () => {
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), failed('operation-error'), failed('operation-error')], removeBundle: [done('applied')], listBundles: [listed(null), listed(null)] }, []))
  const outcome = await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true })
  assert.equal(outcome.code, 'lost')
})

test('an uninstall DSH refuses after disabling the plugin keeps the old version and says it is now disabled', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed')], removeBundle: [failed('bundle-in-use')], listBundles: [listed({ version: '1.0.0', enabled: false })] }, calls))
  assert.deepEqual(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), { error: 'bundle-in-use said so', code: 'bundle-in-use', disabled: true })
  assert.deepEqual(calls.map(c => c[0]), ['installBundle', 'removeBundle', 'listBundles'])
})

test('an uninstall that fails after the package is gone still goes on to install the new version', async () => {
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), done('applied')], removeBundle: [failed('operation-error')], listBundles: [listed(null)] }, []))
  assert.equal(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), 'applied')
})

test('a new version that installed although the call failed counts as updated, and the old one is not put back', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), new Error('connection reset')], removeBundle: [done('applied')], listBundles: [listed({ version: '1.1.0', enabled: true })] }, calls))
  assert.equal(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), 'applied')
  assert.equal(calls.filter(c => c[0] === 'installBundle').length, 2)
})

test('when the installed list cannot be read after a failure, the outcome says the state is unknown rather than lost', async () => {
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), failed('operation-error'), failed('operation-error')], removeBundle: [done('applied')], listBundles: [new Error('gone'), new Error('gone')] }, []))
  assert.equal((await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true })).code, 'unknown')
})

test('a restart any step needs carries into the outcome', async () => {
  const restartRemove = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), done('applied')], removeBundle: [done('restart-required')] }, []))
  assert.equal(await restartRemove.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), 'restart-required')
  const restartBack = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), failed('operation-error'), done('restart-required')], removeBundle: [done('applied')], listBundles: [listed(null), listed({ version: '1.0.0', enabled: true })] }, []))
  assert.deepEqual(await restartBack.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), { error: 'operation-error said so', code: 'restored', version: '1.0.0', restart: true })
})

test('an install that throws after the uninstall still puts the old version back', async () => {
  const calls = []
  const services = pluginManagerServices(scripted({ installBundle: [failed('already-installed'), new Error('lock wait timed out'), done('applied')], removeBundle: [done('applied')], listBundles: [listed(null)] }, calls))
  assert.deepEqual(await services.update('dsh-pet', '1.1.0', { current: '1.0.0', enabled: true }), { error: 'lock wait timed out', code: 'restored', version: '1.0.0' })
  assert.deepEqual(calls.at(-1).slice(0, 2), ['installBundle', 'dsh-pet@1.0.0'])
})

test('DSH makes one change at a time, so a second update waits for the first and says so', async () => {
  const calls = []
  const gates = []
  const strict = strictManager(calls)
  const gated = new Proxy({}, {
    get: (_, method) => async (...args) => {
      const answer = await strict[method](...args)
      await new Promise(resolve => gates.push(resolve))
      return answer
    },
  })
  const services = pluginManagerServices(gated)
  const seen = { a: [], b: [] }
  const tick = () => new Promise(r => setTimeout(r, 0))
  const a = services.update('dsh-a', '2.0.0', { current: '1.0.0', enabled: true }, s => seen.a.push(s))
  const b = services.update('dsh-b', '2.0.0', { current: '1.0.0', enabled: true }, s => seen.b.push(s))
  await tick()
  assert.deepEqual(calls.map(c => c[1]), ['dsh-a@2.0.0'])
  assert.deepEqual(seen, { a: ['running'], b: ['waiting'] })
  gates.shift()()
  assert.equal(await a, 'restart-required')
  await tick()
  assert.deepEqual(calls.map(c => c[1]), ['dsh-a@2.0.0', 'dsh-b@2.0.0'])
  assert.deepEqual(seen.b, ['waiting', 'running'])
  gates.shift()()
  assert.equal(await b, 'restart-required')
})
