import { useEffect, useState } from 'react'

const STORAGE_KEY = 'angel-desktop.notepad.v1'

export default function Notepad() {
  const [text, setText] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    setSaved(false)
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, text)
      } catch {
        /* storage unavailable */
      }
      setSaved(true)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [text])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="notepad">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Start typing — notes save automatically on this PC."
        aria-label="Notepad text"
      />
      <div className="notepad-status">
        <span>{saved ? 'Saved' : 'Saving…'}</span>
        <span>
          {words} {words === 1 ? 'word' : 'words'} · {text.length} characters
        </span>
      </div>
    </div>
  )
}
