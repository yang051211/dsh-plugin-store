/** URL rules for third-party content: only http(s) leaves the page, relative paths resolve against a known base. */

/** jsDelivr's view of a published npm version: README-relative files of exactly the reviewed version. */
export function npmFileBase(name: string, version: string): string {
  return `https://cdn.jsdelivr.net/npm/${name}@${version}/`
}

/**
 * An http(s) URL for `href`, resolving a relative one against `base`; null for every other scheme
 * (javascript:, data:, vbscript:, file:, …) and for relative paths without a base.
 */
export function safeUrl(href: string, base: string | null): string | null {
  const text = href.trim()
  if (text === '') return null
  let url: URL
  try {
    url = /^[a-z][a-z0-9+.-]*:/i.test(text) ? new URL(text) : base ? new URL(text, base) : (() => { throw new Error('no base') })()
  } catch {
    return null
  }
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
}
