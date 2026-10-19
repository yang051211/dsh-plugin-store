import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown, safeUrl, npmFileBase } from '../lib/test/safe.js'

const BASE = npmFileBase('dsh-chat-toc', '0.5.1')
const render = (source, base = BASE) => renderToStaticMarkup(createElement(Markdown, { source, base }))

test('npm file base points at the reviewed version on jsDelivr', () => {
  assert.equal(BASE, 'https://cdn.jsdelivr.net/npm/dsh-chat-toc@0.5.1/')
  assert.equal(npmFileBase('@scope/pkg', '1.0.0'), 'https://cdn.jsdelivr.net/npm/@scope/pkg@1.0.0/')
})

test('safeUrl keeps http(s), resolves relative paths, and refuses other schemes', () => {
  assert.equal(safeUrl('https://a.example/x', null), 'https://a.example/x')
  assert.equal(safeUrl('docs/a.png', BASE), 'https://cdn.jsdelivr.net/npm/dsh-chat-toc@0.5.1/docs/a.png')
  assert.equal(safeUrl('docs/a.png', null), null)
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd']) {
    assert.equal(safeUrl(bad, BASE), null, bad)
  }
})

test('raw html is dropped', () => {
  const html = render('Hello <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<div onclick="x()">block</div>')
  // Only our own wrapper div may appear; the raw <div onclick> block and its text must be gone.
  assert.equal(/<script|onerror|onclick|<div(?! class="ps-md")|>block</i.test(html), false, html)
  assert.match(html, /Hello/)
})

test('javascript links render as text', () => {
  const html = render('[click me](javascript:alert(1))')
  assert.equal(/href=/.test(html), false, html)
  assert.match(html, /click me/)
})

test('data images are dropped, keeping the alt text', () => {
  const html = render('![tracker](data:image/svg+xml;base64,PHN2Zz4=)')
  assert.equal(/<img/.test(html), false, html)
  assert.match(html, /tracker/)
})

test('relative images resolve to the npm cdn', () => {
  const html = render('![shot](docs/toc-pop.png?v=0.4.10)')
  assert.match(html, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/dsh-chat-toc@0\.5\.1\/docs\/toc-pop\.png\?v=0\.4\.10"/)
})

test('external images carry no-referrer and lazy loading', () => {
  const html = render('![badge](https://img.shields.io/npm/v/x)')
  assert.match(html, /referrerPolicy="no-referrer"|referrerpolicy="no-referrer"/i)
  assert.match(html, /loading="lazy"/)
})

test('links open in a new tab without opener', () => {
  const html = render('[repo](https://github.com/a/b)')
  assert.match(html, /href="https:\/\/github\.com\/a\/b"/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /rel="noopener noreferrer"/)
})

test('tables, lists and code blocks render', () => {
  const html = render('| a | b |\n|---|---|\n| 1 | 2 |\n\n- one\n- **two**\n\n```js\nconst x = 1 < 2\n```\n\n# Title')
  assert.match(html, /<table/)
  assert.match(html, /<td[^>]*>1<\/td>/)
  assert.match(html, /<li>one<\/li>/)
  assert.match(html, /<strong>two<\/strong>/)
  assert.match(html, /<pre[^>]*><code[^>]*>const x = 1 &lt; 2<\/code><\/pre>/)
  assert.match(html, /<h1[^>]*>Title<\/h1>/)
})
