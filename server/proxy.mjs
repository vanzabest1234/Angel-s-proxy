const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MAX_BYTES = 4 * 1024 * 1024
const TIMEOUT_MS = 15000

const PRIVATE_HOSTS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
]

function parseTarget(rawUrl) {
  let target
  try {
    target = new URL(rawUrl)
  } catch {
    throw Object.assign(new Error('That does not look like a web address.'), { code: 'bad_url' })
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw Object.assign(new Error('Only http and https pages can be opened.'), { code: 'bad_url' })
  }
  if (PRIVATE_HOSTS.some((pattern) => pattern.test(target.hostname))) {
    throw Object.assign(new Error('Local network addresses are not reachable from this browser.'), {
      code: 'blocked_target',
    })
  }
  return target
}

function escapeAttr(value = '') {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtml(value = '') {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Pages are served read-only: scripts and inline handlers are removed so a
// remote page can never touch Angel Desktop's own origin.
function prepareHtml(html, finalUrl) {
  const base = `<base href="${escapeAttr(finalUrl)}">`
  let output = html
    .replace(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2')

  output = /<head[^>]*>/i.test(output)
    ? output.replace(/<head([^>]*)>/i, `<head$1>${base}`)
    : `${base}${output}`

  return output
}

export async function loadPage(rawUrl) {
  const target = parseTarget(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(target.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    })
  } catch (error) {
    throw Object.assign(
      new Error(
        error.name === 'AbortError'
          ? 'That site took too long to answer.'
          : `Could not reach ${target.hostname}.`,
      ),
      { code: 'upstream' },
    )
  } finally {
    clearTimeout(timer)
  }

  const contentType = response.headers.get('content-type') || 'text/html'

  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_BYTES) {
      throw Object.assign(new Error('That file is too large to open here.'), { code: 'too_large' })
    }
    return { status: response.status, contentType, body: buffer }
  }

  const html = await response.text()
  if (html.length > MAX_BYTES) {
    throw Object.assign(new Error('That page is too large to open here.'), { code: 'too_large' })
  }

  return {
    status: response.status,
    contentType: 'text/html; charset=utf-8',
    body: Buffer.from(prepareHtml(html, response.url || target.href)),
  }
}

export function renderErrorPage(title, message, originalUrl) {
  const link = originalUrl
    ? `<a href="${escapeAttr(originalUrl)}" target="_blank" rel="noreferrer noopener">Open the original page</a>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #16171b; color: #f2f3f5;
    font-family: "Segoe UI", system-ui, sans-serif; }
  main { width: min(460px, 88vw); padding: 22px 24px; border-radius: 12px; background: #1e2026;
    border: 1px solid #2b2f38; }
  h1 { margin: 0 0 8px; font-size: 17px; }
  p { margin: 0 0 14px; font-size: 13px; line-height: 1.55; color: #b7bdc8; }
  a { font-size: 13px; color: #8ab4ff; }
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${link}</main></body>
</html>`
}
