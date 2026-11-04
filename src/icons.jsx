const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const PATHS = {
  windows: (
    <g fill="currentColor">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </g>
  ),
  globe: (
    <g {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.6 3.9 5.7 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.7-3.9-9S9.4 5.6 12 3Z" />
    </g>
  ),
  settings: (
    <g {...STROKE}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.66 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.54h.08A1.7 1.7 0 0 0 10.1 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z" />
    </g>
  ),
  notepad: (
    <g {...STROKE}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </g>
  ),
  search: (
    <g {...STROKE}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </g>
  ),
  back: (
    <g {...STROKE}>
      <path d="M15 5 8 12l7 7" />
    </g>
  ),
  forward: (
    <g {...STROKE}>
      <path d="m9 5 7 7-7 7" />
    </g>
  ),
  reload: (
    <g {...STROKE}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </g>
  ),
  plus: (
    <g {...STROKE}>
      <path d="M12 5v14M5 12h14" />
    </g>
  ),
  close: (
    <g {...STROKE}>
      <path d="M6 6l12 12M18 6 6 18" />
    </g>
  ),
  minimize: (
    <g {...STROKE}>
      <path d="M5 12h14" />
    </g>
  ),
  maximize: <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" {...STROKE} />,
  restore: (
    <g {...STROKE}>
      <rect x="4.5" y="7.5" width="11" height="11" rx="1.5" />
      <path d="M8.5 7.5V5.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2" />
    </g>
  ),
  power: (
    <g {...STROKE}>
      <path d="M12 4v8" />
      <path d="M7.5 7a7 7 0 1 0 9 0" />
    </g>
  ),
  user: (
    <g {...STROKE}>
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5 20c1.3-3.2 3.9-4.8 7-4.8s5.7 1.6 7 4.8" />
    </g>
  ),
  palette: (
    <g {...STROKE}>
      <path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3.4-3.6 3.4h-1.6a2 2 0 0 0-1.5 3.3A1.8 1.8 0 0 1 12 21Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </g>
  ),
  image: (
    <g {...STROKE}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="m5 17 4.5-4.5 3 3L16 12l3.5 3.5" />
    </g>
  ),
  sparkle: (
    <g {...STROKE}>
      <path d="M12 4l1.8 4.7L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.3Z" />
    </g>
  ),
}

export default function Icon({ name, size = 16, className = '', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name] || PATHS.globe}
    </svg>
  )
}

const ENGINE_BRAND = {
  ddg: { color: '#de5833', letter: 'D', name: 'DuckDuckGo' },
  brave: { color: '#fb542b', letter: 'B', name: 'Brave' },
}

export function EngineMark({ engine = 'ddg', size = 16 }) {
  const brand = ENGINE_BRAND[engine === 'brave' ? 'brave' : 'ddg']
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="engine-mark">
      <rect x="1" y="1" width="22" height="22" rx="7" fill={brand.color} />
      <text
        x="12"
        y="16.6"
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="700"
        fill="#fff"
        fontFamily="Segoe UI, Arial, sans-serif"
      >
        {brand.letter}
      </text>
    </svg>
  )
}

export function engineName(engine) {
  return ENGINE_BRAND[engine === 'brave' ? 'brave' : 'ddg'].name
}
