import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KEEP_ONLY_KEY, createKeepOnly, HIDE_CSS, injectHideStyle, selectTabByLabel, selectTabWhenReady } from '../lib/test/hub.js'

const memory = () => {
  const items = new Map()
  return { items, getItem: key => items.get(key) ?? null, setItem: (key, value) => { items.set(key, String(value)) } }
}

test('keep-only is off by default, remembers on, and tells subscribers', () => {
  const storage = memory()
  const keepOnly = createKeepOnly(() => storage)
  let heard = 0
  const stop = keepOnly.subscribe(() => { heard++ })
  assert.equal(keepOnly.get(), false)
  keepOnly.set(true)
  assert.equal(keepOnly.get(), true)
  assert.equal(storage.items.get(KEEP_ONLY_KEY), '1')
  assert.equal(KEEP_ONLY_KEY, 'dsh-startide:keep-only')
  keepOnly.set(false)
  assert.equal(keepOnly.get(), false)
  stop()
  keepOnly.set(true)
  assert.equal(heard, 2)
})

test('keep-only reads as off when storage throws, and set does not throw', () => {
  const keepOnly = createKeepOnly(() => { throw new Error('SecurityError') })
  assert.equal(keepOnly.get(), false)
  assert.doesNotThrow(() => keepOnly.set(true))
  const broken = createKeepOnly(() => ({ getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }))
  assert.equal(broken.get(), false)
  assert.doesNotThrow(() => broken.set(true))
})

test('the hide style targets only the official heading and tab bar of a page holding the store', () => {
  assert.match(HIDE_CSS, /:has\(\.ps-root\)/)
  for (const part of ['_pageHeading', '_pageTabs']) assert.ok(HIDE_CSS.includes(part))
  assert.equal(HIDE_CSS.includes('_pageTabList'), false)
  assert.equal(HIDE_CSS.includes('_toolbar'), false)
  assert.equal(HIDE_CSS.includes('_pageHead"'), false, 'the head also holds the toolbar; only the heading inside it goes')
})

test('the hide style is injected once and removed by its disposer', () => {
  const added = []
  const doc = {
    head: { appendChild: el => { added.push(el); el.isConnected = true } },
    querySelector: selector => (selector === 'style[data-plugin="dsh-startide-hide"]' ? added.find(el => el.isConnected) ?? null : null),
    createElement: () => ({ dataset: {}, textContent: '', isConnected: false, remove() { this.isConnected = false }, setAttribute(name, value) { if (name === 'data-plugin') this.dataset.plugin = value } }),
  }
  const dispose = injectHideStyle(doc)
  const again = injectHideStyle(doc)
  assert.equal(added.length, 1)
  assert.equal(added[0].textContent, HIDE_CSS)
  again()
  assert.equal(added[0].isConnected, true, 'a second disposer does not remove the first owner\'s style')
  dispose()
  assert.equal(added[0].isConnected, false)
})

function page(tabs) {
  const nodes = tabs.map(([text, selected]) => ({ textContent: text, clicks: 0, getAttribute: name => (name === 'aria-selected' ? String(selected) : null), click() { this.clicks++ } }))
  return { nodes, root: { querySelectorAll: selector => (selector === '[role="tab"]' ? nodes : []) } }
}

test('selectTabByLabel clicks the Store tab', () => {
  const { nodes, root } = page([['已安装', true], ['发现', false], ['商城', false]])
  assert.equal(selectTabByLabel(root, '商城'), true)
  assert.deepEqual(nodes.map(n => n.clicks), [0, 0, 1])
})

test('selectTabByLabel leaves an already selected tab alone', () => {
  const { nodes, root } = page([['已安装', false], ['商城', true]])
  assert.equal(selectTabByLabel(root, '商城'), true)
  assert.deepEqual(nodes.map(n => n.clicks), [0, 0])
})

test('selectTabByLabel reports a missing tab so the notice can take over', () => {
  const { root } = page([['已安装', true], ['发现', false]])
  assert.equal(selectTabByLabel(root, '商城'), false)
})

test('selectTabWhenReady retries until the tab appears, then stops', async () => {
  const { nodes, root } = page([])
  let attempts = 0
  const done = selectTabWhenReady(() => { attempts++; if (attempts === 3) nodes.push(...page([['商城', false]]).nodes); return root }, '商城', { tries: 10, delayMs: 1 })
  assert.equal(await done, true)
  assert.equal(attempts, 3)
  assert.equal(nodes[0].clicks, 1)
})

test('selectTabWhenReady gives up after its tries', async () => {
  const { root } = page([])
  assert.equal(await selectTabWhenReady(() => root, '商城', { tries: 3, delayMs: 1 }), false)
})
