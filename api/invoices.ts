import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    if (req.method === 'GET') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (id) {
        const rows = await sql`SELECT data FROM invoices WHERE id=${id} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0].data) : res.status(404).json({ error: 'Faktura nenalezena.' });
      }
      const rows = await sql`SELECT data FROM invoices ORDER BY updated_at DESC, created_at DESC`;
      return res.status(200).json(rows.map((r: any) => r.data));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const data = { ...(req.body || {}) };
      const id = String(data.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      data.id = id;
      if (!Array.isArray(data.items)) data.items = [];
      await sql`
        INSERT INTO invoices (id, data)
        VALUES (${id}, ${JSON.stringify(data)}::jsonb)
        ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
      `;
      return res.status(req.method === 'POST' ? 201 : 200).json(data);
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : String(req.body?.id || '');
      if (!id) return res.status(400).json({ error: 'Chybí ID faktury.' });
      await sql`DELETE FROM invoices WHERE id=${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Invoices API error:', error);
    return res.status(500).json({ error: error?.message || 'Faktury se nepodařilo uložit.' });
  }
}
