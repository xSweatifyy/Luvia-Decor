import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');
const STATUS_LABELS: Record<string, string> = {
  nova: 'Nová objednávka',
  zpracovava_se: 'Objednávka se zpracovává',
  zaplaceno: 'Zaplaceno',
  odeslano: 'Odesláno',
  dokonceno: 'Objednávka dokončena',
  zruseno: 'Objednávka zrušena'
};

const esc = (v: unknown) => String(v ?? '').replace(/[&<>\'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));
const money = (v: unknown) => `${Number(v || 0).toLocaleString('cs-CZ')} Kč`;

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function sendStatusEmail(order: any, status: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const to = String(order?.customer?.email || '').trim();
  if (!key || !to) return null;
  const label = STATUS_LABELS[status] || status;
  const number = String(order.orderNumber || order.id || '');
  const html = `<!doctype html><html lang="cs"><body style="margin:0;background:#f5f1ec;color:#2d2723;font-family:Arial,sans-serif"><div style="padding:32px 12px"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #e8dfd5"><div style="padding:34px 28px;text-align:center;background:#2d2723;color:#faf6f0"><div style="font-family:Georgia,serif;font-size:29px;letter-spacing:4px;font-weight:700">LUVIA DECOR</div><div style="margin-top:9px;color:#d8c9b7;font-size:11px;letter-spacing:1.8px;text-transform:uppercase">Květinový ateliér &amp; dekorace</div></div><div style="height:4px;background:#a48763"></div><div style="padding:34px 30px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.7px;color:#a48763;font-weight:700">Aktualizace objednávky</div><h1 style="font-family:Georgia,serif;font-size:27px;margin:9px 0 8px">${esc(label)}</h1><div style="font-size:13px;color:#817469">Objednávka ${esc(number)}</div><hr style="border:0;border-top:1px solid #eee7df;margin:25px 0"><p style="font-size:15px;line-height:1.8">Dobrý den, <strong>${esc(order.customer?.fullName || '')}</strong>,</p><p style="font-size:15px;line-height:1.8">stav Vaší objednávky <strong>${esc(number)}</strong> byl změněn na <strong>${esc(label)}</strong>.</p><div style="margin:26px 0;padding:22px;background:#f8f5f1;border:1px solid #ebe3da"><div style="font-size:10px;color:#8c7355;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Aktuální stav</div><div style="font-family:Georgia,serif;font-size:22px;margin-top:7px">${esc(label)}</div><div style="margin-top:10px;font-size:15px"><strong>Částka objednávky:</strong> ${money(order.totalPrice)}</div></div><p style="font-size:15px;line-height:1.8">O další změně stavu Vás budeme informovat e-mailem.</p><p style="font-family:Georgia,serif;font-size:16px;line-height:1.7">S přáním hezkého dne,<br><strong>Tým Luvia Decor</strong></p></div></div></div></body></html>`;
  const result = await new Resend(key).emails.send({ from: 'Luvia Decor <no-reply@luvia-decor.cz>', to: [to], subject: `${label} – ${number}`, html });
  if (result.error) throw new Error(result.error.message);
  return result.data?.id || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporována.' });
  try {
    await ensureTable();
    const orderId = String(req.body?.orderId || req.body?.id || '').trim();
    const status = String(req.body?.status || '').trim();
    if (!orderId) return res.status(400).json({ error: 'Chybí id objednávky.' });
    if (!Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)) return res.status(400).json({ error: 'Neplatný stav objednávky.' });
    let rows = await sql`SELECT id,data FROM orders WHERE id=${orderId} LIMIT 1`;
    if (!rows.length) rows = await sql`SELECT id,data FROM orders WHERE data->>'orderNumber'=${orderId} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: `Objednávka ${orderId} nebyla nalezena.` });
    const old = (rows[0].data || {}) as any;
    const oldStatus = String(old.status || '');
    const order = { ...old, id: String(rows[0].id), status };
    await sql`UPDATE orders SET data=${JSON.stringify(order)}::jsonb, updated_at=NOW() WHERE id=${String(rows[0].id)}`;
    let emailId: string | null = null;
    let emailError: string | null = null;
    if (oldStatus !== status) {
      try { emailId = await sendStatusEmail(order, status); } catch (e: any) { emailError = e?.message || 'E-mail se nepodařilo odeslat.'; }
    }
    return res.status(200).json({ success: true, order, status, statusLabel: STATUS_LABELS[status], statusEmailSent: Boolean(emailId), statusEmailId: emailId, statusEmailError: emailError });
  } catch (e: any) {
    console.error('Order status API error:', e);
    return res.status(500).json({ error: e?.message || 'Interní chyba serveru.' });
  }
}
