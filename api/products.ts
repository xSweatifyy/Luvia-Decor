import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeProduct(input: any) {
  const product = { ...(input || {}) };
  const title = String(product.title ?? product.name ?? '').trim();
  if (title) {
    product.title = title;
    if (!product.name) product.name = title;
  }
  if (!product.id) product.id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const imageCandidates = [
    product.imageUrl,
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.gallery) ? product.gallery : []),
  ];
  const images = [...new Set(
    imageCandidates
      .filter((v: any) => typeof v === 'string' && v.trim())
      .map((v: string) => v.trim())
  )];

  product.images = images;
  product.gallery = images;
  if (images[0]) product.imageUrl = images[0];
  return product;
}

// Remove duplicate rows while preserving every image URL. IMPORTANT: when a
// product is edited, its updated_at is newer than its original created_at, so
// the edited row must be kept instead of an older duplicate.
async function removeDuplicateProducts() {
  const rows = await sql`
    SELECT id, data, created_at, updated_at
    FROM products
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  `;
  const groups = new Map<string, any[]>();

  for (const row of rows as any[]) {
    const title = String(row.data?.title ?? row.data?.name ?? '').trim().toLowerCase();
    if (!title) continue;
    const list = groups.get(title) || [];
    list.push(row);
    groups.set(title, list);
  }

  for (const [, duplicates] of groups) {
    if (duplicates.length < 2) continue;

    // The first row is now the most recently updated copy.
    const keeper = duplicates[0];
    const merged = normalizeProduct(keeper.data);
    const allImages = new Set<string>(merged.images || []);

    for (const duplicate of duplicates.slice(1)) {
      const normalized = normalizeProduct(duplicate.data);
      for (const image of normalized.images || []) allImages.add(image);
    }

    merged.images = [...allImages];
    merged.gallery = [...allImages];
    if (merged.images[0]) merged.imageUrl = merged.images[0];

    await sql`
      UPDATE products
      SET data=${JSON.stringify(merged)}::jsonb, updated_at=NOW()
      WHERE id=${keeper.id}
    `;
    const idsToDelete = duplicates.slice(1).map((row: any) => row.id);
    for (const id of idsToDelete) {
      await sql`DELETE FROM products WHERE id=${id}`;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await removeDuplicateProducts();

    if (req.method === 'GET') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (id) {
        const rows = await sql`SELECT data FROM products WHERE id=${id} LIMIT 1`;
        return rows.length ? res.status(200).json(normalizeProduct(rows[0].data)) : res.status(404).json({ error: 'Produkt nenalezen.' });
      }
      const rows = await sql`SELECT data FROM products ORDER BY updated_at DESC NULLS LAST, created_at DESC`;
      return res.status(200).json(rows.map((r: any) => normalizeProduct(r.data)));
    }

    if (req.method === 'POST') {
      const product = normalizeProduct(req.body);
      if (!String(product.title || '').trim()) return res.status(400).json({ error: 'Název produktu je povinný.' });

      const existing = await sql`
        SELECT id, data FROM products
        WHERE LOWER(TRIM(COALESCE(data->>'title', data->>'name', ''))) = LOWER(TRIM(${product.title}))
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      if (existing.length && !req.body?.id) {
        const existingProduct = normalizeProduct(existing[0].data);
        product.id = existing[0].id;
        product.images = [...new Set([...(existingProduct.images || []), ...(product.images || [])])];
        product.gallery = product.images;
        if (product.images[0]) product.imageUrl = product.images[0];
      }

      await sql`
        INSERT INTO products (id,data)
        VALUES (${product.id},${JSON.stringify(product)}::jsonb)
        ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()
      `;
      await removeDuplicateProducts();
      return res.status(201).json(product);
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) return res.status(400).json({ error: 'Chybí ID produktu.' });

    if (req.method === 'PUT') {
      const rows = await sql`SELECT data FROM products WHERE id=${id} LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: 'Produkt nenalezen.' });
      const merged = normalizeProduct({ ...rows[0].data, ...(req.body || {}), id });
      await sql`UPDATE products SET data=${JSON.stringify(merged)}::jsonb,updated_at=NOW() WHERE id=${id}`;
      await removeDuplicateProducts();
      return res.status(200).json(merged);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM products WHERE id=${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  } catch (error: any) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Produkt se nepodařilo uložit.', details: error?.message || String(error) });
  }
}
