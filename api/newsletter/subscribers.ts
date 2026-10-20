import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
function isAdmin(req: VercelRequest) { try { const raw = typeof req.query.adminUser === 'string' ? req.query.adminUser : ''; const user = raw ? JSON.parse(raw) : req.body?.adminUser; return user?.role === 'admin'; } catch { return false; } }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Pro zobrazení odběratelů se přihlaste jako administrátor.' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS newsletter_subscribers (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`SELECT id, email, first_name, last_name, created_at, active FROM newsletter_subscribers ORDER BY created_at DESC`;
    return res.status(200).json(rows.map((r: any) => ({ id:r.id, email:r.email, firstName:r.first_name, lastName:r.last_name, createdAt:r.created_at, active:r.active })));
  } catch (error: any) { console.error('Newsletter subscribers error:', error); return res.status(500).json({ error: error?.message || 'Odběratele se nepodařilo načíst.' }); }
}