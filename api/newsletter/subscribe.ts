import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS newsletter_subscribers (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    await ensureTables();
    const firstName = String(req.body?.firstName || '').trim().slice(0, 100);
    const lastName = String(req.body?.lastName || '').trim().slice(0, 100);
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Vyplňte prosím jméno, příjmení a platný e-mail.' });
    await sql`INSERT INTO newsletter_subscribers (id, email, first_name, last_name, active) VALUES (${'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)}, ${email}, ${firstName}, ${lastName}, TRUE) ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, active = TRUE`;
    return res.status(200).json({ success: true, message: 'Děkujeme za přihlášení k newsletteru.' });
  } catch (error: any) {
    console.error('Newsletter subscribe error:', error);
    return res.status(500).json({ error: error?.message || 'Přihlášení k newsletteru se nepodařilo.' });
  }
}