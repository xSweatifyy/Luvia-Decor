import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureTables();
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, data FROM orders ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => ({ ...(row.data || {}), id: row.id })));
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });

    const { customer, items, couponCode, delivery } = req.body || {};
    if (!customer?.fullName || !customer?.email || !customer?.phone) return res.status(400).json({ error: 'Chybí povinné kontaktní údaje.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Košík je prázdný.' });

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
        discount = rows[0].type === 'percent'
          ? Math.round(subtotal * (Number(rows[0].value) / 100))
          : Math.min(Number(rows[0].value), subtotal);
      }
    }

    const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id, orderNumber, createdAt: new Date().toISOString(),
      customer: {
        fullName: customer.fullName, email: customer.email, phone: customer.phone,
        street: customer.street || '', city: customer.city || '', zip: customer.zip || '',
        country: customer.country || 'Česká republika', note: customer.note || ''
      },
      items: orderItems, subtotal, shipping: 0, discount: discount || undefined,
      couponCode: appliedCouponCode, totalPrice: Math.max(0, subtotal - discount),
      delivery: delivery || { method: 'address' }, status: 'nova', resendSent: false
    };

    await sql`INSERT INTO orders (id, data) VALUES (${id}, ${JSON.stringify(newOrder)}::jsonb)`;
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
