import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
function isAdmin(req: VercelRequest) { try { const raw = typeof req.query.adminUser === 'string' ? req.query.adminUser : ''; const user = raw ? JSON.parse(raw) : req.body?.adminUser; return user?.role === 'admin'; } catch { return false; } }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Pro zobrazení historie se přihlaste jako administrátor.' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS newsletter_campaigns (id TEXT PRIMARY KEY, title TEXT NOT NULL, body_text TEXT NOT NULL, image_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_count INT NOT NULL DEFAULT 0)`;
    const rows = await sql`SELECT id, title, body_text, image_url, created_at, sent_count FROM newsletter_campaigns ORDER BY created_at DESC`;
    return res.status(200).json(rows.map((r: any) => ({ id:r.id, title:r.title, text:r.body_text, imageUrl:r.image_url || undefined, createdAt:r.created_at, sentCount:Number(r.sent_count) || 0 })));
  } catch (error: any) { console.error('Newsletter campaigns error:', error); return res.status(500).json({ error: error?.message || 'Historii newsletterů se nepodařilo načíst.' }); }
}