// SPDX-License-Identifier: MIT
/**
 * Build both plugin halves.
 * Structure adapted from PerryLink/dsh-session-pin scripts/build.mjs (Apache-2.0).
 *
 * - Host half (`lib/index.js`): ESM for the harness process; `@deepseek-ai/*`
 *   stays external so the harness's own instances answer it at load time.
 * - Client half (`lib/client.js`): CJS wrapped in the web boot factory
 *   (`window.__ModuleLoader__.load({ id, factory })`), the format the
 *   client-module system serves at `/plugins/<id>/client.js`. React comes from
 *   the shell through the factory's `require`; DSH packages are type-only
 *   imports, so the purity check fails the build if any reached the bundle.
 */
import { build } from 'esbuild'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const ID = 'dsh-startide'
const CLIENT_EXTERNALS = ['react', 'react/jsx-runtime']

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  outfile: 'lib/index.js',
  external: ['@deepseek-ai/*'],
})

// Built in memory first: an impure bundle must never land in the committed lib/.
const client = await build({
  entryPoints: ['src/client.ts'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  jsx: 'automatic',
  external: CLIENT_EXTERNALS,
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: { js: 'return module.exports; } });' },
})

// Test-only entries that Node tests import directly; lib/test/ is git-ignored and outside `files`.
// React stays external so tests render with the same React that react-dom/server uses.
const TEST_ENTRIES = {
  'first-run': { entry: 'src/client/first-run.ts', platform: 'neutral' },
  host: { entry: 'src/host/testing.ts', platform: 'node' },
  model: { entry: 'src/client/model/testing.ts', platform: 'neutral' },
  safe: { entry: 'src/client/safe/testing.ts', platform: 'neutral' },
  ui: { entry: 'src/client/ui/testing.ts', platform: 'neutral' },
  hub: { entry: 'src/client/hub.ts', platform: 'neutral' },
}
for (const [name, { entry, platform }] of Object.entries(TEST_ENTRIES)) {
  if (!existsSync(entry)) throw new Error(`test entry ${entry} is missing; tests would run against stale lib/test/${name}.js`)
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform,
    mainFields: ['module', 'main'],
    target: 'es2022',
    jsx: 'automatic',
    outfile: `lib/test/${name}.js`,
    external: ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/*'],
  })
}

const clientText = client.outputFiles[0].text
if (clientText.includes('@deepseek-ai/')) {
  throw new Error('client bundle purity: @deepseek-ai packages must be imported with `import type` only')
}
writeFileSync('lib/client.js', clientText)

console.log('built lib/index.js and lib/client.js')
