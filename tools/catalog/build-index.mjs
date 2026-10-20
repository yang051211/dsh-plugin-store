/**
 * Build the published market index from the curation file, upstream facts and scan results.
 * The format-1 part follows the official index format; everything the store adds lives under `store`,
 * which official readers drop. Only approved plugins appear, and each lists only its reviewed version.
 */
import semver from 'semver'
import { slugOf } from './slug.mjs'

/** Where the index is published; relative icon paths resolve against it. */
export const INDEX_PUBLIC_URL = 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json'

/** The generated home section ranked by weekly downloads; curated sections may not reuse the id. */
export const HOT_SECTION_ID = 'hot'
/** How many plugins the trending section lists (the home page shows one row of six). */
export const HOT_SECTION_SIZE = 6

/** Most related plugins listed on a detail page. */
const MAX_RELATED = 6

const PERMISSIONS = ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']

/** A format-1 LocalizedText from a curation text, keeping only non-empty strings. */
function localized(text) {
  return Object.fromEntries(Object.entries(text ?? {}).filter(([, value]) => typeof value === 'string' && value.trim() !== ''))
}

/**
 * The reviewed upstream facts, or an error naming the plugin and version. The display fields must have been read
 * from the reviewed version itself: changing review.version without re-fetching would publish the old README.
 */
function reviewedFacts(plugin, upstream, scans) {
  const facts = upstream.get(plugin.name)
  const version = String(plugin.review.version)
  if (!facts?.versions?.[version]) {
    throw new Error(`${plugin.name}@${version} is approved but not published upstream (run catalog:fetch, or re-review)`)
  }
  if (facts.reviewed?.version !== version) {
    throw new Error(`${plugin.name}: reviewed ${version} but the upstream facts describe ${facts.reviewed?.version ?? 'nothing'} (run catalog:fetch)`)
  }
  if (!scans.has(plugin.name)) {
    throw new Error(`${plugin.name}@${version} is approved but was never scanned (run catalog:scan -- ${plugin.name}@${version})`)
  }
  return { facts, version }
}

/** Plugins related to `plugin`: same category first, then same author; never itself. */
function relatedTo(plugin, listed, authorOf) {
  const sameCategory = listed.filter(p => p.name !== plugin.name && p.category === plugin.category).map(p => p.name)
  const author = authorOf.get(plugin.name)
  const sameAuthor = author ? listed.filter(p => p.name !== plugin.name && authorOf.get(p.name) === author).map(p => p.name) : []
  return [...new Set([...sameCategory, ...sameAuthor])].slice(0, MAX_RELATED)
}

/**
 * Build the index document and the per-plugin detail documents.
 * @param curation - the loaded catalog.yaml.
 * @param upstream - plugin name → upstream record.
 * @param scans - plugin name → scan result of the reviewed version (may be missing).
 * @param now - the generation time.
 * @returns `{ index, details }`; details are keyed by plugin name.
 */
export function buildIndex(curation, upstream, scans, now, storeVersion) {
  const listed = curation.plugins.filter(p => p.review.status === 'approved')
  const names = new Set(listed.map(p => p.name))
  const authorOf = new Map(listed.map(p => [p.name, upstream.get(p.name)?.reviewed?.author ?? null]))
  const plugins = []
  const details = new Map()

  for (const plugin of listed) {
    const { facts, version } = reviewedFacts(plugin, upstream, scans)
    const shown = facts.reviewed
    const listedVersion = { version, publishTimestamp: facts.versions[version].publishTimestamp, source: { type: 'npm' } }
    listedVersion.engines = facts.versions[version].enginesDsh ? { dsh: facts.versions[version].enginesDsh } : {}
    const entry = {
      name: plugin.name,
      title: localized(plugin.title),
      description: localized(plugin.tagline),
      // A reviewer-supplied icon (catalog/icons-curated/) wins over the author's; it fills in for authors who ship none.
      ...(plugin.icon ? { icon: `icons/${plugin.icon}` } : shown.icon ? { icon: `icons/${shown.icon.file}` } : {}),
      ...(shown.author ? { author: shown.author } : {}),
      ...(shown.homepage ? { homepage: shown.homepage } : {}),
      ...(shown.repository ? { repository: shown.repository } : {}),
      metadata: { category: plugin.category, keywords: shown.keywords },
      'dist-tags': { latest: version },
      versions: [listedVersion],
      store: {
        tagline: localized(plugin.tagline),
        detail: `plugins/${slugOf(plugin.name)}.json`,
        review: { version, date: String(plugin.review.date) },
        stats: { ...facts.stats, fetchedAt: facts.fetchedAt },
        ...(facts.latest && semver.valid(facts.latest) && semver.gt(facts.latest, version) ? { upstreamLatest: facts.latest } : {}),
      },
    }
    plugins.push(entry)

    const scan = scans.get(plugin.name)
    details.set(plugin.name, {
      schema: 1,
      name: plugin.name,
      features: plugin.features,
      screenshots: plugin.screenshots ?? [],
      permissions: plugin.review.permissions,
      // Scan results, kept apart from the reviewer's verdict in `permissions` so the UI can show both.
      scanSummary: {
        ...Object.fromEntries(PERMISSIONS.map(k => [k, Boolean(scan[k]?.hit)])),
        dependencies: scan.dependencies,
        minified: scan.minifiedFiles.length > 0,
        binaryFiles: scan.binaryFiles ?? [],
        skippedEntries: scan.skippedEntries ?? [],
      },
      review: { version, date: String(plugin.review.date), reviewer: plugin.review.reviewer, notes: plugin.review.notes ?? {} },
      readme: shown.readme,
      changelog: shown.changelog,
      related: relatedTo(plugin, listed, authorOf),
    })
  }

  curation.sections.forEach((section, i) => {
    if (section.id === HOT_SECTION_ID) throw new Error(`sections[${i}].id: "${HOT_SECTION_ID}" is reserved for the generated trending section`)
  })
  // Trending leads the home page: listed plugins by npm's last-7-day downloads, unknown counts last. The numbers are
  // only as fresh as the last catalog:fetch, so the section follows the data, not the wall clock.
  const downloadsOf = name => upstream.get(name)?.stats?.weeklyDownloads ?? null
  const hot = {
    id: HOT_SECTION_ID,
    title: { zh: '本周热门', en: 'Trending this week' },
    plugins: [...names]
      .sort((a, b) => ((downloadsOf(b) ?? -1) - (downloadsOf(a) ?? -1)) || a.localeCompare(b))
      .slice(0, HOT_SECTION_SIZE),
  }
  const sections = [hot, ...curation.sections
    .map(section => ({ id: section.id, title: localized(section.title), plugins: section.plugins.filter(name => names.has(name)) }))]
    .filter(section => section.plugins.length > 0)
  // The store picks one entry per week; `featured` keeps the first for clients that predate the rotation.
  const featuredRotation = curation.featured
    .filter(entry => names.has(entry.plugin))
    .map(entry => ({ plugin: entry.plugin, title: localized(entry.title), subtitle: localized(entry.subtitle), gradient: entry.gradient ?? [] }))
  const featured = featuredRotation[0] ?? null

  const index = {
    format: 1,
    title: localized(curation.market.title),
    ...(curation.market.description ? { description: localized(curation.market.description) } : {}),
    metadata: { categories: Object.fromEntries(curation.categories.map(c => [c.id, { title: localized(c.title) }])) },
    plugins,
    store: { schema: 1, generatedAt: now.toISOString(), ...(storeVersion ? { self: { version: storeVersion } } : {}), featured, featuredRotation, sections, categoryOrder: curation.categories.map(c => c.id) },
  }
  return { index, details }
}
