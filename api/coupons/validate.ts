import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value NUMERIC NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      note TEXT,
      category_ids TEXT NOT NULL DEFAULT '[]'
    )
  `;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids TEXT NOT NULL DEFAULT '[]'`;
}

function parseCategoryIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  try {
    await ensureTable();

    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ valid: false, error: 'Zadejte slevový kód.' });

    const rows = await sql`
      SELECT id, code, type, value, active, created_at, note, category_ids
      FROM coupons
      WHERE UPPER(code) = ${code} AND active = TRUE
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Slevový kód je neplatný nebo vypršel.' });
    }

    const coupon = rows[0] as any;
    const categoryIds = parseCategoryIds(coupon.category_ids);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    // If the coupon is category-limited, require at least one eligible item in the cart.
    if (categoryIds.length > 0 && items.length > 0) {
      const eligibleSubtotal = items.reduce((sum: number, item: any) => {
        const category = String(item?.category || '');
        if (!categoryIds.includes(category)) return sum;
        return sum + (Number(item?.price) || 0) * Math.max(1, Number(item?.quantity) || 1);
      }, 0);

      if (eligibleSubtotal <= 0) {
        return res.status(422).json({
          valid: false,
          error: 'Tento slevový kód nelze použít na žádný produkt v košíku.'
        });
      }
    }

    return res.status(200).json({
      valid: true,
      code: coupon.code,
      type: coupon.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(coupon.value),
      categoryIds
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    return res.status(500).json({ valid: false, error: 'Chyba ověření slevového kódu.' });
  }
}
