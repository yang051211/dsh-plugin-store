/** File-system-safe name for a package: `@scope/pkg` → `scope__pkg`. */
export function slugOf(name) {
  return name.startsWith('@') ? name.slice(1).replace('/', '__') : name
}
