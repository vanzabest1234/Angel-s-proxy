import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { APPS } from './appMeta.jsx'

const SETTINGS_KEY = 'angel-desktop.settings.v1'
const DEFAULT_SETTINGS = { engine: 'ddg', accent: '#4cc2ff', wallpaper: 'bloom' }

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

const DesktopContext = createContext(null)

export function DesktopProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)
  const [windows, setWindows] = useState([])
  const [startOpen, setStartOpen] = useState(false)
  const nextId = useRef(1)
  const nextZ = useRef(10)

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSettings = useCallback((patch) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const focusWindow = useCallback((id) => {
    setWindows((list) =>
      list.map((win) => (win.id === id ? { ...win, minimized: false, z: (nextZ.current += 1) } : win)),
    )
  }, [])

  const openApp = useCallback((appId) => {
    const meta = APPS[appId]
    if (!meta) return
    setStartOpen(false)
    setWindows((list) => {
      const existing = list.find((win) => win.app === appId)
      if (existing) {
        return list.map((win) =>
          win.id === existing.id ? { ...win, minimized: false, z: (nextZ.current += 1) } : win,
        )
      }
      const offset = list.length * 28
      return [
        ...list,
        {
          id: `win-${nextId.current++}`,
          app: appId,
          title: meta.title,
          x: 132 + offset,
          y: 64 + offset,
          w: meta.width,
          h: meta.height,
          z: (nextZ.current += 1),
          minimized: false,
          maximized: false,
        },
      ]
    })
  }, [])

  const closeWindow = useCallback((id) => {
    setWindows((list) => list.filter((win) => win.id !== id))
  }, [])

  const minimizeWindow = useCallback((id) => {
    setWindows((list) => list.map((win) => (win.id === id ? { ...win, minimized: true } : win)))
  }, [])

  const toggleMaximize = useCallback((id) => {
    setWindows((list) =>
      list.map((win) =>
        win.id === id ? { ...win, maximized: !win.maximized, z: (nextZ.current += 1) } : win,
      ),
    )
  }, [])

  const moveWindow = useCallback((id, x, y) => {
    setWindows((list) => list.map((win) => (win.id === id ? { ...win, x, y } : win)))
  }, [])

  const toggleStart = useCallback(() => setStartOpen((open) => !open), [])
  const closeStart = useCallback(() => setStartOpen(false), [])

  const visible = windows.filter((win) => !win.minimized)
  const activeId = visible.length ? visible.reduce((top, win) => (win.z > top.z ? win : top)).id : null

  const value = {
    settings,
    updateSettings,
    windows,
    activeId,
    startOpen,
    openApp,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    toggleStart,
    closeStart,
  }

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>
}

export function useDesktop() {
  const context = useContext(DesktopContext)
  if (!context) throw new Error('useDesktop must be used inside DesktopProvider')
  return context
}
