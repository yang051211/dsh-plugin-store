#!/usr/bin/env node
/**
 * Catalog maintenance commands, run on the maintainer's machine:
 *   fetch                      refresh catalog/upstream/*.json and the icon cache catalog/icons/ for every curated plugin
 *   scan <name>@<version>      write catalog/scan/<slug>@<version>.json (download and read only, never execute)
 *   build                      make market/ exactly the published catalog: index, details, icons of listed plugins
 *   check                      validate the catalog, run the preflight checks, and confirm market/ matches build
 *   services <dir>             write catalog/scan/dsh-services.json from an installed DSH's @deepseek-ai packages directory
 * Options: --registry <url> (default: `npm config get registry`); GITHUB_TOKEN raises the GitHub API rate limit.
 * Tools never write catalog/catalog.yaml (tests/catalog/curation.test.mjs guards every write call).
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { buildIndex, INDEX_PUBLIC_URL } from './build-index.mjs'
import { CURATED_ICON_DIR, loadCuration } from './curation.mjs'
import { downloadTarball, fetchUpstream } from './fetch-upstream.mjs'
import { appendStatsHistory, mergeStats, plannedMarketFiles, staleMarketFiles, toJson } from './outputs.mjs'
import { preflightIssues, servicesProvidedBy } from './preflight.mjs'
import { scanPackage } from './scan.mjs'
import { slugOf } from './slug.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const CURATION_FILE = join(ROOT, 'catalog', 'catalog.yaml')
export const UPSTREAM_DIR = join(ROOT, 'catalog', 'upstream')
export const SCAN_DIR = join(ROOT, 'catalog', 'scan')
/** Services an installed DSH provides, a tool-owned scan fact next to the package scans. */
export const DSH_SERVICES_NAME = 'dsh-services.json'
export const ICON_CACHE_DIR = join(ROOT, 'catalog', 'icons')
export const CURATED_ICONS = join(ROOT, 'catalog', CURATED_ICON_DIR)
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
    const previous = readJson(join(UPSTREAM_DIR, `${slug}.json`))
    const { stats, warnings } = mergeStats(previous?.stats, upstream.stats)
    upstream.stats = stats
    // Weekly snapshots accumulate so star growth can be ranked later; only the current stats are published.
    upstream.statsHistory = appendStatsHistory(previous?.statsHistory, stats, upstream.fetchedAt)
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
  console.log(`services        ${result.requiredServices.join(', ') || 'none'}`)
  console.log(`setup hints     ${result.setupHints.map(h => `${h.file}:${h.line}`).join(', ') || 'none'}`)
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
  // Curated icons first: a reviewer-supplied file shadows a cached author icon of the same name.
  const readIcon = file => [CURATED_ICONS, ICON_CACHE_DIR].map(dir => join(dir, file)).filter(path => existsSync(path)).map(path => readFileSync(path))[0] ?? null
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

/** Preflight issues of every approved plugin, as "name: [id] message" lines. */
function preflightProblems() {
  const curation = loadCuration(CURATION_FILE)
  const dsh = readJson(join(SCAN_DIR, DSH_SERVICES_NAME)) ?? null
  const problems = []
  for (const plugin of curation.plugins.filter(p => p.review.status === 'approved')) {
    const scan = readJson(join(SCAN_DIR, `${slugOf(plugin.name)}@${plugin.review.version}.json`))
    for (const issue of preflightIssues(plugin, scan, dsh)) problems.push(`${plugin.name}: [${issue.id}] ${issue.message}`)
  }
  return problems
}

/** Record the services an installed DSH provides, so scans can flag plugins that wait for one it lacks. */
async function services(args) {
  const dir = args.find(arg => !arg.startsWith('--'))
  if (!dir || !existsSync(dir)) throw new Error('usage: services <path to node_modules/@deepseek-ai of an installed DSH>')
  const files = new Map()
  const walk = path => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name)
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full) } else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) files.set(full, readFileSync(full, 'utf8'))
    }
  }
  for (const pkg of readdirSync(dir)) if (existsSync(join(dir, pkg, 'lib'))) walk(join(dir, pkg, 'lib'))
  const dshVersion = readJson(join(dir, 'dsh', 'package.json'))?.version ?? 'unknown'
  const list = servicesProvidedBy(files)
  writeFileSync(join(SCAN_DIR, DSH_SERVICES_NAME), toJson({ dshVersion, services: list }))
  console.log(`catalog/scan/dsh-services.json: DSH ${dshVersion}, ${list.length} services from ${files.size} files`)
}

async function check() {
  const { index, planned } = plannedFromFiles()
  const preflight = preflightProblems()
  if (preflight.length > 0) {
    const list = preflight.map(line => `\n  ${line}`).join('')
    throw new Error(`preflight: ${preflight.length} unresolved issue(s) — fix the entry or explain it in review.preflight.<id>:${list}`)
  }
  const problems = []
  for (const [path, content] of planned) {
    const file = join(MARKET_DIR, path)
    if (!existsSync(file) || !readFileSync(file).equals(Buffer.from(content))) problems.push(`market/${path} is out of date`)
  }
  for (const path of staleMarketFiles(existingMarketFiles(), planned)) problems.push(`market/${path} should not be published`)
  if (problems.length > 0) throw new Error(`${problems.join('; ')} (run catalog:build)`)
  console.log(`catalog OK: ${index.plugins.length} plugin(s), index valid, market/ up to date`)
}

const COMMANDS = { fetch: fetchAll, scan: scanOne, build, check, services }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2)
  const run = COMMANDS[command]
  if (!run) {
    console.error(`usage: cli.mjs <${Object.keys(COMMANDS).join('|')}> [args]`)
    process.exit(2)
  }
  run(args).catch(error => { console.error(error.message); process.exit(1) })
}
