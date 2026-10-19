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
.ps-btn { border: 1px solid ${C.border}; background: ${C.bg1}; color: ${C.text}; border-radius: ${C.rMd}; padding: 4px 14px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.ps-btn:hover:not(:disabled) { background: ${C.hover}; }
.ps-btn:disabled { opacity: .55; cursor: not-allowed; }
.ps-btn-primary { background: ${C.brand}; border-color: ${C.brand}; color: ${C.onBrand}; }
.ps-btn-primary:hover:not(:disabled) { background: ${C.brand}; filter: brightness(1.08); }
.ps-btn-large { padding: 8px 26px; font-size: 14px; font-weight: 600; }
.ps-link-btn { border: 0; background: none; color: ${C.link}; cursor: pointer; padding: 0; font-size: 13px; }
.ps-back { margin-bottom: 12px; }
.ps-toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.ps-store-title { font-size: 22px; margin: 0; flex: 1; }
.ps-search { display: flex; align-items: center; gap: 6px; border: 1px solid ${C.border}; border-radius: ${C.rLg}; padding: 6px 12px; min-width: 260px; background: ${C.bg1}; }
.ps-search input { border: 0; outline: none; background: transparent; color: ${C.text}; font-size: 14px; flex: 1; }
.ps-search-icon { color: ${C.text3}; }
.ps-banner { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-radius: ${C.rXl}; padding: 24px 28px; color: #fff; margin-bottom: 28px; }
.ps-banner-kicker { font-size: 12px; opacity: .85; letter-spacing: .04em; }
.ps-banner-title { font-size: 24px; font-weight: 700; margin: 4px 0; }
.ps-banner-subtitle { opacity: .92; }
.ps-banner-btn { margin-top: 14px; border: 0; border-radius: ${C.rMd}; padding: 6px 16px; background: #fff; color: #312e81; font-weight: 600; cursor: pointer; }
.ps-banner .ps-icon { box-shadow: 0 8px 24px rgba(0,0,0,.18); background: #fff; }
.ps-section { margin-bottom: 28px; }
.ps-section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.ps-section-head h3, .ps-block h3 { font-size: 16px; margin: 0 0 10px; }
.ps-row, .ps-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@container (min-width: 720px) { .ps-row, .ps-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.ps-card { border: 1px solid ${C.borderSoft}; border-radius: ${C.rLg}; padding: 14px; background: ${C.bg1}; cursor: pointer; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ps-card:hover { background: ${C.hover}; }
.ps-card-head { display: flex; gap: 12px; align-items: center; min-width: 0; }
.ps-card-text { min-width: 0; }
.ps-card-title { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-card-name { color: ${C.text3}; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-card-pitch { color: ${C.text2}; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.9em; }
.ps-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; margin-top: auto; }
.ps-icon { flex: none; object-fit: contain; }
.ps-icon-tile { display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
.ps-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ps-chip { border: 1px solid ${C.border}; background: ${C.bg2}; color: ${C.text}; border-radius: 999px; padding: 4px 14px; cursor: pointer; font-size: 13px; }
.ps-chip:hover { background: ${C.hover}; }
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
