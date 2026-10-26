import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalog } from '../lib/test/model.js'
import { Home, ListView, DetailView, InstallButton, ErrorBoundary, makeTranslate, PluginCard, keywordsOf, initialsOf, ScenesView, SceneView, scenesOf, AboutView } from '../lib/test/ui.js'

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

test('home shows the directory header, the search and the trending and first two scene sections as cards', () => {
  const catalog = catalogWith()
  const out = html(createElement(Home, { catalog, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const text of [zh.homeTitle, zh.searchButton, zh.linkBrowseAll, zh.linkScenes, zh.linkRecommend, '本周热门', '新装必备', '长对话不迷路', '对话目录']) {
    assert.ok(out.includes(text), `missing ${text}`)
  }
  assert.ok(out.includes(t('homeIntro', { count: String(catalog.plugins.length) })))
  assert.ok(out.includes('class="ps-card"'))
  assert.equal(out.includes('精选插件商城'), false, 'renamed')
  assert.equal(out.includes('本周推荐'), false, 'no weekly pick any more')
})

test('home shows two scenes, at most four cards each, and no install buttons', () => {
  const catalog = catalogWith()
  const out = html(createElement(Home, { catalog, installed: new Map(), lang: 'zh', t, ...handlers }))
  const scenes = catalog.sections.filter(s => s.id !== 'hot')
  assert.equal(out.includes(scenes[2].title.zh + '</h2>'), false, 'the third scene waits on the scenes page')
  assert.equal(out.split('class="ps-section"').length - 1, 3)
  for (const block of out.split('class="ps-section"').slice(1)) assert.ok(block.split('class="ps-card"').length - 1 <= 4)
  assert.equal(out.includes(`>${zh.install}<`), false, 'installing happens on the plugin page')
})

test('a card shows the category and reviewed version, its chips, the pitch, stars and downloads', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-context')
  const card = html(createElement(PluginCard, { plugin, categoryTitle: '工具与能力', installed: new Map(), dshVersion: null, lang: 'zh', t, ...handlers }))
  for (const text of [`#${plugin.category}`, `v${plugin.review.version}`, '工具与能力', plugin.tagline.zh, '☆', '↓', zh.cardView]) assert.ok(card.includes(text), `missing ${text}`)
  for (const word of keywordsOf(plugin)) assert.ok(card.includes(`>${word}<`))
})

test('a card says when its plugin is installed', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-context')
  const card = html(createElement(PluginCard, { plugin, categoryTitle: 'x', installed: new Map([['dsh-context', { version: plugin.version }]]), dshVersion: null, lang: 'zh', t, ...handlers }))
  assert.ok(card.includes('ps-card-done'))
  assert.ok(card.includes(zh.installed))
})

test('card keywords leave out generic ecosystem words and keep three at most', () => {
  const plugin = { keywords: ['dsh', 'plugin', 'deepseek-harness', 'agent', 'chat', 'toc', 'outline', 'conversation'] }
  assert.deepEqual(keywordsOf(plugin), ['chat', 'toc', 'outline'])
})

test('a plugin without an icon gets its initials on a soft tile', () => {
  assert.equal(initialsOf('dsh-chat-toc'), 'CT')
  assert.equal(initialsOf('@tencent-connect/dsh-qqbot'), 'QQ')
  assert.equal(initialsOf('dsh-plugin-memory'), 'ME')
  const catalog = catalogWith(doc => { delete doc.plugins.find(p => p.name === 'dsh-chat-toc').icon; return doc })
  const card = html(createElement(PluginCard, { plugin: catalog.byName.get('dsh-chat-toc'), categoryTitle: 'x', installed: new Map(), dshVersion: null, lang: 'zh', t, ...handlers }))
  assert.ok(card.includes('ps-icon-letters'))
  assert.ok(card.includes('>CT<'))
})

test('the list has a category sidebar with counts and marks the open category', () => {
  const catalog = catalogWith()
  const category = catalog.categories[0]
  const out = html(createElement(ListView, { title: category.title.zh, plugins: category.plugins, catalog, filter: { kind: 'category', id: category.id }, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const c of catalog.categories) assert.ok(out.includes(`${c.title.zh}<i>${c.plugins.length}</i>`), c.id)
  assert.ok(out.includes(`${zh.allPlugins}<i>${catalog.plugins.length}</i>`))
  assert.equal(out.split('ps-side-on').length - 1, 1)
  assert.ok(out.includes(`${category.plugins.length} / ${catalog.plugins.length}`))
  assert.equal(out.split('class="ps-card"').length - 1, category.plugins.length)
})

test('list shows an empty state', () => {
  const catalog = catalogWith()
  const out = html(createElement(ListView, { title: '搜索：zzz', plugins: [], catalog, filter: { kind: 'search', query: 'zzz' }, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.ok(out.includes('没有找到插件'))
  assert.ok(out.includes('value="zzz"'), 'the search field keeps the query')
  assert.equal(out.includes('ps-side-on'), false, 'no category is open on a search')
})

test('the scenes page lists every curated scene with its note and count, not trending', () => {
  const catalog = catalogWith()
  const out = html(createElement(ScenesView, { catalog, lang: 'zh', t, onOpenScene: noop }))
  const scenes = scenesOf(catalog)
  assert.equal(scenes.some(s => s.id === 'hot'), false)
  assert.equal(out.split('class="ps-scene"').length - 1, scenes.length)
  for (const scene of scenes) {
    assert.ok(out.includes(scene.title.zh), scene.id)
    assert.ok(out.includes(t('scenePlugins', { count: String(scene.plugins.length) })), scene.id)
    if (scene.description) assert.ok(out.includes(scene.description.zh), scene.id)
  }
})

test('a scene page shows its description and every plugin in it', () => {
  const catalog = catalogWith()
  const scene = scenesOf(catalog)[0]
  const out = html(createElement(SceneView, { scene, catalog, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.ok(out.includes(scene.title.zh))
  assert.ok(out.includes(scene.description.zh))
  assert.ok(out.includes(t('sceneCount', { count: String(scene.plugins.length) })))
  assert.equal(out.split('class="ps-card"').length - 1, scene.plugins.length)
})

test('the about page answers every question and links to recommending a plugin', () => {
  const out = html(createElement(AboutView, { t }))
  for (const q of ['faqWhat', 'faqVsDiscover', 'faqHowInstall', 'faqWhereIsIt', 'faqWhyOld', 'faqReviewWhat', 'faqNetwork']) {
    assert.ok(out.includes(zh[q]), q)
    assert.ok(out.includes(zh[`${q}A`].slice(0, 20)), `${q}A`)
  }
  assert.ok(out.includes('https://github.com/yang051211/dsh-plugin-store/issues'))
})

test('the detail install panel has the primary install button, the package spec to copy and the GitHub link', () => {
  const catalog = catalogWith()
  const plugin = catalog.byName.get('dsh-chat-toc')
  const out = html(createElement(DetailView, { plugin, catalog, detail: { status: 'ready', data: detailOf('dsh-chat-toc') }, installed: new Map(), lang: 'zh', t, ...handlers }))
  const panel = out.slice(out.indexOf('class="ps-detail-side"'))
  assert.ok(panel.includes('ps-btn-primary'))
  assert.ok(panel.includes(`<code>dsh-chat-toc@${plugin.version}</code>`))
  assert.ok(panel.includes(zh.copy))
  assert.ok(panel.includes('href="https://github.com/a792883583/dsh-chat-toc"'))
  assert.ok(panel.includes(t('reviewedVersionDot', { version: plugin.review.version })))
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

const withUsage = (name, usage) => catalogWith(doc => { doc.plugins.find(p => p.name === name).store.usage = usage; return doc })

test('detail shows how to use the plugin once installed, before the detail loads', () => {
  const catalog = withUsage('dsh-chat-toc', { where: { zh: '对话右侧的消息刻度' }, try: { zh: '把鼠标移到刻度上' } })
  const out = html(createElement(DetailView, { plugin: catalog.byName.get('dsh-chat-toc'), catalog, detail: { status: 'loading' }, installed: new Map(), lang: 'zh', t, ...handlers }))
  for (const text of ['装完怎么用', '对话右侧的消息刻度', '把鼠标移到刻度上']) assert.ok(out.includes(text), `missing ${text}`)
  assert.equal(out.includes('ps-usage-setup'), false, 'no setup step, no warning')
})

test('detail warns about a setup step the plugin needs after install', () => {
  const catalog = withUsage('dsh-chat-toc', { where: { zh: '对话里' }, try: { zh: '问一句' }, setup: { zh: '先运行一次安装脚本' } })
  const out = html(createElement(DetailView, { plugin: catalog.byName.get('dsh-chat-toc'), catalog, detail: { status: 'loading' }, installed: new Map(), lang: 'zh', t, ...handlers }))
  assert.match(out, /class="[^"]*ps-usage-setup[^"]*"/)
  assert.ok(out.includes('还差一步') && out.includes('先运行一次安装脚本'))
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
  assert.ok(out.includes('生态家园出了点问题'))
  assert.ok(out.includes('boom'))
  assert.ok(out.includes('重试'))
})
