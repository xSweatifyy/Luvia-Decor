import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  }

  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Zadejte slevový kód.' });
    }

    const rows = await sql`
      SELECT id, code, type, value, active, created_at, note
      FROM coupons
      WHERE code = ${code} AND active = TRUE
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Slevový kód je neplatný nebo vypršel.' });
    }

    const coupon = rows[0];
    return res.status(200).json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value)
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    return res.status(500).json({ valid: false, error: 'Chyba ověření slevového kódu.' });
  }
}
