import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL)`;
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, name FROM categories ORDER BY name ASC`;
      return res.status(200).json(rows);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
    const name = String(req.body?.name || '').trim();
    const id = String(req.body?.id || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    if (!name || !id) return res.status(400).json({ error: 'Název kategorie je povinný.' });
    await sql`INSERT INTO categories (id, name) VALUES (${id}, ${name}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;
    return res.status(201).json({ id, name });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
