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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });

  try {
    await ensureTable();
    const id = String(req.query.id);
    const rows = await sql`SELECT data FROM orders WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Objednávka nenalezena.' });

    const order = { ...rows[0].data, status: req.body?.status, id };
    await sql`UPDATE orders SET data = ${JSON.stringify(order)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
    return res.status(200).json(order);
  } catch (error) {
    console.error('Order status API error:', error);
    return res.status(500).json({ error: 'Stav objednávky se nepodařilo aktualizovat.' });
  }
}
