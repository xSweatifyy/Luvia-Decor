import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL není nastavená ve Vercelu.' });
  }

  try {
    await ensureTable();
    const id = String(req.query.id);

    if (req.method === 'PUT') {
      const rows = await sql`SELECT data FROM products WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Produkt nenalezen.' });

      const product = { ...rows[0].data, ...req.body, id };
      if (Object.prototype.hasOwnProperty.call(req.body, 'badge')) {
        if (req.body.badge) product.badge = req.body.badge;
        else delete product.badge;
      }
      if (product.isPriceFrom === false) product.pricePrefix = undefined;
      await sql`
        UPDATE products
        SET data = ${JSON.stringify(product)}::jsonb, updated_at = NOW()
        WHERE id = ${id}
      `;
      return res.status(200).json(product);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Product API error:', error);
    return res.status(500).json({ error: 'Databázová operace selhala.' });
  }
}
