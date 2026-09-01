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

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
      return res.status(200).json(rows.map(row => row.data));
    }

    if (req.method === 'POST') {
      const product = req.body;
      if (!product?.id || !product?.title) {
        return res.status(400).json({ error: 'Produkt nemá povinné údaje.' });
      }
      await sql`
        INSERT INTO products (id, data)
        VALUES (${product.id}, ${JSON.stringify(product)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      return res.status(201).json(product);
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Databázová operace selhala.' });
  }
}
