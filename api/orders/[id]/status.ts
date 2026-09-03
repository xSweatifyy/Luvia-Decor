import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');

type OrderStatus = 'nova' | 'zpracovava_se' | 'zaplaceno' | 'u_prepravce' | 'odeslano' | 'dokonceno' | 'zruseno';

const STATUS_LABELS: Record<OrderStatus, string> = {
  nova: 'Nová objednávka',
  zpracovava_se: 'Objednávka se zpracovává',
  zaplaceno: 'Objednávka zaplacena',
  u_prepravce: 'Objednávka je u přepravce',
  odeslano: 'Objednávka odeslána',
  dokonceno: 'Objednávka dokončena',
  zruseno: 'Objednávka zrušena'
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char] || char));
}

function variableSymbol(orderNumber: string): string {
  return String(orderNumber || '').replace(/\D/g, '');
}

function carrierLabel(order: any): string {
  return String(order?.delivery?.carrier || order?.deliveryCarrier || 'neuvedený přepravce');
}

function shippingPrice(order: any): number {
  return Number(order?.shipping || order?.delivery?.price || 0);
}

function paymentQrUrl(order: any): string {
  const iban = 'CZ45550000000000963625011';
  const amount = Number(order.totalPrice || 0).toFixed(2);
  const vs = String(order.variableSymbol || variableSymbol(order.orderNumber)).replace(/\D/g, '');
  const note = String(order.orderNumber || '').replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 60);
  const payload = `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*X-VS:${vs}*X-MSG:${note}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(payload)}`;
}

async function sendStatusEmail(order: any, status: OrderStatus) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = 'Luvia Decor <objednavky@luvia-decor.cz>';
  if (!apiKey || !order?.customer?.email) return;

  const resend = new Resend(apiKey);
  const label = STATUS_LABELS[status];
  const customerName = escapeHtml(order.customer.fullName);
  const orderNumber = escapeHtml(order.orderNumber);
  const vs = escapeHtml(order.variableSymbol || variableSymbol(order.orderNumber));
  const carrier = escapeHtml(carrierLabel(order));
  const shipping = shippingPrice(order);

  const messages: Record<OrderStatus, string> = {
    nova: 'Vaše objednávka byla přijata.',
    zpracovava_se: 'Vaši objednávku jsme začali zpracovávat.',
    zaplaceno: 'Platbu za Vaši objednávku jsme zaznamenali.',
    u_prepravce: 'Vaše objednávka byla předána přepravci.',
    odeslano: 'Vaše objednávka byla odeslána.',
    dokonceno: 'Vaše objednávka byla dokončena. Děkujeme za Vaši důvěru.',
    zruseno: 'Vaše objednávka byla zrušena. Pokud potřebujete více informací, kontaktujte nás.'
  };

  const itemsHtml = (Array.isArray(order.items) ? order.items : []).map((item: any) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>${escapeHtml(item.title)}</strong><br><span style="font-size:12px;color:#777">ID produktu: ${escapeHtml(item.productId || item.id || 'neuvedeno')}</span></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(item.quantity || 1)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(item.price || 0).toLocaleString('cs-CZ')} Kč</td></tr>`
  ).join('');

  const shippingHtml = `<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Doprava</strong><br><span style="font-size:12px;color:#777">Přepravce: ${carrier}</span></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">1×</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${shipping.toLocaleString('cs-CZ')} Kč</td></tr>`;

  const paymentBlock = status === 'nova' || status === 'zpracovava_se'
    ? `<div style="background:#faf8f5;padding:16px;border-radius:12px;margin-top:20px"><strong>Bankovní převod</strong><br>Číslo účtu: 963625011/5500<br>IBAN: CZ45 5500 0000 0096 3625 011<br>Variabilní symbol: ${vs}<br>Částka: ${Number(order.totalPrice || 0).toLocaleString('cs-CZ')} Kč<br><div style="text-align:center;margin-top:14px"><strong>QR platba</strong><br><img src="${paymentQrUrl(order)}" width="220" height="220" alt="QR platba objednávky ${orderNumber}" style="display:block;margin:10px auto;border:1px solid #eee" /><br><span style="font-size:12px;color:#777">Poznámka pro příjemce: ${orderNumber}</span></div></div>`
    : '';

  const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#2D2723"><h1 style="font-size:28px">Luvia Decor</h1><p>Dobrý den, ${customerName},</p><h2>${escapeHtml(label)}</h2><p>${messages[status]}</p><div style="background:#faf8f5;padding:16px;border-radius:12px;margin:20px 0"><strong>Objednávka:</strong> ${orderNumber}<br><strong>Variabilní symbol:</strong> ${vs}</div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px">Položka</th><th style="padding:8px">Ks</th><th style="text-align:right;padding:8px">Cena</th></tr></thead><tbody>${itemsHtml}${shippingHtml}</tbody></table><p style="margin-top:20px"><strong>Celkem: ${Number(order.totalPrice || 0).toLocaleString('cs-CZ')} Kč</strong></p>${paymentBlock}<p>Pokud máte dotaz k objednávce, neváhejte nás kontaktovat.</p><p><strong>Luvia Decor</strong><br>objednavky@luvia-decor.cz</p></div>`;

  const sellerHtml = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#2D2723"><h1>Luvia Decor – objednávka</h1><p><strong>Stav:</strong> ${escapeHtml(label)}</p><p><strong>Objednávka:</strong> ${orderNumber}</p><p><strong>Zákazník:</strong> ${customerName} · ${escapeHtml(order.customer.email)} · ${escapeHtml(order.customer.phone)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px">Produkt</th><th style="padding:8px">Ks</th><th style="text-align:right;padding:8px">Cena</th></tr></thead><tbody>${itemsHtml}${shippingHtml}</tbody></table><p style="margin-top:20px"><strong>Celkem: ${Number(order.totalPrice || 0).toLocaleString('cs-CZ')} Kč</strong></p><p><strong>Přepravce:</strong> ${carrier}</p></div>`;

  const results = await Promise.all([
    resend.emails.send({ from, to: order.customer.email, subject: `${label} ${order.orderNumber} – Luvia Decor`, html: customerHtml }),
    process.env.RESEND_NOTIFY_EMAIL ? resend.emails.send({ from, to: process.env.RESEND_NOTIFY_EMAIL, subject: `${label} ${order.orderNumber} – Luvia Decor`, html: sellerHtml }) : Promise.resolve({ error: null })
  ]);
  const failed = results.find((result: any) => result?.error);
  if (failed?.error) throw new Error(failed.error.message || 'E-mail se nepodařilo odeslat.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  try {
    const id = String(req.query.id || '').trim();
    const status = String(req.body?.status || '') as OrderStatus;

    if (!id) return res.status(400).json({ error: 'Chybí ID objednávky.' });
    if (!Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)) return res.status(400).json({ error: 'Neplatný stav objednávky.' });

    const rows = await sql`SELECT id, data FROM orders WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Objednávka nebyla nalezena.' });

    const order = { ...(rows[0].data || {}), id: rows[0].id };
    const previousStatus = order.status;
    const updatedOrder = { ...order, status };

    await sql`UPDATE orders SET data = ${JSON.stringify(updatedOrder)}::jsonb WHERE id = ${id}`;

    if (previousStatus !== status) {
      try {
        await sendStatusEmail(updatedOrder, status);
        updatedOrder.statusEmail = { sent: true, status, sentAt: new Date().toISOString() };
        updatedOrder.resendSent = true;
        updatedOrder.resendError = undefined;
      } catch (emailError: any) {
        console.error('Order status email error:', emailError);
        updatedOrder.statusEmail = { sent: false, status, error: emailError?.message || 'Odeslání e-mailu selhalo.', failedAt: new Date().toISOString() };
        updatedOrder.resendSent = false;
        updatedOrder.resendError = emailError?.message || 'Odeslání e-mailu selhalo.';
      }
      await sql`UPDATE orders SET data = ${JSON.stringify(updatedOrder)}::jsonb WHERE id = ${id}`;
    }

    return res.status(200).json(updatedOrder);
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
