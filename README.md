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

DuckDuckGo returns its real web result list, scraped server-side from `duckduckgo.com/html/`
(`html.duckduckgo.com/html/` as a second attempt). DuckDuckGo throttles datacenter traffic, so when
both attempts are challenged the same query falls back to Bing's organic results — the page says
which one answered. Clicking a result opens it inside the browser window through the page proxy;
ctrl/cmd-click opens the original site in a new tab.

## Opening web addresses

The address bar accepts a URL as well as a query: type `wikipedia.org` or `news.ycombinator.com`
and the page opens inside the browser frame. Because almost every site refuses to be framed, the
API service fetches the page at `GET /api/page?url=…` and injects a `<base href>` so the page's own
styles, images and scripts load.

Pages keep their scripts and inline handlers, so JavaScript-driven sites are interactive. The frame
mounts proxied pages with a `sandbox` attribute (no `allow-same-origin`), which gives them an opaque
origin: their script runs, but it cannot reach Angel Desktop's origin, storage or settings. A site
that hard-requires first-party cookies or storage may still misbehave.

Local and private addresses (`localhost`, `127.0.0.1`, `10.*`, `192.168.*`, …) are rejected, and
unreachable or invalid addresses get a styled error page inside the frame.

Server-side scraping of either engine's HTML is not used: both block datacenter traffic with bot
challenges.

## Windows packaging

This is the web build of the app. Wrapping it in Electron or Tauri to ship a Windows desktop
installer is a later step; everything in `src/` is plain React and runs unchanged inside either
wrapper.
