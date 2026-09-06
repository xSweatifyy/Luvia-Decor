import type { VercelRequest, VercelResponse } from '@vercel/node';

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  if (host === '169.254.169.254' || host.endsWith('.local')) return true;
  return false;
}

function isAllowedUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || isPrivateHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'image/avif';
  const text = buffer.subarray(0, 500).toString('utf8').trimStart().toLowerCase();
  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'))) return 'image/svg+xml';
  return null;
}

function isImageResponse(url: URL, contentType: string, buffer: Buffer): boolean {
  if (contentType.toLowerCase().startsWith('image/')) return true;
  if (detectImageType(buffer)) return true;
  return /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)(?:$|\?)/i.test(url.pathname + url.search);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractImageUrl(html: string, pageUrl: URL): string | null {
  // Prefer social preview metadata. This handles hosts such as imgbb where
  // the saved URL is the public image page rather than the raw image URL.
  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try { return new URL(decodeHtml(match[1]), pageUrl).toString(); } catch { /* continue */ }
    }
  }

  // Common direct-image fallback used by simple image-host pages.
  const img = html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
  if (img?.[1]) {
    try { return new URL(decodeHtml(img[1]), pageUrl).toString(); } catch { /* continue */ }
  }

  return null;
}

async function fetchPublicImage(target: URL, depth = 0): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (depth > 2) return null;

  const upstream = await fetch(target.toString(), {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/jpeg,image/png,image/gif,text/html;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
      Referer: target.origin + '/'
    },
    redirect: 'follow'
  });

  if (!upstream.ok) return null;

  const contentType = upstream.headers.get('content-type') || '';
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (!buffer.length) return null;

  if (isImageResponse(target, contentType, buffer)) {
    return { buffer, contentType };
  }

  if (contentType.toLowerCase().includes('text/html')) {
    const imageUrl = extractImageUrl(buffer.toString('utf8'), target);
    const next = imageUrl ? isAllowedUrl(imageUrl) : null;
    if (next) return fetchPublicImage(next, depth + 1);
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') return res.status(400).json({ error: 'Chybí URL obrázku.' });

  const target = isAllowedUrl(rawUrl.trim());
  if (!target) return res.status(400).json({ error: 'Nepovolený zdroj obrázku.' });

  try {
    const result = await fetchPublicImage(target);
    if (!result) return res.status(502).json({ error: 'Obrázek se nepodařilo načíst.' });

    const detectedType = detectImageType(result.buffer);
    const upstreamType = result.contentType.toLowerCase().startsWith('image/')
      ? result.contentType.split(';')[0].trim()
      : null;
    const finalContentType = detectedType || upstreamType || 'application/octet-stream';

    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Content-Length', String(result.buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(502).json({ error: 'Chyba při načítání obrázku.' });
  }
}
