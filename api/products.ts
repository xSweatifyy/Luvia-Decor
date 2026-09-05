import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function ensureProductsTable() {
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await ensureProductsTable();
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0].data) : res.status(404).json({ error: 'Produkt nenalezen' });
      }
      const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => row.data));
    }

    if (req.method === 'POST') {
      const product = req.body;
      if (!product?.id || !product?.title) {
        return res.status(400).json({ error: 'Produkt nemá povinné údaje.' });
      }
      await sql`INSERT INTO products (id, data) VALUES (${String(product.id)}, ${JSON.stringify(product)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(201).json(product);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Chybí ID produktu.' });
      const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
      const current = rows.length ? rows[0].data : {};
      const merged = { ...current, ...(req.body || {}), id };
      await sql`INSERT INTO products (id, data) VALUES (${id}, ${JSON.stringify(merged)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(200).json(merged);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Chybí ID produktu.' });
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Nepodařilo se uložit produkt.', details: error instanceof Error ? error.message : String(error) });
  }
}
