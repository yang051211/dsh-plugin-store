/** Test-only entry: built to lib/test/host.js, never shipped (lib/test is git-ignored and outside `files`). */
export { createCatalogCache, checkIndexShape, MAX_INDEX_BYTES, MAX_DETAIL_BYTES } from './catalog-cache.ts'
export { createIndexFetch, createDetailFetch, compatibilityOf, INDEX_ROUTE, DETAIL_ROUTE, INDEX_SOURCES } from './index-route.ts'
export { runtimeVersion, createVersionReader } from './runtime-version.ts'
export { createDiskCopy, defaultCopyFile } from './disk-copy.ts'
export { createReadmeFetch, README_ROUTE, MAX_README_BYTES } from './readme-route.ts'
export { createUpdatesFetch, UPDATES_ROUTE, UPDATE_TTL_MS } from './updates-route.ts'
