import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');

// Inline the mail helper in this serverless function so Vercel Node ESM does not fail resolving an external TS module.

const labels: Record<string, string> = { nova:'Nová objednávka',zpracovava_se:'Objednávka se zpracovává',zaplaceno:'Objednávka zaplacena',u_prepravce:'Objednávka je u přepravce',odeslano:'Objednávka odeslána',dokonceno:'Objednávka dokončena',zruseno:'Objednávka zrušena' };
function esc(v: any) { return String(v ?? '').replace(/[&<>\"']/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c] || c)); }
function formatMoney(v: any) { return Number(v ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function variableSymbol(order: any, id: string) { return String(order?.variableSymbol || order?.orderNumber || id || '').replace(/\D/g, ''); }
function paymentQrUrl(order: any, id: string) { const params = new URLSearchParams({ accountNumber:'963625003',bankCode:'5500',amount:Number(order?.totalPrice || 0).toFixed(2),currency:'CZK',vs:variableSymbol(order,id),message:String(order?.orderNumber || id || '').trim(),size:'220' }); return `https://api.paylibo.com/paylibo/generator/czech/image?${params.toString()}`; }
function shippingAmount(order: any, delivery: any) { const direct=[order?.shipping,delivery?.shipping,delivery?.price,delivery?.shippingPrice].map(Number).find(v=>Number.isFinite(v)); if(direct!==undefined)return direct; const method=String(delivery?.method||''); const carrier=String(delivery?.carrier||'').toUpperCase(); if(method==='personal_pickup')return 0; if(carrier==='UPS')return 356; if(carrier==='PENGUINBOX')return 59; if(carrier==='ZASILKOVNA'&&String(delivery?.country||'').toUpperCase()==='SK')return 0; const baseMap:any={BALIKOVNA:{pickup:52,address:88},DPD:{pickup:85,address:98},GLS:{pickup:52},WEDO:{pickup:57,address:92},PPL:{pickup:68},ZASILKOVNA:{pickup:72,address:99}}; const base=baseMap[carrier]?.[method==='address'?'address':'pickup']; return base===undefined?0:Number((base*1.105*1.21).toFixed(2)); }
function productsHtml(order: any) { const items=Array.isArray(order?.items)?order.items:[]; return items.map((item:any)=>{const qty=Number(item?.quantity||1);const unit=Number(item?.price||0);const line=unit*qty;return `<tr><td style="padding:10px;border-bottom:1px solid #eee"><strong>${esc(item?.title||'Produkt')}</strong></td><td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${qty}×</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatMoney(line)} Kč</td></tr>`;}).join('')||'<tr><td colspan="3" style="padding:10px;color:#777">Žádné produkty</td></tr>'; }
function pickupAddressOf(delivery: any) { const p=delivery?.pickupPoint; const direct=delivery?.pickupPointAddress||delivery?.pickupAddress||delivery?.pickupPointFullAddress||delivery?.pickupAddressFull; if(direct)return String(direct).trim(); if(p&&typeof p==='object')return String(p.formattedAddress||p.address||[p.street,p.zip,p.city].filter(Boolean).join(', ')||'').trim(); return ''; }
function pickupLabelOf(delivery: any) { const p=delivery?.pickupPoint; if(p&&typeof p==='object')return String(p.name||p.label||p.title||p.placeName||'').trim(); return String(p||delivery?.pickupPointName||'').trim(); }

async function sendOrderStatusEmails(order: any, id: string, status: string) {
  if (!labels[status]) throw new Error('Chybí nebo je neplatný stav objednávky.');
  const apiKey=process.env.RESEND_API_KEY;
  if(!apiKey) throw new Error('Ve Vercelu chybí RESEND_API_KEY.');
  const to=String(order?.customer?.email||'').trim();
  const seller=String(process.env.ORDER_NOTIFY_EMAIL||'objednavky@luvia-decor.cz').trim();
  if(!to) throw new Error('Objednávka nemá e-mail zákazníka.');
  const resend=new Resend(apiKey); const label=labels[status]; const delivery=order?.delivery||{};
  const carrier=String(delivery?.carrier||order?.shippingCarrier||order?.carrier||'').trim()||'Doprava'; const vs=variableSymbol(order,id); const orderNo=String(order?.orderNumber||id); const shipping=shippingAmount(order,delivery); const total=Number(order?.totalPrice??0); const pickupAddress=pickupAddressOf(delivery); const pickupLabel=pickupLabelOf(delivery); const pickupDetails=[pickupLabel,pickupAddress].filter(Boolean).join(' · ');
  const deliveryText=delivery?.method==='personal_pickup'?'Osobní odběr – Kroměříž':delivery?.method==='box'?`Box – ${carrier}${pickupDetails?`: ${pickupDetails}`:''}`:delivery?.method==='pickup_point'?`Výdejní místo – ${carrier}${pickupDetails?`: ${pickupDetails}`:''}`:`Doručení na adresu – ${carrier}`;
  const html=`<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto"><h1>LUVIA DECOR</h1><h2>${esc(label)}</h2><p>Dobrý den, ${esc(order?.customer?.fullName||'zákazníku')},</p><p>Stav Vaší objednávky <strong>${esc(orderNo)}</strong> byl změněn na <strong>${esc(label)}</strong>.</p><div style="margin:18px 0;padding:14px;background:#faf8f5;border-radius:10px;line-height:1.8;font-size:13px"><strong>Doprava:</strong> ${esc(carrier)}<br><strong>Způsob doručení:</strong> ${esc(deliveryText)}${pickupLabel?`<br><strong>Výdejní místo:</strong> ${esc(pickupLabel)}`:''}${pickupAddress?`<br><strong>Přesná adresa výdejního místa:</strong> ${esc(pickupAddress)}`:''}</div><table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr><th style="padding:10px;text-align:left;border-bottom:1px solid #ddd">Produkty</th><th style="padding:10px;text-align:center;border-bottom:1px solid #ddd">Ks</th><th style="padding:10px;text-align:right;border-bottom:1px solid #ddd">Cena</th></tr></thead><tbody>${productsHtml(order)}<tr><td style="padding:10px;border-bottom:1px solid #eee"><strong>Doprava (${esc(carrier)})</strong></td><td style="padding:10px;border-bottom:1px solid #eee;text-align:center">1×</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap"><strong>${formatMoney(shipping)} Kč</strong></td></tr><tr><td colspan="2" style="padding:14px 10px 10px;text-align:right"><strong>Celkem:</strong></td><td style="padding:14px 10px 10px;text-align:right;white-space:nowrap"><strong>${formatMoney(total)} Kč</strong></td></tr></tbody></table><div style="margin-top:24px;padding:20px;background:#faf8f5;border:1px solid #eee5dc;border-radius:14px"><strong>Platba bankovním převodem</strong><div style="font-size:13px;line-height:1.8;margin-top:10px">Číslo účtu (ČR): <strong>963625003/5500</strong><br>IBAN (zahraniční platby): <strong>CZ96 5500 0000 0009 6362 5003</strong><br>SWIFT/BIC: <strong>RZBCCZPP</strong><br>Variabilní symbol: <strong>${esc(vs)}</strong><br>Částka: <strong>${formatMoney(total)} Kč</strong><br>Poznámka pro příjemce: <strong>${esc(orderNo)}</strong></div><div style="text-align:center;margin-top:16px"><img src="${paymentQrUrl(order,id)}" width="220" height="220" alt="QR platba" style="display:inline-block;border:1px solid #e6ded5;border-radius:8px"></div></div><p>V případě dotazů nám odpovězte na tento e-mail.</p></div>`;
  const results=await Promise.allSettled([resend.emails.send({from:'Luvia Decor <objednavky@luvia-decor.cz>',to,replyTo:'podpora@luvia-decor.cz',subject:`${label} · ${orderNo} | Luvia Decor`,html}),resend.emails.send({from:'Luvia Decor <objednavky@luvia-decor.cz>',to:seller,subject:`${label} · ${orderNo} | Luvia Decor`,html})]);
  const failed=results.find((r:any)=>r.status==='rejected'||r.value?.error); if(failed){const error=failed.status==='rejected'?failed.reason?.message:failed.value?.error?.message;throw new Error(error||'Resend odmítl e-mail.');}
  return { customer:true, seller:true, sentAt:new Date().toISOString() };
}


const allowed = new Set(['nova','zpracovava_se','zaplaceno','u_prepravce','odeslano','dokonceno','zruseno']);
const ZASLAT_BASE = 'https://www.zaslat.cz/api/v1';

const carrierCode = (carrier: unknown) => {
  const value = String(carrier || '').trim();
  const aliases: Record<string, string> = {
    'Zásilkovna': 'ZASILKOVNA',
    'Balíkovna': 'BALIKOVNA',
    'One By Allegro': 'WEDO',
    'grid.online': 'LIFTAGO',
    'GLS_SK': 'GLS-SK',
  };
  if (aliases[value]) return aliases[value];
  const code = value.toUpperCase();
  return ['PPL','DPD','GLS','TOPTRANS','UPS','GLS-SK','LIFTAGO','FEDEX','WEDO','BALIKOVNA','ZASILKOVNA','SPS'].includes(code) ? code : '';
};

function splitName(fullName: string) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return { firstname: parts[0] || 'Zákazník', surname: parts.slice(1).join(' ') || 'Luvia Decor' };
}

async function zaslatRequest(path: string, init: RequestInit = {}) {
  const apiKey = String(process.env.ZASLAT_API_KEY || '').trim();
  if (!apiKey) throw new Error('Chybí ZASLAT_API_KEY ve Vercel Environment Variables.');
  const response = await fetch(`${ZASLAT_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Apikey': apiKey, ...(init.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || Number(data?.status) >= 400) {
    const detail = Array.isArray(data?.errors) ? data.errors.map((e: any) => e?.message || e).join('; ') : data?.message;
    throw new Error(detail || `Zaslat API vrátilo HTTP ${response.status}.`);
  }
  return data;
}

async function createZaslatShipment(order: any) {
  if (order?.zaslat?.shipments?.length) return order.zaslat;
  const carrier = carrierCode(order?.delivery?.carrier);
  if (!carrier || order?.delivery?.method === 'personal_pickup' || carrier === 'PENGUINBOX') return { skipped: true, reason: 'Pro tento způsob dopravy se zásilka přes Zaslat nevytváří.' };
  const contactsResponse = await zaslatRequest('/contacts/list', { method: 'GET' });
  const contacts = Object.values(contactsResponse?.data || {}) as any[];
  const senderStreet = 'U Rejdiště 3732/15';
  const senderZip = '767 01';
  const senderCity = 'Kroměříž';
  const sender = contacts.find((contact: any) => String(contact?.street || '').trim().toLowerCase() === senderStreet.toLowerCase() && String(contact?.zip || '').replace(/\s/g, '') === senderZip.replace(/\s/g, '') && String(contact?.city || '').trim().toLowerCase() === senderCity.toLowerCase());
  let senderId = Number(sender?.id || 0);
  if (!senderId) {
    const created = await zaslatRequest('/contacts/add', {
      method: 'POST',
      body: JSON.stringify({ contacts: [{ firstname: 'Ladislav', surname: 'Pekárek', company: 'Luvia Decor', street: senderStreet, city: senderCity, zip: senderZip, country: 'CZ', phone: '+420702345999', email: 'objednavky@luvia-decor.cz', tin: '29905061' }] }),
    });
    senderId = Number(created?.data?.[0] || 0);
  }
  if (!senderId) throw new Error('Zaslat API nevrátilo ID odesílací adresy Luvia Decor.');
  const customer = order.customer || {};
  const { firstname, surname } = splitName(customer.fullName);
  const country = String(customer.country || '').toUpperCase() === 'SLOVENSKO' ? 'SK' : 'CZ';
  const packages = Array.isArray(order?.zaslatPackage) && order.zaslatPackage.length ? order.zaslatPackage : [{ weight: 5, width: 30, height: 20, length: 10 }];
  const shipment: any = {
    carrier,
    type: 'OCCASIONAL',
    pickup_date: new Date().toISOString().slice(0, 10),
    from: { id: senderId },
    to: { firstname, surname, street: String(customer.street || ''), city: String(customer.city || ''), zip: String(customer.zip || ''), country, phone: String(customer.phone || ''), email: String(customer.email || '') },
    packages: packages.map((p: any) => ({ weight: Math.max(0.1, Number(p?.weight) || 1), width: Math.max(1, Number(p?.width) || 30), height: Math.max(1, Number(p?.height) || 20), length: Math.max(1, Number(p?.length) || 10), value: { value: Number(order.totalPrice || 0), currency: 'CZK' }, content: 'Objednávka Luvia Decor' })),
    reference: String(order.orderNumber || order.id || '').slice(0, 255),
  };
  if (order?.delivery?.serviceId) shipment.service_id = Number(order.delivery.serviceId);
  const deliveryBranch = order?.delivery?.zaslatPickupBranch || order?.delivery?.pickupPointCode || order?.delivery?.pickupPointId;
  if (deliveryBranch) shipment.delivery_branch = String(deliveryBranch);
  const response = await zaslatRequest('/shipments/create', { method: 'POST', body: JSON.stringify({ currency: 'CZK', payment_type: 'CREDIT', shipments: [shipment] }) });
  const result = response?.data || {};
  return { createdAt: new Date().toISOString(), order: result.order || null, orderNumber: result.order_number || null, shipments: Array.isArray(result.shipments) ? result.shipments : [], carrier, serviceId: order?.delivery?.serviceId || null, pickupPointCode: deliveryBranch || null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    const action = String(req.query?.action || '').trim();
    const orderId = String(req.body?.orderId || '').trim();
    const status = String(req.body?.status || '').trim();
    if (!orderId) return res.status(400).json({ success: false, error: 'Chybí ID objednávky.' });
    await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`SELECT data FROM orders WHERE id = ${orderId} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ success: false, error: 'Objednávka nenalezena.' });
    // Neon normally decodes JSONB automatically, but tolerate deployments/drivers returning it as text.
    const storedData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    if (!storedData || typeof storedData !== 'object' || Array.isArray(storedData)) {
      throw new Error('Data objednávky mají neočekávaný formát.');
    }
    if (action === 'tracking') {
      if (!rows.length) return res.status(404).json({ success: false, error: 'Objednávka nenalezena.' });
      const storedData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      if (!storedData || typeof storedData !== 'object' || Array.isArray(storedData)) throw new Error('Data objednávky mají neočekávaný formát.');
      if (req.body?.remove === true) {
        const updated = { ...(storedData as Record<string, unknown>), updatedAt: new Date().toISOString() } as Record<string, unknown>;
        delete updated.tracking;
        const saved = await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${orderId} RETURNING data`;
        const data = typeof saved[0]?.data === 'string' ? JSON.parse(saved[0].data) : saved[0]?.data;
        return res.status(200).json({ ...(data || updated), id: orderId });
      }
      const trackingNumber = String(req.body?.trackingNumber || '').trim();
      const carrier = String(req.body?.carrier || '').trim();
      if (!trackingNumber) return res.status(400).json({ success: false, error: 'Zadejte číslo zásilky.' });
      if (!['PPL', 'DPD', 'Zásilkovna'].includes(carrier)) return res.status(400).json({ success: false, error: 'Vyberte podporovaného přepravce.' });
      const trackingUrl = carrier === 'PPL'
        ? `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${encodeURIComponent(trackingNumber)}`
        : carrier === 'DPD'
          ? `https://www.dpd.com/cz/cs/receiving/track/?parcelNumber=${encodeURIComponent(trackingNumber)}`
          : `https://tracking.packeta.com/cs/?id=${encodeURIComponent(trackingNumber)}`;
      const currentTracking = (storedData as any).tracking || {};
      const tracking = { ...currentTracking, carrier, trackingNumber, status: String(req.body?.status || currentTracking.status || 'Zásilka evidována'), trackingUrl, updatedAt: new Date().toISOString(), ...(req.body?.refresh ? { lastCheckedAt: new Date().toISOString() } : {}) };
      const updated = { ...(storedData as Record<string, unknown>), tracking, updatedAt: new Date().toISOString() };
      const saved = await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${orderId} RETURNING data`;
      const data = typeof saved[0]?.data === 'string' ? JSON.parse(saved[0].data) : saved[0]?.data;
      return res.status(200).json({ ...(data || updated), id: orderId });
    }
    if (!allowed.has(status)) return res.status(400).json({ success: false, error: 'Neplatný stav objednávky.' });
    if (action === 'email') {
      const result = await sendOrderStatusEmails(storedData, orderId, status);
      return res.status(200).json({ success: true, ...result });
    }
    let order: any = { ...(storedData as Record<string, unknown>), status, updatedAt: new Date().toISOString() };
    if (status === 'u_prepravce' && !order.zaslat?.shipments?.length && process.env.ZASLAT_API_KEY) {
      try { order.zaslat = await createZaslatShipment(order); }
      catch (zaslatError: any) { order.zaslat = { createdAt: new Date().toISOString(), error: zaslatError?.message || 'Vytvoření zásilky přes Zaslat selhalo.' }; console.error('Zaslat shipment creation error:', zaslatError); }
    }
    // Update JSONB fields directly in Postgres to avoid driver/serialization edge cases.
    const updatedRows = await sql`UPDATE orders SET data = ${JSON.stringify(order)}::jsonb WHERE id = ${orderId} RETURNING data`;
    if (!updatedRows.length) return res.status(404).json({ success: false, error: 'Objednávka při ukládání zmizela z databáze.' });
    const savedData = typeof updatedRows[0].data === 'string' ? JSON.parse(updatedRows[0].data) : updatedRows[0].data;
    return res.status(200).json({ success: true, order: { ...savedData, id: orderId } });
  } catch (error: any) {
    console.error('Order status API error:', { message: error?.message, stack: error?.stack });
    return res.status(500).json({ success: false, error: error?.message || 'Chyba serveru.' });
  }
}
