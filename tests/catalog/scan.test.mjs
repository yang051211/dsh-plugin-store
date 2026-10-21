import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanPackage } from '../../tools/catalog/scan.mjs'

const pkg = (files) => new Map(Object.entries({ 'package.json': JSON.stringify({ name: 'x' }), ...files }).map(([k, v]) => [k, Buffer.from(v)]))

const CASES = {
  network: { hit: 'const r = await fetch(url)', miss: 'const fetcher = 1' },
  fileSystem: { hit: "import { readFile } from 'node:fs/promises'", miss: 'const profile = 1' },
  agentTools: { hit: "export const inject = ['tools', 'locale']", miss: "export const inject = ['locale']" },
  childProcess: { hit: "const { spawn } = require('child_process')", miss: 'const processed = 1' },
}

for (const [kind, { hit, miss }] of Object.entries(CASES)) {
  test(`${kind}: detects evidence`, () => {
    const result = scanPackage(pkg({ 'lib/index.js': `// header\n${hit}\n` }))
    assert.equal(result[kind].hit, true)
    assert.deepEqual(result[kind].evidence[0], { file: 'lib/index.js', line: 2, text: hit })
  })
  test(`${kind}: stays quiet without evidence`, () => {
    const result = scanPackage(pkg({ 'lib/index.js': miss }))
    assert.equal(result[kind].hit, false)
    assert.deepEqual(result[kind].evidence, [])
  })
}

test('installScripts: reads lifecycle scripts from package.json', () => {
  const withScript = new Map([['package.json', Buffer.from(JSON.stringify({ scripts: { postinstall: 'node setup.js', test: 'x' } }))]])
  const result = scanPackage(withScript)
  assert.equal(result.installScripts.hit, true)
  assert.deepEqual(result.installScripts.evidence, [{ file: 'package.json', line: 0, text: 'scripts.postinstall: node setup.js' }])
  assert.equal(scanPackage(pkg({})).installScripts.hit, false)
})

test('counts runtime dependencies', () => {
  const files = new Map([['package.json', Buffer.from(JSON.stringify({ dependencies: { a: '1', b: '2' }, devDependencies: { c: '3' } }))]])
  assert.equal(scanPackage(files).dependencies, 2)
})

test('keeps at most five evidence lines and truncates long ones', () => {
  const body = Array.from({ length: 8 }, (_, i) => `fetch('/a${i}') ${'x'.repeat(300)}`).join('\n')
  const result = scanPackage(pkg({ 'lib/a.js': body }))
  assert.equal(result.network.evidence.length, 5)
  assert.ok(result.network.evidence.every(e => e.text.length <= 160))
})

test('evidence from a long line shows the matched part', () => {
  const line = `${'a'.repeat(5000)}await fetch('https://api.example.com/v1')${'b'.repeat(5000)}`
  const [evidence] = scanPackage(pkg({ 'lib/min.js': line })).network.evidence
  assert.ok(evidence.text.length <= 160)
  assert.match(evidence.text, /fetch\('https:\/\/api\.example\.com/)
})

test('flags minified files with very long lines', () => {
  const result = scanPackage(pkg({ 'lib/min.js': 'a'.repeat(6000), 'lib/ok.js': 'short' }))
  assert.deepEqual(result.minifiedFiles, ['lib/min.js'])
})

test('binding.gyp counts as an install script', () => {
  const result = scanPackage(pkg({ 'binding.gyp': '{}' }))
  assert.equal(result.installScripts.hit, true)
  assert.match(result.installScripts.evidence[0].text, /binding\.gyp/)
})

test('scans .mts, .cts and .jsx sources too', () => {
  for (const file of ['lib/a.mts', 'lib/a.cts', 'lib/a.jsx']) {
    assert.equal(scanPackage(pkg({ [file]: 'await fetch(url)' })).network.hit, true, file)
  }
})

test('lists native and wasm binaries it cannot read', () => {
  const result = scanPackage(pkg({ 'build/addon.node': 'bin', 'lib/core.wasm': 'bin', 'lib/a.js': 'x' }))
  assert.deepEqual(result.binaryFiles, ['build/addon.node', 'lib/core.wasm'])
})

test('ignores declaration files, source maps and node_modules', () => {
  const result = scanPackage(pkg({
    'lib/types.d.ts': 'declare function fetch(url: string): void',
    'lib/index.js.map': '{"mappings":"fetch("}',
    'node_modules/dep/index.js': 'fetch(url)',
  }))
  assert.equal(result.network.hit, false)
})

test('network: an imported https request, a PowerShell download and curl count', () => {
  for (const [file, line] of [
    ['scripts/setup.mjs', 'import { request as httpsRequest } from "node:https";'],
    ['scripts/boot.ps1', 'Invoke-WebRequest -Uri $nodeUrl -OutFile $partial'],
    ['scripts/get.sh', 'curl -fsSL https://example.com/x.tar.gz -o x.tar.gz'],
  ]) assert.equal(scanPackage(pkg({ [file]: line })).network.hit, true, file)
})

test('agentTools: a bundle patch that mounts the MCP client registers agent tools', () => {
  const result = scanPackage(pkg({ 'cordis.patch.yml': "- insert:\n    - id: mcp-rea\n      name: '@deepseek-ai/dsh-mcp-client'\n" }))
  assert.equal(result.agentTools.hit, true)
  assert.equal(result.agentTools.evidence[0].file, 'cordis.patch.yml')
})

/** A bundle: package.json with exports, a patch whose rows load some of them, and the module sources. */
const bundle = (manifest, patchRows, sources) => new Map(Object.entries({
  'package.json': JSON.stringify({ name: 'x', ...manifest }),
  'cordis.patch.yml': '- insert:\n' + patchRows.map(row => '    - id: r\n      name: ' + "'" + row + "'" + '\n').join(''),
  ...sources,
}).map(([k, v]) => [k, Buffer.from(v)]))

test('requiredServices: what the loaded rows inject, required only, first segment of dotted names', () => {
  const host = bundle({ main: 'lib/index.js' }, ['x'], { 'lib/index.js': 'export const inject = ["webServer", "webRuntime"];' })
  assert.deepEqual(scanPackage(host).requiredServices, ['webRuntime', 'webServer'])
  const client = bundle({ exports: { '.': './lib/index.js', './client': { import: './lib/client.js' } }, dsh: { client: { platform: 'web' } } }, ['x'], {
    'lib/index.js': 'export function apply() {}',
    'lib/client.js': "export const inject = ['slots', 'remote.pluginManager']",
  })
  assert.deepEqual(scanPackage(client).requiredServices, ['remote', 'slots'])
  const optional = bundle({ main: 'lib/index.js' }, ['x'], { 'lib/index.js': "export const inject = { required: ['tools'], optional: ['llm'] }" })
  assert.deepEqual(scanPackage(optional).requiredServices, ['tools'])
})

test('requiredServices: a module the patch never loads does not count (dsh-doublecheck invariant companion)', () => {
  const pkg = bundle({ exports: { './grill': './lib/grill/index.js', './guard': './lib/guard/index.js', './invariant': './lib/invariant.js' } }, ['x/grill', 'x/guard'], {
    'lib/grill/index.js': "export const inject = ['skills', 'tools'];",
    'lib/guard/index.js': "export const inject = ['commands'];\nctx.inject(['invariants'], () => {})",
    'lib/invariant.js': "export const inject = ['invariants'];",
  })
  assert.deepEqual(scanPackage(pkg).requiredServices, ['commands', 'skills', 'tools'])
})

test('requiredServices: rows that mount another package add nothing of this one', () => {
  const pkg = bundle({ main: 'index.mjs' }, ['@deepseek-ai/dsh-mcp-client'], { 'index.mjs': "export const inject = ['never']" })
  assert.deepEqual(scanPackage(pkg).requiredServices, [])
})

test('setupHints: README and patch lines that say something must be set up first', () => {
  const result = scanPackage(pkg({
    'README.md': '# X\n\nRequirements: Python 3.13 with pyghidra (pip install pyghidra)\n\nRun `node scripts/setup.mjs` once, then restart.\n\nNice colors.\n',
    'cordis.patch.yml': "args: [\"(process.env.DSH_HOME) + '/plugins/rea-bundle/bin/rea-shim.mjs'\"]\n",
  }))
  assert.deepEqual(result.setupHints.map(h => `${h.file}:${h.line}`), ['cordis.patch.yml:1', 'README.md:3', 'README.md:5'])
  assert.deepEqual(scanPackage(pkg({ 'README.md': '# Y\n\nJust install and go.\n' })).setupHints, [])
})

test('setupHints: host prerequisites, credits and tables about other plugins are not setup steps', () => {
  // Each line is a real false positive from a listed plugin's README.
  const readme = [
    '这是 DSH 环境中的插件。请先安装 DSH、配置一个可用模型，再运行：',
    'Requirements: DeepSeek Harness Desktop or web profile, and Node.js 20 or later.',
    '> Requirements: Node.js ≥ 20 + DeepSeek Harness (`npm install -g @deepseek-ai/dsh`) + **pnpm on the DSH process\'s PATH**',
    '### Prerequisites',
    'npm install --global pnpm',
    '- `pnpm` installed. If you do not have it, run `corepack enable` or `npm i -g pnpm`, then open a new terminal',
    '- **1024 store channel**: `npm i -g dsh1024` once, then `dsh1024 plugin --profile web add dsh-doublecheck`',
    '| **[dsh-lsp-actions](https://github.com/x/dsh-lsp-actions)** | LSP diagnostics, formatting and rename over language servers |  |',
  ].join('\n')
  assert.deepEqual(scanPackage(pkg({ 'README.md': readme })).setupHints, [])
})

test('setupHints: a global CLI the plugin needs counts', () => {
  const result = scanPackage(pkg({ 'README.md': 'For Memory Spaces, install the Mnemon CLI with `npm install --global @mnemon-dev/mnemon`.' }))
  assert.equal(result.setupHints.length, 1)
})

test('requiredServices: a class plugin declares them with static inject (dsh-ssh-ops)', () => {
  const pkg = bundle({ main: 'lib/index.js' }, ['x'], { 'lib/index.js': 'class SshOps extends Service {\n  static inject = ["tools", "storageDomain", "credentials"];\n}' })
  assert.deepEqual(scanPackage(pkg).requiredServices, ['credentials', 'storageDomain', 'tools'])
})

test('lists prebuilt DLLs, executables and shared libraries too (dsh-ops ships two DLLs)', () => {
  const result = scanPackage(pkg({ 'runtime/win32-x64/bash-ipc/opsipc.dll': 'MZ', 'bin/helper.exe': 'MZ', 'lib/libx.so': '', 'lib/libx.dylib': '', 'lib/index.js': '' }))
  assert.deepEqual(result.binaryFiles, ['bin/helper.exe', 'lib/libx.dylib', 'lib/libx.so', 'runtime/win32-x64/bash-ipc/opsipc.dll'])
})
