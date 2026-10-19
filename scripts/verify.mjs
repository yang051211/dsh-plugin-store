// SPDX-License-Identifier: MIT
/**
 * The project ships its committed lib/, so lib/ must match src/ exactly:
 * rebuild, fail if the rebuild changed any tracked file under lib/, then run the tests.
 */
import { execFileSync } from 'node:child_process'

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })

run('npm', ['run', 'build'])
try {
  run('git', ['diff', '--exit-code', '--', 'lib'])
} catch {
  console.error('\nlib/ is out of date with src/: commit the rebuilt lib/.')
  process.exit(1)
}
run('npm', ['run', 'catalog:check'])
run('npm', ['test'])
