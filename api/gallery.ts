import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await sql`CREATE TABLE IF NOT EXISTS gallery (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

    if (req.method === 'GET') {
      const rows = await sql`SELECT id, data FROM gallery ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => ({ ...(row.data || {}), id: row.id })));
    }
    if (req.method === 'POST') {
      const item = req.body || {};
      const itemId = String(item.id || `gal-${Date.now()}`);
      await sql`INSERT INTO gallery (id, data) VALUES (${itemId}, ${JSON.stringify({ ...item, id: itemId })}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
      return res.status(201).json({ ...item, id: itemId });
    }
    if (req.method === 'DELETE' && id) {
      await sql`DELETE FROM gallery WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Gallery API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba databáze galerie.' });
  }
}
