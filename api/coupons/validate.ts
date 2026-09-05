import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function normalizeCategory(value: unknown) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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

    const rawCategoryIds = Array.isArray(coupon.category_ids) ? coupon.category_ids.map(String).filter(Boolean) : [];
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawCategoryIds.length && items.length) {
      const allowed = new Set(rawCategoryIds.map(normalizeCategory));
      const eligibleItems = items.filter((item: any) => allowed.has(normalizeCategory(item?.category)));
      if (eligibleItems.length === 0) {
        return res.status(400).json({ valid: false, error: 'Tento slevový kód nelze použít na žádný produkt v košíku.' });
      }
      const matchedCategories = [...new Set(eligibleItems.map((item: any) => String(item?.category || '').trim()).filter(Boolean))];
      return res.status(200).json({ valid: true, code: coupon.code, type: coupon.type, value: Number(coupon.value), remainingValue, categoryIds: matchedCategories, giftVoucher: coupon.note === 'gift-voucher' });
    }

    return res.status(200).json({ valid: true, code: coupon.code, type: coupon.type, value: Number(coupon.value), remainingValue, categoryIds: rawCategoryIds, giftVoucher: coupon.note === 'gift-voucher' });
  } catch (error: any) {
    console.error('Coupon validation API error:', error);
    return res.status(500).json({ valid: false, error: error?.message || 'Chyba serveru.' });
  }
}
