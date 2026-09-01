import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  try {
    await ensureTable();
    const id = String(req.query.id);
    if (req.method === 'PUT') {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Název kategorie je povinný.' });
      const rows = await sql`UPDATE categories SET name = ${name} WHERE id = ${id} RETURNING id, name`;
      if (!rows.length) return res.status(404).json({ error: 'Kategorie nenalezena.' });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const products = await sql`SELECT COUNT(*)::int AS count FROM products WHERE data->>'category' = ${id}`;
      if (products[0].count > 0) return res.status(409).json({ error: 'Nejdříve přesuňte produkty z této kategorie.' });
      await sql`DELETE FROM categories WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) { console.error('Category API error:', error); return res.status(500).json({ error: 'Kategorie se nepodařilo upravit.' }); }
}
