import { useEffect } from 'react'
import { APPS, PINNED_APPS } from '../lib/appMeta.jsx'
import { useDesktop } from '../lib/store.jsx'
import Icon from '../icons.jsx'
import Window from './Window.jsx'
import Taskbar from './Taskbar.jsx'
import StartMenu from './StartMenu.jsx'
import Browser from '../apps/Browser.jsx'
import Settings from '../apps/Settings.jsx'
import Notepad from '../apps/Notepad.jsx'
import '../styles/apps.css'

const APP_VIEWS = { browser: Browser, settings: Settings, notepad: Notepad }

export default function Desktop() {
  const {
    settings,
    windows,
    activeId,
    startOpen,
    openApp,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    closeStart,
  } = useDesktop()

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') closeStart()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeStart])

  return (
    <div className="desktop" style={{ '--accent': settings.accent }}>
      <div className="wallpaper" data-theme={settings.wallpaper} onClick={closeStart} />

      <div className="desktop-icons">
        {PINNED_APPS.map((appId) => {
          const meta = APPS[appId]
          return (
            <button
              key={appId}
              type="button"
              className="desktop-icon"
              title={`${meta.title} — double-click to open`}
              onDoubleClick={() => openApp(appId)}
            >
              <span className="desktop-icon-art">
                <Icon name={meta.icon} size={24} />
              </span>
              <span className="desktop-icon-label">{meta.title}</span>
            </button>
          )
        })}
      </div>

      {windows.map((win) => {
        const View = APP_VIEWS[win.app]
        return (
          <Window
            key={win.id}
            win={win}
            meta={APPS[win.app]}
            active={win.id === activeId}
            onFocus={() => focusWindow(win.id)}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onMaximize={() => toggleMaximize(win.id)}
            onMove={(x, y) => moveWindow(win.id, x, y)}
          >
            <View />
          </Window>
        )
      })}

      {startOpen ? <StartMenu /> : null}
      <Taskbar />
    </div>
  )
}
