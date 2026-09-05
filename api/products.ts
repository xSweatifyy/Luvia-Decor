import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { initialProducts } from '../src/data/initialData';

const sql = neon(process.env.DATABASE_URL || '');

function normalizeProduct(product: any) {
  const imageUrl = typeof product?.imageUrl === 'string' ? product.imageUrl.trim() : '';
  const gallery = Array.isArray(product?.gallery)
    ? product.gallery.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0).map((url: string) => url.trim())
    : [];

  return {
    ...product,
    id: String(product?.id || ''),
    price: Number(product?.price) || 0,
    compareAtPrice: product?.compareAtPrice ? Number(product.compareAtPrice) : undefined,
    inStock: product?.inStock !== false,
    featured: Boolean(product?.featured),
    isPriceFrom: Boolean(product?.isPriceFrom),
    pricePrefix: product?.isPriceFrom ? (product?.pricePrefix || 'Od') : undefined,
    // Product images are deliberately plain public URLs. No Firebase Storage or
    // proxy is used, so the browser loads the exact URL saved in the product.
    imageUrl,
    gallery,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');

  try {
    // Read the same Neon products used by the admin API. This makes products
    // (including their saved imageUrl/gallery URLs) identical for every visitor.
    const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
    const products = rows
      .map((row: any) => normalizeProduct(row.data))
      .filter((product: any) => product.id && (product.imageUrl || product.gallery.length));

    // If the database is empty, keep the shop usable with the built-in catalog.
    if (products.length > 0) return res.status(200).json(products);
    return res.status(200).json(initialProducts.map(normalizeProduct));
  } catch (error) {
    console.error('Public products API error:', error);
    // Do not break the public shop if Neon is temporarily unavailable.
    return res.status(200).json(initialProducts.map(normalizeProduct));
  }
}
