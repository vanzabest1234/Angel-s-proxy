import { useEffect, useRef, useState } from 'react'
import { useDesktop } from '../lib/store.jsx'
import Icon, { EngineMark, engineName } from '../icons.jsx'

const ENGINES = ['ddg', 'brave']

const QUICK_LINKS = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Web_browser' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com/' },
  { label: 'example.com', url: 'https://example.com/' },
]

function toUrl(value) {
  const text = value.trim()
  if (!text || /\s/.test(text)) return null
  if (/^https?:\/\//i.test(text)) return text
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?|#|:)/.test(text)) return `https://${text}`
  return null
}

function entryTitle(entry) {
  if (!entry) return 'New tab'
  if (entry.kind === 'url') {
    try {
      return new URL(entry.url).hostname.replace(/^www\./, '')
    } catch {
      return entry.url
    }
  }
  return entry.q
}

export default function Browser() {
  const { settings, updateSettings } = useDesktop()
  const [engine, setEngine] = useState(settings.engine === 'brave' ? 'brave' : 'ddg')
  const [entries, setEntries] = useState([])
  const [index, setIndex] = useState(-1)
  const [draft, setDraft] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const inputRef = useRef(null)

  const current = index >= 0 ? entries[index] : null

  function pushEntry(entry) {
    setEntries((list) => [...list.slice(0, index + 1), entry])
    setIndex((value) => value + 1)
    setDraft(entry.kind === 'url' ? entry.url : entry.q)
  }

  function search(rawQuery, nextEngine = engine) {
    const q = rawQuery.trim()
    if (!q) return
    pushEntry({ kind: 'search', q, engine: nextEngine })
  }

  function openUrl(url) {
    pushEntry({ kind: 'url', url })
  }

  function submitInput(raw) {
    const asUrl = toUrl(raw)
    if (asUrl) openUrl(asUrl)
    else search(raw)
  }

  // The results frame asks the desktop to run a related search, so the
  // address bar, history and frame stay in sync.
  const submitRef = useRef(submitInput)
  submitRef.current = submitInput
  const openRef = useRef(openUrl)
  openRef.current = openUrl

  useEffect(() => {
    function onMessage(event) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'angel:search' && typeof data.q === 'string') {
        submitRef.current(data.q)
      }
      if (data.type === 'angel:open' && typeof data.url === 'string') {
        openRef.current(data.url)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function step(delta) {
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= entries.length) return
    const entry = entries[nextIndex]
    setIndex(nextIndex)
    setDraft(entry.kind === 'url' ? entry.url : entry.q)
  }

  function newTab() {
    setEntries([])
    setIndex(-1)
    setDraft('')
    inputRef.current?.focus()
  }

  function chooseEngine(nextEngine) {
    setEngine(nextEngine)
    updateSettings({ engine: nextEngine })
    if (current?.kind === 'search') search(current.q, nextEngine)
  }

  const frameSrc = !current
    ? null
    : current.kind === 'url'
      ? `/api/page?url=${encodeURIComponent(current.url)}`
      : `/search?engine=${current.engine}&q=${encodeURIComponent(current.q)}`

  return (
    <div className="browser">
      <div className="tabstrip">
        <div className="tab">
          <Icon name="globe" size={13} />
          <span className="tab-title">{entryTitle(current)}</span>
          <button type="button" className="tab-close" aria-label="Close tab" onClick={newTab}>
            <Icon name="close" size={11} />
          </button>
        </div>
        <button type="button" className="tab-new" aria-label="New tab" title="New tab" onClick={newTab}>
          <Icon name="plus" size={13} />
        </button>
      </div>

      <form
        className="browser-toolbar"
        onSubmit={(event) => {
          event.preventDefault()
          submitInput(draft)
        }}
      >
        <div className="browser-nav">
          <button
            type="button"
            className="nav-button"
            aria-label="Back"
            onClick={() => step(-1)}
            disabled={index <= 0}
          >
            <Icon name="back" size={15} />
          </button>
          <button
            type="button"
            className="nav-button"
            aria-label="Forward"
            onClick={() => step(1)}
            disabled={index >= entries.length - 1}
          >
            <Icon name="forward" size={15} />
          </button>
          <button
            type="button"
            className="nav-button"
            aria-label="Reload"
            title="Reload"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            <Icon name="reload" size={15} />
          </button>
        </div>

        <label className="address-form">
          <Icon name={current?.kind === 'url' ? 'globe' : 'search'} size={14} />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search or enter a web address"
            aria-label="Search or address"
            data-testid="address-input"
          />
          <button type="submit" className="address-go" aria-label="Go" title="Go" data-testid="address-go">
            <Icon name="forward" size={14} />
          </button>
        </label>

        <div className="engine-switch" role="group" aria-label="Search engine">
          {ENGINES.map((id) => (
            <button
              key={id}
              type="button"
              className="engine-option"
              aria-pressed={engine === id}
              onClick={() => chooseEngine(id)}
              data-testid={`engine-${id}`}
            >
              <EngineMark engine={id} size={14} />
              {engineName(id)}
            </button>
          ))}
        </div>
      </form>

      <div className="browser-page">
        {current?.kind === 'url' ? (
          <div className="page-notice">
            <span>
              Read-only view — scripts are off, so sites that need JavaScript (like YouTube) may look
              empty here.
            </span>
            <a href={current.url} target="_blank" rel="noreferrer noopener">
              Open original
            </a>
          </div>
        ) : null}

        {frameSrc ? (
          <iframe
            key={`${frameSrc}-${reloadKey}`}
            className="browser-frame"
            title={entryTitle(current)}
            src={frameSrc}
            data-testid="results-frame"
          />
        ) : (
          <NewTab engine={engine} onSubmit={submitInput} onPickEngine={chooseEngine} />
        )}
      </div>
    </div>
  )
}

function NewTab({ engine, onSubmit, onPickEngine }) {
  const [value, setValue] = useState('')

  return (
    <div className="newtab">
      <h1>Search the web</h1>
      <p className="newtab-sub">
        Search with DuckDuckGo or Brave, or type any web address to open it here.
      </p>

      <form
        className="newtab-search"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(value)
        }}
      >
        <Icon name="search" size={16} />
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search or enter a web address"
          aria-label="Search or address"
          data-testid="newtab-input"
        />
        <button type="submit" className="newtab-go" aria-label="Go" title="Go" data-testid="newtab-go">
          <Icon name="forward" size={16} />
        </button>
      </form>

      <div className="newtab-links">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.url}
            type="button"
            className="newtab-link"
            onClick={() => onSubmit(link.url)}
            data-testid={`quick-${link.label.toLowerCase().replace(/[^a-z]/g, '')}`}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="newtab-engines">
        {ENGINES.map((id) => (
          <button
            key={id}
            type="button"
            className="engine-card"
            aria-pressed={engine === id}
            onClick={() => onPickEngine(id)}
            data-testid={`card-${id}`}
          >
            <span className="engine-card-head">
              <EngineMark engine={id} size={18} />
              {engineName(id)}
            </span>
            <span className="engine-card-desc">
              {id === 'ddg'
                ? 'Instant answers straight from DuckDuckGo — no key needed.'
                : 'Full web results through the Brave Search API. Needs a free API key.'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
