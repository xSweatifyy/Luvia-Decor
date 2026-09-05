import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Chybí ID kategorie.' });

    if (req.method === 'PUT') {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Název kategorie je povinný.' });
      const rows = await sql`UPDATE categories SET name = ${name}, updated_at = NOW() WHERE id = ${id} RETURNING id, name`;
      if (!rows.length) return res.status(404).json({ error: 'Kategorie nenalezena.' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM categories WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Category item API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru při práci s kategorií.' });
  }
}
