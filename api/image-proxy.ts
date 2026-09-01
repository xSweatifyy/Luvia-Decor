import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  }

  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  if (!rawUrl) {
    return res.status(400).json({ error: 'Chybí URL obrázku.' });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Neplatná URL obrázku.' });
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return res.status(400).json({ error: 'URL musí používat HTTP nebo HTTPS.' });
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Luvia-Decor-Image-Proxy/1.0'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 502).json({
        error: 'Vzdálený obrázek nebyl dostupný.'
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(415).json({ error: 'URL nevrátila obrazová data.' });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Obrázek je příliš velký.' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Obrázek je příliš velký.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(502).json({ error: 'Obrázek se nepodařilo načíst.' });
  }
}
