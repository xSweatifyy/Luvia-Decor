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
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, code, type, value, active, created_at, note FROM coupons ORDER BY created_at DESC`;
      return res.status(200).json(rows.map(toCoupon));
    }
    if (req.method === 'POST') {
      const code = String(req.body?.code || '').trim().toUpperCase();
      const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(req.body?.value) || 0;
      if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
      if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
      if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });
      const rows = await sql`INSERT INTO coupons (id, code, type, value, active, note) VALUES (${`cup-${Date.now()}`}, ${code}, ${type}, ${value}, ${req.body?.active !== false}, ${req.body?.note || ''}) ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, active = EXCLUDED.active, note = EXCLUDED.note RETURNING id, code, type, value, active, created_at, note`;
      return res.status(201).json(toCoupon(rows[0]));
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Coupons API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru při načítání slevových kódů.' });
  }
}
