import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS note TEXT`;
}

function send(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(status).json(body);
}

function row(r: any) {
  return { id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    await ensureTable();
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;

    if (req.method === 'GET') {
      const rows = await sql`SELECT id, code, type, value, active, created_at, note FROM coupons ORDER BY created_at DESC`;
      return send(res, 200, rows.map(row));
    }

    if (req.method === 'POST') {
      if (action === 'validate') {
        const code = String(req.body?.code || '').trim().toUpperCase();
        if (!code) return send(res, 400, { valid: false, error: 'Zadejte slevový kód.' });
        const rows = await sql`SELECT code, type, value, active, note FROM coupons WHERE code = ${code} AND active = TRUE LIMIT 1`;
        if (!rows.length) return send(res, 404, { valid: false, error: 'Slevový kód je neplatný nebo vypršel.' });
        return send(res, 200, { valid: true, ...row({ ...rows[0], id: '', created_at: null }) });
      }
      const code = String(req.body?.code || '').trim().toUpperCase();
      const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(req.body?.value) || 0;
      if (!code) return send(res, 400, { error: 'Zadejte kód slevy.' });
      if (value <= 0) return send(res, 400, { error: 'Hodnota slevy musí být kladná.' });
      if (type === 'percent' && value > 100) return send(res, 400, { error: 'Procentní sleva může být nejvýše 100 %.' });
      const idValue = `cup-${Date.now()}`;
      const rows = await sql`INSERT INTO coupons (id, code, type, value, active, note) VALUES (${idValue}, ${code}, ${type}, ${value}, ${req.body?.active !== false}, ${String(req.body?.note || '')}) ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, active = EXCLUDED.active, note = EXCLUDED.note RETURNING id, code, type, value, active, created_at, note`;
      return send(res, 201, row(rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return send(res, 400, { error: 'Chybí ID slevového kódu.' });
      const active = req.body?.active;
      const value = req.body?.value;
      if (typeof active === 'boolean') {
        const rows = await sql`UPDATE coupons SET active = ${active} WHERE id = ${id} RETURNING id, code, type, value, active, created_at, note`;
        if (!rows.length) return send(res, 404, { error: 'Slevový kód nenalezen.' });
        return send(res, 200, row(rows[0]));
      }
      if (value !== undefined) {
        const amount = Number(value);
        if (amount <= 0) return send(res, 400, { error: 'Hodnota slevy musí být kladná.' });
        const rows = await sql`UPDATE coupons SET value = ${amount} WHERE id = ${id} RETURNING id, code, type, value, active, created_at, note`;
        if (!rows.length) return send(res, 404, { error: 'Slevový kód nenalezen.' });
        return send(res, 200, row(rows[0]));
      }
      return send(res, 400, { error: 'Chybí data k aktualizaci.' });
    }

    if (req.method === 'DELETE') {
      if (!id) return send(res, 400, { error: 'Chybí ID slevového kódu.' });
      await sql`DELETE FROM coupons WHERE id = ${id}`;
      return send(res, 200, { success: true });
    }

    return send(res, 405, { error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Coupons API error:', error);
    return send(res, 500, { error: 'Nepodařilo se načíst slevové kódy.', details: error instanceof Error ? error.message : String(error) });
  }
}
