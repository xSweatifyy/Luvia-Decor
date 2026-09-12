import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL || '';
const sql = neon(databaseUrl);
const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.DATABASE_URL || 'luvia-customer-session-secret';
const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://www.luvia-decor.cz').replace(/\/$/, '');
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFrom = process.env.RESEND_FROM_EMAIL || 'Luvia Decor <onboarding@resend.dev>';

type CustomerData = {
  id: string; email: string; name: string; phone: string; createdAt: string; lastLogin?: string;
  addresses: any[]; favorites: string[]; collections: any[]; preferences: { styles: string[]; colors: string[] };
};

function hashPassword(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
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
    if (parts[1].length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload.id || !payload.exp || Date.now() > Number(payload.exp)) return null;
    return String(payload.id);
  } catch { return null; }
}
async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS customer_accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS verification_token_hash TEXT`;
  await sql`ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ`;
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
function verificationPage(res: VercelResponse, ok: boolean, title: string, text: string) {
  res.status(ok ? 200 : 400).setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Luvia Decor</title><style>body{margin:0;background:#fbf8f4;color:#241e1a;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.card{max-width:520px;background:#fff;border:1px solid #e6ddd3;border-radius:24px;padding:36px;text-align:center;box-shadow:0 12px 40px #241e1a12}h1{font-size:30px;margin:0 0 12px}p{color:#7d6f64;line-height:1.6}.btn{display:inline-block;margin-top:18px;padding:12px 20px;border-radius:12px;background:#241e1a;color:#fff;text-decoration:none;font-weight:700}</style></head><body><div class="card"><h1>${title}</h1><p>${text}</p><a class="btn" href="${siteUrl}">Zpět na Luvia Decor</a></div></body></html>`);
}
async function sendVerificationEmail(email: string, name: string, verifyUrl: string) {
  if (!resendApiKey) throw new Error('RESEND_API_KEY není ve Vercelu nastavený.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: resendFrom, to: [email], subject: 'Potvrďte svůj e-mail – Luvia Decor', html: `<div style="font-family:Arial,sans-serif;background:#fbf8f4;padding:36px 16px;color:#241e1a"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e6ddd3;border-radius:24px;padding:34px"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8c7355;font-weight:700">Luvia Decor</div><h1 style="font-size:30px;margin:16px 0 10px">Potvrďte svůj e-mail</h1><p style="color:#6f6258;line-height:1.65">Dobrý den${name ? `, ${name}` : ''},<br>děkujeme za registraci zákaznického účtu u Luvia Decor. Pro dokončení registrace klikněte na tlačítko níže.</p><p style="text-align:center;margin:28px 0"><a href="${verifyUrl}" style="display:inline-block;background:#241e1a;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700">Potvrdit e-mail</a></p><p style="font-size:12px;color:#8a7d73;line-height:1.5">Odkaz je platný 24 hodin. Pokud jste registraci neprováděli vy, tento e-mail ignorujte.</p></div></div>` })
  });
  if (!response.ok) { const detail = await response.text(); console.error('[resend]', detail); throw new Error('Potvrzovací e-mail se nepodařilo odeslat.'); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureTable();
    const parts = (req.query.all as string[]) || [];

    if (parts[0] === 'verify' && req.method === 'GET') {
      const raw = String(req.query.token || '');
      if (!raw) return verificationPage(res, false, 'Ověření se nepodařilo', 'Ověřovací odkaz je neplatný nebo chybí.');
      const tokenHash = hashToken(raw);
      const rows = await sql`SELECT id FROM customer_accounts WHERE verification_token_hash = ${tokenHash} AND verification_expires_at > NOW() LIMIT 1`;
      if (!rows.length) return verificationPage(res, false, 'Odkaz je neplatný', 'Ověřovací odkaz je neplatný nebo již vypršel. Požádejte o nový ověřovací e-mail.');
      await sql`UPDATE customer_accounts SET email_verified = TRUE, verification_token_hash = NULL, verification_expires_at = NULL, updated_at = NOW() WHERE id = ${rows[0].id}`;
      return verificationPage(res, true, 'E-mail potvrzen', 'Váš e-mail byl úspěšně ověřen. Nyní se můžete přihlásit do svého zákaznického účtu.');
    }

    if (parts[0] === 'register' && req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || '').trim();
      const phone = String(req.body?.phone || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Zadejte platný e-mail.' });
      if (password.length < 8) return res.status(400).json({ error: 'Heslo musí mít alespoň 8 znaků.' });
      const exists = await sql`SELECT id, email_verified FROM customer_accounts WHERE email = ${email} LIMIT 1`;
      if (exists.length) return res.status(400).json({ error: exists[0].email_verified ? 'Účet s tímto e-mailem již existuje.' : 'Účet už existuje, ale e-mail ještě nebyl ověřen. Požádejte o nový ověřovací e-mail.' });
      const now = new Date().toISOString();
      const verificationToken = crypto.randomBytes(32).toString('base64url');
      const user: CustomerData = { id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, email, name: name || email.split('@')[0], phone, createdAt: now, addresses: [], favorites: [], collections: [], preferences: { styles: [], colors: [] } };
      await sql`INSERT INTO customer_accounts (id, email, password_hash, data, created_at, updated_at, email_verified, verification_token_hash, verification_expires_at) VALUES (${user.id}, ${user.email}, ${hashPassword(password)}, ${JSON.stringify(user)}::jsonb, ${now}, ${now}, FALSE, ${hashToken(verificationToken)}, NOW() + INTERVAL '24 hours')`;
      try {
        await sendVerificationEmail(user.email, user.name, `${siteUrl}/api/customer/verify?token=${encodeURIComponent(verificationToken)}`);
      } catch (error) {
        await sql`DELETE FROM customer_accounts WHERE id = ${user.id}`;
        throw error;
      }
      return res.status(201).json({ verificationRequired: true, email: user.email, message: 'Registrace proběhla. Na váš e-mail jsme poslali odkaz pro potvrzení adresy. Po potvrzení se můžete přihlásit.' });
    }

    if (parts[0] === 'resend-verification' && req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const rows = await sql`SELECT id, data, email_verified FROM customer_accounts WHERE email = ${email} LIMIT 1`;
      if (!rows.length || rows[0].email_verified) return res.status(200).json({ success: true, message: 'Pokud účet existuje a není ověřený, byl odeslán nový e-mail.' });
      const verificationToken = crypto.randomBytes(32).toString('base64url');
      await sql`UPDATE customer_accounts SET verification_token_hash = ${hashToken(verificationToken)}, verification_expires_at = NOW() + INTERVAL '24 hours', updated_at = NOW() WHERE id = ${rows[0].id}`;
      const user = rows[0].data as CustomerData;
      await sendVerificationEmail(email, user.name, `${siteUrl}/api/customer/verify?token=${encodeURIComponent(verificationToken)}`);
      return res.status(200).json({ success: true, message: 'Nový ověřovací e-mail byl odeslán.' });
    }

    if (parts[0] === 'login' && req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const rows = await sql`SELECT data, password_hash, email_verified FROM customer_accounts WHERE email = ${email} LIMIT 1`;
      if (!rows.length || rows[0].password_hash !== hashPassword(password)) return res.status(401).json({ error: 'Neplatný e-mail nebo heslo.' });
      if (!rows[0].email_verified) return res.status(403).json({ error: 'Nejdříve potvrďte svůj e-mail. Zkontrolujte doručenou poštu nebo si nechte poslat nový ověřovací e-mail.', verificationRequired: true, email });
      const user = rows[0].data as CustomerData;
      user.lastLogin = new Date().toISOString();
      await sql`UPDATE customer_accounts SET data = ${JSON.stringify(user)}::jsonb, updated_at = NOW() WHERE email = ${email}`;
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
    return res.status(500).json({ error: error?.message || 'Interní chyba zákaznického účtu.' });
  }
}
