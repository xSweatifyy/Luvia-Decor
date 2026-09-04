import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ valid: false, error: 'Zadejte slevový kód.' });
    const rows = await sql`SELECT code, type, value, active FROM coupons WHERE code = ${code} AND active = TRUE LIMIT 1`;
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Slevový kód je neplatný nebo vypršel.' });
    const coupon = rows[0];
    return res.status(200).json({ valid: true, code: coupon.code, type: coupon.type, value: Number(coupon.value), categoryIds: [] });
  } catch (error: any) {
    console.error('Coupon validation API error:', error);
    return res.status(500).json({ valid: false, error: error?.message || 'Chyba serveru.' });
  }
}
