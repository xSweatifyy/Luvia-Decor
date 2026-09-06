import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeProduct(input: any) {
  const product = { ...(input || {}) };
  const title = String(product.title ?? product.name ?? '').trim();
  if (title) {
    product.title = title;
    if (!product.name) product.name = title;
  }
  if (!product.id) product.id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (product.imageUrl == null && typeof product.image === 'string') product.imageUrl = product.image;
  if (!Array.isArray(product.images) && Array.isArray(product.gallery)) product.images = product.gallery;
  if (!Array.isArray(product.images)) product.images = product.imageUrl ? [product.imageUrl] : [];
  product.images = product.images.filter((v: any) => typeof v === 'string' && v.trim()).map((v: string) => v.trim());
  if (!product.imageUrl && product.images[0]) product.imageUrl = product.images[0];
  return product;
}

// Remove legacy duplicate rows created with different IDs but the same product name.
// Keep the newest row so existing product data/images are preserved.
async function removeDuplicateProducts() {
  await sql`
    DELETE FROM products p
    USING products newer
    WHERE p.id <> newer.id
      AND NULLIF(LOWER(TRIM(COALESCE(p.data->>'title', p.data->>'name', ''))), '') IS NOT NULL
      AND LOWER(TRIM(COALESCE(p.data->>'title', p.data->>'name', ''))) = LOWER(TRIM(COALESCE(newer.data->>'title', newer.data->>'name', '')))
      AND p.created_at < newer.created_at
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await removeDuplicateProducts();

    if (req.method === 'GET') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (id) {
        const rows = await sql`SELECT data FROM products WHERE id=${id} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0].data) : res.status(404).json({ error: 'Produkt nenalezen.' });
      }
      const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((r: any) => r.data));
    }

    if (req.method === 'POST') {
      const product = normalizeProduct(req.body);
      if (!String(product.title || '').trim()) return res.status(400).json({ error: 'Název produktu je povinný.' });

      // If the client creates a product without an ID but a product with the same
      // name already exists, update that product instead of creating a second copy.
      const existing = await sql`
        SELECT id, data FROM products
        WHERE LOWER(TRIM(COALESCE(data->>'title', data->>'name', ''))) = LOWER(TRIM(${product.title}))
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      if (existing.length && !req.body?.id) product.id = existing[0].id;

      await sql`INSERT INTO products (id,data) VALUES (${product.id},${JSON.stringify(product)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()`;
      await removeDuplicateProducts();
      return res.status(201).json(product);
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) return res.status(400).json({ error: 'Chybí ID produktu.' });

    if (req.method === 'PUT') {
      const rows = await sql`SELECT data FROM products WHERE id=${id} LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: 'Produkt nenalezen.' });
      const merged = normalizeProduct({ ...rows[0].data, ...(req.body || {}), id });
      await sql`UPDATE products SET data=${JSON.stringify(merged)}::jsonb,updated_at=NOW() WHERE id=${id}`;
      await removeDuplicateProducts();
      return res.status(200).json(merged);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM products WHERE id=${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Produkt se nepodařilo uložit.', details: error?.message || String(error) });
  }
}
