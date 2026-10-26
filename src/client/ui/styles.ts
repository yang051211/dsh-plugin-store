/**
 * The store's stylesheet, injected once per page. Every class is prefixed `ps-`; colors and radii come from DSH's
 * `--dsw-*` tokens (with fallbacks), so light and dark themes both follow the host.
 */
const C = {
  text: 'var(--dsw-alias-label-primary, #1f2328)',
  text2: 'var(--dsw-alias-label-secondary, #57606a)',
  text3: 'var(--dsw-alias-label-tertiary, #8b949e)',
  bg1: 'var(--dsw-alias-bg-layer-1, #ffffff)',
  bg2: 'var(--dsw-alias-bg-layer-2, #f6f8fa)',
  border: 'var(--dsw-alias-border-l2, #d0d7de)',
  borderSoft: 'var(--dsw-alias-border-l1, #eaeef2)',
  hover: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.08))',
  brand: 'var(--dsw-alias-brand-primary, #4d6bfe)',
  onBrand: 'var(--dsw-alias-label-primary-foreground, #ffffff)',
  link: 'var(--dsw-alias-link, #4d6bfe)',
  ok: 'var(--dsw-alias-state-success-primary, #1a7f37)',
  warn: 'var(--dsw-alias-state-warn-primary, #b45309)',
  warnBg: 'var(--dsw-alias-state-warn-tertiary, rgba(245,158,11,.12))',
  error: 'var(--dsw-alias-state-error-primary, #cf222e)',
  rSm: 'var(--dsw-radius-sm, 6px)',
  rMd: 'var(--dsw-radius-md, 8px)',
  rLg: 'var(--dsw-radius-lg, 12px)',
  rXl: 'var(--dsw-radius-xl, 16px)',
}

export const STYLE_TEXT = `
.ps-root { color: ${C.text}; font-size: 14px; line-height: 1.55; height: 100%; overflow: auto; box-sizing: border-box; padding: 20px 28px 40px; container-type: inline-size; }
.ps-root *, .ps-root *::before, .ps-root *::after { box-sizing: border-box; }
.ps-mode-tab { padding: 8px 0 32px; height: auto; overflow: visible; }
.ps-muted { color: ${C.text3}; }
.ps-pad { padding: 24px 0; }
.ps-fine { color: ${C.text3}; font-size: 12px; margin: 8px 0 0; }
.ps-btn { border: 1px solid ${C.border}; background: transparent; color: ${C.text}; border-radius: ${C.rMd}; padding: 4px 14px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.ps-btn:hover:not(:disabled) { background: ${C.hover}; }
.ps-btn:disabled { opacity: .55; cursor: not-allowed; }
.ps-btn-primary { background: ${C.brand}; border-color: ${C.brand}; color: ${C.onBrand}; }
.ps-btn-primary:hover:not(:disabled) { background: ${C.brand}; filter: brightness(1.08); }
.ps-btn-large { padding: 8px 26px; font-size: 14px; font-weight: 600; }
.ps-link-btn { border: 0; background: none; color: ${C.link}; cursor: pointer; padding: 0; font-size: 13px; }
.ps-back { margin-bottom: 12px; }
.ps-toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.ps-search-icon { color: ${C.text3}; }
.ps-section { margin-bottom: 28px; }
.ps-icon { flex: none; object-fit: contain; }
.ps-store-title { font-size: 22px; margin: 0; flex: 1; letter-spacing: .01em; }
.ps-search { display: flex; align-items: center; gap: 8px; border: 0; border-bottom: 1px solid ${C.border}; padding: 6px 2px; min-width: 260px; background: transparent; }
.ps-search:focus-within { border-bottom-color: ${C.brand}; }
.ps-search input { border: 0; outline: none; background: transparent; color: ${C.text}; font-size: 14px; flex: 1; min-width: 0; }
.ps-cats { display: flex; flex-wrap: wrap; gap: 4px 22px; border-bottom: 1px solid ${C.borderSoft}; padding-bottom: 10px; margin-bottom: 24px; }
.ps-cat { border: 0; background: none; padding: 2px 0; color: ${C.text2}; font-size: 14px; cursor: pointer; }
.ps-cat:hover { color: ${C.text}; }
.ps-cat i { font-style: normal; color: ${C.text3}; font-variant-numeric: tabular-nums; margin-left: 2px; }
.ps-pick { display: grid; grid-template-columns: 7em minmax(0, 1fr); gap: 18px; margin-bottom: 30px; }
.ps-pick-label { color: ${C.text3}; font-size: 13px; padding-top: 4px; }
.ps-pick-body { display: flex; gap: 18px; align-items: flex-start; min-width: 0; }
.ps-pick-text { display: grid; gap: 6px; min-width: 0; }
.ps-pick-title { font-size: 19px; font-weight: 600; }
.ps-pick-why { margin: 0; max-width: 64ch; }
.ps-pick-actions { display: flex; gap: 16px; align-items: center; padding-top: 6px; }
@container (max-width: 560px) { .ps-pick { grid-template-columns: 1fr; gap: 6px; } .ps-pick-body { flex-direction: column; } }
.ps-section-head { display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid ${C.borderSoft}; padding-bottom: 8px; }
.ps-section-head h3, .ps-block h3 { font-size: 15px; margin: 0; }
.ps-block h3 { margin-bottom: 8px; }
.ps-section-note { color: ${C.text3}; font-size: 12px; }
.ps-more { margin-left: auto; }
.ps-rows { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; column-gap: 36px; }
@container (min-width: 760px) { .ps-rows { grid-template-columns: 1fr 1fr; } }
.ps-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 14px 4px; border-bottom: 1px solid ${C.borderSoft}; cursor: pointer; border-radius: ${C.rSm}; }
.ps-row:hover { background: ${C.hover}; }
.ps-row:focus-visible, .ps-cat:focus-visible, .ps-btn:focus-visible, .ps-link-btn:focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }
.ps-row-main { min-width: 0; }
.ps-row-head { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.ps-row-title { font-weight: 600; font-size: 15px; white-space: nowrap; }
.ps-row-name { color: ${C.text3}; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-row-pitch { margin: 2px 0 6px; color: ${C.text2}; font-size: 13px; }
.ps-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; font-size: 12px; color: ${C.text3}; }
.ps-perm-line { color: ${C.text2}; }
.ps-perm-none { color: ${C.ok}; }
.ps-dot { color: ${C.borderSoft}; }
.ps-icon-letter { display: inline-flex; align-items: center; justify-content: center; background: ${C.bg2}; color: ${C.text2}; font-weight: 600; }
.ps-btn-quiet { border-color: transparent; background: none; color: ${C.text3}; }
.ps-usage { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 0; }
.ps-usage dt { color: ${C.text3}; }
.ps-usage dd { margin: 0; }
.ps-usage .ps-usage-setup { color: ${C.warn}; font-weight: 600; }
.ps-installed-notice { align-items: flex-start; }
.ps-installed-notice-body { display: grid; gap: 6px; }
.ps-list-title { font-size: 20px; margin: 0 0 16px; }
.ps-empty { color: ${C.text3}; padding: 40px 0; text-align: center; }
.ps-detail-head { display: flex; gap: 18px; align-items: flex-start; }
.ps-detail-title { flex: 1; min-width: 0; }
.ps-detail-title h2 { margin: 0; font-size: 22px; }
.ps-detail-name { font-size: 13px; font-weight: 400; }
.ps-detail-pitch { color: ${C.text2}; margin: 4px 0 8px; }
.ps-detail-action { text-align: right; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; font-size: 12px; }
.ps-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.ps-badge { font-size: 12px; border-radius: ${C.rSm}; padding: 1px 8px; background: ${C.bg2}; color: ${C.text2}; }
.ps-badge-ok { color: ${C.ok}; }
.ps-badge-warn { color: ${C.warn}; background: ${C.warnBg}; }
.ps-stats { display: flex; gap: 28px; align-items: flex-end; margin: 18px 0; padding: 12px 0; border-top: 1px solid ${C.borderSoft}; border-bottom: 1px solid ${C.borderSoft}; flex-wrap: wrap; }
.ps-stats > div { display: flex; flex-direction: column; }
.ps-stats b { font-size: 17px; }
.ps-stats span { color: ${C.text3}; font-size: 12px; }
.ps-stats .ps-stats-asof { margin-left: auto; font-size: 12px; }
.ps-notice { background: ${C.warnBg}; color: ${C.warn}; border-radius: ${C.rMd}; padding: 8px 12px; margin: 12px 0; font-size: 13px; }
.ps-notice-bar { display: flex; justify-content: space-between; gap: 12px; }
.ps-error { display: flex; align-items: center; gap: 12px; color: ${C.error}; margin: 12px 0; flex-wrap: wrap; }
.ps-block { margin-top: 22px; }
.ps-shots { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
.ps-shot { margin: 0; flex: none; max-width: 420px; }
.ps-shot-btn { border: 0; padding: 0; background: none; cursor: zoom-in; display: block; }
.ps-reason { color: ${C.warn}; font-size: 13px; margin: 8px 0 0; }
.ps-zoom-close { position: absolute; top: 16px; right: 20px; border: 0; background: rgba(0,0,0,.5); color: #fff; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
.ps-shot img { display: block; max-height: 240px; max-width: 420px; border-radius: ${C.rMd}; border: 1px solid ${C.borderSoft}; }
.ps-shot figcaption { color: ${C.text3}; font-size: 12px; margin-top: 4px; }
.ps-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.ps-features { margin: 0; padding-left: 18px; }
.ps-features li { margin-bottom: 4px; }
.ps-perms { width: 100%; border-collapse: collapse; font-size: 13px; }
.ps-perms th { text-align: left; color: ${C.text3}; font-weight: 400; font-size: 12px; padding: 0 6px 4px 0; }
.ps-perms td { padding: 4px 6px 4px 0; border-top: 1px solid ${C.borderSoft}; vertical-align: top; }
.ps-perm-yes { color: ${C.warn}; font-weight: 600; }
.ps-perm-no { color: ${C.ok}; }
.ps-perm-note { color: ${C.text2}; font-size: 12px; margin-top: 2px; }
.ps-facts { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0; font-size: 13px; }
.ps-facts dt { color: ${C.text3}; }
.ps-facts dd { margin: 0; word-break: break-all; }
.ps-facts a, .ps-md a { color: ${C.link}; }
.ps-review-notes { color: ${C.text2}; font-size: 13px; margin: 10px 0 0; white-space: pre-wrap; }
.ps-tabs { display: flex; gap: 4px; border-bottom: 1px solid ${C.borderSoft}; margin-bottom: 12px; }
.ps-tab { border: 0; background: none; color: ${C.text2}; padding: 6px 12px; cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; }
.ps-tab-on { color: ${C.text}; border-bottom-color: ${C.brand}; font-weight: 600; }
.ps-md { font-size: 14px; overflow-wrap: anywhere; }
.ps-md .ps-md-h { margin: 18px 0 8px; }
.ps-md-img { max-width: 100%; }
.ps-md-code { background: ${C.bg2}; border-radius: 4px; padding: 0 4px; font-size: 12.5px; }
.ps-md-pre { background: ${C.bg2}; border-radius: ${C.rMd}; padding: 10px 12px; overflow: auto; font-size: 12.5px; }
.ps-md-table { overflow-x: auto; }
.ps-md table { border-collapse: collapse; }
.ps-md th, .ps-md td { border: 1px solid ${C.borderSoft}; padding: 4px 8px; }
.ps-md blockquote { margin: 8px 0; padding-left: 12px; border-left: 3px solid ${C.border}; color: ${C.text2}; }
.ps-zoom { position: fixed; inset: 0; background: rgba(0,0,0,.72); display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: zoom-out; }
.ps-zoom img { max-width: 92vw; max-height: 92vh; border-radius: ${C.rMd}; }
.ps-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.ps-modal { background: ${C.bg1}; color: ${C.text}; border-radius: ${C.rXl}; padding: 22px 24px; width: min(440px, 92vw); box-shadow: 0 16px 48px rgba(0,0,0,.25); }
.ps-modal h3 { margin: 0 0 14px; font-size: 17px; }
.ps-modal-plugin { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.ps-trust { background: ${C.warnBg}; color: ${C.warn}; border-radius: ${C.rMd}; padding: 8px 12px; font-size: 13px; margin: 14px 0; }
.ps-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.ps-crash { padding: 32px; height: auto; }
.ps-toast { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); pointer-events: auto; display: flex; gap: 14px; align-items: center; background: ${C.bg1}; color: ${C.text}; border: 1px solid ${C.border}; border-radius: ${C.rLg}; padding: 10px 16px; box-shadow: 0 8px 28px rgba(0,0,0,.18); z-index: 1000; font-size: 14px; }
`

/** Add the stylesheet to the page once; returns a function that removes it. */
export function injectStyles(doc: Document = document): () => void {
  const existing = doc.querySelector('style[data-plugin="dsh-plugin-store"]')
  if (existing) return () => {}
  const tag = doc.createElement('style')
  tag.dataset.plugin = 'dsh-plugin-store'
  tag.textContent = STYLE_TEXT
  doc.head.appendChild(tag)
  return () => tag.remove()
}
