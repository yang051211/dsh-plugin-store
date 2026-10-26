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
import { buildDirectory, INDEX_PUBLIC_URL } from './build.mjs'
import { mergeNames, namesFromIndex, searchPackages } from './discover.mjs'
import { downloadTarball, get, pickIcon } from './npm.mjs'
import { plannedMarketFiles, staleMarketFiles, toJson } from './outputs.mjs'
import { factsOf, qualifies } from './packages.mjs'
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
  const found = await searchPackages(context, config().keywords)
  const seeded = (await Promise.all((config().seedIndexes ?? []).map(url => namesFromIndex(context, url)))).flat()
  const known = readJson(NAMES_FILE, {})
  const names = mergeNames(Object.keys(known), [...found.keys(), ...seeded])
  // Each name keeps the newest version a search reported; refresh uses it to skip unchanged packuments.
  writeJson(NAMES_FILE, Object.fromEntries(names.map(name => [name, found.get(name)?.version ?? known[name] ?? null])))
  console.log(`discover: ${found.size} from search, ${seeded.length} from other indexes, ${names.length} known`)
}

async function refresh(args) {
  const context = io(args)
  const names = readJson(NAMES_FILE, {})
  const limit = Number(option(args, '--limit') ?? Infinity)
  const stale = Object.entries(names)
    .filter(([name, version]) => readJson(join(PACKAGES_DIR, `${slugOf(name)}.json`))?.latest !== version || version === null)
    .map(([name]) => name)
    .slice(0, limit)
  const now = Date.now()
  const results = await runPool(stale, config().concurrency, async name => {
    const response = await get(context, `${context.registry}${name.replace('/', '%2f')}`, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const facts = factsOf(await response.json(), now)
    if (facts.error) throw new Error(facts.error)
    writeJson(join(PACKAGES_DIR, `${slugOf(name)}.json`), facts)
  })
  const failed = results.filter(r => !r.ok)
  writeJson(CLOCK_FILE, { refreshedAt: new Date(now).toISOString() })
  console.log(`refresh: ${stale.length - failed.length} updated, ${failed.length} failed (kept their previous facts)`)
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
    // A failed lookup (rate limit, missing repository) keeps its old date, so it is picked again next run.
    next[name] = stars === null ? { ...next[name], stars: next[name].stars ?? null } : { ...next[name], stars, starsAt: today }
  })
  writeJson(STATS_FILE, Object.fromEntries(Object.keys(next).sort().map(name => [name, next[name]])))
  console.log(`stats: ${listed.length} downloads, ${picked.length} star refreshes`)
}

async function scan(args) {
  const context = io(args)
  const limit = Number(option(args, '--limit') ?? config().scanLimit)
  const counts = readJson(STATS_FILE, {})
  const todo = listedFacts()
    .filter(f => readJson(join(SCAN_DIR, `${slugOf(f.name)}.json`))?.version !== f.latest)
    .sort((a, b) => (counts[b.name]?.weeklyDownloads ?? -1) - (counts[a.name]?.weeklyDownloads ?? -1) || (a.name < b.name ? -1 : 1))
    .slice(0, limit)
  const results = await runPool(todo, 4, async f => {
    const response = await get(context, `${context.registry}${f.name.replace('/', '%2f')}/${f.latest}`, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const manifest = await response.json()
    const { files, skipped } = await downloadTarball(manifest, context)
    const icon = pickIcon(manifest, files)
    const slug = slugOf(f.name)
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
  const { index, details } = buildDirectory({ facts: allFacts(), stats: readJson(STATS_FILE, {}), scans, icons, config: config(), storeVersion, now: clock() })
  parseMarketIndex(structuredClone(index), INDEX_PUBLIC_URL)
  return { index, files: plannedMarketFiles(index, details, file => (existsSync(join(ICONS_DIR, file)) ? readFileSync(join(ICONS_DIR, file)) : null)) }
}

function existingMarketFiles() {
  const paths = []
  for (const dir of ['plugins', 'icons']) if (existsSync(join(MARKET_DIR, dir))) for (const file of readdirSync(join(MARKET_DIR, dir))) paths.push(`${dir}/${file}`)
  return paths
}

function build() {
  const { index, files } = planned()
  for (const [path, content] of files) {
    const file = join(MARKET_DIR, path)
    if (existsSync(file) && readFileSync(file).equals(Buffer.from(content))) continue
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(join(MARKET_DIR, path), content)
  }
  const stale = staleMarketFiles(existingMarketFiles(), files)
  for (const path of stale) rmSync(join(MARKET_DIR, path))
  console.log(`build: ${index.plugins.length} listed, ${stale.length} stale file(s) removed`)
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
