import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

type ShippingScope = 'all' | 'carrier';

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, shipping_scope TEXT, shipping_carrier TEXT)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS shipping_scope TEXT`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS shipping_carrier TEXT`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureTable();
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

    if (req.method === 'GET') {
      const rows = await sql`SELECT id, code, type, value, active, created_at, shipping_scope, shipping_carrier FROM coupons WHERE type = 'shipping' ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((r: any) => ({ id: r.id, code: r.code, type: 'shipping', value: 0, active: r.active, createdAt: r.created_at, shippingScope: r.shipping_scope || 'all', shippingCarrier: r.shipping_carrier || undefined })));
    }

    if (req.method === 'POST') {
      const code = String(req.body?.code || '').trim().toUpperCase();
      const shippingScope: ShippingScope = req.body?.shippingScope === 'carrier' ? 'carrier' : 'all';
      const shippingCarrier = shippingScope === 'carrier' && ['DPD', 'Zásilkovna'].includes(String(req.body?.shippingCarrier)) ? String(req.body.shippingCarrier) : null;
      if (!code) return res.status(400).json({ error: 'Zadejte kód dopravy zdarma.' });
      if (shippingScope === 'carrier' && !shippingCarrier) return res.status(400).json({ error: 'Vyberte konkrétního dopravce.' });
      const idValue = `cup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const rows = await sql`INSERT INTO coupons (id, code, type, value, active, note, shipping_scope, shipping_carrier) VALUES (${idValue}, ${code}, 'shipping', 0, TRUE, 'Doprava zdarma', ${shippingScope}, ${shippingCarrier}) ON CONFLICT (code) DO UPDATE SET type = 'shipping', value = 0, active = TRUE, note = 'Doprava zdarma', shipping_scope = EXCLUDED.shipping_scope, shipping_carrier = EXCLUDED.shipping_carrier RETURNING id, code, type, value, active, created_at, shipping_scope, shipping_carrier`;
      const r = rows[0];
      return res.status(201).json({ id: r.id, code: r.code, type: 'shipping', value: 0, active: r.active, createdAt: r.created_at, shippingScope: r.shipping_scope || 'all', shippingCarrier: r.shipping_carrier || undefined });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Chybí ID kódu.' });
      if (typeof req.body?.active !== 'boolean') return res.status(400).json({ error: 'Chybí stav kódu.' });
      const rows = await sql`UPDATE coupons SET active = ${req.body.active} WHERE id = ${id} AND type = 'shipping' RETURNING id, code, type, value, active, created_at, shipping_scope, shipping_carrier`;
      if (!rows.length) return res.status(404).json({ error: 'Kód nenalezen.' });
      return res.status(200).json({ id: rows[0].id, code: rows[0].code, type: 'shipping', value: 0, active: rows[0].active, createdAt: rows[0].created_at, shippingScope: rows[0].shipping_scope || 'all', shippingCarrier: rows[0].shipping_carrier || undefined });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Chybí ID kódu.' });
      await sql`DELETE FROM coupons WHERE id = ${id} AND type = 'shipping'`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Free shipping coupon API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
