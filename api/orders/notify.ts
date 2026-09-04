import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');
const SELLER = 'objednavky@luvia-decor.cz';
const FROM = 'Luvia Decor <objednavky@luvia-decor.cz>';
const BANK = '963625011/5500';
const IBAN = 'CZ45 5500 0000 0096 3625 011';

function esc(v: unknown) { return String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'} as any)[c] || c); }
function vs(n: string) { return String(n || '').replace(/\D/g, ''); }
function money(v: unknown) { return Number(v || 0).toLocaleString('cs-CZ'); }
function qr(order: any) {
  const payload = `SPD*1.0*ACC:CZ45550000000000963625011*AM:${Number(order.totalPrice || 0).toFixed(2)}*CC:CZK*X-VS:${vs(order.orderNumber)}*X-MSG:${order.orderNumber}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(payload)}`;
}
function layout(title: string, body: string) {
  return `<!doctype html><html lang="cs"><body style="margin:0;background:#f4f0eb;font-family:Arial,Helvetica,sans-serif;color:#302923"><div style="padding:32px 12px"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e7dfd6;border-radius:20px;overflow:hidden"><div style="background:#211c18;padding:28px 32px;text-align:center"><div style="font-size:26px;letter-spacing:5px;font-weight:700;color:#faf6f0">LUVIA DECOR</div><div style="margin-top:7px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a880">Květinový ateliér &amp; dekorace</div></div><div style="padding:32px"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b08f65;font-weight:700;margin-bottom:8px">${esc(title)}</div>${body}</div><div style="padding:24px 32px;background:#faf8f5;border-top:1px solid #eee5dc;text-align:center;color:#756b63;font-size:12px;line-height:1.8"><strong style="color:#302923">Luvia Decor</strong><br>Odpovědná osoba: Ladislav Pekárek<br>Adresa: U Rejdiště 3732/15, 767 01, Kroměříž<br>IČO: 29905061<br>Email: objednavky@luvia-decor.cz · podpora@luvia-decor.cz<br>Telefonní číslo: +420702345999</div></div></div></body></html>`;
}
function shippingPrice(d: any) {
  if (d?.method === 'personal_pickup') return 0;
  if (d?.carrier === 'DPD') return d.method === 'address' ? 105 : 75;
  if (d?.carrier === 'Zásilkovna') return d.method === 'address' ? 89 : 62;
  return 0;
}
function itemsHtml(order: any) { return (order.items || []).map((i: any) => `<tr><td style="padding:12px;border-bottom:1px solid #eee"><strong>${esc(i.title)}</strong></td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center">${Number(i.quantity || 1)}</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right">${money(i.price)} Kč</td></tr>`).join(''); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    const { orderId, delivery } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Chybí ID objednávky.' });
    const rows = await sql`SELECT id, data FROM orders WHERE id = ${String(orderId)} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Objednávka nenalezena.' });
    const order = { ...(rows[0].data as any), id: rows[0].id };
    const shipping = shippingPrice(delivery);
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount || 0);
    const totalPrice = Math.max(0, subtotal - discount + shipping);
    const updated = { ...order, delivery: delivery || order.delivery, shipping, totalPrice, paymentMethod: 'bank_transfer', variableSymbol: vs(order.orderNumber) };
    await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${String(orderId)}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(200).json({ success: true, order: updated, emailSent: false, warning: 'Chybí RESEND_API_KEY.' });
    const resend = new Resend(apiKey);
    const customer = String(updated.customer?.email || '').trim();
    const number = esc(updated.orderNumber);
    const payment = `<div style="margin-top:24px;padding:20px;background:#faf8f5;border:1px solid #eee5dc;border-radius:14px"><div style="font-weight:700;margin-bottom:10px">Bankovní převod</div><div style="font-size:13px;line-height:1.8">Číslo účtu: <strong>${BANK}</strong><br>IBAN: <strong>${IBAN}</strong><br>Variabilní symbol: <strong>${vs(updated.orderNumber)}</strong><br>Částka: <strong>${money(totalPrice)} Kč</strong><br>Poznámka pro příjemce: <strong>${number}</strong></div><div style="text-align:center;margin-top:16px"><img src="${qr(updated)}" width="220" height="220" alt="QR platba" style="border:1px solid #e6ded5;border-radius:8px"></div></div>`;
    const customerBody = `<h1 style="margin:0 0 12px;font-size:25px">Nová objednávka</h1><p style="font-size:15px;line-height:1.7">Dobrý den, ${esc(updated.customer?.fullName)},<br>Vaše objednávka byla úspěšně přijata.</p><div style="padding:16px 18px;background:#faf8f5;border-radius:12px;font-size:13px;line-height:1.8"><strong>Objednávka:</strong> ${number}<br><strong>Variabilní symbol:</strong> ${vs(updated.orderNumber)}<br><strong>Doprava:</strong> ${esc(updated.delivery?.carrier || 'osobní odběr')} / ${esc(updated.delivery?.method || 'personal_pickup')}</div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:20px"><thead><tr><th style="padding:10px;text-align:left;border-bottom:1px solid #ddd">Položka</th><th style="padding:10px">Ks</th><th style="padding:10px;text-align:right">Cena</th></tr></thead><tbody>${itemsHtml(updated)}</tbody></table><p style="font-size:17px;text-align:right"><strong>Celkem: ${money(totalPrice)} Kč</strong></p>${payment}`;
    const sellerBody = `<h1 style="margin:0 0 12px;font-size:25px">Nová objednávka</h1><div style="padding:16px 18px;background:#faf8f5;border-radius:12px;font-size:13px;line-height:1.8"><strong>Objednávka:</strong> ${number}<br><strong>Zákazník:</strong> ${esc(updated.customer?.fullName)}<br><strong>E-mail:</strong> ${esc(customer)}<br><strong>Telefon:</strong> ${esc(updated.customer?.phone)}<br><strong>Celkem:</strong> ${money(totalPrice)} Kč</div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:20px"><tbody>${itemsHtml(updated)}</tbody></table>`;
    const results = await Promise.allSettled([
      customer ? resend.emails.send({ from: FROM, to: customer, replyTo: 'podpora@luvia-decor.cz', subject: `Nová objednávka · ${updated.orderNumber} | Luvia Decor`, html: layout('Potvrzení objednávky', customerBody) }) : Promise.resolve(),
      resend.emails.send({ from: FROM, to: SELLER, subject: `Nová objednávka · ${updated.orderNumber} | Luvia Decor`, html: layout('Nová objednávka', sellerBody) })
    ]);
    return res.status(200).json({ success: true, order: updated, emailSent: results.some(r => r.status === 'fulfilled') });
  } catch (err: any) {
    console.error('Order notify error:', err);
    return res.status(500).json({ error: err?.message || 'Chyba při zpracování objednávky.' });
  }
}
