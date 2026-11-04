import { useEffect, useRef, useState } from 'react'
import { useDesktop } from '../lib/store.jsx'
import Icon, { EngineMark, engineName } from '../icons.jsx'

const ENGINES = ['ddg', 'brave']

export default function Browser() {
  const { settings, updateSettings } = useDesktop()
  const [engine, setEngine] = useState(settings.engine === 'brave' ? 'brave' : 'ddg')
  const [entries, setEntries] = useState([])
  const [index, setIndex] = useState(-1)
  const [draft, setDraft] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const inputRef = useRef(null)

  const current = index >= 0 ? entries[index] : null

  function search(rawQuery, nextEngine = engine) {
    const q = rawQuery.trim()
    if (!q) return
    setEntries((list) => [...list.slice(0, index + 1), { q, engine: nextEngine }])
    setIndex((value) => value + 1)
    setDraft(q)
  }

  // The results frame asks the desktop to run a related search, so the
  // address bar, history and frame stay in sync.
  const searchRef = useRef(search)
  searchRef.current = search

  useEffect(() => {
    function onMessage(event) {
      const data = event.data
      if (!data || data.type !== 'angel:search' || typeof data.q !== 'string') return
      searchRef.current(data.q, data.engine === 'brave' ? 'brave' : 'ddg')
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
    setIndex(nextIndex)
    setDraft(entries[nextIndex].q)
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
    if (current) search(current.q, nextEngine)
  }

  const frameSrc = current
    ? `/search?engine=${current.engine}&q=${encodeURIComponent(current.q)}`
    : null

  return (
    <div className="browser">
      <div className="tabstrip">
        <div className="tab">
          <Icon name="globe" size={13} />
          <span className="tab-title">{current ? current.q : 'New tab'}</span>
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
          search(draft)
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
          <Icon name="search" size={14} />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Search ${engineName(engine)}`}
            aria-label="Search"
            data-testid="address-input"
          />
          <button type="submit" className="address-go" aria-label="Search" title="Search" data-testid="address-go">
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
        {frameSrc ? (
          <iframe
            key={`${frameSrc}-${reloadKey}`}
            className="browser-frame"
            title={`${engineName(current.engine)} results`}
            src={frameSrc}
            data-testid="results-frame"
          />
        ) : (
          <NewTab engine={engine} onSearch={search} onPickEngine={chooseEngine} />
        )}
      </div>
    </div>
  )
}

function NewTab({ engine, onSearch, onPickEngine }) {
  const [value, setValue] = useState('')

  return (
    <div className="newtab">
      <h1>Search the web</h1>
      <p className="newtab-sub">
        DuckDuckGo and Brave both refuse to load inside a frame, so their results render in this frame
        instead.
      </p>

      <form
        className="newtab-search"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch(value, engine)
        }}
      >
        <Icon name="search" size={16} />
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Search with ${engineName(engine)}`}
          aria-label="Search query"
          data-testid="newtab-input"
        />
        <button type="submit" className="newtab-go" aria-label="Search" title="Search" data-testid="newtab-go">
          <Icon name="forward" size={16} />
        </button>
      </form>

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
