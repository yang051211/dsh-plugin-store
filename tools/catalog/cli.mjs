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
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { loadCuration } from './curation.mjs'
import { fetchUpstream } from './fetch-upstream.mjs'
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

const COMMANDS = { fetch: fetchAll }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2)
  const run = COMMANDS[command]
  if (!run) {
    console.error(`usage: cli.mjs <${Object.keys(COMMANDS).join('|')}> [args]`)
    process.exit(2)
  }
  run(args).catch(error => { console.error(error.message); process.exit(1) })
}
