import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeImageUrl(value: string): string {
  const input = value.trim();
  if (!input.startsWith('gs://')) return input;

  const withoutScheme = input.slice(5);
  const slash = withoutScheme.indexOf('/');
  if (slash <= 0) return input;

  const bucket = withoutScheme.slice(0, slash);
  const path = withoutScheme.slice(slash + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  if (host === '169.254.169.254' || host.endsWith('.local')) return true;
  return false;
}

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'image/avif';
  const text = buffer.subarray(0, 300).toString('utf8').trimStart().toLowerCase();
  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'))) return 'image/svg+xml';
  return null;
}

function isImageResponse(url: URL, contentType: string, buffer: Buffer): boolean {
  if (contentType.toLowerCase().startsWith('image/')) return true;
  if (detectImageType(buffer)) return true;
  return /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)$/i.test(url.pathname);
}

async function fetchImage(target: URL, referer?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/jpeg,image/png,image/gif,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
  };
  if (referer) headers.Referer = referer;
  return fetch(target.toString(), { headers, redirect: 'follow' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') return res.status(400).json({ error: 'Chybí URL obrázku.' });

  let target: URL;
  try {
    target = new URL(normalizeImageUrl(rawUrl));
  } catch {
    return res.status(400).json({ error: 'Neplatná URL obrázku.' });
  }

  if (!['http:', 'https:'].includes(target.protocol) || isPrivateHostname(target.hostname)) {
    return res.status(400).json({ error: 'Nepovolený zdroj obrázku.' });
  }

  try {
    const isGoogleUserContent = target.hostname.toLowerCase().endsWith('googleusercontent.com');
    let upstream = await fetchImage(target);

    if ((!upstream.ok || !upstream.headers.get('content-type')?.toLowerCase().startsWith('image/')) && isGoogleUserContent) {
      try {
        if (upstream.body) await upstream.arrayBuffer();
      } catch {}
      upstream = await fetchImage(target, 'https://sites.google.com/');
    }

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({ error: 'Obrázek se nepodařilo načíst.' });
    }

    const contentType = upstream.headers.get('content-type') || '';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) return res.status(502).json({ error: 'Obrázek je prázdný.' });

    if (!isImageResponse(target, contentType, buffer)) {
      return res.status(415).json({ error: 'Zdroj nevrátil obrázek.' });
    }

    const detectedType = detectImageType(buffer);
    const upstreamType = contentType.toLowerCase().startsWith('image/')
      ? contentType.split(';')[0].trim()
      : null;
    const finalContentType = detectedType || upstreamType || 'application/octet-stream';

    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(502).json({ error: 'Chyba při načítání obrázku.' });
  }
}
