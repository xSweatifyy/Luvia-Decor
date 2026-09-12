import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL || '';
const sql = neon(databaseUrl);
const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.DATABASE_URL || 'luvia-customer-session-secret';

type CustomerData = {
  id: string; email: string; name: string; phone: string; createdAt: string; lastLogin?: string;
  addresses: any[]; favorites: string[]; collections: any[]; preferences: { styles: string[]; colors: string[] };
};

function hashPassword(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function publicUser(user: CustomerData) { return user; }
function makeToken(id: string) {
  const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function getUserId(req: VercelRequest) {
  const raw = String(req.headers.authorization || '');
  if (!raw.startsWith('Bearer ')) return null;
  const token = raw.slice(7);
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload.id || !payload.exp || Date.now() > Number(payload.exp)) return null;
    return String(payload.id);
  } catch { return null; }
}
async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS customer_accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}
async function findUser(id: string) {
  const rows = await sql`SELECT data FROM customer_accounts WHERE id = ${id} LIMIT 1`;
  return rows.length ? rows[0].data as CustomerData : null;
}
function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureTable();
    const parts = (req.query.all as string[]) || [];

    if (parts[0] === 'register' && req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || '').trim();
      const phone = String(req.body?.phone || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Zadejte platný e-mail.' });
      if (password.length < 8) return res.status(400).json({ error: 'Heslo musí mít alespoň 8 znaků.' });
      const exists = await sql`SELECT id FROM customer_accounts WHERE email = ${email} LIMIT 1`;
      if (exists.length) return res.status(400).json({ error: 'Účet s tímto e-mailem již existuje.' });
      const now = new Date().toISOString();
      const user: CustomerData = { id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, email, name: name || email.split('@')[0], phone, createdAt: now, addresses: [], favorites: [], collections: [], preferences: { styles: [], colors: [] } };
      await sql`INSERT INTO customer_accounts (id, email, password_hash, data, created_at, updated_at) VALUES (${user.id}, ${user.email}, ${hashPassword(password)}, ${JSON.stringify(user)}::jsonb, ${now}, ${now})`;
      return res.status(201).json({ user: publicUser(user), token: makeToken(user.id) });
    }

    if (parts[0] === 'login' && req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const rows = await sql`SELECT data, password_hash FROM customer_accounts WHERE email = ${email} LIMIT 1`;
      if (!rows.length || rows[0].password_hash !== hashPassword(password)) return res.status(401).json({ error: 'Neplatný e-mail nebo heslo.' });
      const user = rows[0].data as CustomerData;
      user.lastLogin = new Date().toISOString();
      await sql`UPDATE customer_accounts SET data = ${JSON.stringify(user)}::jsonb, updated_at = NOW() WHERE id = ${user.id}`;
      return res.status(200).json({ user: publicUser(user), token: makeToken(user.id) });
    }

    const id = getUserId(req);
    if (!id) return res.status(401).json({ error: 'Nejste přihlášeni.' });
    const user = await findUser(id);
    if (!user) return res.status(401).json({ error: 'Účet nebyl nalezen.' });

    if (parts[0] === 'logout' && req.method === 'POST') return res.status(200).json({ success: true });

    if (parts[0] === 'me' && req.method === 'GET') {
      const email = user.email.toLowerCase();
      let orders: any[] = [];
      try {
        const rows = await sql`SELECT id, data FROM orders WHERE LOWER(data->'customer'->>'email') = ${email} ORDER BY created_at DESC`;
        orders = rows.map((r: any) => ({ ...r.data, id: r.id }));
      } catch { orders = []; }
      let coupons: any[] = [];
      try {
        const rows = await sql`SELECT id, code, type, value, active, created_at, note FROM coupons WHERE active = TRUE ORDER BY created_at DESC`;
        coupons = rows.map((r: any) => ({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' }));
      } catch { coupons = []; }
      const vouchers = coupons.filter((c: any) => String(c.note || '').toLowerCase().includes(email) || String(c.note || '').toLowerCase().includes(`customer:${email}`));
      return res.status(200).json({ user: publicUser(user), orders, coupons: coupons.filter(c => !vouchers.includes(c)), vouchers });
    }

    if (parts[0] === 'me' && req.method === 'PUT') {
      const body = req.body || {};
      if (body.name !== undefined) user.name = String(body.name).trim();
      if (body.phone !== undefined) user.phone = String(body.phone).trim();
      if (Array.isArray(body.favorites)) user.favorites = Array.from(new Set(body.favorites.map(String)));
      if (Array.isArray(body.addresses)) user.addresses = body.addresses;
      if (Array.isArray(body.collections)) user.collections = body.collections;
      if (body.preferences && typeof body.preferences === 'object') user.preferences = { styles: Array.isArray(body.preferences.styles) ? body.preferences.styles.map(String) : [], colors: Array.isArray(body.preferences.colors) ? body.preferences.colors.map(String) : [] };
      await sql`UPDATE customer_accounts SET data = ${JSON.stringify(user)}::jsonb, updated_at = NOW() WHERE id = ${user.id}`;
      return res.status(200).json({ user: publicUser(user) });
    }

    if (parts[0] === 'password' && req.method === 'POST') {
      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');
      if (newPassword.length < 8) return res.status(400).json({ error: 'Nové heslo musí mít alespoň 8 znaků.' });
      const rows = await sql`SELECT password_hash FROM customer_accounts WHERE id = ${user.id} LIMIT 1`;
      if (!rows.length || rows[0].password_hash !== hashPassword(currentPassword)) return res.status(400).json({ error: 'Současné heslo není správné.' });
      await sql`UPDATE customer_accounts SET password_hash = ${hashPassword(newPassword)}, updated_at = NOW() WHERE id = ${user.id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Požadavek zákaznického účtu nebyl nalezen.' });
  } catch (error: any) {
    console.error('[customer-api]', error);
    return res.status(500).json({ error: 'Interní chyba zákaznického účtu.' });
  }
}
