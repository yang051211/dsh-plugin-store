/**
 * Fetch the upstream facts the catalog needs about one curated plugin: its listable versions, the display fields
 * of the reviewed version, its icon, README and changelog, and popularity stats. Tarballs are only downloaded and
 * read, never executed. Rules for versions and engines follow the official generator
 * (deepseek-harness apps/plugin-market-generator, "What gets listed").
 */
import { slugOf } from '../directory/slug.mjs'
import { authorName, downloadTarball, enginesDshOf, get, pickIcon, repositoryOf } from '../directory/npm.mjs'
export { downloadTarball, enginesDshOf, MAX_ICON_BYTES, MAX_TARBALL_BYTES } from '../directory/npm.mjs'

/** First file whose name, case-insensitively, is one of `names` at the package root. */
function rootFile(files, names) {
  for (const [path, body] of files) {
    if (!path.includes('/') && names.includes(path.toLowerCase())) return body.toString('utf8')
  }
  return null
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
