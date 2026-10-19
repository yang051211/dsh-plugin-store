/**
 * Permission evidence for a reviewer: pattern matches over a package's files. It only reads text — nothing is
 * imported, evaluated or executed. Results are candidates; the reviewer records the verdict in catalog.yaml.
 */

const SCANNED = /\.(?:js|mjs|cjs|ts|tsx|json)$/
const SKIPPED = /(?:^|\/)node_modules\/|\.map$|\.d\.ts$/
const MAX_EVIDENCE = 5
const MAX_TEXT = 160
const MINIFIED_LINE = 5000
const LIFECYCLE = ['preinstall', 'install', 'postinstall', 'prepare']

const PATTERNS = {
  network: /\bfetch\s*\(|\bhttps?\.(?:request|get)\s*\(|\bnew\s+WebSocket\b|\bXMLHttpRequest\b|['"]undici['"]|['"]axios['"]/,
  fileSystem: /['"](?:node:)?fs(?:\/promises)?['"]|\b(?:writeFile|readFile|appendFile|rm|unlink|mkdir)(?:Sync)?\s*\(/,
  agentTools: /\binject\s*[:=][^\n]*['"]tools['"]|\bctx\.tools\b|\btools\.register\s*\(/,
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
  const result = { network: empty(), fileSystem: empty(), agentTools: empty(), childProcess: empty(), installScripts: empty(), dependencies: 0, minifiedFiles: [] }
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
  result.dependencies = Object.keys(manifest.dependencies ?? {}).length

  for (const [path, body] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
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
  return result
}
