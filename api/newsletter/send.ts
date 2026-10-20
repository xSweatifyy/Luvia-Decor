import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
const sql = neon(process.env.DATABASE_URL || '');
function isAdmin(req: VercelRequest) { try { const raw = typeof req.query.adminUser === 'string' ? req.query.adminUser : ''; const user = raw ? JSON.parse(raw) : req.body?.adminUser; return user?.role === 'admin'; } catch { return false; } }
function esc(v: string) { return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Pro odeslání newsletteru se přihlaste jako administrátor.' });
  const title = String(req.body?.title || '').trim().slice(0, 200);
  const bodyText = String(req.body?.text || '').trim().slice(0, 20000);
  const imageUrl = String(req.body?.imageUrl || '').trim().slice(0, 2000);
  if (!title || !bodyText) return res.status(400).json({ error: 'Vyplňte nadpis i text newsletteru.' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Odesílání není nastavené: na Vercelu chybí RESEND_API_KEY.' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS newsletter_subscribers (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS newsletter_campaigns (id TEXT PRIMARY KEY, title TEXT NOT NULL, body_text TEXT NOT NULL, image_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_count INT NOT NULL DEFAULT 0)`;
    const subscribers = await sql`SELECT email, first_name FROM newsletter_subscribers WHERE active = TRUE ORDER BY created_at ASC`;
    if (!subscribers.length) return res.status(400).json({ error: 'Zatím nejsou žádní aktivní odběratelé.' });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || 'Luvia Decor <newsletter@luvia-decor.cz>';
    const htmlText = esc(bodyText).replace(/\r?\n/g,'<br>');
    const img = imageUrl.startsWith('https://') ? '<img src="' + esc(imageUrl) + '" alt="" style="max-width:100%;height:auto;border-radius:12px;margin:20px 0">' : '';
    let sent = 0; const failures: string[] = [];
    for (const s of subscribers as any[]) {
      try {
        const result = await resend.emails.send({ from, to:[s.email], subject:title, html:'<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2d2723;line-height:1.65"><h1>'+esc(title)+'</h1><p>Dobrý den '+esc(String(s.first_name||''))+',</p><p>'+htmlText+'</p>'+img+'<hr><p style="font-size:12px;color:#786b60">Luvia Decor · Květinový ateliér a dekorace</p><p style="font-size:11px;color:#786b60">Pokud si již nepřejete dostávat newsletter, odpovězte na tento e-mail se žádostí o odhlášení.</p></div>' });
        if (result.error) failures.push(String(s.email)); else sent++;
      } catch { failures.push(String(s.email)); }
    }
    await sql`INSERT INTO newsletter_campaigns (id,title,body_text,image_url,sent_count) VALUES (${'cmp-'+Date.now()},${title},${bodyText},${imageUrl||null},${sent})`;
    return res.status(200).json({ success:true, sent, total:subscribers.length, failed:failures.length });
  } catch (error: any) { console.error('Newsletter send error:',error); return res.status(500).json({ error:error?.message||'Newsletter se nepodařilo odeslat.' }); }
}