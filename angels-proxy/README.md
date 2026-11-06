# Angel's Proxy

A darker, account-protected take on the Angel's Windows desktop. Same code, same
apps — no AI Studio and no games.

## What is inside

- `index.html` — the desktop shell (start menu, taskbar, windows)
- `theme.css` — the dark skin, loaded after the shared styles
- `auth.js` — the sign-in / create-account gate
- `apps.js`, `app.js`, `apps/*` — the apps: Browser, This PC, README, Notes,
  Store, Calculator, Calendar, Weather, Terminal, Settings
- `server.mjs` — static files, `/read` page reader, `/img` image proxy and the
  account API; mounted by the repository server at `/angels-proxy/`
- `server/auth.mjs` — accounts (scrypt hashes) and cookie sessions
- `server/read.mjs` — turns a fetched page into the text blocks the Browser shows

## Accounts

Sign-up and sign-in are handled by `server/auth.mjs`. Accounts live in
`data/accounts.json` (git-ignored) with a scrypt hash and a random salt per
user; sessions are 30-day `HttpOnly` cookies. Set `ANGEL_DATA_DIR` to keep the
file somewhere else.

The gate is what the desktop opens behind — the files themselves are static, so
treat this as a private desktop, not a hardened multi-tenant app.

## Running it

Through the repository server, on the same port as the rest of the site:

    node serve.mjs          # then open /angels-proxy/

On its own:

    node angels-proxy/serve.mjs      # PORT defaults to 5100

No build step and no dependencies — Node 20+ only.
