import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await sql`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
    if (rows.length === 0) {
      await sql`INSERT INTO app_state (id, data) VALUES (1, '{}'::jsonb)`;
    }

    if (req.method === 'GET') {
      const current = await sql`SELECT data FROM app_state WHERE id = 1`;
      return res.status(200).json(current[0]?.data || {});
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const current = await sql`SELECT data FROM app_state WHERE id = 1`;
      const existing = current[0]?.data && typeof current[0].data === 'object' ? current[0].data : {};
      const merged = { ...existing, ...body };
      await sql`UPDATE app_state SET data = ${JSON.stringify(merged)}::jsonb, updated_at = NOW() WHERE id = 1`;
      return res.status(200).json(merged);
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Config API error:', error);
    return res.status(500).json({ error: 'Nastavení se nepodařilo uložit.' });
  }
}
