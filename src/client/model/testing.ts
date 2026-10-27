/** Test-only entry: built to lib/test/model.js, never shipped. */
export { localize } from './localize.ts'
export { buildCatalog, searchPlugins, sortPlugins, pageOf } from './catalog.ts'
export { installStateOf, installedFrom, installedOf, selfUpdateOf } from './install-state.ts'
export { buildInstalledRows, changeOutcome } from './installed.ts'
export { isRegistrySpec } from '../../shared/registry-spec.ts'
