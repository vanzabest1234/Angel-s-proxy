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

export async function searchDuckDuckGo(query) {
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
