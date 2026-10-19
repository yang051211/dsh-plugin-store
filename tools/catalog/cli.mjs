#!/usr/bin/env node
/**
 * Catalog maintenance commands, run on the maintainer's machine:
 *   fetch                      refresh catalog/upstream/*.json and market/icons/ for every curated plugin
 *   scan <name>@<version>      write catalog/scan/<slug>@<version>.json (download and read only, never execute)
 *   build                      write market/index.json and market/plugins/*.json from the catalog
 *   check                      validate the catalog and the built index without writing
 * Options: --registry <url> (default: `npm config get registry`); GITHUB_TOKEN raises the GitHub API rate limit.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { buildIndex, INDEX_PUBLIC_URL } from './build-index.mjs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { loadCuration } from './curation.mjs'
import { downloadTarball, fetchUpstream } from './fetch-upstream.mjs'
import { scanPackage } from './scan.mjs'
import { slugOf } from './slug.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const CURATION_FILE = join(ROOT, 'catalog', 'catalog.yaml')
export const UPSTREAM_DIR = join(ROOT, 'catalog', 'upstream')
export const SCAN_DIR = join(ROOT, 'catalog', 'scan')
export const MARKET_DIR = join(ROOT, 'market')

/** Stable JSON for committed files. */
export const toJson = value => `${JSON.stringify(value, null, 2)}\n`

function option(args, name) {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}

function io(args) {
  const registry = option(args, '--registry')
    ?? execSync('npm config get registry', { encoding: 'utf8' }).trim()
  return { fetch, registry, githubToken: process.env.GITHUB_TOKEN }
}

async function fetchAll(args) {
  const curation = loadCuration(CURATION_FILE)
  const context = io(args)
  mkdirSync(UPSTREAM_DIR, { recursive: true })
  mkdirSync(join(MARKET_DIR, 'icons'), { recursive: true })
  for (const plugin of curation.plugins) {
    const upstream = await fetchUpstream(plugin.name, plugin.review.version, context)
    writeFileSync(join(UPSTREAM_DIR, `${slugOf(plugin.name)}.json`), toJson(upstream))
    if (upstream.iconData && upstream.reviewed?.icon) writeFileSync(join(MARKET_DIR, 'icons', upstream.reviewed.icon.file), upstream.iconData)
    const reviewed = upstream.reviewed ? 'found' : 'MISSING'
    console.log(`${plugin.name}: latest ${upstream.latest}, reviewed ${plugin.review.version} ${reviewed}, stars ${upstream.stats.stars}, weekly downloads ${upstream.stats.weeklyDownloads}`)
  }
}

async function scanOne(args) {
  const target = args.find(arg => !arg.startsWith('--') && arg !== option(args, '--registry'))
  const at = target?.lastIndexOf('@') ?? -1
  if (!target || at <= 0) throw new Error('usage: scan <name>@<version>')
  const name = target.slice(0, at)
  const version = target.slice(at + 1)
  const context = io(args)
  const registry = context.registry.endsWith('/') ? context.registry : `${context.registry}/`
  const response = await fetch(`${registry}${name.replace('/', '%2f')}`, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`${name}: registry answered HTTP ${response.status}`)
  const dist = (await response.json()).versions?.[version]?.dist
  if (!dist) throw new Error(`${name}@${version} is not published`)
  const result = { name, version, scannedAt: new Date().toISOString(), ...scanPackage(await downloadTarball(dist, context)) }
  mkdirSync(SCAN_DIR, { recursive: true })
  writeFileSync(join(SCAN_DIR, `${slugOf(name)}@${version}.json`), toJson(result))
  for (const kind of ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']) {
    console.log(`${kind.padEnd(15)} ${result[kind].hit ? 'HIT ' : 'none'} ${result[kind].evidence.map(e => `${e.file}:${e.line}`).join(', ')}`)
  }
  console.log(`dependencies    ${result.dependencies}`)
  console.log(`minified files  ${result.minifiedFiles.join(', ') || 'none'}`)
}

/** Build the index in memory from the committed catalog files and validate it with the official reader. */
function buildFromFiles() {
  const curation = loadCuration(CURATION_FILE)
  const upstream = new Map()
  const scans = new Map()
  for (const plugin of curation.plugins.filter(p => p.review.status === 'approved')) {
    const slug = slugOf(plugin.name)
    const upstreamFile = join(UPSTREAM_DIR, `${slug}.json`)
    if (!existsSync(upstreamFile)) throw new Error(`${plugin.name}: ${upstreamFile} is missing (run catalog:fetch)`)
    upstream.set(plugin.name, JSON.parse(readFileSync(upstreamFile, 'utf8')))
    const scanFile = join(SCAN_DIR, `${slug}@${plugin.review.version}.json`)
    if (existsSync(scanFile)) scans.set(plugin.name, JSON.parse(readFileSync(scanFile, 'utf8')))
  }
  // Stable output: the generation time is the newest upstream fetch, not the wall clock.
  const fetched = [...upstream.values()].map(u => Date.parse(u.fetchedAt)).filter(Number.isFinite)
  const now = new Date(fetched.length > 0 ? Math.max(...fetched) : 0)
  const built = buildIndex(curation, upstream, scans, now)
  parseMarketIndex(structuredClone(built.index), INDEX_PUBLIC_URL)
  return built
}

async function build() {
  const { index, details } = buildFromFiles()
  mkdirSync(join(MARKET_DIR, 'plugins'), { recursive: true })
  writeFileSync(join(MARKET_DIR, 'index.json'), toJson(index))
  for (const [name, detail] of details) writeFileSync(join(MARKET_DIR, 'plugins', `${slugOf(name)}.json`), toJson(detail))
  console.log(`market/index.json: ${index.plugins.length} plugin(s): ${index.plugins.map(p => `${p.name}@${p['dist-tags'].latest}`).join(', ') || 'none'}`)
}

async function check() {
  const { index, details } = buildFromFiles()
  const stale = []
  const committed = join(MARKET_DIR, 'index.json')
  if (!existsSync(committed) || readFileSync(committed, 'utf8') !== toJson(index)) stale.push('market/index.json')
  for (const [name, detail] of details) {
    const file = join(MARKET_DIR, 'plugins', `${slugOf(name)}.json`)
    if (!existsSync(file) || readFileSync(file, 'utf8') !== toJson(detail)) stale.push(`market/plugins/${slugOf(name)}.json`)
  }
  if (stale.length > 0) throw new Error(`out of date (run catalog:build): ${stale.join(', ')}`)
  console.log(`catalog OK: ${index.plugins.length} plugin(s), index valid and up to date`)
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
