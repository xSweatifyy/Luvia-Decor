import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureTable();
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0].data) : res.status(404).json({ error: 'Produkt nenalezen.' });
      }
      const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => row.data));
    }

    if (req.method === 'POST') {
      const product = req.body || {};
      if (!product.id || !product.title) return res.status(400).json({ error: 'Produkt nemá povinné údaje.' });
      await sql`INSERT INTO products (id, data) VALUES (${String(product.id)}, ${JSON.stringify(product)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(200).json(product);
    }

    if (req.method === 'PUT' && id) {
      const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
      const current = rows.length ? rows[0].data : {};
      const merged = { ...current, ...(req.body || {}), id };
      await sql`INSERT INTO products (id, data) VALUES (${id}, ${JSON.stringify(merged)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(200).json(merged);
    }

    if (req.method === 'DELETE' && id) {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba databáze produktů.' });
  }
}
