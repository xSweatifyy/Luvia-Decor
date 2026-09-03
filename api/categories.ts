import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureTable();
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`SELECT id, name FROM categories WHERE id = ${id} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Kategorie nenalezena.' });
      }
      const rows = await sql`SELECT id, name FROM categories ORDER BY name ASC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      const categoryId = String(req.body?.id || slugify(name));
      if (!name || !categoryId) return res.status(400).json({ error: 'Název kategorie je povinný.' });
      await sql`INSERT INTO categories (id, name) VALUES (${categoryId}, ${name}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;
      return res.status(200).json({ id: categoryId, name });
    }

    if (req.method === 'PUT' && id) {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Název kategorie je povinný.' });
      const rows = await sql`UPDATE categories SET name = ${name} WHERE id = ${id} RETURNING id, name`;
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Kategorie nenalezena.' });
    }

    if (req.method === 'DELETE' && id) {
      await sql`DELETE FROM categories WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba databáze kategorií.' });
  }
}
