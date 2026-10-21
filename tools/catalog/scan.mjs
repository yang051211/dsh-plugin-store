/**
 * Permission evidence for a reviewer: pattern matches over a package's files. It only reads text — nothing is
 * imported, evaluated or executed. Results are candidates; the reviewer records the verdict in catalog.yaml.
 */

const SCANNED = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx|json|ps1|sh|bat|cmd|ya?ml)$/
/**
 * Lines naming a concrete step the plugin needs after installing: a Python package, a global CLI other than DSH
 * and its own tooling (pnpm, the dsh1024 installer), a setup or bootstrap script, a tool outside the package, or a patch path into DSH_HOME/plugins. Generic
 * "Requirements"/"Prerequisites" wording is left out: in practice it describes installing DSH and Node, and a check
 * that cries wolf gets explained away together with the real cases.
 */
const SETUP = /\bpip3? install\b|\bnpm (?:i|install) (?:-g|--global) (?!(?:@deepseek-ai\/dsh|pnpm|dsh1024)\b)|\bsetup\.(?:mjs|js|ps1|sh|py)\b|\bbootstrap\.(?:ps1|sh)\b|language servers?\b|DSH_HOME[^\n]*\/plugins\//i
/** Markdown table rows: in READMEs they mostly list other plugins or options, not steps. */
const TABLE_ROW = /^\s*\|/
const SKIPPED = /(?:^|\/)node_modules\/|\.map$|\.d\.[mc]?ts$/
/** Executable formats a text scan cannot read; listed for the reviewer. */
const BINARY = /\.(?:node|wasm|dll|exe|so|dylib)$/
const MAX_EVIDENCE = 5
const MAX_TEXT = 160
const MINIFIED_LINE = 5000
const LIFECYCLE = ['preinstall', 'install', 'postinstall', 'prepare']

const PATTERNS = {
  network: /\bfetch\s*\(|\bhttps?\.(?:request|get)\s*\(|\bnew\s+WebSocket\b|\bXMLHttpRequest\b|['"]undici['"]|['"]axios['"]|\bfrom\s+['"](?:node:)?https?['"]|\brequire\(\s*['"](?:node:)?https?['"]\s*\)|\bInvoke-(?:WebRequest|RestMethod)\b|\.DownloadFile\(|\bcurl\s+-|\bwget\s/,
  fileSystem: /['"](?:node:)?fs(?:\/promises)?['"]|\b(?:writeFile|readFile|appendFile|rm|unlink|mkdir)(?:Sync)?\s*\(/,
  agentTools: /\binject\s*[:=][^\n]*['"]tools['"]|\bctx\.tools\b|\btools\.register\s*\(|dsh-mcp-client/,
  childProcess: /['"](?:node:)?child_process['"]|\b(?:spawn|execFile|execSync|spawnSync)\s*\(/,
}

const empty = () => ({ hit: false, evidence: [] })

/** Up to MAX_TEXT characters of `line` around the match at `index`, so minified lines still show what matched. */
function excerpt(line, index) {
  const trimmed = line.trim()
  if (trimmed.length <= MAX_TEXT) return trimmed
  const start = Math.max(0, Math.min(index - 40, line.length - MAX_TEXT))
  return line.slice(start, start + MAX_TEXT)
}

function note(finding, evidence) {
  finding.hit = true
  if (finding.evidence.length < MAX_EVIDENCE) finding.evidence.push(evidence)
}

/**
 * Scan an unpacked package.
 * @param files - package-relative path → contents.
 * @returns evidence per permission kind, the runtime dependency count, and files that look minified.
 */
export function scanPackage(files) {
  const result = { network: empty(), fileSystem: empty(), agentTools: empty(), childProcess: empty(), installScripts: empty(), dependencies: 0, minifiedFiles: [], binaryFiles: [], requiredServices: [], setupHints: [] }
  const required = new Set()
  let manifest = {}
  try {
    manifest = JSON.parse(files.get('package.json')?.toString('utf8') ?? '{}')
  } catch {
    manifest = {}
  }
  for (const name of LIFECYCLE) {
    const script = manifest.scripts?.[name]
    if (typeof script === 'string') note(result.installScripts, { file: 'package.json', line: 0, text: `scripts.${name}: ${script}`.slice(0, MAX_TEXT) })
  }
  // npm runs `node-gyp rebuild` as an implicit install script when binding.gyp sits at the package root.
  if (files.has('binding.gyp') && !manifest.scripts?.install && !manifest.scripts?.preinstall) {
    note(result.installScripts, { file: 'binding.gyp', line: 0, text: 'binding.gyp: npm runs node-gyp rebuild on install' })
  }
  result.dependencies = Object.keys(manifest.dependencies ?? {}).length
  const entries = entryFiles(manifest, files)

  for (const [path, body] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (BINARY.test(path) && !SKIPPED.test(path)) { result.binaryFiles.push(path); continue }
    const isReadme = /^README(?:\.[\w-]+)?\.md$/i.test(path)
    if (isReadme || /^cordis\.patch\.ya?ml$/.test(path)) {
      body.toString('utf8').split(/\r?\n/).forEach((line, index) => {
        const match = TABLE_ROW.test(line) ? null : SETUP.exec(line)
        if (match && result.setupHints.length < MAX_EVIDENCE) result.setupHints.push({ file: path, line: index + 1, text: excerpt(line, match.index) })
      })
      if (isReadme) continue
    }
    if (entries.has(path)) {
      for (const name of injectedServices(body.toString('utf8'))) required.add(name)
    }
    if (!SCANNED.test(path) || SKIPPED.test(path) || path === 'package.json') continue
    const lines = body.toString('utf8').split(/\r?\n/)
    if (/\.(?:js|mjs|cjs)$/.test(path) && lines.some(line => line.length > MINIFIED_LINE)) result.minifiedFiles.push(path)
    lines.forEach((line, index) => {
      for (const [kind, pattern] of Object.entries(PATTERNS)) {
        const match = pattern.exec(line)
        if (match) note(result[kind], { file: path, line: index + 1, text: excerpt(line, match.index) })
      }
    })
  }
  result.requiredServices = [...required].sort()
  return result
}

/**
 * The modules DSH loads from this package: each bundle-patch row naming the package or one of its subpaths, plus the
 * browser half when `dsh.client` is declared. Other files are internals or optional companions; what they inject
 * does not keep the plugin from starting.
 */
function entryFiles(manifest, files) {
  const own = manifest.name
  const patch = files.get('cordis.patch.yml')?.toString('utf8') ?? files.get('cordis.patch.yaml')?.toString('utf8') ?? ''
  const subpaths = new Set()
  for (const match of patch.matchAll(/^\s*name:\s*['"]?([^'"\s#]+)/gm)) {
    if (match[1] === own) subpaths.add('.')
    else if (own && match[1].startsWith(`${own}/`)) subpaths.add(`./${match[1].slice(own.length + 1)}`)
  }
  if (manifest.dsh?.client) subpaths.add('./client')
  const entries = new Set()
  for (const subpath of subpaths) {
    let target = manifest.exports?.[subpath]
    while (target && typeof target === 'object') target = target.import ?? target.default ?? target.node ?? target.require
    if (!target && subpath === '.') target = manifest.main ?? 'index.js'
    if (typeof target === 'string') entries.add(target.replace(/^\.\//, ''))
  }
  return new Set([...entries].filter(path => files.has(path)))
}

/**
 * Services named by `export const inject` or a class plugin's `static inject`, as a list or `{ required: [...] }`;
 * optional ones do not block loading.
 */
function injectedServices(text) {
  const names = []
  for (const match of text.matchAll(/(?:export\s+const|\bstatic)\s+inject\s*=\s*(\[[^\]]*\]|\{[^}]*\})/g)) {
    const declared = match[1].startsWith('[') ? match[1] : (/required\s*:\s*(\[[^\]]*\])/.exec(match[1])?.[1] ?? '[]')
    for (const name of declared.matchAll(/['"]([^'"]+)['"]/g)) names.push(name[1].split('.')[0])
  }
  return names
}
