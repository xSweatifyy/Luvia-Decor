import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, body_text TEXT NOT NULL, image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_count INT NOT NULL DEFAULT 0
  )`;
}
function admin(req: VercelRequest) {
  const raw = typeof req.query.adminUser === 'string' ? req.query.adminUser : '';
  try {
    const user = raw ? JSON.parse(raw) : req.body?.adminUser;
    return user?.role === 'admin' ? user : null;
  } catch { return null; }
}
function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = String(req.query.action || '').toLowerCase();
  try {
    if (action === 'subscribe' && req.method === 'POST') {
      await ensureTables();
      const firstName = String(req.body?.firstName || '').trim().slice(0, 100);
      const lastName = String(req.body?.lastName || '').trim().slice(0, 100);
      const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
      if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Vyplňte prosím jméno, příjmení a platný e-mail.' });
      }
      await sql`INSERT INTO newsletter_subscribers (id,email,first_name,last_name,active)
        VALUES (${'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2,8)},${email},${firstName},${lastName},TRUE)
        ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,active=TRUE`;
      return res.status(200).json({ success: true, message: 'Děkujeme za přihlášení k newsletteru.' });
    }

    if (action === 'subscribers' && req.method === 'GET') {
      if (!admin(req)) return res.status(403).json({ error: 'Pro zobrazení odběratelů se přihlaste jako administrátor.' });
      await ensureTables();
      const accounts = await sql`SELECT to_regclass('public.customer_accounts') AS table_name`;
      if (accounts[0]?.table_name) {
        await sql`INSERT INTO newsletter_subscribers (id,email,first_name,last_name,active)
          SELECT 'sub-account-' || ca.id, LOWER(ca.email),
            COALESCE(NULLIF(SPLIT_PART(TRIM(ca.data->>'name'),' ',1),''),''),
            COALESCE(NULLIF(TRIM(SUBSTRING(TRIM(ca.data->>'name') FROM POSITION(' ' IN TRIM(ca.data->>'name'))+1)),''),''),
            TRUE
          FROM customer_accounts ca
          WHERE ca.email_verified=TRUE AND ca.newsletter_opt_in=TRUE
          ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,active=TRUE`;
      }
      const rows = await sql`SELECT id,email,first_name,last_name,created_at,active FROM newsletter_subscribers ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((r: any) => ({ id:r.id,email:r.email,firstName:r.first_name,lastName:r.last_name,createdAt:r.created_at,active:r.active })));
    }

    if (action === 'campaigns' && req.method === 'GET') {
      if (!admin(req)) return res.status(403).json({ error: 'Pro zobrazení historie se přihlaste jako administrátor.' });
      await ensureTables();
      const rows = await sql`SELECT id,title,body_text,image_url,created_at,sent_count FROM newsletter_campaigns ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((r: any) => ({ id:r.id,title:r.title,text:r.body_text,imageUrl:r.image_url || undefined,createdAt:r.created_at,sentCount:Number(r.sent_count)||0 })));
    }

    if (action === 'send' && req.method === 'POST') {
      if (!admin(req)) return res.status(403).json({ error: 'Pro odeslání newsletteru se přihlaste jako administrátor.' });
      const title = String(req.body?.title || '').trim().slice(0,200);
      const bodyText = String(req.body?.text || '').trim().slice(0,20000);
      const imageUrl = String(req.body?.imageUrl || '').trim().slice(0,2000);
      if (!title || !bodyText) return res.status(400).json({ error: 'Vyplňte nadpis i text newsletteru.' });
      if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Odesílání není nastavené: na Vercelu chybí RESEND_API_KEY.' });
      await ensureTables();
      const subscribers = await sql`SELECT email,first_name FROM newsletter_subscribers WHERE active=TRUE ORDER BY created_at ASC`;
      if (!subscribers.length) return res.status(400).json({ error: 'Zatím nejsou žádní aktivní odběratelé.' });
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM_EMAIL || 'Luvia Decor <newsletter@luvia-decor.cz>';
      const safeImage = imageUrl.startsWith('https://') ? '<img src="'+esc(imageUrl)+'" alt="" style="max-width:100%;height:auto;border-radius:12px;margin:20px 0">' : '';
      const html = (name: string) => '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2d2723;line-height:1.65"><h1>'+esc(title)+'</h1><p>Dobrý den '+esc(name||'')+',</p><p>'+esc(bodyText).replace(/\r?\n/g,'<br>')+'</p>'+safeImage+'<hr style="border:0;border-top:1px solid #e5ddd4;margin:28px 0"><p style="font-size:12px;color:#786b60">Luvia Decor · Květinový ateliér a dekorace</p><p style="font-size:11px;color:#786b60">Pokud si již nepřejete dostávat newsletter, odpovězte na tento e-mail se žádostí o odhlášení.</p></div>';
      let sent=0; let failed=0;
      for (const s of subscribers as any[]) {
        try { const result=await resend.emails.send({from,to:[s.email],subject:title,html:html(String(s.first_name||''))}); if(result.error) failed++; else sent++; }
        catch { failed++; }
      }
      await sql`INSERT INTO newsletter_campaigns (id,title,body_text,image_url,sent_count) VALUES (${'cmp-'+Date.now()},${title},${bodyText},${imageUrl||null},${sent})`;
      return res.status(200).json({success:true,sent,total:subscribers.length,failed});
    }
    return res.status(404).json({ error: 'API newsletteru: neznámá akce.' });
  } catch (error: any) {
    console.error('Newsletter API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru newsletteru.' });
  }
}