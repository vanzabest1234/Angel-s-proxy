import { useEffect, useState } from 'react'
import Icon, { EngineMark, engineName } from '../icons.jsx'
import '../styles/search.css'

const TABS = [
  { id: 'all', label: 'All', icon: 'search' },
  { id: 'images', label: 'Images', icon: 'image' },
  { id: 'videos', label: 'Videos', icon: 'play' },
  { id: 'news', label: 'News', icon: 'news' },
  { id: 'more', label: 'More', icon: null },
]

const FILTERS = [
  { label: 'Private', checked: true },
  { label: 'All regions' },
  { label: 'Safe search: moderate' },
  { label: 'Any time' },
]

const FEEDBACK = {
  ddg: 'https://duckduckgo.com/feedback',
  brave: 'https://search.brave.com',
}

export default function SearchPage() {
  const params = new URLSearchParams(window.location.search)
  const engine = params.get('engine') === 'brave' ? 'brave' : 'ddg'
  const query = (params.get('q') || '').trim()
  const [draft, setDraft] = useState(query)
  const [state, setState] = useState({ status: query ? 'loading' : 'idle', data: null, error: null })

  useEffect(() => {
    document.body.classList.add('search-route')
    document.documentElement.dataset.engine = engine
    document.title = query ? `${query} — ${engineName(engine)}` : engineName(engine)
    return () => document.body.classList.remove('search-route')
  }, [engine, query])

  useEffect(() => {
    setDraft(query)
  }, [query])

  useEffect(() => {
    if (!query) {
      setState({ status: 'idle', data: null, error: null })
      return undefined
    }
    let cancelled = false
    setState({ status: 'loading', data: null, error: null })

    fetch(`/api/search?engine=${engine}&q=${encodeURIComponent(query)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          const error = new Error(body.message || 'The search request failed.')
          error.code = body.error || 'upstream'
          throw error
        }
        return body
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'done', data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error: { code: error.code, message: error.message } })
      })

    return () => {
      cancelled = true
    }
  }, [engine, query])

  // The frame cannot change the address bar itself, so a search typed in the
  // page is handed to the desktop app, which runs it through the same history.
  function runSearch(value) {
    const next = value.trim()
    if (!next) return
    window.parent?.postMessage({ type: 'angel:search', engine, q: next }, '*')
  }

  // Result links open inside the browser window, where the page proxy can
  // display sites that refuse to be framed.
  function openResult(url) {
    window.parent?.postMessage({ type: 'angel:open', url }, '*')
  }

  return (
    <div className="search-page" data-engine={engine}>
      <header className="sp-header">
        <div className="sp-brand">
          <EngineMark engine={engine} size={30} />
          <span className="sp-name">{engineName(engine)}</span>
        </div>

        <form
          className="sp-search"
          onSubmit={(event) => {
            event.preventDefault()
            runSearch(draft)
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search privately"
            aria-label="Search"
            data-testid="sp-input"
          />
          <button type="submit" aria-label="Search" title="Search" data-testid="sp-submit">
            <Icon name="search" size={16} />
          </button>
        </form>

        <div className="sp-utility">
          <span className="sp-tagline">
            {engine === 'ddg' ? 'Protection. Privacy. Peace of mind.' : 'Independent, private results.'}
          </span>
          <Icon name="menu" size={18} />
        </div>
      </header>

      <nav className="sp-tabs" aria-label="Result types">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="sp-tab"
            aria-current={tab.id === 'all' ? 'page' : undefined}
            disabled={tab.id !== 'all'}
            title={tab.id === 'all' ? undefined : 'Only web results are available'}
          >
            {tab.icon ? <Icon name={tab.icon} size={14} /> : null}
            {tab.label}
            {tab.id === 'more' ? <Icon name="chevronDown" size={12} /> : null}
          </button>
        ))}

        <div className="sp-tools">
          <span className="sp-tool">
            <Icon name="star" size={13} />
            Search Assist
          </span>
          <span className="sp-tool">
            <Icon name="sparkle" size={13} />
            Duck.ai
          </span>
          <span className="sp-tool sp-tool-icon">
            <Icon name="settings" size={14} />
          </span>
        </div>
      </nav>

      <div className="sp-filters">
        {FILTERS.map((filter) => (
          <span key={filter.label} className="sp-filter">
            {filter.checked ? <Icon name="check" size={12} className="sp-check" /> : null}
            {filter.label}
            <Icon name="chevronDown" size={11} />
          </span>
        ))}
      </div>

      <main className="sp-main">
        {state.status === 'loading' ? <Skeleton /> : null}
        {state.status === 'error' ? <ErrorState error={state.error} engine={engine} /> : null}
        {state.status === 'done' ? (
          <Results data={state.data} onRelated={runSearch} onOpen={openResult} />
        ) : null}
        {state.status === 'idle' ? <p className="sp-note">Type a search in the address bar above.</p> : null}
      </main>

      <a className="sp-feedback" href={FEEDBACK[engine]} target="_blank" rel="noreferrer noopener">
        Share Feedback
      </a>
    </div>
  )
}

function Results({ data, onRelated, onOpen }) {
  const results = data.results || []
  const related = data.related || []

  return (
    <>
      {data.note ? <p className="sp-note">{data.note}</p> : null}

      {results.length ? (
        <ol className="sp-results">
          {results.map((item, position) => (
            <li className="sp-result" key={`${item.url}-${position}`}>
              <span className="sp-result-site">
                <span className="sp-favicon" aria-hidden="true">
                  {(siteOf(item.url) || '?').slice(0, 1).toUpperCase()}
                </span>
                {siteOf(item.url)}
              </span>
              <span className="sp-result-url">{breadcrumb(item.url)}</span>
              <a
                className="sp-result-title"
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                  event.preventDefault()
                  onOpen(item.url)
                }}
              >
                {item.title || item.url}
              </a>
              {item.snippet ? <p className="sp-result-snippet">{item.snippet}</p> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="sp-empty">
          No results for “{data.query}”. {data.hint || ''}
        </p>
      )}

      {related.length ? (
        <section className="sp-related">
          <h2>Related searches</h2>
          <div className="sp-chips">
            {related.map((term) => (
              <button key={term} type="button" className="sp-chip" onClick={() => onRelated(term)}>
                {term}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

function ErrorState({ error, engine }) {
  const missingKey = error.code === 'missing_key' || error.code === 'invalid_key'

  return (
    <div className="sp-error">
      <h2>{missingKey ? 'Brave needs an API key' : 'Search is unavailable'}</h2>
      <p>{error.message}</p>
      {missingKey ? (
        <p className="sp-note">
          Create a free key at{' '}
          <a href="https://api.search.brave.com/app/keys" target="_blank" rel="noreferrer noopener">
            api.search.brave.com
          </a>{' '}
          and add it as <code>BRAVE_SEARCH_API_KEY</code>. DuckDuckGo works without a key.
        </p>
      ) : null}
      {engine !== 'ddg' ? <p className="sp-note">DuckDuckGo works from the engine switch in the toolbar.</p> : null}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="sp-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Short site name for the result header: "en.wikipedia.org" -> "wikipedia.org".
function siteOf(value) {
  const host = hostOf(value)
  const parts = host.split('.')
  if (parts.length <= 2) return host
  const secondLevel = parts[parts.length - 2]
  const keep = ['co', 'com', 'org', 'net', 'gov', 'ac'].includes(secondLevel) ? 3 : 2
  return parts.slice(-keep).join('.')
}

function breadcrumb(value) {
  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    const path = parts.length ? ` › ${parts.slice(0, 3).join(' › ')}` : ''
    return `${url.protocol}//${url.host}${path}`
  } catch {
    return value
  }
}
