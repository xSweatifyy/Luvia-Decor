import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
}

const SHIPPING_PRICES: Record<string, Record<string, number>> = {
  address: { DPD: 105, 'Zásilkovna': 89 },
  pickup_point: { DPD: 75, 'Zásilkovna': 62 },
  personal_pickup: { DPD: 0, 'Zásilkovna': 0 }
};

function variableSymbol(orderNumber: string): string {
  return String(orderNumber || '').replace(/\D/g, '');
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

async function sendOrderEmails(order: any): Promise<{ customer: boolean; seller: boolean }> {
  const apiKey = process.env.RESEND_API_KEY || 're_X13QXNiA_7sMjc7Gb2Vs8MpJ5ejAmKb6F';
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const seller = process.env.ORDER_NOTIFY_EMAIL || 'objednavky@luvia-decor.cz';
  if (!apiKey) return { customer: false, seller: false };

  const resend = new Resend(apiKey);
  const itemsHtml = (Array.isArray(order.items) ? order.items : []).map((item: any) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.title)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(item.quantity || 1)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(item.price || 0).toLocaleString('cs-CZ')} Kč</td></tr>`
  ).join('');
  const deliveryText = order.delivery?.method === 'personal_pickup' ? 'Osobní odběr – Kroměříž' : order.delivery?.method === 'pickup_point' ? `Výdejní místo – ${order.delivery?.carrier || ''}: ${order.delivery?.pickupPoint || ''}` : `Doručení na adresu – ${order.delivery?.carrier || ''}`;
  const customer = order.customer || {};
  const common = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#2D2723"><h1 style="font-size:28px">Luvia Decor</h1><p>Objednávka <strong>${escapeHtml(order.orderNumber)}</strong></p><p><strong>Variabilní symbol:</strong> ${escapeHtml(order.variableSymbol)}</p><p><strong>Způsob platby:</strong> Bankovní převod</p><p><strong>Doručení:</strong> ${escapeHtml(deliveryText)}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr><th style="text-align:left;padding:8px">Produkt</th><th style="padding:8px">Ks</th><th style="text-align:right;padding:8px">Cena</th></tr></thead><tbody>${itemsHtml}</tbody></table><p><strong>Celkem: ${Number(order.totalPrice || 0).toLocaleString('cs-CZ')} Kč</strong></p><div style="background:#faf8f5;padding:16px;border-radius:12px"><strong>Bankovní převod</strong><br>Číslo účtu: 963625011/5500<br>Variabilní symbol: ${escapeHtml(order.variableSymbol)}<br>Částka: ${Number(order.totalPrice || 0).toLocaleString('cs-CZ')} Kč</div></div>`;

  const customerResult = await resend.emails.send({
    from,
    to: customer.email,
    subject: `Potvrzení objednávky ${order.orderNumber} – Luvia Decor`,
    html: `${common}<p>Děkujeme za Vaši objednávku. Objednávka byla přijata a čeká na úhradu bankovním převodem.</p>`
  });

  const sellerResult = await resend.emails.send({
    from,
    to: seller,
    subject: `NOVÁ OBJEDNÁVKA ${order.orderNumber} – ${customer.fullName}`,
    html: `${common}<h2>Nová objednávka od zákazníka</h2><p><strong>${escapeHtml(customer.fullName)}</strong><br>${escapeHtml(customer.email)}<br>${escapeHtml(customer.phone)}<br>${escapeHtml(customer.street)}, ${escapeHtml(customer.zip)} ${escapeHtml(customer.city)}</p><p>Poznámka: ${escapeHtml(customer.note)}</p>`
  });

  return { customer: !customerResult.error, seller: !sellerResult.error };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureTables();
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, data FROM orders ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => ({ ...(row.data || {}), id: row.id })));
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });

    const { customer, items, couponCode, delivery, paymentMethod } = req.body || {};
    if (!customer?.fullName || !customer?.email || !customer?.phone) return res.status(400).json({ error: 'Chybí povinné kontaktní údaje.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Košík je prázdný.' });
    if (paymentMethod && paymentMethod !== 'bank_transfer') return res.status(400).json({ error: 'Jediný dostupný způsob platby je bankovní převod.' });

    const deliveryMethod = delivery?.method || 'address';
    const carrier = String(delivery?.carrier || 'DPD');
    if (!Object.prototype.hasOwnProperty.call(SHIPPING_PRICES, deliveryMethod)) return res.status(400).json({ error: 'Neplatný způsob doručení.' });
    if (deliveryMethod !== 'personal_pickup' && !Object.prototype.hasOwnProperty.call(SHIPPING_PRICES[deliveryMethod], carrier)) return res.status(400).json({ error: 'Neplatný dopravce.' });
    if (deliveryMethod === 'address' && (!String(customer.street || '').trim() || !String(customer.city || '').trim() || !String(customer.zip || '').trim())) return res.status(400).json({ error: 'Pro doručení na adresu je nutné vyplnit celou adresu.' });
    if (deliveryMethod === 'pickup_point' && !String(delivery?.pickupPoint || '').trim()) return res.status(400).json({ error: 'Je nutné vybrat výdejní místo.' });

    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      subtotal += price * quantity;
      return { productId: item.productId || item.id || 'custom', title: String(item.title || ''), price, quantity, imageUrl: item.imageUrl || '', customNote: item.customNote || '' };
    });

    let discount = 0;
    let appliedCouponCode: string | undefined;
    if (couponCode) {
      const rows = await sql`SELECT code, type, value FROM coupons WHERE code = ${String(couponCode).trim().toUpperCase()} AND active = TRUE LIMIT 1`;
      if (rows.length) {
        appliedCouponCode = rows[0].code;
        discount = rows[0].type === 'percent' ? Math.round(subtotal * (Number(rows[0].value) / 100)) : Math.min(Number(rows[0].value), subtotal);
      }
    }

    const shipping = SHIPPING_PRICES[deliveryMethod][carrier] || 0;
    const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const vs = variableSymbol(orderNumber);
    const newOrder = {
      id, orderNumber, variableSymbol: vs, paymentMethod: 'bank_transfer', createdAt: new Date().toISOString(),
      customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone, street: customer.street || '', city: customer.city || '', zip: customer.zip || '', country: customer.country || 'Česká republika', note: customer.note || '' },
      items: orderItems, subtotal, shipping, discount: discount || undefined, couponCode: appliedCouponCode,
      totalPrice: Math.max(0, subtotal - discount + shipping), delivery: delivery || { method: 'address' }, status: 'nova', emails: { customer: false, seller: false }
    };

    await sql`INSERT INTO orders (id, data) VALUES (${id}, ${JSON.stringify(newOrder)}::jsonb)`;

    try {
      const emailStatus = await sendOrderEmails(newOrder);
      newOrder.emails = emailStatus;
      await sql`UPDATE orders SET data = ${JSON.stringify(newOrder)}::jsonb WHERE id = ${id}`;
    } catch (emailError) {
      console.error('Order email error:', emailError);
    }

    return res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}

export default handler;
