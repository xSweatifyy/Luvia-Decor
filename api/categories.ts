import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

const slugify = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

async function ensureCategoriesTable() {
  await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await ensureCategoriesTable();

    if (req.method === 'GET') {
      return res.status(200).json(await sql`SELECT id, name FROM categories ORDER BY name ASC`);
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Název kategorie je povinný.' });

      const requestedId = String(req.body?.id || slugify(name)).trim();
      if (!requestedId) return res.status(400).json({ error: 'Název kategorie je neplatný.' });

      // Keep existing categories untouched and create a unique ID for a genuinely new category.
      let id = requestedId;
      let suffix = 2;
      while (true) {
        const existing = await sql`SELECT id, name FROM categories WHERE id = ${id} LIMIT 1`;
        if (!existing.length) break;
        if (String(existing[0].name).trim().toLowerCase() === name.toLowerCase()) {
          return res.status(200).json({ id: existing[0].id, name: existing[0].name });
        }
        id = `${requestedId}-${suffix++}`;
      }

      const rows = await sql`
        INSERT INTO categories (id, name)
        VALUES (${id}, ${name})
        RETURNING id, name
      `;

      return res.status(201).json(rows[0]);
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) return res.status(400).json({ error: 'Chybí ID kategorie.' });

    if (req.method === 'PUT') {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Název kategorie je povinný.' });
      const rows = await sql`
        UPDATE categories SET name = ${name}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name
      `;
      if (!rows.length) return res.status(404).json({ error: 'Kategorie nenalezena.' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM categories WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return res.status(500).json({
      error: 'Kategorie se nepodařilo uložit.',
      details: error?.message || String(error)
    });
  }
}
