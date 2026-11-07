import { useRef } from 'react'
import Icon from '../icons.jsx'

export default function Window({ win, meta, active, onFocus, onClose, onMinimize, onMaximize, onMove, children }) {
  const drag = useRef(null)

  if (win.minimized) return null

  function startDrag(event) {
    onFocus()
    if (win.maximized || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: win.x,
      originY: win.y,
    }
  }

  function moveDrag(event) {
    const state = drag.current
    if (!state) return
    const x = Math.min(
      Math.max(state.originX + event.clientX - state.startX, -win.w + 160),
      window.innerWidth - 160,
    )
    const y = Math.min(Math.max(state.originY + event.clientY - state.startY, 0), window.innerHeight - 88)
    onMove(x, y)
  }

  function endDrag(event) {
    if (!drag.current) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const style = win.maximized
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 48px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      className={`window ${active ? 'is-active' : ''} ${win.maximized ? 'is-maximized' : ''}`}
      style={style}
      aria-label={`${meta.title} window`}
      onPointerDown={onFocus}
    >
      <header className="titlebar" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onDoubleClick={onMaximize}>
        <span className="titlebar-icon">
          <Icon name={meta.icon} size={14} />
        </span>
        <span className="titlebar-title">{win.title}</span>
        <div className="titlebar-buttons">
          <button type="button" className="win-button" aria-label="Minimize" title="Minimize" onClick={onMinimize}>
            <Icon name="minimize" size={12} />
          </button>
          <button
            type="button"
            className="win-button"
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
            title={win.maximized ? 'Restore' : 'Maximize'}
            onClick={onMaximize}
          >
            <Icon name={win.maximized ? 'restore' : 'maximize'} size={12} />
          </button>
          <button type="button" className="win-button is-close" aria-label="Close" title="Close" onClick={onClose}>
            <Icon name="close" size={12} />
          </button>
        </div>
      </header>
      <div className="window-body">{children}</div>
    </section>
  )
}
