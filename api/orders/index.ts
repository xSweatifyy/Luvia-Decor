import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');
const STATUSES = ['nova', 'zpracovava_se', 'dokonceno', 'zruseno'] as const;
type Status = typeof STATUSES[number];
const labels: Record<Status, string> = { nova: 'Nová objednávka', zpracovava_se: 'Objednávka se zpracovává', dokonceno: 'Objednávka dokončena', zruseno: 'Objednávka zrušena' };
const esc = (v: unknown) => String(v ?? '').replace(/[&<>\'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));
const money = (v: number) => `${Number(v || 0).toLocaleString('cs-CZ')} Kč`;

async function ensureTable() { await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`; }
function orderId(req: VercelRequest) { const q = req.query?.orderId || req.query?.id; if (typeof q === 'string' && q) return decodeURIComponent(q); if (Array.isArray(q) && q[0]) return decodeURIComponent(String(q[0])); const m = String(req.url || '').match(/\/api\/orders\/([^/?]+)\/status/); return m ? decodeURIComponent(m[1]) : ''; }
function shell(content: string) { return `<!doctype html><html lang="cs"><body style="margin:0;background:#f5f1ec;color:#2d2723;font-family:Arial,sans-serif"><div style="padding:32px 12px"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #e8dfd5;box-shadow:0 10px 32px rgba(45,39,35,.08)"><div style="padding:34px 28px;text-align:center;background:#2d2723;color:#faf6f0"><div style="font-family:Georgia,serif;font-size:29px;letter-spacing:4px;font-weight:700">LUVIA DECOR</div><div style="margin-top:9px;color:#d8c9b7;font-size:11px;letter-spacing:1.8px;text-transform:uppercase">Květinový ateliér &amp; dekorace</div></div><div style="height:4px;background:#a48763"></div>${content}<div style="padding:22px 30px;background:#f5efe6;text-align:center;color:#817469;font-size:12px;line-height:1.8">Luvia Decor &bull; U Rejdiště 3732/15, 767 01 Kroměříž<br><a href="mailto:podpora@luvia-decor.cz" style="color:#8c7355">podpora@luvia-decor.cz</a></div></div></div></body></html>`; }
function itemRows(order: any) { return (Array.isArray(order.items) ? order.items : []).map((i: any) => `<tr><td style="padding:11px 0;border-bottom:1px solid #eee7df"><strong>${esc(i.title)}</strong><br><span style="font-size:12px;color:#817469">${Number(i.quantity) || 0} × ${money(Number(i.price) || 0)}</span></td><td style="padding:11px 0;border-bottom:1px solid #eee7df;text-align:right;font-weight:700">${money((Number(i.price) || 0) * (Number(i.quantity) || 0))}</td></tr>`).join(''); }
function deliveryInfo(order: any) {
  const d = order.delivery || {};
  const method = d.method === 'personal_pickup' ? 'Osobní odběr – Kroměříž' : d.method === 'pickup_point' ? `Výdejní místo – ${d.carrier || 'zvolený dopravce'}` : `Doručení na adresu – ${d.carrier || 'zvolený dopravce'}`;
  return `<div style="margin-top:22px;padding:18px;background:#f8f5f1;border:1px solid #ebe3da;font-size:14px;line-height:1.8"><strong>Způsob doručení:</strong> ${esc(method)}${d.pickupPoint ? `<br><strong>Výdejní místo:</strong> ${esc(d.pickupPoint)}` : ''}</div>`;
}
function totals(order: any) { const discount = Number(order.discount) || 0, coupon = String(order.couponCode || ''); return `<div style="margin-top:22px;padding:20px;background:#f8f5f1;border:1px solid #ebe3da"><div style="display:flex;justify-content:space-between;margin-bottom:7px"><span>Mezisoučet</span><strong>${money(Number(order.subtotal) || 0)}</strong></div>${discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:7px;color:#6f8b62"><span>Sleva${coupon ? ` (${esc(coupon)})` : ''}</span><strong>−${money(discount)}</strong></div>` : ''}<div style="display:flex;justify-content:space-between;border-top:1px solid #e5ddd4;padding-top:12px;margin-top:10px;font-size:20px"><strong>Výsledná částka k zaplacení</strong><strong>${money(Number(order.totalPrice) || 0)}</strong></div></div>`; }

async function sendNewOrderEmails(order: any) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error('Na Vercelu chybí RESEND_API_KEY.');
  const customerEmail = String(order.customer?.email || '').trim();
  if (!customerEmail) throw new Error('Objednávka nemá e-mail zákazníka.');
  const number = String(order.orderNumber || order.id || ''), rows = itemRows(order);
  const customerHtml = shell(`<div style="padding:34px 30px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.7px;color:#a48763;font-weight:700">Potvrzení objednávky</div><h1 style="font-family:Georgia,serif;font-size:27px;margin:9px 0 8px">Objednávka byla přijata</h1><div style="font-size:13px;color:#817469">Objednávka ${esc(number)}</div><hr style="border:0;border-top:1px solid #eee7df;margin:25px 0"><p style="font-size:15px;line-height:1.8">Dobrý den, <strong>${esc(order.customer?.fullName || '')}</strong>,</p><p style="font-size:15px;line-height:1.8">děkujeme Vám za Vaši objednávku v Luvia Decor. Objednávku jsme úspěšně přijali a nyní ji pečlivě zpracujeme.</p>${deliveryInfo(order)}<h2 style="font-family:Georgia,serif;font-size:20px;margin:28px 0 12px">Objednané produkty</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>${totals(order)}<p style="font-size:15px;line-height:1.8;margin-top:26px">Jakmile budeme mít další informace k Vaší objednávce, ozveme se Vám.</p><p style="font-family:Georgia,serif;font-size:16px;line-height:1.7">S přáním hezkého dne,<br><strong>Tým Luvia Decor</strong></p></div>`);
  const internalHtml = shell(`<div style="padding:34px 30px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.7px;color:#a48763;font-weight:700">Nová objednávka</div><h1 style="font-family:Georgia,serif;font-size:27px;margin:9px 0 8px">${esc(number)}</h1><p style="font-size:15px;line-height:1.8">Byla přijata nová objednávka od <strong>${esc(order.customer?.fullName || '')}</strong>.</p><div style="margin:20px 0;padding:18px;background:#f8f5f1;border:1px solid #ebe3da;font-size:14px;line-height:1.8"><strong>E-mail:</strong> ${esc(order.customer?.email)}<br><strong>Telefon:</strong> ${esc(order.customer?.phone)}<br><strong>Adresa:</strong> ${esc(order.customer?.street)}, ${esc(order.customer?.zip)} ${esc(order.customer?.city)}<br><strong>Slevový kód:</strong> ${order.couponCode ? esc(order.couponCode) : 'Bez slevového kódu'}</div>${deliveryInfo(order)}<h2 style="font-family:Georgia,serif;font-size:20px;margin:28px 0 12px">Položky</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>${totals(order)}</div>`);
  const results = await Promise.allSettled([
    new Resend(key).emails.send({ from: 'Luvia Decor <no-reply@luvia-decor.cz>', to: [customerEmail], subject: `Potvrzení objednávky ${number} – ${money(Number(order.totalPrice) || 0)}`, html: customerHtml }),
    new Resend(key).emails.send({ from: 'Luvia Decor <no-reply@luvia-decor.cz>', to: ['objednavky@luvia-decor.cz'], subject: `NOVÁ OBJEDNÁVKA ${number} – ${money(Number(order.totalPrice) || 0)}`, html: internalHtml })
  ]);
  const errors: string[] = [];
  results.forEach(r => { if (r.status === 'rejected') errors.push(r.reason?.message || 'Neznámá chyba'); else if (r.value.error) errors.push(r.value.error.message); });
  if (errors.length) throw new Error(`Resend: ${errors.join(' | ')}`);
  return results.map(r => r.status === 'fulfilled' ? r.value.data?.id || null : null);
}

async function sendStatusEmail(order: any, status: Status) {
  const key = process.env.RESEND_API_KEY?.trim(), to = String(order?.customer?.email || '').trim();
  if (!key) throw new Error('Na Vercelu chybí RESEND_API_KEY.'); if (!to) throw new Error('Objednávka nemá e-mail zákazníka.');
  const label = labels[status], number = String(order.orderNumber || order.id || ''), first = status === 'nova';
  const intro = first ? 'děkujeme Vám za Váš zájem o naše produkty a za vytvoření objednávky. Vaší objednávky si vážíme a nyní ji pečlivě zpracujeme. Brzy Vás budeme kontaktovat s informacemi o dalším postupu.' : `rádi bychom Vás informovali, že stav Vaší objednávky <strong>${esc(number)}</strong> byl aktualizován.`;
  const html = shell(`<div style="padding:34px 30px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.7px;color:#a48763;font-weight:700">Aktualizace objednávky</div><h1 style="font-family:Georgia,serif;font-size:27px;margin:9px 0 8px">${esc(label)}</h1><div style="font-size:13px;color:#817469">Objednávka ${esc(number)}</div><hr style="border:0;border-top:1px solid #eee7df;margin:25px 0"><p style="font-size:15px;line-height:1.8">Dobrý den, <strong>${esc(order.customer?.fullName || '')}</strong>,</p><p style="font-size:15px;line-height:1.8">${intro}</p>${deliveryInfo(order)}<div style="margin:26px 0;padding:22px 20px;background:#f8f5f1;border:1px solid #ebe3da"><div style="font-size:10px;color:#8c7355;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Aktuální stav objednávky</div><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;margin-top:7px">${esc(label)}</div><div style="margin-top:10px;font-size:15px"><strong>Částka k zaplacení:</strong> ${money(Number(order.totalPrice) || 0)}</div></div><p style="font-size:15px;line-height:1.8">${first ? 'Jakmile budeme mít další informace k Vaší objednávce, ozveme se Vám.' : 'O další změně stavu Vás budeme informovat e-mailem.'}</p><p style="font-family:Georgia,serif;font-size:16px;line-height:1.7">S přáním hezkého dne,<br><strong>Tým Luvia Decor</strong></p></div>`);
  const r = await new Resend(key).emails.send({ from: 'Luvia Decor <no-reply@luvia-decor.cz>', to: [to], subject: `${label} – ${number}`, html });
  if (r.error) throw new Error(`Resend: ${r.error.message}`); return r.data?.id || null;
}

async function updateStatus(req: VercelRequest, res: VercelResponse, id: string) {
  if (!id) return res.status(400).json({ error: 'Chybí id objednávky.' });
  let rows = await sql`SELECT id,data FROM orders WHERE id=${id} LIMIT 1`; if (!rows.length) rows = await sql`SELECT id,data FROM orders WHERE data->>'orderNumber'=${id} LIMIT 1`;
  if (!rows.length) return res.status(404).json({ error: `Objednávka ${id} nebyla nalezena.` });
  const status = String(req.body?.status || '').trim() as Status; if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Neplatný stav objednávky.' });
  const old = (rows[0].data || {}) as any, oldStatus = String(old.status || ''), storedId = String(rows[0].id), order = { ...old, id: storedId, status };
  await sql`UPDATE orders SET data=${JSON.stringify(order)}::jsonb,updated_at=NOW() WHERE id=${storedId}`;
  if (oldStatus === status) return res.status(200).json({ success: true, order, statusEmailSent: false });
  try { const emailId = await sendStatusEmail(order, status); return res.status(200).json({ success: true, order, statusEmailSent: true, statusEmailId: emailId }); }
  catch (e: any) { const errorMessage = e?.message || 'E-mail se nepodařilo odeslat.'; console.error('Order status email failed:', e); return res.status(200).json({ success: true, order, statusEmailSent: false, statusEmailError: errorMessage, message: `Stav objednávky byl uložen, ale e-mail se nepodařilo odeslat: ${errorMessage}` }); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0');
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  try {
    await ensureTable();
    if (req.method === 'GET') { const rows = await sql`SELECT data FROM orders ORDER BY created_at DESC`; return res.status(200).json(rows.map(r => r.data)); }
    if (req.method === 'POST') {
      if (req.body?.action === 'update_status' || req.body?.action === 'updateStatus') return updateStatus(req, res, String(req.body.orderId || req.body.id || ''));
      const { customer, items, customNote, couponCode, delivery } = req.body || {};
      if (!customer?.fullName || !customer?.email || !customer?.phone) return res.status(400).json({ error: 'Chybí povinné kontaktní údaje.' });
      if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Košík je prázdný.' });
      const method = String(delivery?.method || '');
      const carrier = delivery?.carrier ? String(delivery.carrier) : undefined;
      const pickupPoint = delivery?.pickupPoint ? String(delivery.pickupPoint) : undefined;
      if (!['address', 'pickup_point', 'personal_pickup'].includes(method)) return res.status(400).json({ error: 'Vyberte způsob doručení.' });
      if ((method === 'address' || method === 'pickup_point') && !carrier) return res.status(400).json({ error: 'Vyberte dopravce.' });
      if (method === 'pickup_point' && !pickupPoint) return res.status(400).json({ error: 'Vyberte nebo zadejte výdejní místo.' });
      const orderItems = items.map((i: any) => ({ productId: i.productId || i.id || i.sku || 'custom', title: i.title || 'Produkt', price: Number(i.price) || 0, quantity: Number(i.quantity) || 1, imageUrl: i.imageUrl || '', customNote: i.customNote || '' }));
      const subtotal = orderItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
      let discount = 0, normalizedCoupon = '';
      if (couponCode) {
        normalizedCoupon = String(couponCode).trim().toUpperCase();
        const rows = await sql`SELECT code,type,value,active FROM coupons WHERE code=${normalizedCoupon} AND active=TRUE LIMIT 1`;
        if (rows.length) { const c = rows[0], value = Number(c.value) || 0; discount = c.type === 'fixed' ? Math.min(value, subtotal) : Math.min(subtotal, Math.round(subtotal * (value / 100))); } else normalizedCoupon = '';
      }
      const totalPrice = Math.max(0, subtotal - discount);
      const order: any = { id: `ord-${Date.now()}`, orderNumber: `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, createdAt: new Date().toISOString(), customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone, street: customer.street || '', city: customer.city || '', zip: customer.zip || '', country: customer.country || 'Česká republika', note: customer.note || customNote || '' }, items: orderItems, subtotal, shipping: 0, discount, couponCode: normalizedCoupon || undefined, totalPrice, delivery: { method, ...(carrier ? { carrier } : {}), ...(pickupPoint ? { pickupPoint } : {}) }, status: 'nova', resendSent: false };
      await sql`INSERT INTO orders(id,data) VALUES(${order.id},${JSON.stringify(order)}::jsonb)`;
      try {
        const emailIds = await sendNewOrderEmails(order); order.resendSent = true; order.resendEmailIds = emailIds;
        await sql`UPDATE orders SET data=${JSON.stringify(order)}::jsonb,updated_at=NOW() WHERE id=${order.id}`;
        return res.status(201).json({ success: true, order, emailSent: true, emailIds });
      } catch (e: any) {
        const errorMessage = e?.message || 'E-mail se nepodařilo odeslat.'; console.error('New order email failed:', e); order.resendSent = false; order.resendError = errorMessage;
        await sql`UPDATE orders SET data=${JSON.stringify(order)}::jsonb,updated_at=NOW() WHERE id=${order.id}`;
        return res.status(201).json({ success: true, order, emailSent: false, emailError: errorMessage, message: `Objednávka byla přijata, ale e-mail se nepodařilo odeslat: ${errorMessage}` });
      }
    }
    return res.status(405).json({ error: 'Metoda není podporována.' });
  } catch (e: any) { console.error('Orders API error:', e); return res.status(500).json({ error: e?.message || 'Interní chyba serveru.' }); }
}
