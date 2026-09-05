import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureCouponsTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, category_ids JSONB NOT NULL DEFAULT '[]'::jsonb, remaining_value NUMERIC)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;
  await sql`UPDATE coupons SET remaining_value = value WHERE note = 'gift-voucher' AND remaining_value IS NULL`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    await ensureCouponsTable();
    await sql`INSERT INTO coupons (id, code, type, value, active, note, category_ids, remaining_value) VALUES ('coupon-luvia10', 'LUVIA10', 'percent', 10, TRUE, '', '[]'::jsonb, NULL) ON CONFLICT (code) DO NOTHING`;
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ valid: false, error: 'Zadejte slevový kód.' });
    const rows = await sql`SELECT id, code, type, value, active, note, category_ids, remaining_value FROM coupons WHERE code = ${code} AND active = TRUE LIMIT 1`;
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Slevový kód je neplatný nebo deaktivovaný.' });
    const coupon = rows[0];
    const remainingValue = coupon.note === 'gift-voucher' ? Number(coupon.remaining_value ?? coupon.value) : undefined;
    if (coupon.note === 'gift-voucher' && remainingValue <= 0) return res.status(404).json({ valid: false, error: 'Dárkový poukaz je již vyčerpán.' });
    const categoryIds = Array.isArray(coupon.category_ids) ? coupon.category_ids.map(String) : [];
    return res.status(200).json({ valid: true, code: coupon.code, type: coupon.type, value: Number(coupon.value), remainingValue, categoryIds, giftVoucher: coupon.note === 'gift-voucher' });
  } catch (error: any) {
    console.error('Coupon validation API error:', error);
    return res.status(500).json({ valid: false, error: error?.message || 'Chyba serveru.' });
  }
}
