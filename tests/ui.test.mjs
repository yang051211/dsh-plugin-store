import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalog } from '../lib/test/model.js'
import { Home, ListView, DetailView, AboutView, ConfirmInstall, InstallButton, PluginCard, ErrorBoundary, makeTranslate, initialsOf, keywordsOf } from '../lib/test/ui.js'

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const zh = read('locale/zh.json').ui
const en = read('locale/en.json').ui
const t = makeTranslate(key => zh[key] ?? key)
const fixture = () => read('tests/fixtures/directory/index.json')
const detailOf = name => read(`tests/fixtures/directory/plugins/${name.replace('@', '').replace('/', '__')}.json`)

function catalogWith(transform = doc => doc, compatibility = { 'dsh-qq-bridge': 'incompatible' }) {
  return buildCatalog({ index: transform(fixture()), indexUrl: 'https://cdn.example/gh/o/r@main/market/index.json', stale: false, dshVersion: '0.2.1-rc.2', compatibility })
}
/** The fixture grown to `n` plugins, for paging. */
const manyPlugins = n => catalogWith(doc => {
  const base = doc.plugins[0]
  doc.plugins = Array.from({ length: n }, (_, i) => ({ ...structuredClone(base), name: `dsh-p${String(i).padStart(2, '0')}`, title: `P${i}` }))
  return doc
}, {})
const noop = () => {}
const handlers = { onOpenPlugin: noop, onOpenList: noop, onSearch: noop, onInstallClick: noop, onBack: noop, onRetryDetail: noop, onRetryReadme: noop, onChange: noop }
const html = element => renderToStaticMarkup(element)
const cardsIn = out => (out.match(/class="ps-card"/g) ?? []).length
const ready = name => ({ status: 'ready', data: detailOf(name) })
const detail = (name, extra = {}) => {
  const catalog = catalogWith()
  return html(createElement(DetailView, { plugin: catalog.byName.get(name), catalog, detail: ready(name), readme: { status: 'ready', data: { markdown: '# Hello', base: 'https://cdn.jsdelivr.net/npm/x@1.0.0/' } }, installed: new Map(), lang: 'zh', t, ...handlers, ...extra }))
}
/** Words that would claim a review the directory does not do. */
const REVIEW_CLAIMS = ['审过', '已审核', '人工', '审核结论', '审核人', '读过源码', 'reviewed']

test('translate interpolates parameters', () => {
  assert.equal(t('pageOf', { page: '2', pages: '5' }), '第 2 / 5 页')
})

test('home: header with the plugin count and the search, then trending, recently updated and new, eight cards at most', () => {
  const catalog = catalogWith()
  const out = html(createElement(Home, { catalog, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const text of [zh.homeTitle, t('homeIntro', { count: '8' }), zh.searchButton, zh.sectionPopular, zh.sectionUpdated, zh.sectionNew]) assert.ok(out.includes(text), `missing ${text}`)
  const sections = out.split('class="ps-section"').slice(1)
  assert.equal(sections.length, 3)
  for (const block of sections) assert.ok(cardsIn(block) <= 8)
  assert.ok(sections[0].indexOf('dsh-context') < sections[0].indexOf('dsh-pet'), 'trending is by weekly downloads')
  assert.ok(sections[2].indexOf('dsh-qq-bridge') < sections[2].indexOf('dsh-pet'), 'new is by first publish')
})

test('a card shows category, version, keywords, the description, stars and downloads, and whether it is installed', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-context')
  const card = installed => html(createElement(PluginCard, { plugin, categoryTitle: '记忆与上下文', installed, dshVersion: null, lang: 'zh', t, ...handlers }))
  const out = card(new Map())
  for (const text of ['#memory', 'v1.0.0', '记忆与上下文', 'See what fills the context window', '☆', '↓', '42k', zh.cardView]) assert.ok(out.includes(text), `missing ${text}`)
  for (const word of keywordsOf(plugin)) assert.ok(out.includes(`>${word}<`))
  assert.ok(card(new Map([['dsh-context', { version: '1.0.0' }]])).includes('ps-card-done'))
})

test('a plugin without an icon gets its initials', () => {
  assert.equal(initialsOf('dsh-chat-toc'), 'CT')
  assert.equal(initialsOf('@ann/dsh-theme-night'), 'TN')
  const out = html(createElement(PluginCard, { plugin: catalogWith().byName.get('dsh-pet'), categoryTitle: 'x', installed: new Map(), dshVersion: null, lang: 'zh', t, ...handlers }))
  assert.ok(out.includes('ps-icon-letters'))
})

const list = (catalog, extra = {}) => html(createElement(ListView, { catalog, plugins: catalog.plugins, filter: { kind: 'all' }, sort: 'popular', page: 1, compatibleOnly: false, installed: new Map(), lang: 'zh', t, ...handlers, ...extra }))

test('the list has a category sidebar with counts, including "other", and marks the open category', () => {
  const catalog = catalogWith()
  const ui = catalog.categories.find(c => c.id === 'ui')
  const out = list(catalog, { plugins: ui.plugins, filter: { kind: 'category', id: 'ui' } })
  for (const c of catalog.categories) assert.ok(out.includes(`<i>${c.plugins.length}</i>`), c.id)
  assert.ok(out.includes('其他'))
  assert.equal((out.match(/ps-side-on/g) ?? []).length, 1)
  assert.equal(cardsIn(out), ui.plugins.length)
})

test('the list is sorted by the chosen key', () => {
  const catalog = catalogWith()
  const order = sort => { const out = list(catalog, { sort }); return ['dsh-context', 'dsh-qq-bridge', 'dsh-pet'].sort((a, b) => out.indexOf(`>${a}<`) - out.indexOf(`>${b}<`)) }
  assert.deepEqual(order('popular'), ['dsh-context', 'dsh-pet', 'dsh-qq-bridge'])
  assert.deepEqual(order('new'), ['dsh-qq-bridge', 'dsh-pet', 'dsh-context'])
  const select = list(catalog)
  for (const key of ['sortPopular', 'sortUpdated', 'sortNew', 'sortStars']) assert.ok(select.includes(zh[key]), key)
})

test('the list pages 30 at a time and says where it is', () => {
  const catalog = manyPlugins(65)
  const first = list(catalog, { page: 1 })
  assert.equal(cardsIn(first), 30)
  assert.ok(first.includes(t('pageOf', { page: '1', pages: '3' })))
  const last = list(catalog, { page: 3 })
  assert.equal(cardsIn(last), 5)
  assert.ok(last.includes('65 / 65'))
  assert.match(first, /<button[^>]*disabled=""[^>]*>[^<]*上一页/)
})

test('"compatible only" hides plugins that cannot run on this DSH', () => {
  const catalog = catalogWith()
  assert.ok(list(catalog).includes('>dsh-qq-bridge<'))
  assert.equal(list(catalog, { compatibleOnly: true }).includes('>dsh-qq-bridge<'), false)
})

test('list shows an empty state and keeps the query in the search field', () => {
  const out = list(catalogWith(), { plugins: [], filter: { kind: 'search', query: 'zzz' } })
  assert.ok(out.includes(zh.empty))
  assert.ok(out.includes('value="zzz"'))
})

test('detail: hero, stats, install panel with the spec to copy and the source link', () => {
  const out = detail('dsh-context')
  for (const text of ['Context', 'See what fills the context window', '42k', 'v1.0.0', zh.panelInstall, '<code>dsh-context@1.0.0</code>', 'href="https://github.com/ann/dsh-context"']) assert.ok(out.includes(text), `missing ${text}`)
  assert.ok(out.includes('ps-btn-primary'))
})

test('detail: automatic detection lists what was found, with the note that it is not a review', () => {
  const out = detail('dsh-context')
  assert.ok(out.includes(zh.detection))
  assert.ok(out.includes(zh.detectionNote))
  assert.match(out, new RegExp(`${zh.permNetwork}</td><td class="ps-perm-yes">${zh.yes}`))
  assert.match(out, new RegExp(`${zh.permChildProcess}</td><td class="ps-perm-no">${zh.no}`))
})

test('detail: a plugin whose latest version is not scanned yet says so', () => {
  const out = detail('dsh-ssh-ops')
  assert.ok(out.includes(zh.notScanned))
  assert.equal(out.includes('ps-perm-yes'), false)
})

test('detail: the README shows its loading, failure, empty and ready states', () => {
  const states = {
    loading: { status: 'loading' },
    error: { status: 'error', error: 'HTTP 502' },
    empty: { status: 'ready', data: { markdown: '', base: 'https://x/' } },
    ready: { status: 'ready', data: { markdown: '# Hello there', base: 'https://x/' } },
  }
  assert.ok(detail('dsh-pet', { readme: states.loading }).includes(zh.loading))
  const failed = detail('dsh-pet', { readme: states.error })
  assert.ok(failed.includes(zh.readmeFailed) && failed.includes(zh.retry))
  assert.ok(detail('dsh-pet', { readme: states.empty }).includes(zh.noReadme))
  assert.ok(detail('dsh-pet', { readme: states.ready }).includes('Hello there</h1>'))
})

test('detail: versions come from the detail document, and similar plugins share the category', () => {
  const versions = detail('dsh-chat-toc', { initialTab: 'versions' })
  assert.ok(versions.includes('0.9.0'))
  const out = detail('dsh-chat-toc')
  assert.ok(out.includes(zh.related))
  assert.ok(out.includes('>@ann/dsh-theme-night<'), 'the other ui plugin')
})

test('the detail page states why a plugin is incompatible', () => {
  assert.ok(detail('dsh-qq-bridge').includes('<p class="ps-reason">'))
})

test('the about page answers each question and says the directory is not reviewed', () => {
  const out = html(createElement(AboutView, { t }))
  for (const q of ['faqWhat', 'faqVsDiscover', 'faqWhatListed', 'faqHowOften', 'faqDetectWhat', 'faqDetectWrong', 'faqHowInstall', 'faqReport']) {
    assert.ok(out.includes(zh[q]), q)
    assert.ok(out.includes(zh[`${q}A`].slice(0, 16)), `${q}A`)
  }
  assert.ok(out.includes('未经审核'))
})

test('the install confirmation says the plugin is not reviewed', () => {
  const plugin = catalogWith().byName.get('dsh-pet')
  const out = html(createElement(ConfirmInstall, { plugin, lang: 'zh', t, onCancel: noop, onConfirm: noop }))
  assert.ok(out.includes('未经审核'))
  assert.ok(out.includes('v1.0.0'))
})

test('no page claims a review', () => {
  const catalog = catalogWith()
  const pages = [
    html(createElement(Home, { catalog, installed: new Map(), lang: 'zh', t, ...handlers })),
    list(catalog),
    detail('dsh-context'),
    detail('dsh-ssh-ops'),
    html(createElement(AboutView, { t })),
    html(createElement(ConfirmInstall, { plugin: catalog.byName.get('dsh-pet'), lang: 'zh', t, onCancel: noop, onConfirm: noop })),
  ]
  for (const out of pages) for (const word of REVIEW_CLAIMS) assert.equal(out.includes(word), false, `${word} in ${out.slice(0, 60)}`)
})

test('install button states', () => {
  const catalog = catalogWith()
  const pet = catalog.byName.get('dsh-pet')
  const qq = catalog.byName.get('dsh-qq-bridge')
  const button = (plugin, installed) => html(createElement(InstallButton, { plugin, installed, dshVersion: '0.2.1-rc.2', t, onClick: noop }))
  assert.match(button(pet, new Map()), />安装</)
  assert.match(button(pet, new Map([['dsh-pet', { version: '1.0.0' }]])), />已安装</)
  assert.match(button(pet, new Map([['dsh-pet', { version: '0.9.0' }]])), />有新版本</)
  const blocked = button(qq, new Map())
  assert.match(blocked, /disabled/)
  assert.match(blocked, />不兼容</)
  assert.match(button(pet, null), /disabled/, 'disabled while the installed list is unknown')
})

test('error boundary shows retry instead of a blank area', () => {
  const boundary = new ErrorBoundary({ t, children: null })
  boundary.state = ErrorBoundary.getDerivedStateFromError(new Error('boom'))
  const out = html(boundary.render())
  assert.ok(out.includes('生态家园出了点问题') && out.includes('boom') && out.includes('重试'))
})

test('every translation key the client uses exists in both languages, and the languages match', () => {
  const dir = new URL('../src/client/', import.meta.url)
  const used = new Set()
  const walk = url => {
    for (const entry of readdirSync(url, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(new URL(`${entry.name}/`, url))
      else if (/\.tsx?$/.test(entry.name)) for (const m of readFileSync(new URL(entry.name, url), 'utf8').matchAll(/\bt\(\s*'([A-Za-z]+)'/g)) used.add(m[1])
    }
  }
  walk(dir)
  for (const key of used) {
    assert.ok(key in zh, `zh is missing ${key}`)
    assert.ok(key in en, `en is missing ${key}`)
  }
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const [key, value] of Object.entries(zh)) for (const word of ['审过', '已审核', '人工', '审核结论', '读过源码']) assert.equal(value.includes(word), false, `zh.${key}`)
})
