#!/usr/bin/env node
/**
 * Catalog maintenance commands, run on the maintainer's machine:
 *   fetch                      refresh catalog/upstream/*.json and the icon cache catalog/icons/ for every curated plugin
 *   scan <name>@<version>      write catalog/scan/<slug>@<version>.json (download and read only, never execute)
 *   build                      make market/ exactly the published catalog: index, details, icons of listed plugins
 *   check                      validate the catalog and confirm market/ matches what build would write
 * Options: --registry <url> (default: `npm config get registry`); GITHUB_TOKEN raises the GitHub API rate limit.
 * Tools never write catalog/catalog.yaml (tests/catalog/curation.test.mjs guards every write call).
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { buildIndex, INDEX_PUBLIC_URL } from './build-index.mjs'
import { loadCuration } from './curation.mjs'
import { downloadTarball, fetchUpstream } from './fetch-upstream.mjs'
import { mergeStats, plannedMarketFiles, staleMarketFiles, toJson } from './outputs.mjs'
import { scanPackage } from './scan.mjs'
import { slugOf } from './slug.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const CURATION_FILE = join(ROOT, 'catalog', 'catalog.yaml')
export const UPSTREAM_DIR = join(ROOT, 'catalog', 'upstream')
export const SCAN_DIR = join(ROOT, 'catalog', 'scan')
export const ICON_CACHE_DIR = join(ROOT, 'catalog', 'icons')
export const MARKET_DIR = join(ROOT, 'market')

function option(args, name) {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}

function io(args) {
  const registry = option(args, '--registry') ?? execSync('npm config get registry', { encoding: 'utf8' }).trim()
  return { fetch, registry: registry.endsWith('/') ? registry : `${registry}/`, githubToken: process.env.GITHUB_TOKEN }
}

const readJson = file => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined)

async function fetchAll(args) {
  const curation = loadCuration(CURATION_FILE)
  const context = io(args)
  mkdirSync(UPSTREAM_DIR, { recursive: true })
  mkdirSync(ICON_CACHE_DIR, { recursive: true })
  const failed = []
  for (const plugin of curation.plugins) {
    const slug = slugOf(plugin.name)
    let upstream
    try {
      upstream = await fetchUpstream(plugin.name, plugin.review.version, context)
    } catch (error) {
      // One unreachable plugin must not stop the others; the run still fails at the end.
      failed.push(plugin.name)
      console.error(`${plugin.name}: FAILED ${error.message}`)
      continue
    }
    const { stats, warnings } = mergeStats(readJson(join(UPSTREAM_DIR, `${slug}.json`))?.stats, upstream.stats)
    upstream.stats = stats
    writeFileSync(join(UPSTREAM_DIR, `${slug}.json`), toJson(upstream))
    if (upstream.iconData && upstream.reviewed?.icon) writeFileSync(join(ICON_CACHE_DIR, upstream.reviewed.icon.file), upstream.iconData)
    const reviewed = upstream.reviewed ? 'found' : 'MISSING'
    console.log(`${plugin.name}: latest ${upstream.latest}, reviewed ${plugin.review.version} ${reviewed}, stars ${stats.stars}, weekly downloads ${stats.weeklyDownloads}`)
    for (const warning of warnings) console.warn(`  warning: ${warning}`)
  }
  if (failed.length > 0) throw new Error(`fetch failed for: ${failed.join(', ')} (their previous upstream files are unchanged)`)
}

async function scanOne(args) {
  const target = args.find(arg => !arg.startsWith('--') && arg !== option(args, '--registry'))
  const at = target?.lastIndexOf('@') ?? -1
  if (!target || at <= 0) throw new Error('usage: scan <name>@<version>')
  const name = target.slice(0, at)
  const version = target.slice(at + 1)
  const context = io(args)
  const response = await fetch(`${context.registry}${name.replace('/', '%2f')}`, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`${name}: registry answered HTTP ${response.status}`)
  const record = (await response.json()).versions?.[version]
  if (!record?.dist) throw new Error(`${name}@${version} is not published`)
  const { files, skipped } = await downloadTarball(record, context)
  const result = { name, version, scannedAt: new Date().toISOString(), ...scanPackage(files), skippedEntries: skipped }
  mkdirSync(SCAN_DIR, { recursive: true })
  writeFileSync(join(SCAN_DIR, `${slugOf(name)}@${version}.json`), toJson(result))
  for (const kind of ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']) {
    console.log(`${kind.padEnd(15)} ${result[kind].hit ? 'HIT ' : 'none'} ${result[kind].evidence.map(e => `${e.file}:${e.line}`).join(', ')}`)
  }
  console.log(`dependencies    ${result.dependencies}`)
  console.log(`minified files  ${result.minifiedFiles.join(', ') || 'none'}`)
  console.log(`binary files    ${result.binaryFiles.join(', ') || 'none'}`)
  console.log(`skipped entries ${skipped.join(', ') || 'none'}`)
}

/** Build the published files in memory from the committed catalog files, validated with the official reader. */
function plannedFromFiles() {
  const curation = loadCuration(CURATION_FILE)
  const upstream = new Map()
  const scans = new Map()
  for (const plugin of curation.plugins.filter(p => p.review.status === 'approved')) {
    const slug = slugOf(plugin.name)
    const facts = readJson(join(UPSTREAM_DIR, `${slug}.json`))
    if (!facts) throw new Error(`${plugin.name}: catalog/upstream/${slug}.json is missing (run catalog:fetch)`)
    upstream.set(plugin.name, facts)
    const scan = readJson(join(SCAN_DIR, `${slug}@${plugin.review.version}.json`))
    if (scan) scans.set(plugin.name, scan)
  }
  // Stable output: the generation time is the newest upstream fetch, not the wall clock.
  const fetched = [...upstream.values()].map(u => Date.parse(u.fetchedAt)).filter(Number.isFinite)
  // The store's own release rides along, so installed copies can offer the update.
  const storeVersion = readJson(join(ROOT, 'package.json')).version
  const { index, details } = buildIndex(curation, upstream, scans, new Date(fetched.length > 0 ? Math.max(...fetched) : 0), storeVersion)
  parseMarketIndex(structuredClone(index), INDEX_PUBLIC_URL)
  const readIcon = file => (existsSync(join(ICON_CACHE_DIR, file)) ? readFileSync(join(ICON_CACHE_DIR, file)) : null)
  return { index, planned: plannedMarketFiles(index, details, readIcon) }
}

/** Paths of the files currently under market/plugins and market/icons, relative to market/. */
function existingMarketFiles() {
  const paths = []
  for (const dir of ['plugins', 'icons']) {
    if (!existsSync(join(MARKET_DIR, dir))) continue
    for (const file of readdirSync(join(MARKET_DIR, dir))) paths.push(`${dir}/${file}`)
  }
  return paths
}

async function build() {
  const { index, planned } = plannedFromFiles()
  for (const [path, content] of planned) {
    mkdirSync(dirname(join(MARKET_DIR, path)), { recursive: true })
    writeFileSync(join(MARKET_DIR, path), content)
  }
  const stale = staleMarketFiles(existingMarketFiles(), planned)
  for (const path of stale) rmSync(join(MARKET_DIR, path))
  console.log(`market/: ${index.plugins.length} plugin(s): ${index.plugins.map(p => `${p.name}@${p['dist-tags'].latest}`).join(', ') || 'none'}`)
  if (stale.length > 0) console.log(`removed: ${stale.join(', ')}`)
}

async function check() {
  const { index, planned } = plannedFromFiles()
  const problems = []
  for (const [path, content] of planned) {
    const file = join(MARKET_DIR, path)
    if (!existsSync(file) || !readFileSync(file).equals(Buffer.from(content))) problems.push(`market/${path} is out of date`)
  }
  for (const path of staleMarketFiles(existingMarketFiles(), planned)) problems.push(`market/${path} should not be published`)
  if (problems.length > 0) throw new Error(`${problems.join('; ')} (run catalog:build)`)
  console.log(`catalog OK: ${index.plugins.length} plugin(s), index valid, market/ up to date`)
}

const COMMANDS = { fetch: fetchAll, scan: scanOne, build, check }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2)
  const run = COMMANDS[command]
  if (!run) {
    console.error(`usage: cli.mjs <${Object.keys(COMMANDS).join('|')}> [args]`)
    process.exit(2)
  }
  run(args).catch(error => { console.error(error.message); process.exit(1) })
}
