import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function getOrderId(req: VercelRequest): string | null {
  const q = req.query;
  const v = q.id;
  if (typeof v === 'string' && v.length > 0) return v;
  if (Array.isArray(v) && typeof v[0] === 'string' && v[0].length > 0) return v[0];
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  }

  try {
    await ensureTable();

    const id = getOrderId(req);
    if (!id) return res.status(400).json({ error: 'Chybí id objednávky.' });

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM orders WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Objednávka nenalezena.' });
      return res.status(200).json({ ...(rows[0].data as Record<string, unknown>), id });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const status = req.body?.status;
      if (!status) return res.status(400).json({ error: 'Chybí pole "status".' });

      const rows = await sql`SELECT data FROM orders WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Objednávka nenalezena.' });

      const order = { ...(rows[0].data as Record<string, unknown>), status, id };
      await sql`
        UPDATE orders
        SET data = ${JSON.stringify(order)}::jsonb,
            updated_at = NOW()
        WHERE id = ${id}
      `;
      return res.status(200).json(order);
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ error: error?.message || 'Stav objednávky se nepodařilo aktualizovat.' });
  }
}
