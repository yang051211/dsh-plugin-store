/**
 * The store's stylesheet, injected once per page. Every class is prefixed `ps-`; colors and radii come from DSH's
 * `--dsw-*` tokens (with fallbacks), so light and dark themes both follow the host. The page system is a directory:
 * a tab bar, breadcrumb headers, layered cards with a tinted head, sidebars, and panels; actions use DSH's blue.
 */
const C = {
  text: 'var(--dsw-alias-label-primary, #1f2328)',
  text2: 'var(--dsw-alias-label-secondary, #57606a)',
  text3: 'var(--dsw-alias-label-tertiary, #8b949e)',
  bg1: 'var(--dsw-alias-bg-layer-1, #ffffff)',
  bg2: 'var(--dsw-alias-bg-layer-2, #f6f8fa)',
  border: 'var(--dsw-alias-border-l2, #d0d7de)',
  borderSoft: 'var(--dsw-alias-border-l1, #e3e6eb)',
  hover: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.08))',
  brand: 'var(--dsw-alias-brand-primary, #4d6bfe)',
  onBrand: 'var(--dsw-alias-label-primary-foreground, #ffffff)',
  link: 'var(--dsw-alias-link, #2f63d8)',
  ok: 'var(--dsw-alias-state-success-primary, #1a7f37)',
  warn: 'var(--dsw-alias-state-warn-primary, #b45309)',
  warnBg: 'var(--dsw-alias-state-warn-tertiary, rgba(245,158,11,.12))',
  error: 'var(--dsw-alias-state-error-primary, #cf222e)',
  rSm: 'var(--dsw-radius-sm, 6px)',
  rMd: 'var(--dsw-radius-md, 8px)',
  rLg: 'var(--dsw-radius-lg, 12px)',
  rXl: 'var(--dsw-radius-xl, 16px)',
  mono: 'var(--dsw-font-mono, ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, monospace)',
}

export const STYLE_TEXT = `
.ps-root { color: ${C.text}; font-size: 14px; line-height: 1.55; height: 100%; overflow: auto; box-sizing: border-box; padding: 0 28px 40px; container-type: inline-size; }
.ps-root *, .ps-root *::before, .ps-root *::after { box-sizing: border-box; }
.ps-root :where(button) { font: inherit; color: inherit; }
.ps-mode-tab { padding: 0 0 32px; height: auto; overflow: visible; }
.ps-muted { color: ${C.text3}; }
.ps-pad { padding: 24px 0; }
.ps-fine { color: ${C.text3}; font-size: 12.5px; margin: 0; }
.ps-root :focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }

/* tab bar */
.ps-nav { position: sticky; top: 0; z-index: 3; display: flex; align-items: stretch; gap: 22px; height: 50px; margin-bottom: 4px; background: ${C.bg1}; border-bottom: 1px solid ${C.borderSoft}; }
.ps-nav-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; margin-right: 6px; }
.ps-nav-logo { width: 24px; height: 24px; border-radius: 6px; display: block; object-fit: cover; }
.ps-nav button { border: 0; background: none; padding: 0; color: ${C.text2}; cursor: pointer; border-bottom: 2px solid transparent; }
.ps-nav button:hover { color: ${C.text}; }
.ps-nav .ps-nav-on { color: ${C.text}; font-weight: 600; border-bottom-color: ${C.text}; }

/* buttons */
.ps-btn { border: 1px solid ${C.borderSoft}; background: ${C.bg1}; color: ${C.text}; border-radius: ${C.rMd}; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
.ps-btn:hover:not(:disabled) { border-color: ${C.border}; }
.ps-btn:disabled { opacity: .55; cursor: not-allowed; }
.ps-btn-primary { background: ${C.brand}; border-color: ${C.brand}; color: ${C.onBrand}; }
.ps-btn-primary:hover:not(:disabled) { border-color: ${C.brand}; filter: brightness(1.08); }
.ps-btn-quiet { border-color: transparent; background: none; color: ${C.text3}; }
.ps-btn-large { width: 100%; padding: 10px 16px; font-size: 14px; }
.ps-btn-block { width: 100%; padding: 9px 16px; }
.ps-link-btn { border: 0; background: none; color: ${C.link}; cursor: pointer; padding: 0; font-size: 13px; }
.ps-back { border: 0; background: none; padding: 0; margin: 20px 0 4px; color: ${C.text2}; font-size: 13px; cursor: pointer; }
.ps-back:hover { color: ${C.text}; }

/* page header */
.ps-ph { padding: 28px 0 26px; margin-bottom: 26px; border-bottom: 1px solid ${C.borderSoft}; }
.ps-ph-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 32px; align-items: center; }
@container (max-width: 820px) { .ps-ph-split { grid-template-columns: 1fr; gap: 18px; } }
.ps-crumb { font-family: ${C.mono}; font-size: 12px; color: ${C.link}; letter-spacing: .02em; }
.ps-ph-title { margin: 8px 0 8px; font-size: 28px; line-height: 1.2; letter-spacing: -.01em; text-wrap: balance; }
.ps-ph-intro { margin: 0; color: ${C.text2}; font-size: 14.5px; max-width: 54ch; }

/* search */
.ps-search { display: flex; align-items: center; gap: 12px; border: 1px solid ${C.borderSoft}; background: ${C.bg2}; border-radius: 14px; padding: 8px 8px 8px 18px; min-height: 58px; color: ${C.text3}; }
.ps-search:focus-within { border-color: ${C.brand}; }
.ps-search svg { flex: none; }
.ps-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: ${C.text}; font: inherit; font-size: 15px; }
.ps-search .ps-btn { padding: 10px 18px; font-size: 14px; border-radius: 10px; }
.ps-search-links { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 12px; font-size: 13px; }
.ps-search-links button, .ps-search-links a { border: 0; background: none; padding: 0; color: ${C.text3}; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; text-decoration: none; font-size: 13px; }
.ps-search-links button:hover, .ps-search-links a:hover { color: ${C.text}; }

/* sections */
.ps-section { margin-bottom: 36px; }
.ps-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ps-section-head h2 { margin: 4px 0 0; font-size: 19px; }
.ps-more { border: 0; background: none; padding: 0; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.ps-more:hover { color: ${C.brand}; }

/* card grid */
.ps-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
@container (min-width: 560px) { .ps-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (min-width: 980px) { .ps-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .ps-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.ps-card { display: flex; flex-direction: column; border: 1px solid ${C.borderSoft}; border-radius: ${C.rLg}; background: ${C.bg1}; overflow: hidden; min-width: 0; text-align: left; padding: 0; cursor: pointer; }
.ps-card:hover { border-color: ${C.border}; }
.ps-card-hd { display: flex; gap: 12px; align-items: center; padding: 13px 14px; background: ${C.bg2}; border-bottom: 1px solid ${C.borderSoft}; min-width: 0; }
.ps-card-id { display: grid; min-width: 0; }
.ps-card-id b { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-card-id span { font-size: 12px; color: ${C.text3}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-card-bd { padding: 12px 14px 0; flex: 1; display: grid; gap: 8px; align-content: start; }
.ps-card-tags { display: flex; gap: 10px; font-family: ${C.mono}; font-size: 11.5px; color: ${C.link}; }
.ps-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.ps-chip { font-size: 11.5px; color: ${C.text2}; border: 1px solid ${C.borderSoft}; border-radius: 999px; padding: 0 8px; }
.ps-chip-main { color: ${C.text}; background: ${C.bg2}; border-color: transparent; font-weight: 600; }
.ps-card-pitch { color: ${C.text2}; font-size: 13.5px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; min-height: 4.65em; }
.ps-card-ft { display: flex; align-items: center; gap: 14px; padding: 13px 14px; font-size: 12px; color: ${C.text2}; font-variant-numeric: tabular-nums; }
.ps-card-open { margin-left: auto; color: ${C.text}; font-weight: 600; }
.ps-card:hover .ps-card-open { color: ${C.brand}; }
.ps-card-done, .ps-card:hover .ps-card-done { color: ${C.text3}; font-weight: 400; }
.ps-icon { flex: none; object-fit: contain; }
.ps-icon-letters { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; letter-spacing: .02em; }

/* list page */
.ps-with-side { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 24px; align-items: start; }
@container (max-width: 760px) { .ps-with-side { grid-template-columns: 1fr; } }
.ps-side { border: 1px solid ${C.borderSoft}; border-radius: ${C.rLg}; padding: 10px; background: ${C.bg1}; display: grid; gap: 2px; position: sticky; top: 62px; }
.ps-side-head { font-size: 12px; color: ${C.text3}; padding: 4px 8px 8px; }
.ps-side button { display: flex; justify-content: space-between; align-items: center; border: 1px solid transparent; background: none; padding: 7px 10px; border-radius: ${C.rMd}; color: ${C.text2}; font-size: 13.5px; text-align: left; cursor: pointer; }
.ps-side button i { font-style: normal; color: ${C.text3}; font-family: ${C.mono}; font-size: 11.5px; }
.ps-side button:hover { background: ${C.bg2}; color: ${C.text}; }
.ps-side .ps-side-on { background: ${C.bg2}; color: ${C.text}; font-weight: 600; border-color: ${C.borderSoft}; }
.ps-list-main { min-width: 0; }
.ps-count-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ps-list-title { margin: 0; font-size: 19px; }
.ps-list-title small { color: ${C.text3}; font-weight: 400; font-size: 13px; margin-left: 8px; }
.ps-list-tools { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: ${C.text2}; }
.ps-list-tools .ps-muted { font-family: ${C.mono}; font-size: 12px; }
.ps-check { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.ps-check input { accent-color: ${C.brand}; margin: 0; }
.ps-sort { display: inline-flex; align-items: center; gap: 6px; }
.ps-sort select { font: inherit; color: ${C.text}; background: ${C.bg1}; border: 1px solid ${C.borderSoft}; border-radius: ${C.rMd}; padding: 4px 8px; }
.ps-pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 22px; font-size: 13px; color: ${C.text2}; }
.ps-versions { width: 100%; border-collapse: collapse; font-size: 13px; }
.ps-versions td { padding: 6px 8px 6px 0; border-top: 1px solid ${C.borderSoft}; }
.ps-versions td:first-child { font-family: ${C.mono}; }
.ps-perm-where { font-family: ${C.mono}; font-size: 11.5px; word-break: break-all; }
.ps-installed-notice-body { display: grid; gap: 2px; }
.ps-count-line > span { font-family: ${C.mono}; font-size: 12px; color: ${C.text3}; }
.ps-empty { color: ${C.text3}; padding: 40px 0; text-align: center; }

/* scenes */

/* detail */
.ps-hero { border: 1px solid ${C.borderSoft}; border-radius: ${C.rXl}; background: ${C.bg1}; overflow: hidden; margin: 10px 0 26px; }
.ps-hero-top { display: flex; gap: 18px; align-items: center; padding: 24px; background: ${C.bg2}; }
.ps-hero-text { min-width: 0; display: grid; gap: 4px; }
.ps-hero-title { margin: 0; font-size: 26px; line-height: 1.2; }
.ps-hero-pitch { margin: 0; color: ${C.text2}; font-size: 15px; }
.ps-stats { display: flex; flex-wrap: wrap; gap: 6px 22px; padding: 12px 24px; border-top: 1px solid ${C.borderSoft}; font-family: ${C.mono}; font-size: 12px; color: ${C.text2}; }
.ps-stats b { color: ${C.text}; font-weight: 500; }
.ps-stats-asof { margin-left: auto; color: ${C.text3}; }
.ps-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 26px; align-items: start; }
@container (max-width: 900px) { .ps-detail-grid { grid-template-columns: 1fr; } }
.ps-detail-main { min-width: 0; }
.ps-detail-side { display: grid; gap: 16px; min-width: 0; }
.ps-panel { border: 1px solid ${C.borderSoft}; border-radius: ${C.rLg}; background: ${C.bg1}; padding: 16px; display: grid; gap: 10px; }
.ps-panel h3 { margin: 0; font-size: 15px; }
.ps-panel-label { font-family: ${C.mono}; font-size: 11.5px; color: ${C.text3}; letter-spacing: .04em; }
.ps-panel-sub { margin: 4px 0 0; font-size: 13px; color: ${C.text2}; font-weight: 600; }
.ps-cmd { border: 1px solid ${C.borderSoft}; border-radius: ${C.rMd}; background: ${C.bg2}; padding: 10px 12px; display: grid; gap: 8px; }
.ps-cmd-head { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: ${C.text3}; }
.ps-cmd-head button { border: 0; background: none; padding: 0; color: ${C.link}; font-size: 12px; cursor: pointer; }
.ps-cmd code { font-family: ${C.mono}; font-size: 12px; word-break: break-all; }
.ps-related { display: grid; gap: 10px; }
.ps-related .ps-grid { grid-template-columns: 1fr; }
.ps-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.ps-badge { font-size: 12px; border-radius: ${C.rSm}; padding: 1px 8px; background: ${C.bg1}; color: ${C.text2}; }
.ps-badge-ok { color: ${C.ok}; }
.ps-badge-warn { color: ${C.warn}; background: ${C.warnBg}; }
.ps-reason { color: ${C.warn}; font-size: 13px; margin: 0 0 12px; }
.ps-block { margin-bottom: 24px; }
.ps-block h3 { font-size: 16px; margin: 0 0 10px; }
.ps-perms { width: 100%; border-collapse: collapse; font-size: 13px; }
.ps-perms th { text-align: left; color: ${C.text3}; font-weight: 400; font-size: 12px; padding: 0 6px 4px 0; }
.ps-perms td { padding: 5px 6px 5px 0; border-top: 1px solid ${C.borderSoft}; vertical-align: top; }
.ps-perm-yes { color: ${C.warn}; font-weight: 600; }
.ps-perm-no { color: ${C.ok}; }
.ps-facts { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0; font-size: 13px; }
.ps-facts dt { color: ${C.text3}; }
.ps-facts dd { margin: 0; word-break: break-all; }
.ps-facts a, .ps-md a { color: ${C.link}; }
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

/* about */
.ps-faq { max-width: 760px; }
.ps-faq h2 { font-size: 18px; margin: 28px 0 6px; padding-bottom: 10px; border-bottom: 1px solid ${C.borderSoft}; }
.ps-faq section:first-child h2 { margin-top: 0; }
.ps-faq h3 { font-size: 15px; margin: 18px 0 6px; }
.ps-faq p { margin: 0; color: ${C.text2}; }
.ps-ask { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid ${C.borderSoft}; border-radius: ${C.rLg}; padding: 16px 18px; margin-top: 30px; background: ${C.bg1}; flex-wrap: wrap; }
.ps-ask b { display: block; }
.ps-ask span { color: ${C.text2}; font-size: 13px; }

/* notices, errors, overlays */
.ps-notice { background: ${C.warnBg}; color: ${C.warn}; border-radius: ${C.rMd}; padding: 8px 12px; margin: 12px 0; font-size: 13px; }
.ps-notice-bar { display: flex; justify-content: space-between; gap: 12px; }
.ps-installed-notice { align-items: flex-start; }
.ps-installed-notice-body { display: grid; gap: 6px; }
.ps-error { display: flex; align-items: center; gap: 12px; color: ${C.error}; margin: 12px 0; flex-wrap: wrap; }
.ps-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.ps-modal { background: ${C.bg1}; color: ${C.text}; border-radius: ${C.rXl}; padding: 22px 24px; width: min(440px, 92vw); box-shadow: 0 16px 48px rgba(0,0,0,.25); }
.ps-modal h3 { margin: 0 0 14px; font-size: 17px; }
.ps-modal-plugin { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.ps-row-title { font-weight: 600; }
.ps-trust { background: ${C.warnBg}; color: ${C.warn}; border-radius: ${C.rMd}; padding: 8px 12px; font-size: 13px; margin: 14px 0; }
.ps-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.ps-modal-actions .ps-btn-large { width: auto; }
.ps-crash { padding: 32px; height: auto; }
.ps-toast { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); pointer-events: auto; display: flex; gap: 14px; align-items: center; background: ${C.bg1}; color: ${C.text}; border: 1px solid ${C.border}; border-radius: ${C.rLg}; padding: 10px 16px; box-shadow: 0 8px 28px rgba(0,0,0,.18); z-index: 1000; font-size: 14px; }
/* installed page */
.ps-btn-danger { background: ${C.error}; border-color: ${C.error}; color: #fff; }
.ps-btn-danger:hover:not(:disabled) { border-color: ${C.error}; filter: brightness(1.08); }
.ps-nav .ps-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 6px; border-radius: 9px; background: ${C.brand}; color: ${C.onBrand}; font-size: 11px; font-weight: 700; align-self: center; }
.ps-nav button:has(.ps-badge) { display: inline-flex; align-items: center; }
.ps-keep { display: grid; gap: 4px; max-width: 300px; justify-items: end; text-align: right; }
.ps-keep-row { display: flex; align-items: center; gap: 10px; }
.ps-switch { position: relative; width: 36px; height: 20px; flex: none; border-radius: 10px; border: 0; padding: 0; background: ${C.border}; cursor: pointer; transition: background .15s; }
.ps-switch-on { background: ${C.brand}; }
.ps-switch:disabled { opacity: .55; cursor: not-allowed; }
.ps-switch-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .15s; }
.ps-switch-on .ps-switch-knob { transform: translateX(16px); }
.ps-spec { display: grid; gap: 6px; margin: 4px 0 22px; }
.ps-spec-label { font-weight: 600; font-size: 13px; }
.ps-spec-field { display: flex; gap: 8px; }
.ps-spec-input { flex: 1; min-width: 0; font: inherit; font-family: ${C.mono}; font-size: 13px; color: ${C.text}; background: ${C.bg1}; border: 1px solid ${C.border}; border-radius: ${C.rMd}; padding: 7px 10px; }
.ps-inst-group { margin-bottom: 26px; }
.ps-inst-group-title { font-size: 15px; margin: 0 0 8px; }
.ps-inst-list { list-style: none; margin: 0; padding: 0; border: 1px solid ${C.borderSoft}; border-radius: ${C.rLg}; background: ${C.bg1}; }
.ps-inst-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; }
.ps-inst-row + .ps-inst-row { border-top: 1px solid ${C.borderSoft}; }
.ps-inst-main { flex: 1; min-width: 0; display: grid; gap: 2px; }
.ps-inst-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; color: ${C.text3}; font-size: 12.5px; font-family: ${C.mono}; }
.ps-inst-meta .ps-muted { font-family: inherit; }
.ps-inst-arrow { color: ${C.brand}; font-weight: 600; }
.ps-inst-actions { display: flex; align-items: center; gap: 8px; flex: none; }
.ps-row-note { font-size: 12.5px; color: ${C.warn}; }
.ps-row-error { color: ${C.error}; }
@container (max-width: 560px) { .ps-inst-row { flex-wrap: wrap; } .ps-inst-actions { width: 100%; justify-content: flex-end; } }
`

/** Add the stylesheet to the page once; returns a function that removes it. */
export function injectStyles(doc: Document = document): () => void {
  const existing = doc.querySelector('style[data-plugin="dsh-startide"]')
  if (existing) return () => {}
  const tag = doc.createElement('style')
  tag.dataset.plugin = 'dsh-startide'
  tag.textContent = STYLE_TEXT
  doc.head.appendChild(tag)
  return () => tag.remove()
}
