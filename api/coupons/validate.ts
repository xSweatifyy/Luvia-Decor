import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function send(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(status).json(body);
}

function parseCategoryIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map(v => v.trim()).filter(Boolean);
    } catch {}
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { valid: false, error: 'Metoda není podporovaná.' });

  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return send(res, 400, { valid: false, error: 'Zadejte slevový kód nebo kód dárkového poukazu.' });

    // Keep the validation endpoint compatible with the existing coupons table
    // used by the admin. The cart previously called /api/coupons/validate,
    // while the main endpoint only accepted ?action=validate.
    await sql`CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value NUMERIC NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      note TEXT
    )`;
    await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS note TEXT`;
    await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;

    const rows = await sql`
      SELECT id, code, type, value, active, created_at, note, category_ids, remaining_value
      FROM coupons
      WHERE UPPER(TRIM(code)) = ${code} AND active = TRUE
      LIMIT 1
    `;

    if (!rows.length) {
      return send(res, 404, { valid: false, error: 'Slevový kód nebo dárkový poukaz nebyl nalezen, je neaktivní nebo vypršel.' });
    }

    const row = rows[0] as any;
    const value = Number(row.value) || 0;
    const remainingValue = row.remaining_value == null ? value : Number(row.remaining_value);
    const categoryIds = parseCategoryIds(row.category_ids);

    if (value <= 0 || (row.note === 'gift-voucher' && remainingValue <= 0)) {
      return send(res, 400, { valid: false, error: 'Tento kód již nemá žádnou využitelnou hodnotu.' });
    }

    return send(res, 200, {
      valid: true,
      id: row.id,
      code: String(row.code).toUpperCase(),
      type: row.type === 'fixed' ? 'fixed' : 'percent',
      value,
      active: Boolean(row.active),
      note: row.note || '',
      giftVoucher: row.note === 'gift-voucher',
      categoryIds,
      remainingValue
    });
  } catch (error) {
    console.error('Coupon validation API error:', error);
    return send(res, 500, {
      valid: false,
      error: 'Slevový kód se nepodařilo ověřit.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
