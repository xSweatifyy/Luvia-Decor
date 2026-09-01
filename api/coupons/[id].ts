import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
}

function isAdmin(req: VercelRequest): boolean {
  const user = (req.body as any)?.adminUser || (req.query as any)?.adminUser;
  return !!user && user.role === 'admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  try {
    await ensureTable();
    const id = String(req.query.id);

    if (req.method === 'PUT') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Slevové kódy může spravovat pouze hlavní správce.' });
      const updates: string[] = [];
      const params: any[] = [];
      if (typeof (req.body as any)?.active === 'boolean') {
        params.push((req.body as any).active);
        updates.push(`active = $${params.length}`);
      }
      if ((req.body as any)?.value !== undefined) {
        const value = Number((req.body as any).value) || 0;
        if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
        params.push(value);
        updates.push(`value = $${params.length}`);
      }
      if (!updates.length) return res.status(400).json({ error: 'Chybí data k aktualizaci.' });
      params.push(id);
      const rows = await sql.query(
        `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, code, type, value, active, created_at, note`,
        params
      );
      if (!rows.length) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
      const r = rows[0];
      return res.status(200).json({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' });
    }

    if (req.method === 'DELETE') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Slevové kódy může spravovat pouze hlavní správce.' });
      await sql`DELETE FROM coupons WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Coupon API error:', error);
    return res.status(500).json({ error: 'Slevový kód se nepodařilo upravit.' });
  }
}