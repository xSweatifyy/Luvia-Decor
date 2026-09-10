import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
const send = (res: VercelResponse, status: number, body: unknown) => { res.setHeader('Cache-Control','no-store'); res.setHeader('Access-Control-Allow-Origin','*'); return res.status(status).json(body); };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metoda není podporovaná.' });
  try {
    const orderId = String(req.body?.orderId || '').trim();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const securityCode = String(req.body?.securityCode || '').trim().toUpperCase();
    const amount = Number(req.body?.amount);
    const remainingDue = Number(req.body?.remainingDue);
    if (!orderId || !code || !securityCode || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(remainingDue) || remainingDue < 0) return send(res, 400, { error: 'Neplatná data platby dárkovou kartou.' });
    await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, category_ids JSONB NOT NULL DEFAULT '[]'::jsonb, remaining_value NUMERIC, security_code TEXT)`;
    await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;
    await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS security_code TEXT`;
    const cards = await sql`SELECT id, code, value, active, remaining_value, security_code FROM coupons WHERE UPPER(TRIM(code))=${code} AND note='gift-voucher' LIMIT 1`;
    if (!cards.length || !cards[0].active) return send(res, 404, { error: 'Dárková karta nebyla nalezena nebo je neaktivní.' });
    if (!cards[0].security_code || String(cards[0].security_code).trim().toUpperCase() !== securityCode) return send(res, 403, { error: 'Bezpečnostní kód dárkové karty není správný.' });
    const debited = await sql`UPDATE coupons SET remaining_value=GREATEST(0,COALESCE(remaining_value,value)-${amount}),active=CASE WHEN COALESCE(remaining_value,value)-${amount}<=0 THEN FALSE ELSE active END WHERE id=${cards[0].id} AND active=TRUE AND COALESCE(remaining_value,value)>=${amount} RETURNING remaining_value`;
    if (!debited.length) return send(res, 409, { error: 'Dárková karta už nemá dostatečný zůstatek.' });
    const orders = await sql`SELECT data FROM orders WHERE id=${orderId} LIMIT 1`;
    if (!orders.length) return send(res, 404, { error: 'Objednávka nebyla nalezena.' });
    const order = orders[0].data || {};
    const updated = { ...order, paymentMethod: remainingDue > 0 ? 'gift_card_plus_bank_transfer' : 'gift_card', status: remainingDue > 0 ? (order.status || 'čeká na platbu') : 'zaplaceno', giftCardPayment: true, giftCardCode: code, giftCardUsed: Number(order.giftCardUsed || 0) + amount, giftCardRemainingDue: remainingDue, totalPrice: remainingDue };
    await sql`UPDATE orders SET data=${JSON.stringify(updated)}::jsonb WHERE id=${orderId}`;
    return send(res, 200, { success: true, order: updated, remainingValue: Number(debited[0].remaining_value || 0) });
  } catch (error: any) { console.error('Gift card payment error:', error); return send(res, 500, { error: error?.message || 'Platbu dárkovou kartou se nepodařilo dokončit.' }); }
}
