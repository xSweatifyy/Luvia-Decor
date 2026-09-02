import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');
const ALLOWED = ['nova', 'zpracovava_se', 'dokonceno', 'zruseno'] as const;
type Status = typeof ALLOWED[number];

const statusLabels: Record<Status, string> = {
  nova: 'Nová objednávka',
  zpracovava_se: 'Objednávka se zpracovává',
  dokonceno: 'Objednávka dokončena',
  zruseno: 'Objednávka zrušena'
};

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

function getOrderId(req: VercelRequest): string | null {
  const value = req.query.id;
  if (typeof value === 'string' && value) return decodeURIComponent(value);
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) return decodeURIComponent(value[0]);
  return null;
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c] || c));
}

async function sendStatusEmail(order: any, status: Status) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = String(order?.customer?.email || '').trim();
  if (!apiKey) throw new Error('Chybí RESEND_API_KEY ve Vercelu.');
  if (!recipient) throw new Error('Objednávka nemá e-mail zákazníka.');

  const resend = new Resend(apiKey);
  const label = statusLabels[status];
  const orderNumber = String(order.orderNumber || order.id || '');
  const firstStatus = status === 'nova';
  const intro = firstStatus
    ? 'děkujeme Vám za Váš zájem o naše produkty a za vytvoření objednávky. Vaší objednávky si vážíme a nyní ji pečlivě zpracujeme. Brzy Vás budeme kontaktovat s informacemi o dalším postupu.'
    : `rádi bychom Vás informovali, že stav Vaší objednávky <strong>${escapeHtml(orderNumber)}</strong> byl aktualizován.`;
  const nextText = firstStatus
    ? 'Jakmile budeme mít další informace k Vaší objednávce, ozveme se Vám.'
    : 'O další změně stavu Vás budeme informovat e-mailem.';

  const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(label)} | Luvia Decor</title></head>
<body style="margin:0;background:#f5f1ec;color:#2d2723;font-family:Arial,Helvetica,sans-serif">
<div style="padding:32px 12px"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e8dfd5;box-shadow:0 10px 32px rgba(45,39,35,.08)">
<div style="padding:34px 28px;text-align:center;background:#2d2723;color:#faf6f0"><div style="font-family:Georgia,serif;font-size:29px;letter-spacing:4px;font-weight:700">LUVIA DECOR</div><div style="margin-top:9px;color:#d8c9b7;font-size:11px;letter-spacing:1.8px;text-transform:uppercase">Květinový ateliér &amp; dekorace</div></div>
<div style="height:4px;background:#a48763"></div>
<div style="padding:34px 30px 30px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.7px;color:#a48763;font-weight:700">Aktualizace objednávky</div>
<h1 style="font-family:Georgia,serif;font-weight:600;font-size:27px;line-height:1.25;margin:9px 0 8px;color:#2d2723">${escapeHtml(label)}</h1>
<div style="font-size:13px;color:#817469">Objednávka ${escapeHtml(orderNumber)}</div>
<div style="height:1px;background:#eee7df;margin:25px 0"></div>
<p style="margin:0 0 15px;font-size:15px;line-height:1.8">Dobrý den, <strong>${escapeHtml(order.customer?.fullName || '')}</strong>,</p>
<p style="margin:0 0 15px;font-size:15px;line-height:1.8">${intro}</p>
<div style="margin:26px 0;padding:22px 20px;background:#f8f5f1;border:1px solid #ebe3da;border-radius:4px"><div style="font-size:10px;color:#8c7355;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Aktuální stav objednávky</div><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;margin-top:7px;color:#2d2723">${escapeHtml(label)}</div></div>
<p style="margin:0;font-size:15px;line-height:1.8">${nextText}</p>
<p style="margin:25px 0 0;font-size:15px;line-height:1.8">Děkujeme za Vaši důvěru a přejeme Vám krásný den.</p>
<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.7">S přáním hezkého dne,<br><strong>Tým Luvia Decor</strong></p>
</div>
<div style="padding:22px 30px;background:#f5efe6;border-top:1px solid #e8dfd5;text-align:center;color:#817469;font-size:12px;line-height:1.8">Luvia Decor &bull; U Rejdiště 3732/15, 767 01 Kroměříž<br><a href="mailto:no-reply@luvia-decor.cz" style="color:#8c7355;text-decoration:none">no-reply@luvia-decor.cz</a></div>
</div></div></body></html>`;

  const result = await resend.emails.send({
    from: 'Luvia Decor <no-reply@luvia-decor.cz>',
    to: [recipient],
    subject: `${label} – ${orderNumber}`,
    html
  });
  if (result.error) throw new Error(result.error.message);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });

  try {
    await ensureTable();
    const id = getOrderId(req);
    if (!id) return res.status(400).json({ error: 'Chybí id objednávky.' });

    if (req.method === 'GET') {
      let rows = await sql`SELECT data FROM orders WHERE id = ${id} LIMIT 1`;
      if (!rows.length) rows = await sql`SELECT data FROM orders WHERE data->>'orderNumber' = ${id} LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: 'Objednávka nenalezena.' });
      return res.status(200).json(rows[0].data);
    }

    if (!['PUT','PATCH','POST'].includes(req.method || '')) return res.status(405).json({ error: 'Metoda není podporovaná.' });
    const status = String(req.body?.status || '').trim() as Status;
    if (!ALLOWED.includes(status)) return res.status(400).json({ error: 'Neplatný stav objednávky.' });

    let rows = await sql`SELECT id, data FROM orders WHERE id = ${id} LIMIT 1`;
    if (!rows.length) rows = await sql`SELECT id, data FROM orders WHERE data->>'orderNumber' = ${id} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: `Objednávka ${id} nebyla nalezena.` });

    const storedId = String(rows[0].id);
    const oldOrder = (rows[0].data || {}) as any;
    const oldStatus = String(oldOrder.status || '');
    const updatedOrder = { ...oldOrder, id: storedId, status };

    await sql`UPDATE orders SET data = ${JSON.stringify(updatedOrder)}::jsonb, updated_at = NOW() WHERE id = ${storedId}`;

    let emailSent = false;
    let emailError = '';
    if (oldStatus !== status) {
      try {
        await sendStatusEmail(updatedOrder, status);
        emailSent = true;
      } catch (emailErr: any) {
        emailError = emailErr?.message || 'E-mail se nepodařilo odeslat.';
        console.error('Order status email error:', emailErr);
      }
    }

    return res.status(200).json({ ...updatedOrder, statusEmailSent: emailSent, statusEmailError: emailError || undefined });
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ error: error?.message || 'Stav objednávky se nepodařilo aktualizovat.' });
  }
}
