import http from 'node:http'
import { searchBrave, searchDuckDuckGo } from './engines.mjs'
import { loadPage, renderErrorPage } from './proxy.mjs'

const PORT = Number(process.env.PORT || 8000)
const BRAVE_KEY = (process.env.BRAVE_SEARCH_API_KEY || '').trim()
const MAX_QUERY_LENGTH = 240

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, braveKey: Boolean(BRAVE_KEY) })
    return
  }

  if (url.pathname === '/api/search') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'method_not_allowed', message: 'Search uses GET.' })
      return
    }

    const query = (url.searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH)
    const engine = url.searchParams.get('engine') === 'brave' ? 'brave' : 'ddg'

    if (!query) {
      sendJson(res, 400, { error: 'missing_query', message: 'Type something to search for.' })
      return
    }

    try {
      const payload = engine === 'brave' ? await searchBrave(query, BRAVE_KEY) : await searchDuckDuckGo(query)
      sendJson(res, 200, payload)
    } catch (error) {
      const code = error.code || 'upstream'
      const status = code === 'missing_key' || code === 'invalid_key' ? 400 : 502
      console.warn(`[search:${engine}] ${code}: ${error.message}`)
      sendJson(res, status, { error: code, message: error.message })
    }
    return
  }

  if (url.pathname === '/api/page') {
    const target = url.searchParams.get('url') || ''
    try {
      const page = await loadPage(target)
      res.writeHead(page.status, {
        'content-type': page.contentType,
        'content-length': page.body.length,
        'cache-control': 'no-store',
      })
      res.end(page.body)
    } catch (error) {
      const code = error.code || 'upstream'
      console.warn(`[page] ${code}: ${error.message}`)
      const title = code === 'bad_url' ? 'Not a web address' : code === 'blocked_target' ? 'Blocked address' : 'Page unavailable'
      const body = Buffer.from(renderErrorPage(title, error.message, /^https?:/i.test(target) ? target : ''))
      res.writeHead(code === 'bad_url' || code === 'blocked_target' ? 400 : 502, {
        'content-type': 'text/html; charset=utf-8',
        'content-length': body.length,
        'cache-control': 'no-store',
      })
      res.end(body)
    }
    return
  }

  sendJson(res, 404, { error: 'not_found', message: 'Unknown API route.' })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Angel Desktop search API listening on :${PORT} (Brave key ${BRAVE_KEY ? 'present' : 'missing'})`)
})
