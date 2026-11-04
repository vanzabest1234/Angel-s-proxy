import { useState } from 'react'
import { ACCENTS, WALLPAPERS } from '../lib/appMeta.jsx'
import { useDesktop } from '../lib/store.jsx'
import Icon, { EngineMark, engineName } from '../icons.jsx'

const TABS = [
  { id: 'personalization', label: 'Personalization', icon: 'palette' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'about', label: 'About', icon: 'sparkle' },
]

export default function Settings() {
  const { settings, updateSettings } = useDesktop()
  const [tab, setTab] = useState('personalization')

  return (
    <div className="settings">
      <nav className="settings-nav" aria-label="Settings sections">
        <span className="settings-nav-title">Settings</span>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`settings-tab ${tab === item.id ? 'is-active' : ''}`}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            data-testid={`settings-tab-${item.id}`}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="settings-panel">
        {tab === 'personalization' ? (
          <>
            <h2>Personalization</h2>
            <section className="settings-block">
              <h3>Accent color</h3>
              <div className="swatches">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent.value}
                    type="button"
                    className="swatch"
                    style={{ background: accent.value }}
                    aria-label={accent.name}
                    aria-pressed={settings.accent === accent.value}
                    title={accent.name}
                    onClick={() => updateSettings({ accent: accent.value })}
                    data-testid={`accent-${accent.name.toLowerCase()}`}
                  />
                ))}
              </div>
              <p className="settings-hint">
                Highlights the taskbar indicator, focus rings and Start menu avatars.
              </p>
            </section>

            <section className="settings-block">
              <h3>Wallpaper</h3>
              <div className="wallpaper-options">
                {WALLPAPERS.map((wallpaper) => (
                  <button
                    key={wallpaper.value}
                    type="button"
                    className="wallpaper-option"
                    aria-pressed={settings.wallpaper === wallpaper.value}
                    onClick={() => updateSettings({ wallpaper: wallpaper.value })}
                    data-testid={`wallpaper-${wallpaper.value}`}
                  >
                    <span className="wp-swatch" data-theme={wallpaper.value} />
                    <small>{wallpaper.name}</small>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {tab === 'search' ? (
          <>
            <h2>Search</h2>
            <section className="settings-block">
              <h3>Default engine</h3>
              <div className="engine-choice">
                {['ddg', 'brave'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="engine-choice-option"
                    aria-pressed={settings.engine === id}
                    onClick={() => updateSettings({ engine: id })}
                    data-testid={`default-engine-${id}`}
                  >
                    <EngineMark engine={id} size={16} />
                    {engineName(id)}
                  </button>
                ))}
              </div>
              <p className="settings-hint">
                The browser uses this engine for new tabs. You can still switch engines in its toolbar.
              </p>
            </section>

            <section className="settings-block">
              <h3>How the engines are wired</h3>
              <p className="settings-hint">
                DuckDuckGo answers come from its public instant-answer API and need no key. Brave web
                results use the Brave Search API with a free <code>BRAVE_SEARCH_API_KEY</code> secret.
                Neither engine permits being embedded directly, so the browser renders their results in
                the page frame.
              </p>
            </section>
          </>
        ) : null}

        {tab === 'about' ? (
          <>
            <h2>About</h2>
            <section className="settings-block">
              <div className="settings-meta">
                <span>Angel Desktop</span>
                <span>Version 0.1.0</span>
              </div>
              <div className="settings-meta">
                <span>Build</span>
                <span>Web app — Windows wrapper comes later</span>
              </div>
              <div className="settings-meta">
                <span>Search engines</span>
                <span>DuckDuckGo · Brave</span>
              </div>
              <p className="settings-hint">
                Everything here runs in the browser and stores settings on this machine. Packaging it as
                a Windows desktop app (Electron or Tauri) is the next step.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
