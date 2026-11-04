const DDG_ANSWERS = 'https://api.duckduckgo.com/'
const DDG_SUGGEST = 'https://duckduckgo.com/ac/'
const BRAVE_SEARCH = 'https://api.search.brave.com/res/v1/web/search'

const USER_AGENT = 'AngelDesktop/0.1 (web build)'

async function requestJson(url, { headers = {}, timeout = 12000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, ...headers },
      signal: controller.signal,
    })
    const text = await response.text()
    let body = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    return { response, body }
  } finally {
    clearTimeout(timer)
  }
}

function cleanText(value = '') {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function flattenTopics(topics = []) {
  const flat = []
  for (const item of topics) {
    if (Array.isArray(item.Topics)) flat.push(...flattenTopics(item.Topics))
    else if (item.FirstURL) flat.push(item)
  }
  return flat
}

function uniqueByUrl(results) {
  const seen = new Set()
  return results.filter((item) => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

async function suggestDuckDuckGo(query) {
  try {
    const { response, body } = await requestJson(`${DDG_SUGGEST}?q=${encodeURIComponent(query)}&type=list`, {
      timeout: 6000,
    })
    if (!response.ok || !Array.isArray(body)) return []
    const list = Array.isArray(body[1]) ? body[1] : body
    const phrases = list
      .map((item) => (typeof item === 'string' ? item : item && item.phrase))
      .filter((item) => typeof item === 'string' && item.trim())
    return [...new Set(phrases)].slice(0, 8)
  } catch {
    return []
  }
}

const DDG_HTML = 'https://html.duckduckgo.com/html/'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function decodeEntities(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
}

// DuckDuckGo wraps result links in /l/?uddg=<target>; unwrap them so the
// browser can open the site itself.
function ddgTarget(href = '') {
  const value = decodeEntities(href).trim()
  if (!value) return ''
  try {
    if (value.startsWith('//') || value.startsWith('/l/')) {
      const parsed = new URL(value.startsWith('//') ? `https:${value}` : value, 'https://duckduckgo.com')
      return parsed.searchParams.get('uddg') || ''
    }
    return value
  } catch {
    return ''
  }
}

function parseDuckDuckGo(html = '') {
  const chunks = html.split(/class="result results_links/).slice(1)
  const results = []

  for (const chunk of chunks) {
    if (/result--ad/.test(chunk.slice(0, 160))) continue
    const title = chunk.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/)
    if (!title) continue
    const url = ddgTarget(title[1])
    if (!/^https?:\/\//i.test(url)) continue
    const snippet = chunk.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
    const shown = chunk.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/)
    results.push({
      title: cleanText(decodeEntities(title[2])) || url,
      url,
      snippet: cleanText(decodeEntities(snippet?.[1] || '')),
      source: cleanText(decodeEntities(shown?.[1] || '')),
    })
  }

  return uniqueByUrl(results)
}

const DDG_WEB_HEADERS = {
  'user-agent': BROWSER_UA,
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'en-US,en;q=0.9',
}

async function ddgFetch(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) return []
    return parseDuckDuckGo(await response.text()).slice(0, 12)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

// DuckDuckGo serves its HTML result list on both endpoints; it throttles
// datacenter traffic, so both are tried before falling back to another engine.
async function duckDuckGoWebResults(query) {
  const direct = await ddgFetch(
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`,
    { headers: DDG_WEB_HEADERS },
  )
  if (direct.length) return direct

  return ddgFetch(DDG_HTML, {
    method: 'POST',
    headers: { ...DDG_WEB_HEADERS, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: query, kl: 'us-en' }).toString(),
  })
}

const BING = 'https://www.bing.com/search'

// Bing wraps result links as /ck/a?...&u=a1<base64url>; unwrap them too.
function bingTarget(href = '') {
  const value = decodeEntities(href).trim()
  if (!value) return ''
  try {
    const parsed = new URL(value, BING)
    const wrapped = parsed.searchParams.get('u')
    if (wrapped && wrapped.startsWith('a1')) {
      const decoded = Buffer.from(wrapped.slice(2).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      if (/^https?:\/\//i.test(decoded)) return decoded
    }
    return parsed.href
  } catch {
    return ''
  }
}

function parseBing(html = '') {
  const chunks = html.split('<li class="b_algo"').slice(1)
  const results = []

  for (const chunk of chunks) {
    const title = chunk.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!title) continue
    const url = bingTarget(title[1])
    if (!/^https?:\/\//i.test(url)) continue
    try {
      const host = new URL(url).hostname
      if (/(^|\.)bing\.com$|(^|\.)microsofttranslator\.com$/.test(host)) continue
    } catch {
      continue
    }
    const snippet = chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/)
    results.push({
      title: cleanText(decodeEntities(title[2])) || url,
      url,
      snippet: cleanText(decodeEntities(snippet?.[1] || '')),
      source: '',
    })
  }

  return uniqueByUrl(results)
}

async function bingWebResults(query) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${BING}?q=${encodeURIComponent(query)}&setlang=en-US&cc=us`, {
      headers: {
        'user-agent': BROWSER_UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    })
    if (!response.ok) return []
    return parseBing(await response.text()).slice(0, 12)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

export async function searchDuckDuckGo(query) {
  const related = await suggestDuckDuckGo(query)

  const web = await duckDuckGoWebResults(query)
  if (web.length) {
    return { engine: 'ddg', query, results: web, related, note: 'Web results from DuckDuckGo.', hint: 'Try different wording.' }
  }

  const bing = await bingWebResults(query)
  if (bing.length) {
    return {
      engine: 'ddg',
      query,
      results: bing,
      related,
      note: 'Web results from Bing.',
      hint: 'Try different wording.',
    }
  }

  const fallback = await searchDuckDuckGoAnswers(query)
  return {
    ...fallback,
    related: related.length ? related : fallback.related,
    note: 'Web results were unavailable, so these are DuckDuckGo instant answers.',
  }
}

async function searchDuckDuckGoAnswers(query) {
  const { response, body } = await requestJson(
    `${DDG_ANSWERS}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&ia=web`,
  )
  if (!response.ok || !body) {
    throw Object.assign(new Error('DuckDuckGo did not answer that search.'), { code: 'upstream' })
  }

  const results = []

  if (body.AbstractText) {
    results.push({
      title: cleanText(body.Heading) || query,
      url: body.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: cleanText(body.AbstractText),
      source: body.AbstractSource ? `DuckDuckGo · ${body.AbstractSource}` : 'DuckDuckGo',
    })
  }

  for (const item of body.Results || []) {
    if (!item.FirstURL) continue
    const text = cleanText(item.Text)
    results.push({ title: text.split(' - ')[0] || item.FirstURL, url: item.FirstURL, snippet: text })
  }

  for (const topic of flattenTopics(body.RelatedTopics)) {
    const text = cleanText(topic.Text)
    results.push({
      title: text.split(' - ')[0] || topic.FirstURL,
      url: topic.FirstURL,
      snippet: text,
      source: 'DuckDuckGo topic',
    })
  }

  const related = await suggestDuckDuckGo(query)

  return {
    engine: 'ddg',
    query,
    results: uniqueByUrl(results).slice(0, 12),
    related,
    note: 'DuckDuckGo instant answers come from its public API. Brave returns full web results.',
    hint: related.length
      ? 'Try one of the related searches below, or switch to Brave for web results.'
      : 'Try a well-known topic, or switch to Brave for web results.',
  }
}

export async function searchBrave(query, apiKey) {
  if (!apiKey) {
    throw Object.assign(
      new Error('Brave web results need a free Brave Search API key. Add BRAVE_SEARCH_API_KEY and this page will fill in.'),
      { code: 'missing_key' },
    )
  }

  const { response, body } = await requestJson(
    `${BRAVE_SEARCH}?q=${encodeURIComponent(query)}&count=10&safesearch=moderate&text_decorations=false`,
    { headers: { accept: 'application/json', 'x-subscription-token': apiKey } },
  )

  if (response.status === 401 || response.status === 403) {
    throw Object.assign(new Error('Brave rejected the stored API key. Replace BRAVE_SEARCH_API_KEY with a valid subscription token.'), {
      code: 'invalid_key',
    })
  }
  if (response.status === 429) {
    throw Object.assign(new Error('Brave is rate limiting this key right now. Try again in a minute.'), {
      code: 'rate_limited',
    })
  }
  if (!response.ok || !body) {
    throw Object.assign(new Error(`Brave returned ${response.status}.`), { code: 'upstream' })
  }

  const results = (body.web?.results || []).map((item) => ({
    title: cleanText(item.title),
    url: item.url,
    snippet: cleanText(item.description),
    source: item.profile?.long_name || undefined,
  }))

  return {
    engine: 'brave',
    query,
    results: uniqueByUrl(results),
    related: [],
    note: null,
    hint: 'Try different wording.',
  }
}
