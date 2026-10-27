import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as tar from 'tar'
import { MAX_TARBALL_BYTES, MAX_UNPACKED_BYTES, untar } from '../../tools/directory/npm.mjs'

async function tarball(files) {
  const dir = mkdtempSync(join(tmpdir(), 'npm-test-'))
  try {
    mkdirSync(join(dir, 'package'))
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, 'package', name), body)
    const chunks = []
    await new Promise((resolve, reject) => tar.c({ gzip: true, cwd: dir }, ['package']).on('data', c => chunks.push(c)).on('end', resolve).on('error', reject))
    return Buffer.concat(chunks)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('a package that unpacks past the limit is refused with a clear reason', async () => {
  const tgz = await tarball({ 'big.bin': Buffer.alloc(4096, 1) })
  await assert.rejects(untar(tgz, 1024), /unpacks to more than 1024 bytes/)
  const { files } = await untar(tgz, 1 << 20)
  assert.equal(files.get('big.bin').length, 4096)
})

test('plugins with large assets fit: the limits allow a 128 MB tarball unpacking to 256 MB', () => {
  assert.equal(MAX_TARBALL_BYTES, 128 * 1024 * 1024)
  assert.equal(MAX_UNPACKED_BYTES, 256 * 1024 * 1024)
})
