import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as tar from 'tar'
import { createHash } from 'node:crypto'
import { downloadTarball, MAX_TARBALL_BYTES, MAX_UNPACKED_BYTES, untar } from '../../tools/directory/npm.mjs'
import { scanPackage } from '../../tools/directory/scan.mjs'

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

test('a package.json that starts with a byte-order mark is still read, as npm reads it', async () => {
  const manifest = { name: 'dsh-bom', version: '1.0.0', scripts: { postinstall: 'node x.js' } }
  const tgz = await tarball({ 'package.json': '﻿' + JSON.stringify(manifest) })
  const integrity = `sha512-${createHash('sha512').update(tgz).digest('base64')}`
  const io = { fetch: async () => new Response(tgz) }
  const { files } = await downloadTarball({ name: 'dsh-bom', version: '1.0.0', dist: { tarball: 'https://r/dsh-bom.tgz', integrity } }, io)
  assert.equal(scanPackage(files).installScripts.hit, true, 'the scanner reads the same manifest')
})

test('plugins with large assets fit: the limits allow a 128 MB tarball unpacking to 256 MB', () => {
  assert.equal(MAX_TARBALL_BYTES, 128 * 1024 * 1024)
  assert.equal(MAX_UNPACKED_BYTES, 256 * 1024 * 1024)
})
