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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') return res.status(400).json({ error: 'Chybí URL obrázku.' });

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Neplatná URL obrázku.' });
  }

  if (!['http:', 'https:'].includes(target.protocol) || isPrivateHostname(target.hostname)) {
    return res.status(400).json({ error: 'Nepovolený zdroj obrázku.' });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Luvia-Decor-ImageProxy/1.0'
      },
      redirect: 'follow'
    });

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({ error: 'Obrázek se nepodařilo načíst.' });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return res.status(415).json({ error: 'Zdroj nevrátil obrázek.' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(502).json({ error: 'Chyba při načítání obrázku.' });
  }
}
