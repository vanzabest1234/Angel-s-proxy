import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.env.APP_ROOT || '/workspace';
const SKIP = new Set(['.git', 'node_modules', '.next', 'dist', '.cache', '.base44']);

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

const json = (res, code, data) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};

const inside = (file) => file === ROOT || file.startsWith(ROOT + '/');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\])/i;

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const decode = (s) => s
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));

const textOf = (frag) => decode(frag.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

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

const sanitize = (html) => html
  .replace(/<(script|style|noscript|svg|iframe|template|form|button|select|input|textarea|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<(script|style|iframe|input|link|meta|br)\b[^>]*>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

const IMAGE_SKIP = /(sprite|spacer|pixel|blank\.|1x1|icon|favicon|avatar)/i;

function blocksOf(html, base) {
  const out = [];
  const re = /<(h[1-4]|p|li|blockquote|pre|img)\b([^>]*)>/gi;
  const src = sanitize(html);
  let match;
  let last = '';

  while ((match = re.exec(src)) && out.length < 160) {
    const tag = match[1].toLowerCase();

    if (tag === 'img') {
      const raw = (match[2].match(/\bsrc=["']([^"']+)["']/i) || [])[1];
      if (!raw || /^(data|blob):/i.test(raw) || IMAGE_SKIP.test(raw)) continue;
      const width = Number((match[2].match(/\bwidth=["']?(\d+)/i) || [])[1] || 0);
      if (width && width < 80) continue;
      let href;
      try { href = new URL(decode(raw), base).href; } catch { continue; }
      if (!/^https?:/i.test(href)) continue;
      out.push({ t: 'img', src: href, alt: decode((match[2].match(/\balt=["']([^"']*)["']/i) || [])[1] || '') });
      continue;
    }

    const close = src.toLowerCase().indexOf(`</${tag}>`, re.lastIndex);
    if (close === -1) continue;
    const text = textOf(src.slice(re.lastIndex, close));
    re.lastIndex = close + tag.length + 3;
    if (!text || text === last) continue;

    last = text;
    if (tag === 'pre') out.push({ t: 'pre', text: text.slice(0, 2000) });
    else if (tag === 'blockquote') out.push({ t: 'q', text: text.slice(0, 1200) });
    else if (tag === 'li') out.push({ t: 'li', text: text.slice(0, 600) });
    else if (tag.startsWith('h') && text.length < 200) out.push({ t: 'h', level: Number(tag[1]), text });
    else if (text.length > 24) out.push({ t: 'p', text: text.slice(0, 4000) });
  }

  return out;
}

function extract(html, dest) {
  const title = decode((html.match(/<title[^>]*>([^<]*)/i) || [, ''])[1]).replace(/\s+/g, ' ').trim();
  const article = html.match(/<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i);
  let blocks = article ? blocksOf(article[2], dest.href) : [];
  const weight = blocks.reduce((total, b) => total + (b.text ? b.text.length : 60), 0);

  if (weight < 300) {
    blocks = blocksOf((html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1], dest.href);
  }

  const start = blocks.findIndex((b) => (b.t === 'p' && b.text.length > 90) || (b.t === 'h' && b.text.length > 3));
  const trimmed = start > 0 ? blocks.slice(start) : blocks;
  return {
    blocks: trimmed,
    title: title || dest.hostname,
    site: dest.hostname,
    ...(trimmed.length ? {} : { note: 'There is no readable text on this page. Open the real page to see it.' }),
  };
}

async function readPage(res, target) {
  let dest;
  try { dest = new URL(target); } catch { return json(res, 400, { error: 'bad url' }); }
  if (!/^https?:$/.test(dest.protocol) || PRIVATE.test(dest.hostname)) return json(res, 400, { error: 'blocked' });

  try {
    const upstream = await fetch(dest.href, {
      redirect: 'follow',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const type = upstream.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) {
      return json(res, 200, {
        url: dest.href,
        title: dest.pathname.split('/').pop() || dest.hostname,
        site: dest.hostname,
        blocks: [],
        note: `That address is a ${type.split(';')[0] || 'file'}, not a page.`,
      });
    }
    const html = (await upstream.text()).slice(0, 900000);
    return json(res, 200, { url: dest.href, ...extract(html, dest) });
  } catch {
    return json(res, 200, { url: dest.href, title: dest.hostname, site: dest.hostname, blocks: [], note: 'The site did not answer.' });
  }
}

async function image(res, target, referer) {
  let dest;
  try { dest = new URL(target); } catch { return json(res, 400, { error: 'bad url' }); }
  if (!/^https?:$/.test(dest.protocol) || PRIVATE.test(dest.hostname)) return json(res, 400, { error: 'blocked' });

  try {
    const upstream = await fetch(dest.href, {
      headers: {
        'user-agent': UA,
        accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        ...(referer ? { referer } : {}),
      },
    });
    const type = upstream.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//i.test(type)) return json(res, 404, { error: 'not an image' });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=600' });
    return res.end(buf);
  } catch {
    return json(res, 502, { error: 'image failed' });
  }
}

/* ---------- AI providers ---------- */
const AI_MODEL_IDS = {
  claude: { 'Claude Sonnet 4.5': 'claude-sonnet-4-5', 'Claude Opus 4.1': 'claude-opus-4-1', 'Claude Haiku 3.5': 'claude-3-5-haiku-latest' },
  chatgpt: { 'GPT-5': 'gpt-5', 'GPT-4.1': 'gpt-4.1', 'o4-mini': 'o4-mini' },
  gemini: { 'Gemini 2.5 Pro': 'gemini-2.5-pro', 'Gemini 2.5 Flash': 'gemini-2.5-flash', 'Gemini 2.0 Flash': 'gemini-2.0-flash' },
};
const AI_LABEL = { claude: 'Anthropic (Claude)', chatgpt: 'OpenAI', gemini: 'Google (Gemini)' };

const aiKeys = () => ({
  claude: (process.env.ANTHROPIC_API_KEY || '').trim(),
  chatgpt: (process.env.OPENAI_API_KEY || '').trim(),
  gemini: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim(),
});

const aiStatus = () => Object.fromEntries(Object.entries(aiKeys()).map(([id, key]) => [id, Boolean(key)]));

const aiMessages = (raw) => (Array.isArray(raw) ? raw : [])
  .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
  .slice(-12)
  .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

async function aiReply(provider, model, messages) {
  const key = aiKeys()[provider];
  const models = AI_MODEL_IDS[provider];
  const id = models[model] || Object.values(models)[0];
  const signal = AbortSignal.timeout(60000);

  if (provider === 'claude') {
    const turns = messages[0].role === 'assistant' ? messages.slice(1) : messages;
    if (!turns.length) throw new Error('Nothing to send.');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: id, max_tokens: 1024, messages: turns }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error?.message || `Claude returned ${r.status}`);
    return (data.content || []).filter((part) => part.type === 'text').map((part) => part.text).join('\n').trim();
  }

  if (provider === 'chatgpt') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: id, messages }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error?.message || `OpenAI returned ${r.status}`);
    return (data.choices?.[0]?.message?.content || '').trim();
  }

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error?.message || `Gemini returned ${r.status}`);
  return (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('').trim();
}

async function handleAi(req, res) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 400000) return json(res, 413, { error: 'Message too large.' });
  }
  let body;
  try { body = JSON.parse(raw || '{}'); } catch { return json(res, 400, { error: 'Bad request.' }); }

  const provider = String(body.provider || '');
  if (!(provider in AI_MODEL_IDS)) return json(res, 400, { error: 'Unknown assistant.' });
  if (!aiKeys()[provider]) return json(res, 501, { error: `${AI_LABEL[provider]} is not connected — add its API key in the app secrets.` });

  const messages = aiMessages(body.messages);
  if (!messages.length) return json(res, 400, { error: 'Nothing to send.' });

  try {
    const reply = await aiReply(provider, String(body.model || ''), messages);
    if (!reply) return json(res, 502, { error: 'The assistant returned an empty reply.' });
    return json(res, 200, { reply });
  } catch (err) {
    return json(res, 502, { error: err.message || 'The assistant could not be reached.' });
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);

  if (path === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }

  if (path === '/api/ai/status') {
    return json(res, 200, { configured: aiStatus() });
  }

  if (path === '/api/ai' && req.method === 'POST') {
    return handleAi(req, res);
  }

  if (path === '/read') {
    return readPage(res, url.searchParams.get('url') || '');
  }

  if (path === '/img') {
    return image(res, url.searchParams.get('url') || '', url.searchParams.get('ref') || '');
  }

  if (path === '/api/files') {
    try {
      const items = await walk(ROOT);
      items.sort((a, b) => (a.dir === b.dir ? a.path.localeCompare(b.path) : a.dir ? -1 : 1));
      return json(res, 200, items);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (path === '/api/file') {
    const rel = normalize(url.searchParams.get('path') || '').replace(/^(\.\.(\/|\\|$))+/, '');
    const file = join(ROOT, rel);
    if (!inside(file)) return json(res, 403, { error: 'forbidden' });
    try {
      const buf = await readFile(file);
      const binary = buf.includes(0);
      return json(res, 200, {
        path: rel,
        size: buf.length,
        binary,
        content: binary ? '' : buf.toString('utf8').slice(0, 200000),
      });
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
  }

  let file = join(ROOT, normalize(path).replace(/^(\.\.(\/|\\|$))+/, ''));
  if (path.endsWith('/')) file = join(file, 'index.html');
  if (!inside(file)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    return res.end('forbidden');
  }

  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
    const buf = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    return res.end(buf);
  } catch {
    const notFound = join(ROOT, 'index.html');
    try {
      const buf = await readFile(notFound);
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(buf);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`serving ${ROOT} on ${PORT}`);
});
