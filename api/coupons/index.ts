import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureCouponsTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, category_ids JSONB NOT NULL DEFAULT '[]'::jsonb, remaining_value NUMERIC)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;
  await sql`UPDATE coupons SET category_ids = '[]'::jsonb WHERE category_ids IS NULL`;
  await sql`UPDATE coupons SET remaining_value = value WHERE note = 'gift-voucher' AND remaining_value IS NULL`;
}

function toCoupon(row: any) {
  const categoryIds = Array.isArray(row.category_ids) ? row.category_ids.map(String) : [];
  return { id: row.id, code: row.code, type: row.type, value: Number(row.value), active: row.active, createdAt: row.created_at, note: row.note || '', categoryIds, remainingValue: row.remaining_value == null ? undefined : Number(row.remaining_value) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureCouponsTable();
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, code, type, value, active, created_at, note, category_ids, remaining_value FROM coupons ORDER BY created_at DESC`;
      return res.status(200).json(rows.map(toCoupon));
    }
    if (req.method === 'POST') {
      const code = String(req.body?.code || '').trim().toUpperCase();
      const note = String(req.body?.note || '').trim();
      const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(req.body?.value) || 0;
      const categoryIds = Array.isArray(req.body?.categoryIds) ? [...new Set(req.body.categoryIds.map(String).filter(Boolean))] : [];
      if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
      if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
      if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });
      if (note === 'gift-voucher' && categoryIds.length) return res.status(400).json({ error: 'Dárkový poukaz nelze omezit na kategorii.' });
      const remainingValue = note === 'gift-voucher' ? value : null;
      const rows = await sql`INSERT INTO coupons (id, code, type, value, active, note, category_ids, remaining_value) VALUES (${`cup-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}, ${code}, ${type}, ${value}, ${req.body?.active !== false}, ${note}, ${JSON.stringify(categoryIds)}::jsonb, ${remainingValue}) ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, active = EXCLUDED.active, note = EXCLUDED.note, category_ids = EXCLUDED.category_ids, remaining_value = CASE WHEN EXCLUDED.note = 'gift-voucher' THEN COALESCE(coupons.remaining_value, EXCLUDED.value) ELSE NULL END RETURNING id, code, type, value, active, created_at, note, category_ids, remaining_value`;
      return res.status(201).json(toCoupon(rows[0]));
    }
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Coupons API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru při práci se slevovými kódy.' });
  }
}
