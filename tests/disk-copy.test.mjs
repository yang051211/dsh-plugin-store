import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createDiskCopy, defaultCopyFile } from '../lib/test/host.js'

const doc = { format: 1, plugins: [{ name: 'a', versions: [{ version: '1.0.0' }] }] }
const scratch = () => fs.mkdtempSync(join(tmpdir(), 'startide-copy-'))

test('the copy lives in the DSH cache directory, under $DSH_HOME when it is set', () => {
  assert.equal(defaultCopyFile({}), join(homedir(), '.dsh', 'cache', 'startide', 'index.json'))
  assert.equal(defaultCopyFile({ DSH_HOME: '  ' }), join(homedir(), '.dsh', 'cache', 'startide', 'index.json'))
  assert.equal(defaultCopyFile({ DSH_HOME: 'elsewhere' }), join(resolve('elsewhere'), 'cache', 'startide', 'index.json'))
})

test('a saved copy reads back, and its folder is created on the way', async () => {
  const dir = scratch()
  const copy = createDiskCopy(join(dir, 'nested', 'index.json'))
  assert.equal(await copy.load(), null)
  await copy.save({ index: doc, indexUrl: 'https://x/index.json', savedAt: 5 })
  assert.deepEqual(await copy.load(), { index: doc, indexUrl: 'https://x/index.json', savedAt: 5 })
  assert.deepEqual(fs.readdirSync(join(dir, 'nested')), ['index.json'], 'no temporary file left behind')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('a damaged or foreign file reads as no copy instead of breaking the store', async () => {
  const dir = scratch()
  const file = join(dir, 'index.json')
  for (const text of ['{not json', JSON.stringify({ index: { format: 2, plugins: [] }, indexUrl: 'u', savedAt: 1 }), JSON.stringify({ index: doc })]) {
    fs.writeFileSync(file, text)
    assert.equal(await createDiskCopy(file).load(), null, text)
  }
  fs.rmSync(dir, { recursive: true, force: true })
})

test('a copy that cannot be written is skipped quietly', async () => {
  const dir = scratch()
  fs.writeFileSync(join(dir, 'blocker'), '')
  await createDiskCopy(join(dir, 'blocker', 'index.json')).save({ index: doc, indexUrl: 'u', savedAt: 1 })
  fs.rmSync(dir, { recursive: true, force: true })
})
