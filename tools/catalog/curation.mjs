/**
 * The curation file (catalog/catalog.yaml) holds every human-written field: names, pitches, features,
 * sections, the featured banner, and review verdicts. Tools only read it; see tests/catalog/curation.test.mjs.
 */
import { readFileSync } from 'node:fs'
import semver from 'semver'
import { parse } from 'yaml'

/** A curation file that breaks a rule; `message` names the YAML path. */
export class CurationError extends Error {
  constructor(path, reason) {
    super(`${path}: ${reason}`)
    this.name = 'CurationError'
    this.path = path
  }
}

const REVIEW_STATUSES = new Set(['pending', 'approved'])
const PERMISSION_KEYS = ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = value => typeof value === 'string' && value.trim() !== ''

function need(condition, path, reason) {
  if (!condition) throw new CurationError(path, reason)
}

/** Validate one plugin entry. */
function checkPlugin(plugin, i, categoryIds) {
  const at = `plugins[${i}]`
  need(isObject(plugin), at, 'must be a mapping')
  need(isText(plugin.name), `${at}.name`, 'is required')
  need(plugin.source === 'npm', `${at}.source`, 'must be "npm"')
  need(categoryIds.has(plugin.category), `${at}.category`, `must be one of: ${[...categoryIds].join(', ')}`)
  need(isObject(plugin.title) && isText(plugin.title.en), `${at}.title.en`, 'is required (format 1 needs English)')
  need(isObject(plugin.tagline) && isText(plugin.tagline.en), `${at}.tagline.en`, 'is required (format 1 needs English)')
  const features = plugin.features?.zh
  need(Array.isArray(features) && features.length >= 3 && features.length <= 5 && features.every(isText),
    `${at}.features.zh`, 'needs 3 to 5 non-empty entries')
  need(plugin.screenshots === undefined || Array.isArray(plugin.screenshots), `${at}.screenshots`, 'must be a list')
  for (const [j, shot] of (plugin.screenshots ?? []).entries()) {
    need(isObject(shot) && /^https:\/\//.test(shot.url ?? ''), `${at}.screenshots[${j}].url`, 'must be an https URL')
  }
  const review = plugin.review
  need(isObject(review), `${at}.review`, 'is required')
  need(REVIEW_STATUSES.has(review.status), `${at}.review.status`, 'must be "pending" or "approved"')
  if (review.version !== undefined) {
    // Quote-free YAML turns 1.0 into a number; only a string that is an exact SemVer version names one release.
    need(typeof review.version === 'string' && semver.valid(review.version) === review.version,
      `${at}.review.version`, `must be an exact version such as "1.2.3" (got ${JSON.stringify(review.version)})`)
  }
  if (review.status === 'approved') {
    need(isText(review.version), `${at}.review.version`, 'is required when approved')
    need(isText(String(review.date ?? '')) && review.date !== undefined, `${at}.review.date`, 'is required when approved')
    need(isText(review.reviewer), `${at}.review.reviewer`, 'is required when approved')
    need(isObject(review.permissions) && PERMISSION_KEYS.every(k => typeof review.permissions[k] === 'boolean'),
      `${at}.review.permissions`, `needs a boolean for each of: ${PERMISSION_KEYS.join(', ')}`)
  }
}

/**
 * Read and validate the curation file.
 * @param path - file path or URL of catalog.yaml.
 * @returns the parsed curation document.
 */
export function loadCuration(path) {
  const doc = parse(readFileSync(path, 'utf8'), { schema: 'core' })
  need(isObject(doc), '(root)', 'must be a mapping')
  need(isObject(doc.market) && isObject(doc.market.title) && isText(doc.market.title.en), 'market.title.en', 'is required')
  need(Array.isArray(doc.categories) && doc.categories.length > 0, 'categories', 'needs at least one entry')
  const categoryIds = new Set()
  for (const [i, category] of doc.categories.entries()) {
    need(isText(category?.id), `categories[${i}].id`, 'is required')
    need(!categoryIds.has(category.id), `categories[${i}].id`, `duplicates "${category.id}"`)
    need(isObject(category.title) && isText(category.title.en), `categories[${i}].title.en`, 'is required')
    categoryIds.add(category.id)
  }
  need(Array.isArray(doc.plugins), 'plugins', 'must be a list')
  const names = new Set()
  doc.plugins.forEach((plugin, i) => {
    checkPlugin(plugin, i, categoryIds)
    need(!names.has(plugin.name), `plugins[${i}].name`, `duplicates "${plugin.name}"`)
    names.add(plugin.name)
  })
  need(isObject(doc.featured) && names.has(doc.featured.plugin), 'featured.plugin', 'must name a curated plugin')
  need(Array.isArray(doc.sections), 'sections', 'must be a list')
  const sectionIds = new Set()
  for (const [i, section] of doc.sections.entries()) {
    need(isText(section?.id), `sections[${i}].id`, 'is required')
    need(!sectionIds.has(section.id), `sections[${i}].id`, `duplicates "${section.id}"`)
    sectionIds.add(section.id)
    need(Array.isArray(section.plugins), `sections[${i}].plugins`, 'must be a list')
    section.plugins.forEach((name, j) => need(names.has(name), `sections[${i}].plugins[${j}]`, `"${name}" is not a curated plugin`))
  }
  return doc
}
