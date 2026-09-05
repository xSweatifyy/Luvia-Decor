import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureConfigTable() {
  await sql`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
  if (!rows.length) await sql`INSERT INTO app_state (id, data) VALUES (1, ${JSON.stringify({})}::jsonb)`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureConfigTable();
    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
      return res.status(200).json(rows[0]?.data || {});
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = (req.body || {}) as Record<string, unknown>;
      const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
      const current = (rows[0]?.data || {}) as Record<string, unknown>;
      const merged = { ...current, ...body };
      await sql`UPDATE app_state SET data = ${JSON.stringify(merged)}::jsonb, updated_at = NOW() WHERE id = 1`;
      return res.status(200).json(merged);
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Config API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru při ukládání konfigurace.' });
  }
}
