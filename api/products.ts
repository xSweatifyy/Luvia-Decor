import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureProductsTable() {
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

function headers(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  headers(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await ensureProductsTable();
    const rawId = req.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId ? String(rawId) : '';

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0].data) : res.status(404).json({ error: 'Produkt nenalezen.' });
      }
      const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => row.data));
    }

    if (req.method === 'POST') {
      const product = req.body;
      if (!product?.id || !String(product.title || '').trim()) {
        return res.status(400).json({ error: 'Produkt nemá povinné údaje.' });
      }
      const normalized = {
        ...product,
        id: String(product.id),
        title: String(product.title).trim(),
        imageUrl: typeof product.imageUrl === 'string' ? product.imageUrl.trim() : '',
        gallery: Array.isArray(product.gallery) ? product.gallery.filter((v: unknown) => typeof v === 'string' && v.trim()).map((v: string) => v.trim()) : []
      };
      await sql`INSERT INTO products (id, data) VALUES (${normalized.id}, ${JSON.stringify(normalized)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(201).json(normalized);
    }

    if ((req.method === 'PUT' || req.method === 'PATCH') && id) {
      const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
      const current = rows.length ? rows[0].data : {};
      const merged = { ...current, ...(req.body || {}), id, updatedAt: new Date().toISOString() };
      await sql`INSERT INTO products (id, data) VALUES (${id}, ${JSON.stringify(merged)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(200).json(merged);
    }

    if (req.method === 'DELETE' && id) {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'API endpoint nenalezen.' });
  } catch (error: any) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru při práci s produkty.' });
  }
}
