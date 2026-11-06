/* Angel's Proxy server: the desktop files, the page reader and the account API.
   Mounted by the repository server at /angels-proxy/, or run on its own with
   `node angels-proxy/serve.mjs`. */

import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from './server/auth.mjs';
import { image, readPage } from './server/read.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ANGEL_DATA_DIR || join(ROOT, 'data');
const SKIP = new Set(['.git', 'node_modules', 'data', 'server']);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const auth = createAuth({ dataDir: DATA_DIR });

const json = (res, code, data) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};

const inside = (file) => file === ROOT || file.startsWith(ROOT + '/');

async function walk(dir, depth = 0, out = []) {
  if (depth > 3) return out;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full);
    const info = await stat(full);
    if (entry.isDirectory()) {
      out.push({ path: rel, dir: true, size: 0 });
      await walk(full, depth + 1, out);
    } else {
      out.push({ path: rel, dir: false, size: info.size });
    }
  }
  return out;
}

async function sendFile(res, rel) {
  const file = join(ROOT, normalize(rel).replace(/^(\.\.(\/|\\|$))+/, ''));
  if (!inside(file)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    return res.end('forbidden');
  }

  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const buf = await readFile(target);
    res.writeHead(200, {
      'content-type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    return res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('not found');
  }
}

export async function handle(req, res, base = '') {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);

  if (base && path === base) {
    res.writeHead(302, { location: `${base}/` });
    return res.end();
  }

  const rel = (base && path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path.replace(/^\/+/, '')) || 'index.html';

  if (rel === 'read') return readPage(res, url.searchParams.get('url') || '', json);
  if (rel === 'img') return image(res, url.searchParams.get('url') || '', url.searchParams.get('ref') || '', json);

  if (rel.startsWith('api/auth/')) {
    return auth(req, res, rel.slice('api/auth/'.length), json);
  }

  if (rel === 'api/files') {
    try {
      const items = await walk(ROOT);
      items.sort((a, b) => (a.dir === b.dir ? a.path.localeCompare(b.path) : a.dir ? -1 : 1));
      return json(res, 200, items);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (rel === 'api/file') {
    const wanted = normalize(url.searchParams.get('path') || '').replace(/^(\.\.(\/|\\|$))+/, '');
    const file = join(ROOT, wanted);
    if (!inside(file)) return json(res, 403, { error: 'forbidden' });
    try {
      const buf = await readFile(file);
      const binary = buf.includes(0);
      return json(res, 200, {
        path: wanted,
        size: buf.length,
        binary,
        content: binary ? '' : buf.toString('utf8').slice(0, 200000),
      });
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
  }

  return sendFile(res, rel);
}
