import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: { fullName: string; email: string; phone: string; street: string; city: string; zip: string; country: string; note?: string };
  items: Array<{ productId: string; title: string; category?: string; price: number; quantity: number; imageUrl: string; customNote?: string }>;
  subtotal: number;
  shipping: number;
  discount?: number;
  couponCode?: string;
  totalPrice: number;
  status: 'nova' | 'zpracovava_se' | 'dokonceno' | 'zruseno';
  resendSent: boolean;
  resendError?: string;
};

const sql = neon(process.env.DATABASE_URL || '');

function computeDiscount(subtotal: number, coupon: { type: 'percent' | 'fixed'; value: number }): number {
  return coupon.type === 'percent'
    ? Math.round(subtotal * (coupon.value / 100))
    : Math.min(coupon.value, subtotal);
}

function parseCategoryIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function findCoupon(code: string): Promise<{ code: string; type: 'percent' | 'fixed'; value: number; categoryIds: string[] } | null> {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;

  await sql`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value NUMERIC NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      note TEXT,
      category_ids TEXT NOT NULL DEFAULT '[]'
    )
  `;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids TEXT NOT NULL DEFAULT '[]'`;

  const rows = await sql`
    SELECT code, type, value, category_ids
    FROM coupons
    WHERE UPPER(code) = ${clean} AND active = TRUE
    LIMIT 1
  `;
  const row = rows[0] as any;
  return row
    ? {
        code: String(row.code),
        type: row.type === 'fixed' ? 'fixed' : 'percent',
        value: Number(row.value),
        categoryIds: parseCategoryIds(row.category_ids)
      }
    : null;
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function sendOrderEmail(order: Order) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { success: false, error: 'Chybí RESEND_API_KEY ve Vercelu.' };

  const resend = new Resend(apiKey);
  const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character] || character);
  const items = order.items.map(item => `
    <tr>
      <td style="padding:16px 8px;border-bottom:1px solid #eee7df;color:#2d2723;font-size:14px">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.customNote ? `<br><span style="font-size:12px;color:#817469">Poznámka: ${escapeHtml(item.customNote)}</span>` : ''}
      </td>
      <td style="padding:16px 8px;border-bottom:1px solid #eee7df;text-align:center;color:#5c5046;font-size:14px">${item.quantity}&times;</td>
      <td style="padding:16px 8px;border-bottom:1px solid #eee7df;text-align:right;color:#2d2723;font-size:14px;font-weight:700">${(item.price * item.quantity).toLocaleString('cs-CZ')} Kč</td>
    </tr>`).join('');
  const html = `
<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Objednávka ${order.orderNumber} | Luvia Decor</title></head>
<body style="margin:0;background:#f5f1ec;color:#2d2723;font-family:Arial,Helvetica,sans-serif">
  <div style="padding:32px 12px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e8dfd5;box-shadow:0 8px 28px rgba(45,39,35,.08)">
      <div style="padding:34px 28px;text-align:center;background:#2d2723;color:#faf6f0">
        <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:4px;font-weight:700">LUVIA DECOR</div>
        <div style="margin-top:8px;color:#d8c9b7;font-size:12px;letter-spacing:1px;text-transform:uppercase">Květinový ateliér &amp; dekorace</div>
      </div>
      <div style="padding:32px 28px">
        <div style="padding:18px 20px;background:#f7f3ee;border-left:4px solid #a48763;margin-bottom:26px">
          <div style="color:#8c7355;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Nová objednávka</div>
          <div style="margin-top:6px;font-family:Georgia,serif;font-size:24px;font-weight:700">${order.orderNumber}</div>
          <div style="margin-top:7px;color:#75695f;font-size:12px">${new Date(order.createdAt).toLocaleString('cs-CZ')}</div>
        </div>
        <p style="font-size:15px;line-height:1.65;color:#493f38">Dobrý den,<br>v administraci čeká nová objednávka od zákazníka <strong>${escapeHtml(order.customer.fullName)}</strong>.</p>
        <h2 style="margin:28px 0 10px;font-family:Georgia,serif;font-size:19px;border-bottom:2px solid #eee7df;padding-bottom:10px">Položky v objednávce</h2>
        <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#faf8f5;color:#897b6e;font-size:11px;text-transform:uppercase;letter-spacing:1px"><th style="padding:10px 8px;text-align:left">Položka</th><th style="padding:10px 8px;text-align:center">Množství</th><th style="padding:10px 8px;text-align:right">Cena</th></tr></thead><tbody>${items}</tbody></table>
        <div style="margin-top:18px;padding:18px 0;border-bottom:1px solid #eee7df;text-align:right"><span style="font-size:14px;color:#75695f">Celkem k úhradě</span><br><strong style="display:inline-block;margin-top:4px;color:#8c7355;font-family:Georgia,serif;font-size:25px">${order.totalPrice.toLocaleString('cs-CZ')} Kč</strong></div>
        <h2 style="margin:28px 0 10px;font-family:Georgia,serif;font-size:19px;border-bottom:2px solid #eee7df;padding-bottom:10px">Kontaktní údaje zákazníka</h2>
        <div style="padding:16px 18px;background:#faf8f5;color:#50463f;font-size:14px;line-height:1.8">
          <strong>${escapeHtml(order.customer.fullName)}</strong><br>${escapeHtml(order.customer.email)}<br>${escapeHtml(order.customer.phone)}<br>${escapeHtml(order.customer.street)}, ${escapeHtml(order.customer.zip)} ${escapeHtml(order.customer.city)}
          ${order.customer.note ? `<br><br><strong>Poznámka:</strong> ${escapeHtml(order.customer.note)}` : ''}
        </div>
      </div>
      <div style="padding:22px 28px;background:#f5efe6;border-top:1px solid #e8dfd5;text-align:center;color:#817469;font-size:12px;line-height:1.7">Luvia Decor &bull; U Rejdiště 3732/15, 767 01 Kroměříž<br><a href="mailto:objednavky@luvia-decor.cz" style="color:#8c7355">objednavky@luvia-decor.cz</a><br><span style="color:#a29488">Tato zpráva byla odeslána z administračního systému Luvia Decor.</span></div>
    </div>
  </div>
</body></html>`;

  try {
    const response = await resend.emails.send({
      from: 'Luvia Decor <onboarding@resend.dev>',
      to: ['objednavky@luvia-decor.cz'],
      subject: `Nová objednávka ${order.orderNumber}`,
      html
    });
    if (response.error) return { success: false, error: response.error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Odeslání e-mailu selhalo.' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM orders ORDER BY created_at DESC`;
      return res.status(200).json(rows.map(row => row.data));
    }

    if (req.method === 'POST') {
      const { customer, items, customNote, couponCode } = req.body || {};
      if (!customer?.fullName || !customer?.email || !customer?.phone) {
        return res.status(400).json({ error: 'Chybí povinné kontaktní údaje.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Košík je prázdný.' });
      }

      const orderItems = items.map((item: any) => ({
        productId: item.productId || item.id || 'custom',
        title: item.title,
        category: item.category || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        imageUrl: item.imageUrl || '',
        customNote: item.customNote || ''
      }));
      const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

      let discount = 0;
      let appliedCouponCode: string | undefined;
      if (couponCode) {
        try {
          const coupon = await findCoupon(couponCode);
          if (coupon) {
            const eligibleSubtotal = coupon.categoryIds.length === 0
              ? subtotal
              : orderItems.reduce((sum: number, item: any) => {
                  if (!coupon.categoryIds.includes(String(item.category || ''))) return sum;
                  return sum + item.price * item.quantity;
                }, 0);

            // A category-limited coupon is silently ignored if the submitted order
            // contains no eligible products. The cart validation endpoint already
            // warns the customer before checkout.
            if (eligibleSubtotal > 0) {
              appliedCouponCode = coupon.code;
              discount = computeDiscount(eligibleSubtotal, coupon);
            }
          }
        } catch (couponErr) {
          console.error('Coupon validation error:', couponErr);
        }
      }

      const order: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        customer: {
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          street: customer.street || '',
          city: customer.city || '',
          zip: customer.zip || '',
          country: customer.country || 'Česká republika',
          note: customer.note || customNote || ''
        },
        items: orderItems,
        subtotal,
        shipping: 0,
        discount: discount || undefined,
        couponCode: appliedCouponCode,
        totalPrice: Math.max(0, subtotal - discount),
        status: 'nova',
        resendSent: false
      };

      const emailResult = await sendOrderEmail(order);
      order.resendSent = emailResult.success;
      if (!emailResult.success) order.resendError = emailResult.error;

      await sql`
        INSERT INTO orders (id, data)
        VALUES (${order.id}, ${JSON.stringify(order)}::jsonb)
      `;
      return res.status(201).json({ success: true, order, emailStatus: emailResult.success ? 'Odesláno na e-mail' : emailResult.error });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: 'Objednávku se nepodařilo zpracovat.' });
  }
}
