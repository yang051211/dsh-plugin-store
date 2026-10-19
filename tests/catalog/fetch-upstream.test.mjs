import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import * as tar from 'tar'
import { fetchUpstream, enginesDshOf, downloadTarball } from '../../tools/catalog/fetch-upstream.mjs'

const REGISTRY = 'https://registry.example/'

/**
 * Pack `files` (path → string | Buffer; undefined omits) under package/ into a gzipped tarball buffer.
 * `typeflags` rewrites the header type of named entries, e.g. '7' (contiguous file) or '2' (symbolic link).
 */
async function pack(files, typeflags = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-'))
  for (const [path, body] of Object.entries(files)) {
    if (body === undefined) continue
    mkdirSync(dirname(join(dir, 'package', path)), { recursive: true })
    writeFileSync(join(dir, 'package', path), body)
  }
  const out = join(dir, 'out.tar')
  await tar.c({ gzip: false, cwd: dir, file: out, portable: true }, ['package'])
  const raw = readFileSync(out)
  for (const [path, flag] of Object.entries(typeflags)) {
    const at = raw.indexOf(Buffer.from(`package/${path}\0`))
    assert.ok(at >= 0 && at % 512 === 0, `header for ${path}`)
    raw[at + 156] = flag.charCodeAt(0)
    if (flag === '1' || flag === '2') raw.write('target.js\0', at + 157, 'latin1') // links need a link target
    // Recompute the header checksum: sum of header bytes with the checksum field read as spaces.
    raw.fill(0x20, at + 148, at + 156)
    let sum = 0
    for (let i = at; i < at + 512; i++) sum += raw[i]
    raw.write(`${sum.toString(8).padStart(6, '0')}\0 `, at + 148, 'latin1')
  }
  return gzipSync(raw)
}

const integrity = buf => `sha512-${createHash('sha512').update(buf).digest('base64')}`
const png = bytes => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(bytes - 8)])

/** A registry + GitHub + downloads stand-in. */
async function world({ files = {}, github = { status: 403 }, manifestOverrides = {}, typeflags = {}, tarballManifestOverrides = {}, tarballHeaders = {} } = {}) {
  const manifest = {
    name: 'alpha', version: '0.5.1', description: 'Alpha plugin', author: 'Ann Lee <ann@example.com> (https://ann.example)',
    homepage: 'https://alpha.example', repository: { type: 'git', url: 'git+https://github.com/ann/alpha.git', directory: 'pkg' },
    keywords: ['toc', 'ui'], icon: './icon.png', dsh: { bundle: { patch: './cordis.patch.yml' } }, engines: { dsh: ' >=0.2.0 ' },
    ...manifestOverrides,
  }
  const tgz = await pack({ 'package.json': JSON.stringify({ ...manifest, ...tarballManifestOverrides }), 'README.md': '# Alpha\nreadme from tarball', 'CHANGELOG.md': '## 0.5.1', ...files }, typeflags)
  const packument = {
    name: 'alpha',
    'dist-tags': { latest: '0.6.0' },
    readme: 'readme from packument',
    time: { '0.1.0': '2026-01-01T00:00:00Z', '0.2.0': '2026-02-01T00:00:00Z', '0.5.1': '2026-09-30T00:00:00Z', '0.6.0': '2026-10-10T00:00:00Z' },
    versions: {
      '0.1.0': { ...manifest, version: '0.1.0', deprecated: 'old' },
      '0.2.0': { ...manifest, version: '0.2.0', dsh: undefined },
      '0.5.1': { ...manifest, dist: { tarball: `${REGISTRY}alpha/-/alpha-0.5.1.tgz`, integrity: integrity(tgz) } },
      '0.6.0': { ...manifest, version: '0.6.0', engines: {}, peerDependencies: { '@deepseek-ai/dsh-settings': '^0.2.0', react: '^18' } },
    },
  }
  const seen = []
  const fetchImpl = async (url) => {
    url = String(url); seen.push(url)
    if (url === `${REGISTRY}alpha`) return Response.json(packument)
    if (url.endsWith('.tgz')) return new Response(tgz, { headers: tarballHeaders })
    if (url.startsWith('https://api.github.com/repos/ann/alpha')) return github.status === 200 ? Response.json({ stargazers_count: 42 }) : new Response('rate limited', { status: github.status })
    if (url === 'https://api.npmjs.org/downloads/point/last-week/alpha') return Response.json({ downloads: 1234 })
    return new Response('nope', { status: 404 })
  }
  return { io: { fetch: fetchImpl, registry: REGISTRY }, seen, packument }
}

test('lists only published, undeprecated bundle versions with their times', async () => {
  const { io } = await world({ files: { 'icon.png': png(100) } })
  const up = await fetchUpstream('alpha', '0.5.1', io)
  assert.deepEqual(Object.keys(up.versions).sort(), ['0.5.1', '0.6.0'])
  assert.equal(up.versions['0.5.1'].publishTimestamp, Date.parse('2026-09-30T00:00:00Z') / 1000)
  assert.equal(up.latest, '0.6.0')
})

test('enginesDsh follows the official generator rules', () => {
  assert.equal(enginesDshOf({ engines: { dsh: ' >=0.2.0 ' } }), '>=0.2.0')
  assert.equal(enginesDshOf({ peerDependencies: { '@deepseek-ai/dsh-settings': '^0.2.0', '@deepseek-ai/dsh': '>=0.2.1', '@deepseek-ai/cordis': '^4', react: '^18' } }), '^0.2.0 >=0.2.1')
  assert.equal(enginesDshOf({ peerDependencies: { '@deepseek-ai/dsh-a': 'workspace:*', '@deepseek-ai/dsh-b': '^0.2.0', '@deepseek-ai/dsh-c': '^0.2.0' } }), '^0.2.0')
  assert.equal(enginesDshOf({ peerDependencies: { '@deepseek-ai/dsh-a': '*' } }), null)
  assert.equal(enginesDshOf({}), null)
})

test('reads display fields of the reviewed version', async () => {
  const { io } = await world({ files: { 'icon.png': png(100) } })
  const up = await fetchUpstream('alpha', '0.5.1', io)
  assert.equal(up.reviewed.description, 'Alpha plugin')
  assert.equal(up.reviewed.author, 'Ann Lee')
  assert.equal(up.reviewed.homepage, 'https://alpha.example')
  assert.deepEqual(up.reviewed.repository, { url: 'https://github.com/ann/alpha', directory: 'pkg' })
  assert.deepEqual(up.reviewed.keywords, ['toc', 'ui'])
  assert.equal(up.reviewed.readme, '# Alpha\nreadme from tarball')
  assert.equal(up.reviewed.changelog, '## 0.5.1')
  assert.equal(up.stats.weeklyDownloads, 1234)
})

test('reviewed is null when that version is not published', async () => {
  const { io } = await world()
  const up = await fetchUpstream('alpha', '9.9.9', io)
  assert.equal(up.reviewed, null)
})

test('large icons are written as files', async () => {
  const { io } = await world({ files: { 'icon.png': png(40 * 1024) } })
  const up = await fetchUpstream('alpha', '0.5.1', io)
  assert.equal(up.reviewed.icon.file, 'alpha.png')
  assert.equal(up.reviewed.icon.bytes, 40 * 1024)
  assert.equal(up.iconData.length, 40 * 1024)
})

test('unsupported icon types are dropped', async () => {
  const { io } = await world({ files: { 'icon.gif': Buffer.from('GIF89a') }, manifestOverrides: { icon: './icon.gif' } })
  const upstream = await fetchUpstream('alpha', '0.5.1', io)
  assert.equal(upstream.reviewed.icon, null)
})

test('a failing GitHub API leaves stars null without failing the fetch', async () => {
  const { io } = await world({ github: { status: 403 } })
  const up = await fetchUpstream('alpha', '0.5.1', io)
  assert.equal(up.stats.stars, null)
  const ok = await world({ github: { status: 200 } })
  assert.equal((await fetchUpstream('alpha', '0.5.1', ok.io)).stats.stars, 42)
})

test('keeps long paths that tar stores in pax headers', async () => {
  const deep = `${'very-long-directory-name/'.repeat(12)}CHANGELOG-notes.md`
  const { io, packument } = await world({ files: { [deep]: 'deep file' } })
  const { files } = await downloadTarball(packument.versions['0.5.1'], io)
  assert.equal(files.get(deep)?.toString('utf8'), 'deep file')
})

test('rejects a tarball whose integrity does not match', async () => {
  const { io, packument } = await world()
  packument.versions['0.5.1'].dist.integrity = 'sha512-AAAA'
  await assert.rejects(downloadTarball(packument.versions['0.5.1'], io), /integrity/)
})

test('records the reviewed version it describes', async () => {
  const { io } = await world()
  assert.equal((await fetchUpstream('alpha', '0.5.1', io)).reviewed.version, '0.5.1')
})

test('keeps contiguous-file entries, which npm installs as regular files', async () => {
  const { io, packument } = await world({ files: { 'lib/b.js': "fetch('https://evil')" }, typeflags: { 'lib/b.js': '7' } })
  const { files } = await downloadTarball(packument.versions['0.5.1'], io)
  assert.equal(files.get('lib/b.js')?.toString('utf8'), "fetch('https://evil')")
})

test('reports the entries it skips', async () => {
  const { io, packument } = await world({ files: { 'lib/link.js': 'x' }, typeflags: { 'lib/link.js': '2' } })
  const { files, skipped } = await downloadTarball(packument.versions['0.5.1'], io)
  assert.equal(files.has('lib/link.js'), false)
  assert.ok(skipped.some(entry => entry.startsWith('lib/link.js')), JSON.stringify(skipped))
})

test('rejects a tarball whose manifest names another package or version', async () => {
  const { io, packument } = await world({ tarballManifestOverrides: { name: 'evil' } })
  await assert.rejects(downloadTarball(packument.versions['0.5.1'], io), /evil/)
})

test('rejects a tarball that announces a size over the cap', async () => {
  const { io, packument } = await world({ tarballHeaders: { 'content-length': String(10 ** 9) } })
  await assert.rejects(downloadTarball(packument.versions['0.5.1'], io), /too large/)
})

test('cleans repository URLs and directories', async () => {
  const messy = await world({ manifestOverrides: { repository: { url: 'git+https://user:pw@github.com/ann/alpha.git?x=1#main', directory: './packages/x/' } } })
  assert.deepEqual((await fetchUpstream('alpha', '0.5.1', messy.io)).reviewed.repository, { url: 'https://github.com/ann/alpha', directory: 'packages/x' })
  const escaping = await world({ manifestOverrides: { repository: { url: 'https://github.com/ann/alpha', directory: '../x' } } })
  assert.deepEqual((await fetchUpstream('alpha', '0.5.1', escaping.io)).reviewed.repository, { url: 'https://github.com/ann/alpha' })
})

test('finds README and CHANGELOG case-insensitively', async () => {
  const { io } = await world({ files: { 'README.md': undefined, 'CHANGELOG.md': undefined, 'Readme.MD': '# mixed case', 'changelog.md': 'lower' } })
  const up = await fetchUpstream('alpha', '0.5.1', io)
  assert.equal(up.reviewed.readme, '# mixed case')
  assert.equal(up.reviewed.changelog, 'lower')
})

test("uses the registry README only when it belongs to the reviewed version", async () => {
  const { io } = await world({ files: { 'README.md': undefined } })
  // The packument README describes the latest version (0.6.0), not the reviewed 0.5.1.
  assert.equal((await fetchUpstream('alpha', '0.5.1', io)).reviewed.readme, '')
})
