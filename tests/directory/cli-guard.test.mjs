import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

/** Write calls whose target is not tool-owned state or the published market/ (config.json is edited by hand only). */
const WRITE_CALL = /\b(writeFileSync|writeFile|appendFile\w*|createWriteStream|rmSync|unlinkSync|renameSync|copyFileSync|writeJson)\(\s*/g
const OWNED_TARGET = /^(?:join\(\s*)?(NAMES_FILE|CLOCK_FILE|STATS_FILE|CHECKED_FILE|PACKAGES_DIR|SCAN_DIR|MARKET_DIR|ICONS_DIR)\b/

/** The writeJson helper writes whatever path it is given; its call sites are what the guard checks. */
const HELPER = /function writeJson\([^)]*\) \{[\s\S]*?\n\}/

function unsafeWrites(source) {
  source = source.replace(HELPER, '')
  return [...source.matchAll(WRITE_CALL)]
    .map(call => source.slice(call.index + call[0].length, call.index + call[0].length + 120))
    .filter(target => !OWNED_TARGET.test(target))
}

test('the guard flags writes outside tool-owned paths', () => {
  assert.equal(unsafeWrites("writeFileSync(CONFIG_FILE, 'x')").length, 1)
  assert.equal(unsafeWrites("writeFileSync(join(ROOT, 'directory', 'config.json'), x)").length, 1)
  assert.equal(unsafeWrites("writeJson(STATS_FILE, x)").length, 0)
  assert.equal(unsafeWrites("writeFileSync(join(MARKET_DIR, 'index.json'), x)").length, 0)
})

test('directory tools never write the hand-edited config', () => {
  const dir = new URL('../../tools/directory/', import.meta.url)
  for (const file of readdirSync(dir).filter(f => f.endsWith('.mjs'))) {
    assert.deepEqual(unsafeWrites(readFileSync(new URL(file, dir), 'utf8')), [], `${file} writes outside tool-owned paths`)
  }
})
