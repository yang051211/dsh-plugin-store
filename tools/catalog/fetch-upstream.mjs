/**
 * Fetch the upstream facts the catalog needs about one curated plugin: its listable versions, the display fields
 * of the reviewed version, its icon, README and changelog, and popularity stats. Tarballs are only downloaded and
 * read, never executed. Rules for versions and engines follow the official generator
 * (deepseek-harness apps/plugin-market-generator, "What gets listed").
 */
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import * as tar from 'tar'
import { slugOf } from './slug.mjs'

/** Largest tarball (compressed or unpacked) accepted. */
export const MAX_TARBALL_BYTES = 64 * 1024 * 1024
/** Largest icon accepted. */
export const MAX_ICON_BYTES = 256 * 1024
const ICON_TYPES = { '.svg': 'svg', '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.webp': 'webp' }
const TIMEOUT_MS = 30_000

/** `engines.dsh` of a manifest, else the conjunction of its DSH peer ranges; null when nothing constrains. */
export function enginesDshOf(manifest) {
  const declared = manifest.engines?.dsh
  if (typeof declared === 'string' && declared.trim() !== '') return declared.trim()
  const ranges = []
  for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
    if (name !== '@deepseek-ai/dsh' && !name.startsWith('@deepseek-ai/dsh-')) continue
    const value = String(range).trim()
    if (/^workspace:[*^~]$/.test(value) || value === '*' || ranges.includes(value)) continue
    ranges.push(value)
  }
  return ranges.length > 0 ? ranges.join(' ') : null
}

/** Name part of an npm author string or object. */
function authorName(author) {
  if (typeof author === 'string') return author.replace(/\s*<[^>]*>/, '').replace(/\s*\([^)]*\)/, '').trim() || null
  return typeof author?.name === 'string' && author.name.trim() !== '' ? author.name.trim() : null
}

/** A package directory inside its repository, normalized; undefined when it is unusable (absolute or escaping). */
function directoryOf(raw) {
  if (typeof raw !== 'string') return undefined
  const path = raw.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
  if (path === '' || path === '.' || path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').some(part => part === '..')) return undefined
  return path
}

/** Web page of a manifest repository field, without credentials, query, fragment or `.git`. */
function repositoryOf(repository) {
  const raw = typeof repository === 'string' ? repository : repository?.url
  if (typeof raw !== 'string') return null
  let text = raw.trim()
  const shorthand = /^(?:github:)?([\w.-]+)\/([\w.-]+)$/.exec(text)
  if (shorthand) text = `https://github.com/${shorthand[1]}/${shorthand[2]}`
  text = text.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/^ssh:\/\/git@/, 'https://')
  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const page = `${url.protocol}//${url.host}${url.pathname.replace(/\.git$/, '').replace(/\/+$/, '')}`
  const directory = directoryOf(typeof repository === 'object' ? repository?.directory : undefined)
  return directory ? { url: page, directory } : { url: page }
}

async function get(io, url, init = {}) {
  return io.fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

/** Entry types npm installs as regular files (node-tar unpacks all three the same way). */
const FILE_TYPES = new Set(['File', 'OldFile', 'ContiguousFile'])

/**
 * Read a gzipped tarball into package-relative paths. Regular files outside node_modules are kept; every other
 * entry (links, devices, escaping paths, duplicates) is listed in `skipped` for the reviewer.
 */
async function untar(tgz) {
  const data = gunzipSync(tgz, { maxOutputLength: MAX_TARBALL_BYTES })
  const files = new Map()
  const skipped = []
  const parser = new tar.Parser({ strict: true })
  parser.on('entry', entry => {
    const path = String(entry.path).replace(/^[^/]+\//, '')
    if (entry.type === 'Directory' || path === '') { entry.resume(); return }
    const escapes = path.split('/').some(part => part === '..' || part === 'node_modules')
    if (!FILE_TYPES.has(entry.type) || escapes || files.has(path)) {
      skipped.push(`${path} (${files.has(path) ? 'duplicate' : escapes ? 'outside the package' : entry.type})`)
      entry.resume()
      return
    }
    const chunks = []
    entry.on('data', chunk => chunks.push(chunk))
    entry.on('end', () => files.set(path, Buffer.concat(chunks)))
  })
  await new Promise((resolve, reject) => {
    parser.on('end', resolve)
    parser.on('error', reject)
    parser.end(data)
  })
  return { files, skipped }
}

/** Read a response body, aborting once it exceeds `limit` bytes. */
async function readCapped(response, limit, what) {
  const announced = Number(response.headers.get('content-length'))
  if (Number.isFinite(announced) && announced > limit) {
    await response.body?.cancel()
    throw new Error(`${what} too large (${announced} bytes announced)`)
  }
  const chunks = []
  let total = 0
  if (response.body) {
    const reader = response.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        await reader.cancel()
        throw new Error(`${what} too large (over ${limit} bytes)`)
      }
      chunks.push(value)
    }
  }
  return Buffer.concat(chunks)
}

/**
 * Download one version's tarball, check its integrity and its manifest identity, and unpack it in memory.
 * @param version - the version record from the packument (`name`, `version`, `dist`).
 * @returns `{ files, skipped }`: package-relative path → contents, and the entries left out.
 */
export async function downloadTarball(version, io) {
  const { dist } = version
  const response = await get(io, dist.tarball)
  if (!response.ok) throw new Error(`tarball answered HTTP ${response.status}: ${dist.tarball}`)
  const tgz = await readCapped(response, MAX_TARBALL_BYTES, `tarball ${dist.tarball}`)
  const [algorithm, expected] = String(dist.integrity ?? '').split('-', 2)
  if (!['sha512', 'sha256', 'sha1'].includes(algorithm) || createHash(algorithm).update(tgz).digest('base64') !== expected) {
    throw new Error(`tarball integrity mismatch: ${dist.tarball}`)
  }
  const unpacked = await untar(tgz)
  let manifest
  try {
    manifest = JSON.parse(unpacked.files.get('package.json')?.toString('utf8') ?? 'null')
  } catch {
    manifest = null
  }
  if (manifest?.name !== version.name || manifest?.version !== version.version) {
    throw new Error(`tarball of ${version.name}@${version.version} contains ${manifest?.name}@${manifest?.version}`)
  }
  return unpacked
}

/** First file whose name, case-insensitively, is one of `names` at the package root. */
function rootFile(files, names) {
  for (const [path, body] of files) {
    if (!path.includes('/') && names.includes(path.toLowerCase())) return body.toString('utf8')
  }
  return null
}

/** The icon a manifest declares, if it is a supported image inside the package. */
function pickIcon(manifest, files) {
  const declared = typeof manifest.icon === 'string' ? manifest.icon : manifest.exports?.['./icon']
  if (typeof declared !== 'string') return null
  const path = declared.replace(/^\.\//, '')
  const ext = (/\.[a-z]+$/i.exec(path)?.[0] ?? '').toLowerCase()
  const data = files.get(path)
  if (!ICON_TYPES[ext] || !data || data.length > MAX_ICON_BYTES) return null
  return { ext: ext === '.jpeg' ? '.jpg' : ext, data }
}

/** GitHub stars of a repository web URL, or null. */
async function starsOf(repository, io) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(repository?.url ?? '')
  if (!match) return null
  try {
    const headers = { accept: 'application/vnd.github+json', 'user-agent': 'dsh-plugin-store-catalog' }
    if (io.githubToken) headers.authorization = `Bearer ${io.githubToken}`
    const response = await get(io, `https://api.github.com/repos/${match[1]}/${match[2]}`, { headers })
    if (!response.ok) return null
    const body = await response.json()
    return typeof body.stargazers_count === 'number' ? body.stargazers_count : null
  } catch {
    return null
  }
}

/** npm downloads in the last week, or null. */
async function weeklyDownloadsOf(name, io) {
  try {
    const response = await get(io, `https://api.npmjs.org/downloads/point/last-week/${name}`)
    if (!response.ok) return null
    const body = await response.json()
    return typeof body.downloads === 'number' ? body.downloads : null
  } catch {
    return null
  }
}

/**
 * Collect the upstream facts for one plugin.
 * @param name - npm package name.
 * @param reviewedVersion - the version under review; its display fields, icon and docs are read.
 * @param io - `{ fetch, registry, githubToken? }`.
 * @returns the upstream record, plus `iconData` (not serialized) when an icon was found.
 */
export async function fetchUpstream(name, reviewedVersion, io) {
  const registry = io.registry.endsWith('/') ? io.registry : `${io.registry}/`
  const response = await get(io, `${registry}${name.replace('/', '%2f')}`, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`${name}: registry answered HTTP ${response.status}`)
  const packument = await response.json()
  const versions = {}
  for (const [version, manifest] of Object.entries(packument.versions ?? {})) {
    if (manifest.deprecated || !manifest.dsh?.bundle?.patch || !packument.time?.[version]) continue
    versions[version] = { publishTimestamp: Math.floor(Date.parse(packument.time[version]) / 1000), enginesDsh: enginesDshOf(manifest) }
  }
  const manifest = packument.versions?.[reviewedVersion]
  let reviewed = null
  let iconData
  if (manifest && versions[reviewedVersion]) {
    const { files } = await downloadTarball(manifest, io)
    const icon = pickIcon(manifest, files)
    iconData = icon?.data
    const repository = repositoryOf(manifest.repository)
    // The registry README describes dist-tags.latest; it stands in only when that is the reviewed version.
    const registryReadme = packument['dist-tags']?.latest === reviewedVersion && typeof packument.readme === 'string' ? packument.readme : ''
    reviewed = {
      version: reviewedVersion,
      description: typeof manifest.description === 'string' ? manifest.description : null,
      author: authorName(manifest.author),
      homepage: /^https?:\/\//.test(manifest.homepage ?? '') ? manifest.homepage : null,
      repository,
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords.filter(k => typeof k === 'string') : [],
      icon: icon ? { file: `${slugOf(name)}${icon.ext}`, bytes: icon.data.length } : null,
      readme: rootFile(files, ['readme.md', 'readme.markdown', 'readme']) ?? registryReadme,
      changelog: rootFile(files, ['changelog.md', 'changelog.markdown', 'changelog', 'history.md']),
    }
  }
  const repository = reviewed?.repository ?? repositoryOf(packument.repository)
  const upstream = {
    name,
    fetchedAt: new Date().toISOString(),
    latest: packument['dist-tags']?.latest ?? null,
    versions,
    reviewed,
    stats: { stars: await starsOf(repository, io), weeklyDownloads: await weeklyDownloadsOf(name, io) },
  }
  if (iconData) Object.defineProperty(upstream, 'iconData', { value: iconData, enumerable: false })
  return upstream
}
