import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');
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
  if (order?.delivery?.pickupPointCode) shipment.delivery_branch = String(order.delivery.pickupPointCode);

  const response = await zaslatRequest('/shipments/create', { method: 'POST', body: JSON.stringify({ currency: 'CZK', payment_type: 'CREDIT', shipments: [shipment] }) });
  const result = response?.data || {};
  return { createdAt: new Date().toISOString(), order: result.order || null, orderNumber: result.order_number || null, shipments: Array.isArray(result.shipments) ? result.shipments : [], carrier, serviceId: order?.delivery?.serviceId || null, pickupPointCode: order?.delivery?.pickupPointCode || null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const orderId = String(req.body?.orderId || '').trim();
    const status = String(req.body?.status || '').trim();
    if (!orderId || !allowed.has(status)) return res.status(400).json({ success: false, error: 'Neplatný stav objednávky.' });
    const rows = await sql`SELECT data FROM orders WHERE id = ${orderId} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ success: false, error: 'Objednávka nenalezena.' });
    let order: any = { ...(rows[0].data as Record<string, unknown>), status, updatedAt: new Date().toISOString() };
    if (status === 'u_prepravce' && !order.zaslat?.shipments?.length && process.env.ZASLAT_API_KEY) {
      try { order.zaslat = await createZaslatShipment(order); }
      catch (zaslatError: any) { order.zaslat = { createdAt: new Date().toISOString(), error: zaslatError?.message || 'Vytvoření zásilky přes Zaslat selhalo.' }; console.error('Zaslat shipment creation error:', zaslatError); }
    }
    await sql`UPDATE orders SET data = ${JSON.stringify(order)}::jsonb WHERE id = ${orderId}`;
    return res.status(200).json({ success: true, order: { ...order, id: orderId } });
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Chyba serveru.' });
  }
}
