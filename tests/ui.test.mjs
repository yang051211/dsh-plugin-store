import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalog } from '../lib/test/model.js'
import { Home, ListView, DetailView, InstallButton, ErrorBoundary, makeTranslate } from '../lib/test/ui.js'

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const zh = read('locale/zh.json').ui
const t = makeTranslate(key => zh[key] ?? key)
const index = read('market/index.json')
const detailOf = name => read(`market/plugins/${name}.json`)

function catalogWith(transform = doc => doc, compatibility = { 'dsh-chat-toc': 'compatible', 'dsh-context': 'compatible' }) {
  return buildCatalog({ index: transform(structuredClone(index)), indexUrl: 'https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json', stale: false, dshVersion: '0.2.1-rc.2', compatibility })
}
const noop = () => {}
const handlers = { onOpenPlugin: noop, onOpenList: noop, onSearch: noop, onInstallClick: noop, onBack: noop, onRetryDetail: noop }
const html = element => renderToStaticMarkup(element)

test('translate interpolates parameters', () => {
  assert.equal(t('reviewed', { date: '2026-10-19' }), '已审核 · 2026-10-19')
})

test('home shows banner, sections and categories', () => {
  // The banner rotates weekly, so check whichever entry this week picked.
  const catalog = catalogWith()
  const { title, gradient } = catalog.featured
  const out = html(createElement(Home, { catalog, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const text of ['本周精选', title.zh, '让界面更顺手', '看清 Agent 在做什么', '按分类浏览', '界面与体验', '工具与能力', '对话目录', '上下文洞察']) {
    assert.ok(out.includes(text), `missing ${text}`)
  }
  assert.ok(out.includes(`linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`))
})

test('home hides the banner without a featured plugin', () => {
  const catalog = catalogWith(doc => { doc.store.featured = null; delete doc.store.featuredRotation; return doc })
  const out = html(createElement(Home, { catalog, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.equal(out.includes('本周精选'), false)
  assert.ok(out.includes('让界面更顺手'))
})

test('list shows an empty state', () => {
  const out = html(createElement(ListView, { title: '搜索：zzz', plugins: [], installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.ok(out.includes('没有找到插件'))
})

test('detail shows all eight modules', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-context')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'ready', data: detailOf('dsh-context') }, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const text of ['上下文洞察', '看清 Agent 的上下文窗口', '已审核 · 2026-10-19', '兼容当前版本', '星标', '周下载', '数据截至', '截图', '能做什么', '需要的权限', '审核结论', '详细介绍', '更新日志', '版本', '来源']) {
    assert.ok(out.includes(text), `missing ${text}`)
  }
  assert.match(out, /<img[^>]+src="https:\/\/cdn\.jsdelivr\.net\/gh\/bowenliang123\/dsh-context@c22ccb203915\/docs\/context-dashboard\.png"/)
})

test('detail shows review verdict next to a disagreeing scan result', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-context')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'ready', data: detailOf('dsh-context') }, installed: new Map(), lang: 'zh', t, ...handlers }))
  // installScripts: the scan matched `prepare`, the reviewer concluded "no".
  assert.ok(out.includes('自动扫描有命中，审核人看过代码后判断为「否」'), out)
  assert.ok(out.includes('扫描结果来自自动扫描源码'))
})

test('detail degrades to index fields when the detail fails', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-chat-toc')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'error', error: 'HTTP 502' }, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const text of ['对话目录', '把对话右侧的消息刻度', '0.5.1', '安装', '详细信息读取失败', '重试']) assert.ok(out.includes(text), `missing ${text}`)
})

test('install button states', () => {
  const catalog = catalogWith(doc => doc, { 'dsh-chat-toc': 'compatible', 'dsh-context': 'incompatible' })
  const toc = catalog.byName.get('dsh-chat-toc')
  const ctx = catalog.byName.get('dsh-context')
  const button = (plugin, installed) => html(createElement(InstallButton, { plugin, installed, dshVersion: '0.2.1-rc.2', t, onClick: noop }))
  assert.match(button(toc, new Map()), />安装</)
  assert.match(button(toc, new Map([['dsh-chat-toc', { version: '0.5.1' }]])), />已安装</)
  assert.match(button(toc, new Map([['dsh-chat-toc', { version: '0.4.0' }]])), />有新版本</)
  const blocked = button(ctx, new Map())
  assert.match(blocked, /disabled/)
  assert.match(blocked, />不兼容</)
  assert.ok(blocked.includes('与当前的 0.2.1-rc.2 不兼容'))
})

test('install buttons are disabled while the installed list is unknown', () => {
  const plugin = catalogWith().byName.get('dsh-chat-toc')
  const out = html(createElement(InstallButton, { plugin, installed: null, dshVersion: '0.2.1-rc.2', t, onClick: noop }))
  assert.match(out, /disabled/)
})

test('the detail page states why a plugin is incompatible', () => {
  const catalog = catalogWith(doc => doc, { 'dsh-chat-toc': 'compatible', 'dsh-context': 'incompatible' })
  const plugin = catalog.byName.get('dsh-context')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'ready', data: detailOf('dsh-context') }, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.ok(out.includes('<p class="ps-reason">'), 'reason is visible text, not only a tooltip')
})

test('missing review date and features degrade gracefully', () => {
  const catalog = catalogWith(doc => { doc.plugins[0].store.review.date = ''; return doc })
  const plugin = catalog.byName.get('dsh-chat-toc')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'ready', data: { ...detailOf('dsh-chat-toc'), features: {} } }, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.equal(out.includes('已审核 · <'), false)
  assert.ok(out.includes('>已审核<'))
  assert.equal(out.includes('能做什么'), false)
})

test('related plugins wait for the detail document', () => {
  const catalog = catalogWith(doc => { doc.plugins[1].metadata.category = 'ui'; return doc })
  const plugin = catalog.byName.get('dsh-chat-toc')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'loading' }, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.equal(out.includes('同类插件'), false)
})

test('changelog empty state', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-chat-toc')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'ready', data: detailOf('dsh-chat-toc') }, installed: new Map(), lang: 'zh', t, initialTab: 'changelog', ...handlers }))
  assert.ok(out.includes('作者没有提供更新日志'))
})

test('error boundary shows retry instead of a blank area', () => {
  const boundary = new ErrorBoundary({ t, children: null })
  boundary.state = ErrorBoundary.getDerivedStateFromError(new Error('boom'))
  const out = html(boundary.render())
  assert.ok(out.includes('商城出了点问题'))
  assert.ok(out.includes('boom'))
  assert.ok(out.includes('重试'))
})
