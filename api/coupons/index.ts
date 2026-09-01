import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
}

function isAdmin(req: VercelRequest): boolean {
  const user = (req.body as any)?.adminUser || (req.query as any)?.adminUser;
  return !!user && user.role === 'admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`SELECT id, code, type, value, active, created_at, note FROM coupons ORDER BY created_at DESC`;
      return res.status(200).json(rows.map(r => ({
        id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active,
        createdAt: r.created_at, note: r.note || ''
      })));
    }

    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Slevové kódy může spravovat pouze hlavní správce.' });
      const code = String(req.body?.code || '').trim().toUpperCase();
      const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(req.body?.value) || 0;
      if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
      if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
      if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });
      const rows = await sql`
        INSERT INTO coupons (id, code, type, value, active, note)
        VALUES (${`cup-${Date.now()}`}, ${code}, ${type}, ${value}, ${req.body?.active !== false}, ${req.body?.note || ''})
        ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, active = EXCLUDED.active, note = EXCLUDED.note
        RETURNING id, code, type, value, active, created_at, note`;
      const r = rows[0];
      return res.status(201).json({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Coupons API error:', error);
    return res.status(500).json({ error: 'Slevový kód se nepodařilo uložit.' });
  }
}
