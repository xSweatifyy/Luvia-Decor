import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');
const allowed = new Set(['nova','zpracovava_se','zaplaceno','odeslano','dokonceno','zruseno']);

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
    const order = { ...(rows[0].data as Record<string, unknown>), status, updatedAt: new Date().toISOString() };
    await sql`UPDATE orders SET data = ${JSON.stringify(order)}::jsonb WHERE id = ${orderId}`;
    return res.status(200).json({ success: true, order: { ...order, id: orderId } });
  } catch (error: any) {
    console.error('Order status API error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Chyba serveru.' });
  }
}
