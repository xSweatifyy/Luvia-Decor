import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureCouponsTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
}

function toCoupon(row: any) {
  return { id: row.id, code: row.code, type: row.type, value: Number(row.value), active: row.active, createdAt: row.created_at, note: row.note || '' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureCouponsTable();
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Chybí ID slevového kódu.' });

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (typeof body.active === 'boolean' && body.value === undefined) {
        const rows = await sql`UPDATE coupons SET active = ${body.active} WHERE id = ${id} RETURNING id, code, type, value, active, created_at, note`;
        if (!rows.length) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
        return res.status(200).json(toCoupon(rows[0]));
      }
      if (body.value !== undefined) {
        const value = Number(body.value) || 0;
        if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
        const rows = typeof body.active === 'boolean'
          ? await sql`UPDATE coupons SET value = ${value}, active = ${body.active} WHERE id = ${id} RETURNING id, code, type, value, active, created_at, note`
          : await sql`UPDATE coupons SET value = ${value} WHERE id = ${id} RETURNING id, code, type, value, active, created_at, note`;
        if (!rows.length) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
        return res.status(200).json(toCoupon(rows[0]));
      }
      return res.status(400).json({ error: 'Chybí data k aktualizaci.' });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM coupons WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Coupon item API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
