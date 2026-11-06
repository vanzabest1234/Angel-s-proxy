/* Accounts for Angel's Proxy: scrypt password hashes and cookie sessions kept
   in a JSON file next to the app. No dependencies, no external service. */

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SESSION_COOKIE = 'angel_proxy_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY = 20000;

const player = (user) => ({ id: user.id, name: user.name, email: user.email });

const hashPassword = (password, salt = randomBytes(16).toString('hex')) => ({
  salt,
  hash: scryptSync(password, salt, 64).toString('hex'),
});

const passwordMatches = (password, user) => {
  try {
    const attempt = scryptSync(password, user.salt, 64);
    const known = Buffer.from(user.hash, 'hex');
    return attempt.length === known.length && timingSafeEqual(attempt, known);
  } catch {
    return false;
  }
};

const cookieValue = (req, name) => {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
};

const sessionCookie = (token) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}`;

const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) return null;
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return null;
  }
}

export function createAuth({ dataDir }) {
  const storeFile = join(dataDir, 'accounts.json');
  let chain = Promise.resolve();

  const load = async () => {
    try {
      const data = JSON.parse(await readFile(storeFile, 'utf8'));
      const now = Date.now();
      const sessions = {};
      for (const [token, entry] of Object.entries(data.sessions || {})) {
        if (entry && entry.expires > now) sessions[token] = entry;
      }
      return {
        users: Array.isArray(data.users) ? data.users : [],
        sessions,
      };
    } catch {
      return { users: [], sessions: {} };
    }
  };

  const save = async (store) => {
    await mkdir(dataDir, { recursive: true });
    const tmp = `${storeFile}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(store, null, 2));
    await rename(tmp, storeFile);
  };

  /* Serialise mutations so two quick sign-ups cannot overwrite each other. */
  const mutate = (step) => {
    const run = chain.then(async () => {
      const store = await load();
      const result = await step(store);
      await save(store);
      return result;
    });
    chain = run.catch(() => {});
    return run;
  };

  const withSession = (store, user) => {
    const token = randomBytes(24).toString('hex');
    store.sessions[token] = { userId: user.id, expires: Date.now() + SESSION_MS };
    return token;
  };

  const currentUser = async (req) => {
    const token = cookieValue(req, SESSION_COOKIE);
    if (!token) return null;
    const store = await load();
    const session = store.sessions[token];
    if (!session) return null;
    return store.users.find((user) => user.id === session.userId) || null;
  };

  return async function handle(req, res, action, json) {
    if (action === 'me') {
      if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
      const user = await currentUser(req);
      if (!user) return json(res, 401, { error: 'Not signed in.' });
      return json(res, 200, { user: player(user) });
    }

    if (action === 'logout') {
      const token = cookieValue(req, SESSION_COOKIE);
      if (token) {
        await mutate((store) => {
          delete store.sessions[token];
        });
      }
      res.setHeader('set-cookie', clearCookie());
      return json(res, 200, { ok: true });
    }

    if (action !== 'signup' && action !== 'login') {
      return json(res, 404, { error: 'Unknown account action.' });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

    const body = await readJson(req);
    if (!body) return json(res, 400, { error: 'That request could not be read.' });

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!EMAIL.test(email)) return json(res, 400, { error: 'Enter a valid email address.' });
    if (password.length < 6) return json(res, 400, { error: 'Passwords need at least 6 characters.' });
    if (password.length > 200) return json(res, 400, { error: 'That password is too long.' });

    if (action === 'login') {
      const store = await load();
      const user = store.users.find((entry) => entry.email === email);
      if (!user || !passwordMatches(password, user)) {
        return json(res, 401, { error: 'That email and password do not match.' });
      }
      const token = await mutate((next) => withSession(next, user));
      res.setHeader('set-cookie', sessionCookie(token));
      return json(res, 200, { user: player(user) });
    }

    const name = String(body.name || '').trim();
    if (name.length > 40) return json(res, 400, { error: 'Keep the name under 40 characters.' });

    const outcome = await mutate((store) => {
      if (store.users.some((entry) => entry.email === email)) return { taken: true };
      const user = {
        id: randomUUID(),
        name: name || email.split('@')[0],
        email,
        ...hashPassword(password),
        created: new Date().toISOString(),
      };
      store.users.push(user);
      return { user, token: withSession(store, user) };
    });

    if (outcome.taken) return json(res, 409, { error: 'An account with that email already exists.' });

    res.setHeader('set-cookie', sessionCookie(outcome.token));
    return json(res, 201, { user: player(outcome.user) });
  };
}
