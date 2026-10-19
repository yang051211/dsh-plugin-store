/**
 * Third-party Markdown (READMEs, changelogs) rendered as React elements from marked's tokens — never as an HTML
 * string. Raw HTML tokens are dropped, links and images pass through safeUrl, external links open without an
 * opener, and images load lazily without a referrer so a README cannot track who reads it.
 */
import { Fragment, useMemo, type ReactNode } from 'react'
import { marked, type Token, type Tokens } from 'marked'
import { safeUrl } from './urls.ts'

interface Context { base: string | null }

function inline(tokens: Token[] | undefined, ctx: Context): ReactNode[] {
  return (tokens ?? []).map((token, i) => <Fragment key={i}>{renderInline(token, ctx)}</Fragment>)
}

function renderInline(token: Token, ctx: Context): ReactNode {
  switch (token.type) {
    case 'text': {
      const t = token as Tokens.Text
      return t.tokens ? inline(t.tokens, ctx) : t.text
    }
    case 'escape': return (token as Tokens.Escape).text
    case 'strong': return <strong>{inline((token as Tokens.Strong).tokens, ctx)}</strong>
    case 'em': return <em>{inline((token as Tokens.Em).tokens, ctx)}</em>
    case 'del': return <del>{inline((token as Tokens.Del).tokens, ctx)}</del>
    case 'codespan': return <code className="ps-md-code">{(token as Tokens.Codespan).text}</code>
    case 'br': return <br />
    case 'link': {
      const t = token as Tokens.Link
      const href = safeUrl(t.href, ctx.base)
      const label = inline(t.tokens, ctx)
      return href ? <a href={href} target="_blank" rel="noopener noreferrer" title={t.title ?? undefined}>{label}</a> : <>{label}</>
    }
    case 'image': {
      const t = token as Tokens.Image
      const src = safeUrl(t.href, ctx.base)
      return src ? <img src={src} alt={t.text} title={t.title ?? undefined} referrerPolicy="no-referrer" loading="lazy" className="ps-md-img" /> : t.text
    }
    case 'html': return null
    default: return 'text' in token && typeof token.text === 'string' ? token.text : null
  }
}

function renderBlock(token: Token, ctx: Context): ReactNode {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading
      const Tag = `h${Math.min(Math.max(t.depth, 1), 6)}` as 'h1'
      return <Tag className="ps-md-h">{inline(t.tokens, ctx)}</Tag>
    }
    case 'paragraph': return <p>{inline((token as Tokens.Paragraph).tokens, ctx)}</p>
    case 'text': return <p>{renderInline(token, ctx)}</p>
    case 'blockquote': return <blockquote>{blocks((token as Tokens.Blockquote).tokens, ctx)}</blockquote>
    case 'code': {
      const t = token as Tokens.Code
      return <pre className="ps-md-pre"><code>{t.text}</code></pre>
    }
    case 'list': {
      const t = token as Tokens.List
      const items = t.items.map((item, i) => <li key={i}>{blocksOrInline(item.tokens, ctx)}</li>)
      return t.ordered ? <ol start={typeof t.start === 'number' && t.start !== 1 ? t.start : undefined}>{items}</ol> : <ul>{items}</ul>
    }
    case 'table': {
      const t = token as Tokens.Table
      return (
        <div className="ps-md-table">
          <table>
            <thead><tr>{t.header.map((cell, i) => <th key={i}>{inline(cell.tokens, ctx)}</th>)}</tr></thead>
            <tbody>{t.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{inline(cell.tokens, ctx)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    }
    case 'hr': return <hr />
    case 'html':
    case 'space':
    case 'def':
      return null
    default: return null
  }
}

/** List items hold block tokens in loose lists and inline-ish `text` tokens in tight ones. */
function blocksOrInline(tokens: Token[], ctx: Context): ReactNode {
  if (tokens.every(t => t.type === 'text')) return inline(tokens, ctx)
  return blocks(tokens, ctx)
}

function blocks(tokens: Token[], ctx: Context): ReactNode[] {
  return tokens.map((token, i) => <Fragment key={i}>{renderBlock(token, ctx)}</Fragment>)
}

/** Render untrusted Markdown. `base` resolves relative links and images; null drops them. */
export function Markdown({ source, base }: { source: string; base: string | null }): ReactNode {
  // A README can be megabytes; parse and build it only when the source or base changes.
  return useMemo(() => <div className="ps-md">{blocks(marked.lexer(source ?? '', { gfm: true }), { base })}</div>, [source, base])
}
