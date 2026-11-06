/* Fetch a page and turn it into the text blocks the proxy browser renders.
   Images are streamed separately through the /img route. */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\])/i;
const IMAGE_SKIP = /(sprite|spacer|pixel|blank\.|1x1|icon|favicon|avatar)/i;

const decode = (s) => s
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));

const textOf = (frag) => decode(frag.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const sanitize = (html) => html
  .replace(/<(script|style|noscript|svg|iframe|template|form|button|select|input|textarea|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<(script|style|iframe|input|link|meta|br)\b[^>]*>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

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
  const heading = decode((html.match(/<title[^>]*>([^<]*)/i) || [, ''])[1]).replace(/\s+/g, ' ').trim();
  const article = html.match(/<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i);
  let blocks = article ? blocksOf(article[2], dest.href) : [];
  const weight = blocks.reduce((total, block) => total + (block.text ? block.text.length : 60), 0);

  if (weight < 300) {
    blocks = blocksOf((html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1], dest.href);
  }

  const start = blocks.findIndex((block) => (block.t === 'p' && block.text.length > 90) || (block.t === 'h' && block.text.length > 3));
  const trimmed = start > 0 ? blocks.slice(start) : blocks;

  return {
    blocks: trimmed,
    title: heading || dest.hostname,
    site: dest.hostname,
    ...(trimmed.length ? {} : { note: 'There is no readable text on this page. Open the real page to see it.' }),
  };
}

export async function readPage(res, target, json) {
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

export async function image(res, target, referer, json) {
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
