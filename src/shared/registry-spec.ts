/**
 * Whether a bundle's install spec names a registry package: the bare name, or `name@<range or tag>`. Git, path,
 * tarball and alias (`name@npm:other`) specs are not, so their latest version cannot be asked of the registry.
 */
export function isRegistrySpec(name: string, source: string | undefined): boolean {
  if (source === name) return true
  if (!source?.startsWith(`${name}@`)) return false
  const rest = source.slice(name.length + 1)
  return rest !== '' && !/[:/\\#]/.test(rest)
}
