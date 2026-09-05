import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');

const DEFAULT_SHIPPING = {
  carriers: {
    DPD: { enabled: true, address: 105, pickup_point: 75, box: 75 },
    'Zásilkovna': { enabled: true, address: 89, pickup_point: 62, box: 62 },
    PPL: { enabled: true, address: 105 }
  },
  personalPickup: { enabled: true, price: 0, label: 'Osobní odběr – Kroměříž' }
};

const normalizeCategory = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, category_ids JSONB NOT NULL DEFAULT '[]'::jsonb, remaining_value NUMERIC)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;
  await sql`UPDATE coupons SET remaining_value = value WHERE note = 'gift-voucher' AND remaining_value IS NULL`;
}

async function getShippingConfig() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`SELECT data FROM app_state WHERE id = 1 LIMIT 1`;
    const saved = rows[0]?.data?.shipping;
    if (!saved) return DEFAULT_SHIPPING;
    const carriers = Object.fromEntries(Object.entries(saved.carriers || DEFAULT_SHIPPING.carriers).map(([name, cfg]: [string, any]) => [name, { enabled: cfg?.enabled !== false, address: Math.max(0, Number(cfg?.address ?? 0)), pickup_point: Math.max(0, Number(cfg?.pickup_point ?? 0)), box: Math.max(0, Number(cfg?.box ?? cfg?.pickup_point ?? 0)) }]));
    return { carriers, personalPickup: { enabled: saved.personalPickup?.enabled !== false, price: Math.max(0, Number(saved.personalPickup?.price ?? 0)), label: String(saved.personalPickup?.label || DEFAULT_SHIPPING.personalPickup.label) } };
  } catch (error) { console.warn('Shipping config fallback:', error); return DEFAULT_SHIPPING; }
}

function variableSymbol(orderNumber: string): string { return String(orderNumber || '').replace(/\D/g, ''); }
function escapeHtml(value: unknown): string { return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char] || char)); }
function money(value: unknown): string { return Number(value || 0).toLocaleString('cs-CZ'); }
function paymentQrUrl(order: any): string { const iban = 'CZ45550000000000963625011'; const amount = Number(order.totalPrice || 0).toFixed(2); const vs = String(order.variableSymbol || '').replace(/\D/g, ''); const note = String(order.orderNumber || ''); const payload = `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*X-VS:${vs}*X-MSG:${note}`; return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(payload)}`; }
function emailLayout(title: string, content: string): string { return `<!doctype html><html lang="cs"><body style="margin:0;background:#f4f0eb;font-family:Arial,Helvetica,sans-serif;color:#302923"><div style="padding:32px 12px"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e7dfd6;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(45,39,35,.08)"><div style="background:#211c18;padding:28px 32px;text-align:center"><div style="font-size:26px;letter-spacing:5px;font-weight:700;color:#faf6f0">LUVIA DECOR</div><div style="margin-top:7px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a880">Květinový ateliér &amp; dekorace</div></div><div style="padding:32px"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b08f65;font-weight:700;margin-bottom:8px">${escapeHtml(title)}</div>${content}</div><div style="padding:24px 32px;background:#faf8f5;border-top:1px solid #eee5dc;text-align:center;color:#756b63;font-size:12px;line-height:1.8"><strong style="color:#302923">Luvia Decor</strong><br>Odpovědná osoba: Ladislav Pekárek<br>Adresa: U Rejdiště 3732/15, 767 01, Kroměříž<br>IČO: 29905061<br>Email: objednavky@luvia-decor.cz · podpora@luvia-decor.cz<br>Telefonní číslo: +420702345999</div></div></div></body></html>`; }
function itemsHtml(items: any[]): string { if (!items.length) return '<tr><td colspan="3" style="padding:12px;color:#777">Žádné položky</td></tr>'; return items.map((item: any) => `<tr><td style="padding:12px;border-bottom:1px solid #eee"><strong>${escapeHtml(item.title)}</strong><br><span style="font-size:11px;color:#8b8178">ID produktu: ${escapeHtml(item.productId || item.id || 'neuvedeno')}</span></td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center">${Number(item.quantity || 1)}</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${money(item.price)} Kč</td></tr>`).join(''); }

async function sendOrderEmails(order: any): Promise<{ customer: boolean; seller: boolean; sentAt?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY; const customerEmail = String(order?.customer?.email || '').trim(); const sellerEmail = String(process.env.ORDER_NOTIFY_EMAIL || 'objednavky@luvia-decor.cz').trim();
  if (!apiKey) throw new Error('Chybí RESEND_API_KEY ve Vercel Environment Variables.'); if (!customerEmail) throw new Error('Objednávka nemá e-mail zákazníka.');
  const resend = new Resend(apiKey); const customer = order.customer || {}; const items = Array.isArray(order.items) ? order.items : []; const delivery = order.delivery || {};
  const deliveryText = delivery.method === 'personal_pickup' ? 'Osobní odběr – Kroměříž' : delivery.method === 'box' ? `Box – ${delivery.carrier || ''}: ${delivery.pickupPoint || ''}` : delivery.method === 'pickup_point' ? `Výdejní místo – ${delivery.carrier || ''}: ${delivery.pickupPoint || ''}` : `Doručení na adresu – ${delivery.carrier || ''}`;
  const paymentBlock = `<div style="margin-top:24px;padding:20px;background:#faf8f5;border:1px solid #eee5dc;border-radius:14px"><div style="font-weight:700;margin-bottom:10px">Bankovní převod</div><div style="font-size:13px;line-height:1.8">Číslo účtu: <strong>963625011/5500</strong><br>IBAN: <strong>CZ45 5500 0000 0096 3625 011</strong><br>Variabilní symbol: <strong>${escapeHtml(order.variableSymbol)}</strong><br>Částka: <strong>${money(order.totalPrice)} Kč</strong><br>Poznámka pro příjemce: <strong>${escapeHtml(order.orderNumber)}</strong></div><div style="text-align:center;margin-top:16px"><img src="${paymentQrUrl(order)}" width="220" height="220" alt="QR platba" style="display:inline-block;border:1px solid #e6ded5;border-radius:8px"></div></div>`;
  const common = `<div style="margin:18px 0;padding:16px 18px;background:#faf8f5;border-radius:12px;font-size:13px;line-height:1.8"><strong>Objednávka:</strong> ${escapeHtml(order.orderNumber)}<br><strong>Variabilní symbol:</strong> ${escapeHtml(order.variableSymbol)}<br><strong>Doručení:</strong> ${escapeHtml(deliveryText)}</div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="padding:10px;text-align:left;border-bottom:1px solid #ddd">Položka</th><th style="padding:10px">Ks</th><th style="padding:10px;text-align:right">Cena</th></tr></thead><tbody>${itemsHtml(items)}</tbody></table><p style="font-size:17px;text-align:right;margin:20px 0 0"><strong>Celkem: ${money(order.totalPrice)} Kč</strong></p>${paymentBlock}`;
  const customerHtml = emailLayout('Potvrzení objednávky', `<h1 style="margin:0 0 12px;font-size:25px">Děkujeme za Vaši objednávku</h1><p style="font-size:15px;line-height:1.7">Dobrý den, ${escapeHtml(customer.fullName)},<br>Vaše objednávka byla úspěšně přijata. Jakmile obdržíme platbu, budeme ji dále zpracovávat.</p>${common}<p style="margin-top:24px;font-size:13px;color:#756b63">O změně stavu objednávky Vás budeme informovat e-mailem.</p>`);
  const sellerHtml = emailLayout('Nová objednávka', `<h1 style="margin:0 0 12px;font-size:25px">Nová objednávka ${escapeHtml(order.orderNumber)}</h1><p style="font-size:14px;line-height:1.7"><strong>Zákazník:</strong> ${escapeHtml(customer.fullName)}<br><strong>E-mail:</strong> ${escapeHtml(customer.email)}<br><strong>Telefon:</strong> ${escapeHtml(customer.phone)}<br><strong>Adresa:</strong> ${escapeHtml(customer.street)}, ${escapeHtml(customer.zip)} ${escapeHtml(customer.city)}<br><strong>Poznámka:</strong> ${escapeHtml(customer.note || '—')}</p>${common}<p style="font-size:12px;color:#756b63">ID produktů: ${items.map((item: any) => escapeHtml(item.productId || item.id || 'neuvedeno')).join(', ')}</p>`);
  const results = await Promise.allSettled([resend.emails.send({ from: 'Luvia Decor <objednavky@luvia-decor.cz>', to: customerEmail, replyTo: 'podpora@luvia-decor.cz', subject: `Potvrzení objednávky · ${order.orderNumber} | Luvia Decor`, html: customerHtml }), resend.emails.send({ from: 'Luvia Decor <objednavky@luvia-decor.cz>', to: sellerEmail, subject: `NOVÁ OBJEDNÁVKA · ${order.orderNumber} | Luvia Decor`, html: sellerHtml })]);
  const failed = results.find((result: any) => result.status === 'rejected' || result.value?.error); if (failed) { const reason = failed.status === 'rejected' ? failed.reason?.message : failed.value?.error?.message; throw new Error(reason || 'Resend odmítl odeslání e-mailu.'); }
  return { customer: true, seller: true, sentAt: new Date().toISOString() };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await ensureTables();
    if (req.method === 'GET') { const rows = await sql`SELECT id, data FROM orders ORDER BY created_at DESC`; return res.status(200).json(rows.map((row: any) => ({ ...(row.data || {}), id: row.id }))); }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
    const { customer, items, couponCode, delivery, paymentMethod } = req.body || {};
    if (!customer?.fullName || !customer?.email || !customer?.phone) return res.status(400).json({ error: 'Chybí povinné kontaktní údaje.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Košík je prázdný.' });
    if (paymentMethod && paymentMethod !== 'bank_transfer') return res.status(400).json({ error: 'Jediný dostupný způsob platby je bankovní převod.' });

    const pplEligible = items.every((item: any) => normalizeCategory(item?.category) === 'doplnky');
    const shippingConfig = await getShippingConfig(); const deliveryMethod = String(delivery?.method || 'address'); const carrier = String(delivery?.carrier || '');
    if (deliveryMethod === 'personal_pickup') { if (!shippingConfig.personalPickup.enabled) return res.status(400).json({ error: 'Osobní odběr momentálně není dostupný.' }); }
    else { const carrierConfig = shippingConfig.carriers[carrier] || (carrier === 'PPL' ? DEFAULT_SHIPPING.carriers.PPL : null); if (!carrierConfig || carrierConfig.enabled === false) return res.status(400).json({ error: 'Zvolený dopravce není dostupný.' }); if (carrier === 'PPL' && !pplEligible) return res.status(400).json({ error: 'PPL je dostupné pouze pro objednávky obsahující výhradně produkty z kategorie Doplňky.' }); if (carrier === 'PPL' && deliveryMethod !== 'address') return res.status(400).json({ error: 'PPL je dostupné pouze pro doručení na adresu.' }); if (!['address','pickup_point','box'].includes(deliveryMethod)) return res.status(400).json({ error: 'Neplatný způsob doručení.' }); if ((deliveryMethod === 'pickup_point' || deliveryMethod === 'box') && !String(delivery?.pickupPoint || '').trim()) return res.status(400).json({ error: 'Je nutné vybrat výdejní místo nebo box.' }); if (deliveryMethod === 'address' && (!String(customer.street || '').trim() || !String(customer.city || '').trim() || !String(customer.zip || '').trim())) return res.status(400).json({ error: 'Pro doručení na adresu je nutné vyplnit celou adresu.' }); }

    let subtotal = 0;
    const orderItems = items.map((item: any) => { const price = Number(item.price) || 0; const quantity = Math.max(1, Number(item.quantity) || 1); subtotal += price * quantity; return { productId: item.productId || item.id || 'custom', title: String(item.title || ''), price, quantity, imageUrl: item.imageUrl || '', customNote: item.customNote || '', category: String(item.category || '') }; });
    const carrierConfig = carrier ? (shippingConfig.carriers[carrier] || (carrier === 'PPL' ? DEFAULT_SHIPPING.carriers.PPL : null)) : null;
    const shipping = deliveryMethod === 'personal_pickup' ? shippingConfig.personalPickup.price : deliveryMethod === 'address' ? Number(carrierConfig?.address || 0) : deliveryMethod === 'box' ? Number(carrierConfig?.box || 0) : Number(carrierConfig?.pickup_point || 0);

    let discount = 0; let appliedCouponCode: string | undefined; let voucherConsumed = 0; let voucherId: string | undefined;
    if (couponCode) {
      const code = String(couponCode).trim().toUpperCase();
      const rows = await sql`SELECT id, code, type, value, active, note, category_ids, remaining_value FROM coupons WHERE code = ${code} AND active = TRUE LIMIT 1`;
      if (rows.length) {
        const coupon = rows[0]; const categoryIds = Array.isArray(coupon.category_ids) ? coupon.category_ids.map(String) : [];
        const eligibleItems = categoryIds.length ? orderItems.filter((item: any) => categoryIds.includes(String(item.category))) : orderItems;
        const eligibleSubtotal = eligibleItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
        if (categoryIds.length && eligibleItems.length === 0) return res.status(400).json({ error: 'Tento slevový kód nelze použít na žádný produkt v košíku.' });
        appliedCouponCode = coupon.code;
        if (coupon.note === 'gift-voucher') {
          const remaining = Number(coupon.remaining_value ?? coupon.value);
          if (remaining <= 0) return res.status(400).json({ error: 'Dárkový poukaz je již vyčerpán.' });
          const voucherBase = subtotal + shipping;
          discount = Math.min(remaining, voucherBase);
          voucherConsumed = discount; voucherId = coupon.id;
        } else {
          discount = coupon.type === 'percent' ? Math.round(eligibleSubtotal * (Number(coupon.value) / 100)) : Math.min(Number(coupon.value), eligibleSubtotal);
        }
      }
    }

    if (voucherId && voucherConsumed > 0) {
      const updatedVoucher = await sql`UPDATE coupons SET remaining_value = GREATEST(0, COALESCE(remaining_value, value) - ${voucherConsumed}), active = CASE WHEN COALESCE(remaining_value, value) - ${voucherConsumed} <= 0 THEN FALSE ELSE active END WHERE id = ${voucherId} AND active = TRUE AND COALESCE(remaining_value, value) >= ${voucherConsumed} RETURNING remaining_value`;
      if (!updatedVoucher.length) return res.status(409).json({ error: 'Dárkový poukaz byl mezitím použit. Zkontrolujte jeho zbývající hodnotu.' });
    }

    const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; const orderNumber = `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`; const vs = variableSymbol(orderNumber);
    const normalizedDelivery = deliveryMethod === 'personal_pickup' ? { method: 'personal_pickup' } : { method: deliveryMethod, carrier, ...(deliveryMethod === 'pickup_point' || deliveryMethod === 'box' ? { pickupPoint: String(delivery?.pickupPoint || '').trim() } : {}) };
    const newOrder: any = { id, orderNumber, variableSymbol: vs, paymentMethod: 'bank_transfer', createdAt: new Date().toISOString(), customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone, street: customer.street || '', city: customer.city || '', zip: customer.zip || '', country: customer.country || 'Česká republika', note: customer.note || '' }, items: orderItems, subtotal, shipping, discount: discount || undefined, couponCode: appliedCouponCode, giftVoucherUsed: voucherConsumed || undefined, totalPrice: Math.max(0, subtotal - discount + shipping), delivery: normalizedDelivery, status: 'nova', emails: { customer: false, seller: false } };
    try {
      await sql`INSERT INTO orders (id, data) VALUES (${id}, ${JSON.stringify(newOrder)}::jsonb)`;
    } catch (insertError) {
      if (voucherId && voucherConsumed > 0) await sql`UPDATE coupons SET remaining_value = COALESCE(remaining_value, value) + ${voucherConsumed}, active = TRUE WHERE id = ${voucherId}`;
      throw insertError;
    }
    try { newOrder.emails = await sendOrderEmails(newOrder); } catch (emailError: any) { console.error('Order email error:', emailError); newOrder.emails = { customer: false, seller: false, error: emailError?.message || 'Odeslání e-mailu selhalo.', failedAt: new Date().toISOString() }; }
    await sql`UPDATE orders SET data = ${JSON.stringify(newOrder)}::jsonb WHERE id = ${id}`;
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) { console.error('Orders API error:', error); return res.status(500).json({ error: error?.message || 'Chyba serveru.' }); }
}
export default handler;
