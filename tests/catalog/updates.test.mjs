import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareScans, compareFiles, selfUpdateLines, updatesReport, ISSUE_MARKER } from '../../tools/catalog/updates.mjs'

const hit = (...files) => ({ hit: files.length > 0, evidence: files.map((file, i) => ({ file, line: i + 1, text: `${file} code` })) })
const scan = (overrides = {}) => ({
  network: hit(), fileSystem: hit(), agentTools: hit(), childProcess: hit(), installScripts: hit(),
  dependencies: 2, minifiedFiles: [], binaryFiles: [], requiredServices: [], setupHints: [], ...overrides,
})

test('an unchanged scan is a quick review', () => {
  const r = compareScans(scan({ network: hit('lib/a.js') }), scan({ network: hit('lib/a.js') }))
  assert.equal(r.verdict, 'quick')
  assert.deepEqual(r.changes, [])
})

test('evidence that only moved lines is not a change', () => {
  const before = scan({ network: { hit: true, evidence: [{ file: 'lib/a.js', line: 3, text: 'fetch(url)' }] } })
  const after = scan({ network: { hit: true, evidence: [{ file: 'lib/a.js', line: 90, text: 'fetch(url)' }] } })
  assert.equal(compareScans(before, after).verdict, 'quick')
})

test('a newly hit permission needs a closer look', () => {
  const r = compareScans(scan(), scan({ childProcess: hit('lib/run.js') }))
  assert.equal(r.verdict, 'look')
  assert.ok(r.changes.some(c => c.kind === 'new-permission' && c.detail.includes('childProcess')))
})

test('new network or command evidence in a new file needs a look; new file-system evidence is only noted', () => {
  const net = compareScans(scan({ network: hit('lib/a.js') }), scan({ network: hit('lib/a.js', 'lib/b.js') }))
  assert.equal(net.verdict, 'look')
  const fs = compareScans(scan({ fileSystem: hit('lib/a.js') }), scan({ fileSystem: hit('lib/a.js', 'lib/b.js') }))
  assert.equal(fs.verdict, 'quick')
  assert.ok(fs.changes.some(c => c.kind === 'new-evidence'))
})

test('install scripts, binaries, extra dependencies, services and setup hints each need a look', () => {
  for (const after of [
    scan({ installScripts: hit('package.json') }),
    scan({ binaryFiles: ['bin/tool.exe'] }),
    scan({ dependencies: 3 }),
    scan({ requiredServices: ['webRuntime'] }),
    scan({ setupHints: [{ file: 'README.md', line: 4, text: 'pip install x' }] }),
  ]) assert.equal(compareScans(scan(), after).verdict, 'look', JSON.stringify(after))
})

test('fewer dependencies or a new minified file are noted, not escalated', () => {
  const r = compareScans(scan(), scan({ dependencies: 1, minifiedFiles: ['lib/client.js'] }))
  assert.equal(r.verdict, 'quick')
  assert.equal(r.changes.length, 2)
})

test('compareFiles counts added, removed and changed files and the bytes they cover', () => {
  const before = new Map([['a.js', Buffer.from('aaa')], ['b.js', Buffer.from('bb')], ['gone.js', Buffer.from('x')]])
  const after = new Map([['a.js', Buffer.from('aaa')], ['b.js', Buffer.from('bbbb')], ['new.js', Buffer.from('nnnnn')]])
  assert.deepEqual(compareFiles(before, after), { added: ['new.js'], removed: ['gone.js'], changed: ['b.js'], changedBytes: 9 })
})

test('selfUpdateLines finds package-manager installs and update bypasses that the reviewed version lacks', () => {
  const before = new Map([['lib/a.js', Buffer.from('const x = 1')]])
  const after = new Map([
    ['lib/a.js', Buffer.from('const x = 1')],
    ['lib/update.js', Buffer.from("spawn('pnpm', ['add', name, '--config.minimumReleaseAge=0'])")],
    ['README.md', Buffer.from('npm install -g something')],
  ])
  const lines = selfUpdateLines(before, after)
  assert.equal(lines.length, 1, 'only code files count, not docs')
  assert.equal(lines[0].file, 'lib/update.js')
  assert.deepEqual(selfUpdateLines(after, after), [], 'already in the reviewed version: not new')
})

test('the report lists quick ones and ones to look at, with links, and carries the marker', () => {
  const md = updatesReport([
    { name: 'a', reviewed: '1.0.0', latest: '1.0.1', verdict: 'quick', changes: [], files: { added: [], removed: [], changed: ['lib/a.js'], changedBytes: 120 }, selfUpdate: [] },
    { name: '@s/b', reviewed: '2.0.0', latest: '3.0.0', verdict: 'look', changes: [{ kind: 'new-permission', detail: 'childProcess', escalate: true }], files: { added: ['lib/x.js'], removed: [], changed: [], changedBytes: 50 }, selfUpdate: [] },
    { name: 'c', reviewed: '1.0.0', latest: '1.1.0', error: 'tarball answered HTTP 500' },
  ], '2026-10-26')
  assert.ok(md.includes(ISSUE_MARKER))
  assert.ok(md.indexOf('需细看') < md.indexOf('可快速通过'), 'the ones to look at come first')
  assert.ok(md.includes('https://www.npmjs.com/package/@s/b/v/3.0.0'))
  assert.ok(md.includes('1.0.0 → 1.0.1'))
  assert.ok(md.includes('tarball answered HTTP 500'))
  assert.ok(md.includes('3 个插件'))
})

test('an empty report says nothing is pending', () => {
  assert.ok(updatesReport([], '2026-10-26').includes('没有待审的新版本'))
})
