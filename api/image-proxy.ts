import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header === 'GIF87a' || header === 'GIF89a') return 'image/gif';
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'image/avif';

  const text = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trim().toLowerCase();
  if (text.startsWith('<svg') || text.startsWith('<?xml') && text.indexOf('<svg') !== -1) return 'image/svg+xml';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  if (!rawUrl) return res.status(400).json({ error: 'Chybí URL obrázku.' });

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
        'User-Agent': 'Mozilla/5.0 (compatible; Luvia-Decor/1.0; image-proxy)'
      },
      redirect: 'follow'
    });

    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ error: 'Vzdálený obrázek nebyl dostupný.' });

    const declaredType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'Obrázek je příliš velký.' });

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'Obrázek je příliš velký.' });

    const detectedType = sniffImageType(buffer);
    const contentType = declaredType.startsWith('image/') ? declaredType : detectedType;
    if (!contentType) return res.status(415).json({ error: 'URL nevrátila obrazová data.' });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=604800, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(502).json({ error: 'Obrázek se nepodařilo načíst.' });
  }
}
