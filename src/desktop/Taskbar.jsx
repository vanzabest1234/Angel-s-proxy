import { useEffect, useState } from 'react'
import { APPS, PINNED_APPS } from '../lib/appMeta.jsx'
import { useDesktop } from '../lib/store.jsx'
import Icon from '../icons.jsx'

export default function Taskbar() {
  const { windows, activeId, openApp, focusWindow, toggleStart, startOpen } = useDesktop()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 20000)
    return () => window.clearInterval(timer)
  }, [])

  function activate(appId) {
    const win = windows.find((item) => item.app === appId)
    if (win) focusWindow(win.id)
    else openApp(appId)
  }

  return (
    <div className="taskbar" role="toolbar" aria-label="Taskbar">
      <button
        type="button"
        className={`taskbar-start ${startOpen ? 'is-open' : ''}`}
        onClick={toggleStart}
        aria-label="Start"
        aria-expanded={startOpen}
        data-testid="start-button"
      >
        <Icon name="windows" size={19} />
      </button>
      <span className="taskbar-divider" />
      <div className="taskbar-apps">
        {PINNED_APPS.map((appId) => {
          const meta = APPS[appId]
          const win = windows.find((item) => item.app === appId)
          const active = Boolean(win) && win.id === activeId && !win.minimized
          return (
            <button
              key={appId}
              type="button"
              className={`taskbar-app ${win ? 'is-running' : ''} ${active ? 'is-active' : ''}`}
              onClick={() => activate(appId)}
              title={meta.title}
              aria-label={meta.title}
              data-testid={`task-${appId}`}
            >
              <Icon name={meta.icon} size={21} />
              {win ? <span className="taskbar-indicator" /> : null}
            </button>
          )
        })}
      </div>
      <div className="tray" aria-label="Clock">
        <span className="tray-time">
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
        <span className="tray-date">
          {now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
