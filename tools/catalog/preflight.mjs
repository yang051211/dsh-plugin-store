/**
 * Pre-listing checks that catch what reading permissions does not: a plugin that waits for a host service the
 * running DSH never provides (it stays "waiting for dependencies" forever), and a plugin that needs a setup step
 * after installing (it looks installed but does nothing). Each issue blocks catalog:check until the reviewer either
 * fixes the entry (usage.setup) or explains it in review.preflight.<id>.
 */

/**
 * Service names a DSH installation registers, read from its packages' text: provide('x') and super(ctx, 'x'), also
 * when the name is a constant declared in the same file (`const WEB_STARTUP_SERVICE = "webStartup"`).
 */
export function servicesProvidedBy(files) {
  const found = new Set()
  const literal = /(?<![\w$])provide\(\s*['"]([A-Za-z]\w*)['"]|\bsuper\(\s*ctx\s*,\s*['"]([A-Za-z]\w*)['"]/g
  const byConstant = /(?<![\w$])provide\(\s*([A-Za-z_$][\w$]*)\s*[,)]|\bsuper\(\s*ctx\s*,\s*([A-Za-z_$][\w$]*)\s*[,)]/g
  for (const value of files.values()) {
    const text = String(value)
    for (const match of text.matchAll(literal)) found.add(match[1] ?? match[2])
    const constants = new Map([...text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([A-Za-z]\w*)['"]/g)].map(m => [m[1], m[2]]))
    for (const match of text.matchAll(byConstant)) {
      const name = constants.get(match[1] ?? match[2])
      if (name) found.add(name)
    }
  }
  return [...found].sort()
}

/**
 * Unresolved pre-listing issues for one plugin.
 * @param plugin - the catalog.yaml entry.
 * @param scan - its catalog/scan record, or undefined when there is none.
 * @param dsh - { dshVersion, services } from catalog/scan/dsh-services.json, or null when it has not been generated.
 * @returns issues { id, message }; ids a reviewer resolved in review.preflight are left out.
 */
export function preflightIssues(plugin, scan, dsh) {
  if (!scan || !Array.isArray(scan.requiredServices) || !Array.isArray(scan.setupHints)) {
    return [{ id: 'rescan', message: 'the scan predates the preflight checks; run catalog:scan again' }]
  }
  const issues = []
  if (scan.requiredServices.length > 0) {
    if (!dsh) {
      issues.push({ id: 'services-unknown', message: `requires ${scan.requiredServices.join(', ')} but catalog/scan/dsh-services.json is missing; run catalog:services` })
    } else {
      const missing = scan.requiredServices.filter(name => !dsh.services.includes(name))
      if (missing.length > 0) {
        issues.push({ id: 'services', message: `requires ${missing.join(', ')}, which DSH ${dsh.dshVersion} does not provide: it would wait for dependencies forever` })
      }
    }
  }
  if (scan.setupHints.length > 0 && !plugin.usage?.setup) {
    const where = scan.setupHints.map(hint => `${hint.file}:${hint.line}`).join(', ')
    issues.push({ id: 'setup', message: `its docs mention a setup step (${where}) but usage.setup is empty` })
  }
  const notes = plugin.review?.preflight ?? {}
  return issues.filter(issue => !notes[issue.id])
}
