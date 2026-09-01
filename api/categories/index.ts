import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');
const defaults = [
  ['vence', 'Věnce & dekorace'],
  ['aranzma', 'Květinová vazba & boxy'],
  ['vazy-doplnky', 'Vázy & keramika'],
  ['svicky-vune', 'Svíčky & vůně'],
  ['zakazkove', 'Zakázková tvorba']
];

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const count = await sql`SELECT COUNT(*)::int AS count FROM categories`;
  if (count[0].count === 0) {
    for (const [position, [id, name]] of defaults.entries()) await sql`INSERT INTO categories (id, name, position) VALUES (${id}, ${name}, ${position})`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  try {
    await ensureTable();
    if (req.method === 'GET') return res.status(200).json(await sql`SELECT id, name FROM categories ORDER BY position, name`);
    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      const id = String(req.body?.id || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      if (!name || !id) return res.status(400).json({ error: 'Název kategorie je povinný.' });
      const rows = await sql`INSERT INTO categories (id, name, position) VALUES (${id}, ${name}, COALESCE((SELECT MAX(position) + 1 FROM categories), 0)) RETURNING id, name`;
      return res.status(201).json(rows[0]);
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) { console.error('Categories API error:', error); return res.status(500).json({ error: 'Kategorie se nepodařilo uložit.' }); }
}
