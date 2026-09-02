import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id INT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
  if (rows.length === 0) {
    await sql`INSERT INTO app_state (id, data) VALUES (1, ${JSON.stringify({})}::jsonb)`;
  }
}

function readConfig() {
  return sql`SELECT data FROM app_state WHERE id = 1`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await readConfig();
      return res.status(200).json((rows[0]?.data as Record<string, unknown>) || {});
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = (req.body || {}) as Record<string, unknown>;
      const rows = await readConfig();
      const current = (rows[0]?.data as Record<string, unknown>) || {};
      const merged = { ...current, ...body };
      await sql`
        UPDATE app_state
        SET data = ${JSON.stringify(merged)}::jsonb,
            updated_at = NOW()
        WHERE id = 1
      `;
      return res.status(200).json(merged);
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (err: any) {
    console.error('Config API error:', err);
    return res.status(500).json({ error: err?.message || 'Chyba konfigurace.' });
  }
}
