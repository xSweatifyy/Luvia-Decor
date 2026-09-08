import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');
const ZASLAT_BASE = 'https://www.zaslat.cz/api/v1';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;
}

async function zaslatRates(body: any) {
  const apiKey = String(process.env.ZASLAT_API_KEY || '').trim();
  if (!apiKey) throw new Error('Chybí ZASLAT_API_KEY ve Vercel Environment Variables.');
  const country = String(body?.country || 'CZ').toUpperCase() === 'SK' ? 'SK' : 'CZ';
  const packages = Array.isArray(body?.packages) && body.packages.length ? body.packages : [{ weight: 1, width: 30, height: 20, length: 10 }];
  const payload: any = {
    currency: 'CZK',
    type: 'OCCASIONAL',
    pickup_date: new Date().toISOString().slice(0, 10),
    from: { country: 'CZ' },
    to: { country },
    packages: packages.map((p: any) => ({
      weight: Math.max(0.1, Number(p?.weight) || 1),
      width: Math.max(1, Number(p?.width) || 30),
      height: Math.max(1, Number(p?.height) || 20),
      length: Math.max(1, Number(p?.length) || 10),
    })),
  };
  if (body?.deliveryBranch) payload.delivery_branch = String(body.deliveryBranch);
  const response = await fetch(`${ZASLAT_BASE}/rates/get`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Apikey': apiKey },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || Number(data?.status) >= 400) {
    const detail = Array.isArray(data?.errors) ? data.errors.map((e: any) => e?.message || e).join('; ') : data?.message;
    throw new Error(detail || `Zaslat API vrátilo HTTP ${response.status}.`);
  }
  return Array.isArray(data?.rates) ? data.rates : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET' && String(req.query?.action || '') === 'zaslat-rates') {
      const rates = await zaslatRates({ country: req.query?.country, deliveryBranch: req.query?.deliveryBranch });
      return res.status(200).json({ success: true, rates });
    }
    if (req.method === 'POST' && String(req.query?.action || '') === 'zaslat-rates') {
      const rates = await zaslatRates(req.body || {});
      return res.status(200).json({ success: true, rates });
    }

    await sql`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
    if (rows.length === 0) {
      await sql`INSERT INTO app_state (id, data) VALUES (1, '{}'::jsonb)`;
    }

    if (req.method === 'GET') {
      const current = await sql`SELECT data FROM app_state WHERE id = 1`;
      return res.status(200).json(current[0]?.data || {});
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const current = await sql`SELECT data FROM app_state WHERE id = 1`;
      const existing = current[0]?.data && typeof current[0].data === 'object' ? current[0].data : {};
      const merged = { ...existing, ...body };
      await sql`UPDATE app_state SET data = ${JSON.stringify(merged)}::jsonb, updated_at = NOW() WHERE id = 1`;
      return res.status(200).json(merged);
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Config API error:', error);
    return res.status(500).json({ error: error?.message || 'Nastavení se nepodařilo zpracovat.' });
  }
}
