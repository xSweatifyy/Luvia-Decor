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
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function variableSymbol(orderNumber: string): string {
  return String(orderNumber || '').replace(/\D/g, '');
}

async function sendStatusEmail(order: any, status: OrderStatus) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !order?.customer?.email) return;

  const resend = new Resend(apiKey);
  const label = STATUS_LABELS[status];
  const customerName = escapeHtml(order.customer.fullName);
  const orderNumber = escapeHtml(order.orderNumber);
  const vs = escapeHtml(order.variableSymbol || variableSymbol(order.orderNumber));

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
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.title)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(item.quantity || 1)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(item.price || 0).toLocaleString('cs-CZ')} Kč</td></tr>`
  ).join('');

  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#2D2723"><h1 style="font-size:28px">Luvia Decor</h1><p>Dobrý den, ${customerName},</p><h2>${escapeHtml(label)}</h2><p>${messages[status]}</p><div style="background:#faf8f5;padding:16px;border-radius:12px;margin:20px 0"><strong>Objednávka:</strong> ${orderNumber}<br><strong>Variabilní symbol:</strong> ${vs}</div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px">Produkt</th><th style="padding:8px">Ks</th><th style="text-align:right;padding:8px">Cena</th></tr></thead><tbody>${itemsHtml}</tbody></table><p style="margin-top:20px"><strong>Celkem: ${Number(order.totalPrice || 0).toLocaleString('cs-CZ')} Kč</strong></p><p>Pokud máte dotaz k objednávce, neváhejte nás kontaktovat.</p></div>`;

  const result = await resend.emails.send({ from, to: order.customer.email, subject: `${label} ${order.orderNumber} – Luvia Decor`, html });
  if (result.error) throw new Error(result.error.message || 'E-mail se nepodařilo odeslat.');
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
      } catch (emailError: any) {
        console.error('Order status email error:', emailError);
        updatedOrder.statusEmail = { sent: false, status, error: emailError?.message || 'Odeslání e-mailu selhalo.', failedAt: new Date().toISOString() };
      }
      await sql`UPDATE orders SET data = ${JSON.stringify(updatedOrder)}::jsonb WHERE id = ${id}`;
    }

    return res.status(200).json(updatedOrder);
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
