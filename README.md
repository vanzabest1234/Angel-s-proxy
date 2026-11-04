# Angel Desktop

A Windows 11-style desktop that runs in the browser: wallpaper, taskbar, Start menu, draggable
windows, and a Browser that searches with **DuckDuckGo** or **Brave**.

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d
```

Then open <http://localhost:3000>.

Services:

- `web` — Vite dev server on port 3000 (hot reload) with `/api` proxied to the API service.
- `api` — small dependency-free Node service exposing `GET /api/search?engine=ddg|brave&q=…`.

## Search engines

DuckDuckGo and Brave both send `frame-ancestors 'self'`, so neither one can be embedded in an
iframe. The Browser therefore loads the results page from the app's own origin (`/search`) and
renders that engine's results inside the page frame, with the engine's brand and colours.

- **DuckDuckGo** — public instant-answer API. No key required; returns abstracts, results and
  related topics, plus related-search suggestions.
- **Brave** — Brave Search API. Needs a free subscription token stored as `BRAVE_SEARCH_API_KEY`
  (see `.base44/environment.json`). Without the key the Brave page explains how to add one.

## Opening web addresses

The address bar accepts a URL as well as a query: type `wikipedia.org` or `news.ycombinator.com`
and the page opens inside the browser frame. Because almost every site refuses to be framed, the
API service fetches the page at `GET /api/page?url=…`, injects a `<base href>` so the page's own
styles and images load, and strips the site's scripts and inline handlers — so a remote page can
never touch Angel Desktop's origin, storage or settings. Pages therefore render read-only; the
browser shows a notice with an "Open original" link.

Local and private addresses (`localhost`, `127.0.0.1`, `10.*`, `192.168.*`, …) are rejected, and
unreachable or invalid addresses get a styled error page inside the frame.

Server-side scraping of either engine's HTML is not used: both block datacenter traffic with bot
challenges.

## Windows packaging

This is the web build of the app. Wrapping it in Electron or Tauri to ship a Windows desktop
installer is a later step; everything in `src/` is plain React and runs unchanged inside either
wrapper.
