import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');
type OrderStatus = 'nova' | 'zpracovava_se' | 'zaplaceno' | 'u_prepravce' | 'odeslano' | 'dokonceno' | 'zruseno';

const LABELS: Record<OrderStatus, string> = {
  nova: 'Nová objednávka', zpracovava_se: 'Objednávka se zpracovává', zaplaceno: 'Objednávka zaplacena',
  u_prepravce: 'Objednávka je u přepravce', odeslano: 'Objednávka odeslána', dokonceno: 'Objednávka dokončena', zruseno: 'Objednávka zrušena'
};
const MESSAGES: Record<OrderStatus, string> = {
  nova: 'Vaše objednávka byla přijata.', zpracovava_se: 'Vaši objednávku jsme začali zpracovávat.', zaplaceno: 'Platbu za Vaši objednávku jsme zaznamenali.',
  u_prepravce: 'Vaše objednávka byla předána přepravci.', odeslano: 'Vaše objednávka byla odeslána.', dokonceno: 'Vaše objednávka byla dokončena. Děkujeme za Vaši důvěru.',
  zruseno: 'Vaše objednávka byla zrušena. Pokud potřebujete více informací, kontaktujte nás.'
};

const esc = (v: unknown) => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c] || c));
const money = (v: unknown) => Number(v || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const variableSymbol = (orderNumber: unknown) => String(orderNumber || '').replace(/\D/g, '');
const firstNonEmpty = (...values: unknown[]) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

/** Normalizes both the current order schema and older orders saved before the shipping/products fields were standardized. */
function normalizeOrder(order: any) {
  const rawDelivery = order?.delivery && typeof order.delivery === 'object' ? order.delivery : {};
  const rawShipping = order?.shipping && typeof order.shipping === 'object' ? order.shipping : {};
  const rawItems = Array.isArray(order?.items) ? order.items
    : Array.isArray(order?.products) ? order.products
    : Array.isArray(order?.cartItems) ? order.cartItems : [];

  const items = rawItems.map((item: any) => ({
    title: firstNonEmpty(item?.title, item?.name, item?.productName, 'Produkt'),
    quantity: Math.max(1, Number(item?.quantity ?? item?.qty ?? 1) || 1),
    price: Number(firstNonEmpty(item?.price, item?.unitPrice, item?.pricePerUnit, 0)) || 0,
    productId: firstNonEmpty(item?.productId, item?.id, '')
  }));

  const carrier = String(firstNonEmpty(
    rawDelivery?.carrier,
    rawShipping?.carrier,
    order?.shippingCarrier,
    order?.carrier,
    order?.deliveryCarrier,
    ''
  )).trim();

  const shippingPrice = Number(firstNonEmpty(
    rawDelivery?.price,
    rawDelivery?.shippingPrice,
    rawShipping?.price,
    order?.shippingPrice,
    typeof order?.shipping === 'number' ? order.shipping : undefined,
    order?.deliveryPrice,
    0
  )) || 0;

  const method = String(firstNonEmpty(rawDelivery?.method, order?.deliveryMethod, '')).trim();
  const pickupLabel = String(firstNonEmpty(rawDelivery?.pickupPoint, rawDelivery?.pickupPointName, order?.pickupPoint, '')).trim();
  const pickupAddress = String(firstNonEmpty(rawDelivery?.pickupPointAddress, rawDelivery?.pickupAddress, order?.pickupPointAddress, '')).trim();

  return {
    ...order,
    items,
    delivery: { ...rawDelivery, carrier, price: shippingPrice, method, pickupPoint: pickupLabel, pickupPointAddress: pickupAddress },
    shippingPrice,
    shippingCarrier: carrier
  };
}

const footer = `<div style="padding:26px 30px;background:#faf8f5;border-top:1px solid #eee5dc;text-align:center;color:#756b63;font:12px/1.8 Arial,sans-serif"><strong style="color:#302923">Luvia Decor</strong><br>Odpovědná osoba: Ladislav Pekárek<br>Adresa: U Rejdiště 3732/15, 767 01, Kroměříž<br>IČO: 29905061<br>Email: objednavky@luvia-decor.cz · podpora@luvia-decor.cz<br>Telefonní číslo: +420702345999</div>`;
const layout = (title: string, body: string) => `<!doctype html><html lang="cs"><body style="margin:0;background:#f4f0eb"><div style="padding:28px 12px"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #e7dfd6;border-radius:20px;overflow:hidden"><div style="background:#211c18;padding:28px;text-align:center;color:#faf6f0;font:700 25px Arial,sans-serif;letter-spacing:5px">LUVIA DECOR<div style="margin-top:7px;color:#c5a880;font:11px Arial,sans-serif;letter-spacing:2px">KVĚTINOVÝ ATELIÉR &amp; DEKORACE</div></div><div style="padding:30px;font-family:Arial,sans-serif;color:#302923"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b08f65;font-weight:700;margin-bottom:10px">${esc(title)}</div>${body}</div>${footer}</div></div></body></html>`;

async function sendCustomerStatusEmail(rawOrder: any, status: OrderStatus) {
  const order = normalizeOrder(rawOrder);
  const apiKey = process.env.RESEND_API_KEY;
  const to = String(order?.customer?.email || '').trim();
  if (!apiKey) throw new Error('Chybí RESEND_API_KEY ve Vercel Environment Variables.');
  if (!to) throw new Error('Objednávka nemá e-mail zákazníka.');

  const number = String(order?.orderNumber || order?.id || '');
  const vs = variableSymbol(number);
  const delivery = order.delivery || {};
  const deliveryText = delivery.method === 'personal_pickup'
    ? 'Osobní odběr – Kroměříž'
    : delivery.method === 'box'
      ? `BOX – ${delivery.carrier || 'přepravce'}${delivery.pickupPoint ? `: ${delivery.pickupPoint}` : ''}`
      : delivery.method === 'pickup_point'
        ? `Výdejní místo – ${delivery.carrier || 'přepravce'}${delivery.pickupPoint ? `: ${delivery.pickupPoint}` : ''}`
        : delivery.carrier
          ? `Doručení na adresu – ${delivery.carrier}`
          : 'Doručení na adresu';

  const items = (Array.isArray(order.items) ? order.items : []).map((i: any) => `<tr><td style="padding:11px;border-bottom:1px solid #eee"><strong>${esc(i.title)}</strong>${i.productId ? `<br><span style="font-size:11px;color:#8b8178">ID produktu: ${esc(i.productId)}</span>` : ''}</td><td style="padding:11px;text-align:center;border-bottom:1px solid #eee">${Number(i.quantity || 1)}</td><td style="padding:11px;text-align:right;border-bottom:1px solid #eee">${money(i.price)} Kč</td></tr>`).join('');
  const shippingRow = `<tr><td style="padding:11px;border-bottom:1px solid #eee"><strong>Doprava (${esc(delivery.carrier || (delivery.method === 'personal_pickup' ? 'Osobní odběr – Kroměříž' : 'přepravce neuveden'))})</strong></td><td style="padding:11px;text-align:center;border-bottom:1px solid #eee">1×</td><td style="padding:11px;text-align:right;border-bottom:1px solid #eee">${money(order.shippingPrice)} Kč</td></tr>`;
  const rows = (items || '') + shippingRow;

  const payment = (status === 'nova' || status === 'zpracovava_se') ? `<div style="margin-top:22px;padding:18px;background:#faf8f5;border:1px solid #eee5dc;border-radius:14px;font-size:13px;line-height:1.8"><strong>Bankovní převod</strong><br>Číslo účtu (ČR): <strong>963625003/5500</strong><br>IBAN (zahraniční platby): <strong>CZ96 5500 0000 0009 6362 5003</strong><br>SWIFT/BIC: <strong>RZBCCZPP</strong><br>Variabilní symbol: <strong>${esc(vs)}</strong><br>Částka: <strong>${money(order.totalPrice)} Kč</strong><br>Poznámka pro příjemce: <strong>${esc(number)}</strong><div style="text-align:center;margin-top:14px"><img src="https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=963625003&bankCode=5500&amount=${encodeURIComponent(Number(order.totalPrice || 0).toFixed(2))}&currency=CZK&vs=${encodeURIComponent(vs)}&message=${encodeURIComponent(number)}" width="220" height="220" alt="QR platba" style="border:1px solid #e6ded5;border-radius:8px"></div></div>` : '';

  const body = `<h1 style="margin:0 0 12px;font:700 25px Georgia,serif">${esc(LABELS[status])}</h1><p style="font-size:15px;line-height:1.7">Dobrý den, ${esc(order?.customer?.fullName || 'zákazníku')},<br>${esc(MESSAGES[status])}</p><div style="margin:20px 0;padding:15px 18px;background:#faf8f5;border-radius:12px;font-size:13px;line-height:1.8"><strong>Objednávka:</strong> ${esc(number)}<br><strong>Variabilní symbol:</strong> ${esc(vs)}<br><strong>Doručení:</strong> ${esc(deliveryText)}${delivery.pickupPointAddress ? `<br><strong>Adresa výdejního místa:</strong> ${esc(delivery.pickupPointAddress)}` : ''}</div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="padding:10px;text-align:left;border-bottom:1px solid #ddd">Produkt</th><th style="padding:10px;border-bottom:1px solid #ddd">Ks</th><th style="padding:10px;text-align:right;border-bottom:1px solid #ddd">Cena</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right;font-size:17px"><strong>Celkem: ${money(order.totalPrice)} Kč</strong></p>${payment}<p style="margin-top:24px;font-size:13px;color:#756b63">V případě dotazů nás kontaktujte na objednavky@luvia-decor.cz.</p>`;

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from: 'Luvia Decor <objednavky@luvia-decor.cz>', to, replyTo: 'podpora@luvia-decor.cz', subject: `${LABELS[status]} · ${number} | Luvia Decor`, html: layout('Informace k objednávce', body) });
  if (result.error) throw new Error(result.error.message || 'Resend odmítl odeslání e-mailu.');
  return { sent: true, id: result.data?.id };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    const requested = String(req.query.id || '').trim();
    const status = String(req.body?.status || '') as OrderStatus;
    if (!requested) return res.status(400).json({ error: 'Chybí ID objednávky.' });
    if (!Object.prototype.hasOwnProperty.call(LABELS, status)) return res.status(400).json({ error: 'Neplatný stav objednávky.' });

    const rows = await sql`SELECT id, data FROM orders WHERE id = ${requested} OR data->>'orderNumber' = ${requested} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Objednávka nebyla nalezena podle ID ani čísla objednávky.' });

    const dbId = String(rows[0].id);
    const order = normalizeOrder({ ...(rows[0].data || {}), id: dbId });
    const previous = String(order.status || 'nova') as OrderStatus;
    const changed = previous !== status;
    const updated: any = { ...order, status, variableSymbol: variableSymbol(order.orderNumber), updatedAt: new Date().toISOString() };
    await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${dbId}`;

    let statusEmail: any = { sent: false, skipped: true };
    if (changed || req.body?.resendEmail === true) {
      try { statusEmail = { ...(await sendCustomerStatusEmail(updated, status)), status }; }
      catch (emailError: any) { statusEmail = { sent: false, status, error: emailError?.message || 'Odeslání e-mailu selhalo.' }; console.error('Status email error:', emailError); }
      updated.statusEmail = statusEmail;
      updated.resendSent = statusEmail.sent === true;
      if (statusEmail.error) updated.resendError = statusEmail.error; else delete updated.resendError;
      await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${dbId}`;
    }
    return res.status(200).json({ ...updated, success: true, statusChanged: changed, emailAttempted: changed || req.body?.resendEmail === true, statusEmail });
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
