import { useMemo, useState } from 'react'
import { APPS } from '../lib/appMeta.jsx'
import { useDesktop } from '../lib/store.jsx'
import Icon from '../icons.jsx'

export default function StartMenu() {
  const { openApp } = useDesktop()
  const [filter, setFilter] = useState('')

  const apps = useMemo(() => Object.values(APPS), [])
  const term = filter.trim().toLowerCase()
  const visible = apps.filter(
    (app) => !term || app.title.toLowerCase().includes(term) || app.description.toLowerCase().includes(term),
  )

  return (
    <div className="start-menu" role="dialog" aria-label="Start menu" onClick={(event) => event.stopPropagation()}>
      <label className="start-search">
        <Icon name="search" size={14} />
        <input
          autoFocus
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search apps"
          aria-label="Search apps"
        />
      </label>

      <div className="start-section">
        <span className="start-section-title">{term ? 'Results' : 'Pinned'}</span>
        <div className="start-grid">
          {visible.map((app) => (
            <button
              key={app.id}
              type="button"
              className="start-app"
              onClick={() => openApp(app.id)}
              data-testid={`start-${app.id}`}
            >
              <span className="start-app-art">
                <Icon name={app.icon} size={19} />
              </span>
              <span className="start-app-text">
                <span className="start-app-name">{app.title}</span>
                <span className="start-app-desc">{app.description}</span>
              </span>
            </button>
          ))}
          {visible.length === 0 ? <p className="start-empty">No apps match “{filter}”.</p> : null}
        </div>
      </div>

      <div className="start-footer">
        <span className="start-user">
          <span className="start-avatar">
            <Icon name="user" size={13} />
          </span>
          Angel
        </span>
        <span className="start-hint">Local profile</span>
        <span className="start-power" title="Web build — no power menu">
          <Icon name="power" size={15} />
        </span>
      </div>
    </div>
  )
}
