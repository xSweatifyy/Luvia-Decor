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

  // Safe migration for the existing coupons table created by the previous version.
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids TEXT NOT NULL DEFAULT '[]'`;
}

function isAdmin(req: VercelRequest): boolean {
  const user = (req.body as any)?.adminUser || (req.query as any)?.adminUser;
  return !!user && user.role === 'admin';
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

function mapCoupon(row: any) {
  return {
    id: row.id,
    code: row.code,
    type: row.type === 'fixed' ? 'fixed' : 'percent',
    value: Number(row.value),
    active: Boolean(row.active),
    createdAt: row.created_at,
    note: row.note || '',
    categoryIds: parseCategoryIds(row.category_ids)
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, code, type, value, active, created_at, note, category_ids
        FROM coupons
        ORDER BY created_at DESC
      `;
      return res.status(200).json(rows.map(mapCoupon));
    }

    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Slevové kódy může spravovat pouze hlavní správce.' });

      const code = String(req.body?.code || '').trim().toUpperCase();
      const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(req.body?.value) || 0;
      const categoryIds = parseCategoryIds(req.body?.categoryIds);

      if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
      if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
      if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });

      const rows = await sql`
        INSERT INTO coupons (id, code, type, value, active, note, category_ids)
        VALUES (
          ${`cup-${Date.now()}`},
          ${code},
          ${type},
          ${value},
          ${req.body?.active !== false},
          ${req.body?.note || ''},
          ${JSON.stringify(categoryIds)}
        )
        ON CONFLICT (code) DO UPDATE SET
          type = EXCLUDED.type,
          value = EXCLUDED.value,
          active = EXCLUDED.active,
          note = EXCLUDED.note,
          category_ids = EXCLUDED.category_ids
        RETURNING id, code, type, value, active, created_at, note, category_ids
      `;

      return res.status(201).json(mapCoupon(rows[0]));
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Coupons API error:', error);
    return res.status(500).json({ error: 'Slevový kód se nepodařilo uložit.' });
  }
}
