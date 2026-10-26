/**
 * Upstream update tracking: for every listed plugin whose npm `latest` is newer than the reviewed version, compare the
 * new version against the reviewed one and say whether it is a quick review or needs a closer look. Nothing here
 * approves anything: the report is for the reviewer, who still edits catalog.yaml by hand.
 */

/** The marker that identifies the tracking issue, so the workflow updates one issue instead of opening many. */
export const ISSUE_MARKER = '<!-- dsh-plugin-store:upstream-updates -->'

const KINDS = ['network', 'fileSystem', 'agentTools', 'childProcess', 'installScripts']
const KIND_LABELS = { network: '联网', fileSystem: '读写文件', agentTools: '给 Agent 注册工具', childProcess: '执行命令', installScripts: '安装脚本' }
/** New evidence of these in a new place is worth reading; new file-system or tool evidence is only noted. */
const ESCALATE_EVIDENCE = new Set(['network', 'childProcess', 'installScripts'])

/** Evidence identity without line numbers, which move on every edit. */
const evidenceKeys = finding => new Set((finding?.evidence ?? []).map(e => `${e.file}\u0000${String(e.text ?? '').trim()}`))
const filesOf = finding => new Set((finding?.evidence ?? []).map(e => e.file))

/**
 * What changed between the reviewed version's scan and the new version's scan. `files` (compareFiles) lets an install
 * script that kept its command still be flagged when a file it runs changed.
 * @returns `{ verdict: 'quick' | 'look', changes: Array<{ kind, detail, escalate }> }`
 */
export function compareScans(reviewed, latest, files = null) {
  const changes = []
  const add = (kind, detail, escalate) => changes.push({ kind, detail, escalate })
  for (const kind of KINDS) {
    const before = reviewed?.[kind], after = latest?.[kind]
    if (after?.hit && !before?.hit) { add('new-permission', `新增：${KIND_LABELS[kind]}（${kind}）`, true); continue }
    if (!after?.hit) continue
    if (kind === 'installScripts') { installScriptChange(before, after, files, add); continue }
    const oldKeys = evidenceKeys(before)
    const fresh = (after.evidence ?? []).filter(e => !oldKeys.has(`${e.file}\u0000${String(e.text ?? '').trim()}`))
    const newFiles = [...new Set(fresh.map(e => e.file))].filter(file => !filesOf(before).has(file))
    if (newFiles.length > 0) add('new-evidence', `${KIND_LABELS[kind]}出现在新文件：${newFiles.slice(0, 4).join('、')}${newFiles.length > 4 ? ` 等 ${newFiles.length} 个` : ''}`, ESCALATE_EVIDENCE.has(kind))
  }
  const newBinaries = (latest?.binaryFiles ?? []).filter(f => !(reviewed?.binaryFiles ?? []).includes(f))
  if (newBinaries.length > 0) add('binaries', `新增预编译文件：${newBinaries.join('、')}`, true)
  const depDelta = (latest?.dependencies ?? 0) - (reviewed?.dependencies ?? 0)
  if (depDelta > 0) add('dependencies', `依赖 ${reviewed?.dependencies ?? 0} → ${latest?.dependencies ?? 0}`, true)
  else if (depDelta < 0) add('dependencies', `依赖减少 ${reviewed?.dependencies ?? 0} → ${latest?.dependencies ?? 0}`, false)
  const newServices = (latest?.requiredServices ?? []).filter(s => !(reviewed?.requiredServices ?? []).includes(s))
  if (newServices.length > 0) add('services', `新依赖宿主服务：${newServices.join('、')}（看 DSH 有没有）`, true)
  const oldHints = new Set((reviewed?.setupHints ?? []).map(h => `${h.file}\u0000${h.text}`))
  const newHints = (latest?.setupHints ?? []).filter(h => !oldHints.has(`${h.file}\u0000${h.text}`))
  if (newHints.length > 0) add('setup', `新的安装前置提示：${newHints.slice(0, 2).map(h => `${h.file}:${h.line}`).join('、')}（可能要补 usage.setup）`, true)
  const newMinified = (latest?.minifiedFiles ?? []).filter(f => !(reviewed?.minifiedFiles ?? []).includes(f))
  if (newMinified.length > 0) add('minified', `新增压缩文件：${newMinified.join('、')}`, false)
  return { verdict: changes.some(c => c.escalate) ? 'look' : 'quick', changes }
}

/** Paths an install-script command runs, such as `scripts/setup.js` in `scripts.postinstall: node scripts/setup.js`. */
const scriptPaths = text => (String(text).split(':').slice(1).join(':').match(/[\w.@-]+(?:\/[\w.@-]+)*\.(?:[cm]?js|ts|sh|ps1|cmd|bat|py)\b/g) ?? []).map(path => path.replace(/^\.\//, ''))

/** An install script kept from the reviewed version is only noted, unless its command or a file it runs changed. */
function installScriptChange(before, after, files, add) {
  const oldTexts = new Set((before?.evidence ?? []).map(e => String(e.text ?? '').trim()))
  const edited = (after.evidence ?? []).map(e => String(e.text ?? '').trim()).filter(text => !oldTexts.has(text))
  if (edited.length > 0) return add('install-scripts', `安装脚本改了：${edited.slice(0, 2).join('；')}`, true)
  const touched = new Set([...(files?.changed ?? []), ...(files?.added ?? [])])
  const runs = [...new Set((after.evidence ?? []).flatMap(e => scriptPaths(e.text)))].filter(path => touched.has(path))
  if (runs.length > 0) return add('install-scripts', `安装脚本调用的文件改了：${runs.join('、')}`, true)
  // Without the file diff there is no telling whether the scripts it runs changed.
  add('install-scripts', files ? '安装脚本与已审版本相同' : '仍有安装脚本，看一下内容有没有变', !files)
}

/** Added, removed and changed paths between two unpacked packages, and how many bytes the changed and added ones hold. */
export function compareFiles(before, after) {
  const added = [], removed = [], changed = []
  let changedBytes = 0
  for (const [path, body] of after) {
    const old = before.get(path)
    if (!old) { added.push(path); changedBytes += body.length } else if (!old.equals(body)) { changed.push(path); changedBytes += body.length }
  }
  for (const path of before.keys()) if (!after.has(path)) removed.push(path)
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort(), changedBytes }
}

const CODE = /\.(?:[cm]?js|ts|sh|ps1|cmd|bat|py)$/i
/** Installing or updating packages from inside the plugin, or skipping pnpm's release-age guard (the dsh-ssh-ops 0.4 case). */
// Only command shapes count: a string that starts with the command, or the manager's name as its own string next to an
// install argument. Prose such as "published to npm — install it by package name" does not.
const SELF_UPDATE = /["'`](?:pnpm|npm|yarn)(?:\.cmd)?\s+(?:add|install|i|update|up)\b|["'`](?:pnpm|npm|yarn)(?:\.cmd)?["'`][^\n]*["'`](?:add|install|i|update|up)["'`]|["'`]dsh\s+plugin\s+add|minimumReleaseAge|registry\.npmjs\.org\/[^\s'"]+\/-\//

/** Code lines in the new version that look like self-installation and do not appear in the reviewed version. */
export function selfUpdateLines(before, after) {
  const seen = new Set()
  for (const [path, body] of before) if (CODE.test(path)) for (const line of body.toString('utf8').split('\n')) if (SELF_UPDATE.test(line)) seen.add(line.trim())
  const found = []
  for (const [path, body] of after) {
    if (!CODE.test(path)) continue
    body.toString('utf8').split('\n').forEach((line, i) => {
      if (SELF_UPDATE.test(line) && !seen.has(line.trim())) found.push({ file: path, line: i + 1, text: line.trim().slice(0, 160) })
    })
  }
  return found
}

const kb = n => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const npmLink = (name, version) => `https://www.npmjs.com/package/${name}/v/${version}`

function itemLines(item) {
  const head = `- **${item.name}** ${item.reviewed} → ${item.latest} · [npm](${npmLink(item.name, item.latest)})`
  if (item.error) return [head, `  - 没能比对：${item.error}`]
  const f = item.files
  const lines = [head, `  - 改动：新增 ${f.added.length} 个文件、删除 ${f.removed.length} 个、修改 ${f.changed.length} 个，约 ${kb(f.changedBytes)}`]
  for (const c of item.changes) lines.push(`  - ${c.escalate ? '⚠ ' : ''}${c.detail}`)
  for (const s of item.selfUpdate.slice(0, 3)) lines.push(`  - ⚠ 疑似自我安装：\`${s.file}:${s.line}\` ${s.text.replace(/`/g, "'")}`)
  return lines
}

/** The tracking issue's body. */
export function updatesReport(items, date) {
  const look = items.filter(i => !i.error && (i.verdict === 'look' || i.selfUpdate?.length > 0))
  const quick = items.filter(i => !i.error && i.verdict === 'quick' && !(i.selfUpdate?.length > 0))
  const failed = items.filter(i => i.error)
  const lines = [ISSUE_MARKER, '', `${date} 检查：${items.length > 0 ? `${items.length} 个插件` + '有比已审版本更新的上游版本。' : '没有待审的新版本。'}`, '']
  if (items.length > 0) lines.push('自动比对只看扫描结果和文件差异，**不会自动上架**。审过以后改 `catalog/catalog.yaml` 里的 `review.version`，跑 `catalog:fetch` / `build` / `check` 再推送。', '')
  if (look.length > 0) lines.push(`## 需细看（${look.length}）`, '', ...look.flatMap(itemLines), '')
  if (quick.length > 0) lines.push(`## 可快速通过（${quick.length}）`, '', '权限、依赖、预编译文件、宿主服务都没有新增，读一眼更新日志即可。', '', ...quick.flatMap(itemLines), '')
  if (failed.length > 0) lines.push(`## 没能比对（${failed.length}）`, '', ...failed.flatMap(itemLines), '')
  return lines.join('\n')
}
