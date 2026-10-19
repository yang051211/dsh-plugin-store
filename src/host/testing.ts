/** Test-only entry: built to lib/test/host.js, never shipped (lib/test is git-ignored and outside `files`). */
export { createCatalogCache, checkIndexShape, MAX_INDEX_BYTES, MAX_DETAIL_BYTES } from './catalog-cache.ts'
export { createIndexFetch, createDetailFetch, compatibilityOf, INDEX_ROUTE, DETAIL_ROUTE, DEFAULT_INDEX_URL } from './index-route.ts'
export { runtimeVersion, createVersionReader } from './runtime-version.ts'
