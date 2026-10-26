#!/usr/bin/env node
/**
 * Directory maintenance, run daily by .github/workflows/directory.yml (and by hand):
 *   discover            search npm for candidate packages; directory/names.json gains names (never loses them)
 *   refresh [--limit N] re-read packuments whose latest version changed; directory/packages/<slug>.json
 *   stats               weekly downloads of listed packages, stars for a rotating slice; directory/stats.json
 *   scan [--limit N]    automatic detection on the latest version of listed packages not yet scanned; icons too
 *   build               make market/ exactly what the state describes
 *   check               confirm market/ matches build and the index passes the official reader
 * Options: --registry <url> (default: `npm config get registry`); GITHUB_TOKEN raises the GitHub API rate limit.
 * Tarballs are only downloaded and read, never executed. directory/config.json is edited by hand only.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { buildDirectory, INDEX_PUBLIC_URL, SCAN_ATTEMPTS } from './build.mjs'
import { mergeNames, namesFromIndex, searchPackages } from './discover.mjs'
import { downloadTarball, get, pickIcon } from './npm.mjs'
import { plannedMarketFiles, staleMarketFiles, toJson } from './outputs.mjs'
import { factsOf, qualifies } from './packages.mjs'
import { pickRefresh } from './refresh.mjs'
import { runPool } from './pool.mjs'
import { scanPackage } from './scan.mjs'
import { slugOf } from './slug.mjs'
import { fetchStars, pickStarRefresh, weeklyDownloads } from './stats.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const STATE = join(ROOT, 'directory')
export const CONFIG_FILE = join(STATE, 'config.json')
export const NAMES_FILE = join(STATE, 'names.json')
export const CLOCK_FILE = join(STATE, 'clock.json')
export const STATS_FILE = join(STATE, 'stats.json')
/** When each package's packument was last read successfully (or found gone): drives the recheck rotation. */
export const CHECKED_FILE = join(STATE, 'checked.json')
/** Largest packument accepted; a package with thousands of versions can be big, but not unbounded. */
const MAX_PACKUMENT_BYTES = 48 * 1024 * 1024
/** The Host refuses a catalog over 16 MB; keep a margin. */
const MAX_INDEX_FILE_BYTES = 15 * 1024 * 1024
export const PACKAGES_DIR = join(STATE, 'packages')
export const SCAN_DIR = join(STATE, 'scan')
export const MARKET_DIR = join(ROOT, 'market')
export const ICONS_DIR = join(MARKET_DIR, 'icons')

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback)
const listJson = dir => (existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).map(f => readJson(join(dir, f))) : [])
/** Write only when the content changed, so unchanged state never shows up in a commit. */
function writeJson(file, value) {
  const text = toJson(value)
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return true
}

function option(args, name) {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}

function io(args) {
  const registry = option(args, '--registry') ?? execSync('npm config get registry', { encoding: 'utf8' }).trim()
  return { fetch, registry: registry.endsWith('/') ? registry : `${registry}/`, githubToken: process.env.GITHUB_TOKEN }
}

const config = () => readJson(CONFIG_FILE)
/** The run's clock: refresh sets it, build and check read it, so a build is reproducible from the committed state. */
const clock = () => Date.parse(readJson(CLOCK_FILE, { refreshedAt: '1970-01-01T00:00:00Z' }).refreshedAt)
const allFacts = () => listJson(PACKAGES_DIR)
const listedFacts = () => { const c = config(), now = clock(); return allFacts().filter(f => qualifies(f, c, now).ok) }

async function discover(args) {
  const context = io(args)
  const { found, failures } = await searchPackages(context, config().keywords)
  const seeded = (await Promise.all((config().seedIndexes ?? []).map(url => namesFromIndex(context, url)))).flat()
  const known = readJson(NAMES_FILE, {})
  const names = mergeNames(Object.keys(known), [...found.keys(), ...seeded])
  // Each name keeps the newest version a search reported; refresh uses it to skip unchanged packuments.
  writeJson(NAMES_FILE, Object.fromEntries(names.map(name => [name, found.get(name)?.version ?? known[name] ?? null])))
  console.log(`discover: ${found.size} from search, ${seeded.length} from other indexes, ${names.length} known`)
  for (const failure of failures) console.log(`  search failed (kept the names already known): ${failure}`)
}

/** A packument answer that will not get better by retrying: the package is gone, or what npm serves is unusable. */
class Gone extends Error {}

async function readPackument(context, name, now) {
  const response = await get(context, `${context.registry}${name.replace('/', '%2f')}`, { headers: { accept: 'application/json' } })
  if (response.status === 404) { await response.body?.cancel(); throw new Gone('not found on npm') }
  if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`) }
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > MAX_PACKUMENT_BYTES) { await response.body?.cancel(); throw new Gone(`packument too large (${length} bytes)`) }
  const text = await response.text()
  if (text.length > MAX_PACKUMENT_BYTES) throw new Gone(`packument too large (${text.length} characters)`)
  let doc
  try { doc = JSON.parse(text) } catch { throw new Error('packument is not JSON') }
  const facts = factsOf(doc, now)
  if (facts.error) throw new Gone(facts.error)
  return facts
}

async function refresh(args) {
  const context = io(args)
  const c = config()
  const names = readJson(NAMES_FILE, {})
  const checked = readJson(CHECKED_FILE, {})
  const now = Date.now()
  const latest = new Map(allFacts().map(f => [f.name, f.latest]))
  const todo = pickRefresh({ hints: names, latest, checked, now, recheckDays: c.recheckDays ?? 7, recheckLimit: c.recheckLimit ?? 1500 })
    .slice(0, Number(option(args, '--limit') ?? Infinity))
  const stamp = new Date(now).toISOString()
  const results = await runPool(todo, c.concurrency, async name => {
    try {
      writeJson(join(PACKAGES_DIR, `${slugOf(name)}.json`), await readPackument(context, name, now))
    } catch (error) {
      if (!(error instanceof Gone)) throw error
      // Gone for good (unpublished, or unusable): record it so build delists it and the rotation moves on.
      writeJson(join(PACKAGES_DIR, `${slugOf(name)}.json`), { name, error: error.message })
    }
    checked[name] = stamp
  })
  const failed = results.filter(r => !r.ok)
  writeJson(CHECKED_FILE, Object.fromEntries(Object.keys(checked).sort().map(name => [name, checked[name]])))
  writeJson(CLOCK_FILE, { refreshedAt: stamp })
  console.log(`refresh: ${todo.length - failed.length} read, ${failed.length} failed and will be retried (kept their previous facts)`)
  for (const r of failed.slice(0, 20)) console.log(`  ${r.item}: ${r.error.message}`)
}

async function stats(args) {
  const context = io(args)
  const listed = listedFacts()
  const previous = readJson(STATS_FILE, {})
  const downloads = await weeklyDownloads(context, listed.map(f => f.name), { concurrency: config().concurrency })
  const next = {}
  for (const f of listed) {
    const before = previous[f.name] ?? {}
    // An unknown count keeps the last known one instead of turning into "no downloads".
    next[f.name] = { ...before, weeklyDownloads: downloads.get(f.name) ?? before.weeklyDownloads ?? null }
  }
  const repositories = new Map(listed.map(f => [f.name, f.repository?.url ?? null]))
  const onGitHub = listed.filter(f => /^https:\/\/github\.com\//.test(f.repository?.url ?? '')).map(f => f.name)
  const picked = pickStarRefresh(onGitHub, previous, config().starsLimit)
  const today = new Date(clock()).toISOString().slice(0, 10)
  await runPool(picked, 4, async name => {
    const stars = await fetchStars(context, repositories.get(name))
    // Every attempt is dated, so a repository that never answers goes to the back of the queue instead of the front.
    next[name] = { ...next[name], stars: stars ?? next[name].stars ?? null, starsTriedAt: today, ...(stars !== null ? { starsAt: today } : {}) }
  })
  writeJson(STATS_FILE, Object.fromEntries(Object.keys(next).sort().map(name => [name, next[name]])))
  console.log(`stats: ${listed.length} downloads, ${picked.length} star refreshes`)
}

async function scan(args) {
  const context = io(args)
  const limit = Number(option(args, '--limit') ?? config().scanLimit)
  const counts = readJson(STATS_FILE, {})
  const todo = listedFacts()
    .filter(f => {
      const done = readJson(join(SCAN_DIR, `${slugOf(f.name)}.json`))
      // A failed attempt is retried a few times (a dropped download is not the package's fault), then left alone.
      return done?.version !== f.latest || (done.error && (done.attempts ?? 1) < SCAN_ATTEMPTS)
    })
    .sort((a, b) => (counts[b.name]?.weeklyDownloads ?? -1) - (counts[a.name]?.weeklyDownloads ?? -1) || (a.name < b.name ? -1 : 1))
    .slice(0, limit)
  const results = await runPool(todo, 4, async f => {
    const slug = slugOf(f.name)
    let manifest, files, skipped
    try {
      const response = await get(context, `${context.registry}${f.name.replace('/', '%2f')}/${f.latest}`, { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      manifest = await response.json()
      ;({ files, skipped } = await downloadTarball(manifest, context))
    } catch (error) {
      // Counted against this version, so a package that never downloads stops taking a slot after a few rounds;
      // a new version starts over.
      const before = readJson(join(SCAN_DIR, `${slug}.json`))
      const attempts = before?.version === f.latest && before.error ? (before.attempts ?? 1) + 1 : 1
      writeJson(join(SCAN_DIR, `${slug}.json`), { name: f.name, version: f.latest, scannedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error), attempts })
      throw error
    }
    const icon = pickIcon(manifest, files)
    for (const old of existsSync(ICONS_DIR) ? readdirSync(ICONS_DIR).filter(file => file.startsWith(`${slug}.`)) : []) rmSync(join(ICONS_DIR, old))
    if (icon) {
      mkdirSync(ICONS_DIR, { recursive: true })
      writeFileSync(join(ICONS_DIR, `${slug}${icon.ext}`), icon.data)
    }
    writeJson(join(SCAN_DIR, `${slug}.json`), { name: f.name, version: f.latest, scannedAt: new Date().toISOString(), icon: icon ? `${slug}${icon.ext}` : null, ...scanPackage(files), skippedEntries: skipped })
  })
  const failed = results.filter(r => !r.ok)
  console.log(`scan: ${todo.length - failed.length} scanned, ${failed.length} failed, limit ${limit}`)
  for (const r of failed.slice(0, 20)) console.log(`  ${r.item.name}@${r.item.latest}: ${r.error.message}`)
}

/** The published files the committed state describes. */
function planned() {
  const scans = new Map(listJson(SCAN_DIR).map(s => [s.name, s]))
  const icons = new Map([...scans].filter(([, s]) => s.icon && existsSync(join(ICONS_DIR, s.icon))).map(([name, s]) => [name, s.icon]))
  const storeVersion = readJson(join(ROOT, 'package.json')).version
  const { index, details, rejected } = buildDirectory({ facts: allFacts(), stats: readJson(STATS_FILE, {}), scans, icons, config: config(), storeVersion, now: clock() })
  parseMarketIndex(structuredClone(index), INDEX_PUBLIC_URL)
  const files = plannedMarketFiles(index, details, file => (existsSync(join(ICONS_DIR, file)) ? readFileSync(join(ICONS_DIR, file)) : null))
  const size = Buffer.byteLength(files.get('index.json'))
  if (size > MAX_INDEX_FILE_BYTES) throw new Error(`market/index.json would be ${size} bytes, over the ${MAX_INDEX_FILE_BYTES}-byte limit the store can read`)
  return { index, files, rejected }
}

function existingMarketFiles() {
  const paths = []
  for (const dir of ['plugins', 'icons']) if (existsSync(join(MARKET_DIR, dir))) for (const file of readdirSync(join(MARKET_DIR, dir))) paths.push(`${dir}/${file}`)
  return paths
}

function build() {
  const { index, files, rejected } = planned()
  for (const [path, content] of files) {
    const file = join(MARKET_DIR, path)
    if (existsSync(file) && readFileSync(file).equals(Buffer.from(content))) continue
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(join(MARKET_DIR, path), content)
  }
  const stale = staleMarketFiles(existingMarketFiles(), files)
  for (const path of stale) rmSync(join(MARKET_DIR, path))
  console.log(`build: ${index.plugins.length} listed, ${rejected.length} left out by the official reader, ${stale.length} stale file(s) removed`)
  for (const r of rejected.slice(0, 20)) console.log(`  left out ${r.name}: ${r.error}`)
}

function check() {
  const { index, files } = planned()
  const problems = []
  for (const [path, content] of files) {
    const file = join(MARKET_DIR, path)
    if (!existsSync(file) || !readFileSync(file).equals(Buffer.from(content))) problems.push(`market/${path} is out of date`)
  }
  for (const path of staleMarketFiles(existingMarketFiles(), files)) problems.push(`market/${path} should not be published`)
  if (problems.length > 0) throw new Error(`${problems.slice(0, 10).join('; ')}${problems.length > 10 ? ` …and ${problems.length - 10} more` : ''} (run directory:build)`)
  console.log(`directory OK: ${index.plugins.length} listed, index valid, market/ up to date`)
}

const COMMANDS = { discover, refresh, stats, scan, build, check }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2)
  if (!COMMANDS[command]) {
    console.error(`usage: cli.mjs <${Object.keys(COMMANDS).join('|')}> [--registry <url>] [--limit N]`)
    process.exit(2)
  }
  try {
    await COMMANDS[command](args)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
