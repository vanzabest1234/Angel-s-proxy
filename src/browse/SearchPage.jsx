import { useEffect, useState } from 'react'
import { EngineMark, engineName } from '../icons.jsx'
import '../styles/search.css'

export default function SearchPage() {
  const params = new URLSearchParams(window.location.search)
  const engine = params.get('engine') === 'brave' ? 'brave' : 'ddg'
  const query = (params.get('q') || '').trim()
  const [state, setState] = useState({ status: query ? 'loading' : 'idle', data: null, error: null })

  useEffect(() => {
    document.body.classList.add('search-route')
    document.documentElement.dataset.engine = engine
    document.title = query ? `${query} — ${engineName(engine)}` : engineName(engine)
    return () => document.body.classList.remove('search-route')
  }, [engine, query])

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

  function runRelated(nextQuery) {
    window.parent?.postMessage({ type: 'angel:search', engine, q: nextQuery }, '*')
  }

  return (
    <div className="search-page" data-engine={engine}>
      <header className="sp-bar">
        <EngineMark engine={engine} size={22} />
        <span className="sp-name">{engineName(engine)}</span>
        <span className="sp-tag">{engine === 'ddg' ? 'Instant answers' : 'Web results'}</span>
      </header>

      <main className="sp-main">
        {query ? <h1 className="sp-query">{query}</h1> : null}
        {state.status === 'loading' ? <Skeleton /> : null}
        {state.status === 'error' ? <ErrorState error={state.error} engine={engine} /> : null}
        {state.status === 'done' ? <Results data={state.data} onRelated={runRelated} /> : null}
        {state.status === 'idle' ? <p className="sp-note">Type a search in the address bar above.</p> : null}
      </main>

      <footer className="sp-footer">
        {engineName(engine)} blocks direct embedding, so Angel Desktop renders its results inside this frame.
      </footer>
    </div>
  )
}

function Results({ data, onRelated }) {
  const results = data.results || []
  const related = data.related || []

  return (
    <>
      {data.note ? <p className="sp-note">{data.note}</p> : null}

      {results.length ? (
        <ol className="sp-results">
          {results.map((item, position) => (
            <li className="sp-result" key={`${item.url}-${position}`}>
              <a className="sp-result-title" href={item.url} target="_blank" rel="noreferrer noopener">
                {item.title || item.url}
              </a>
              <span className="sp-result-url">{prettyUrl(item.url)}</span>
              {item.snippet ? <p className="sp-result-snippet">{item.snippet}</p> : null}
              {item.source ? <span className="sp-result-source">{item.source}</span> : null}
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

function prettyUrl(value) {
  try {
    const url = new URL(value)
    return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return value
  }
}
