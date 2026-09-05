import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json(rows.map((row: any) => row.data));
    }
    if (req.method === 'POST') {
      const product = req.body;
      if (!product?.id || !product?.title) return res.status(400).json({ error: 'Produkt nemá povinné údaje.' });
      await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const data = { ...product, id: String(product.id), updatedAt: new Date().toISOString() };
      await sql`INSERT INTO products (id, data) VALUES (${data.id}, ${JSON.stringify(data)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) return res.status(400).json({ error: 'Chybí ID produktu.' });
      await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const rows = await sql`SELECT data FROM products WHERE id = ${id} LIMIT 1`;
      const data = { ...(rows[0]?.data || {}), ...req.body, id, updatedAt: new Date().toISOString() };
      await sql`INSERT INTO products (id, data) VALUES (${id}, ${JSON.stringify(data)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'Chybí ID produktu.' });
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Nepodařilo se uložit nebo načíst produkty.' });
  }
}
