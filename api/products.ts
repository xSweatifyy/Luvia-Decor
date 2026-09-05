import { initialProducts } from '../src/data/initialData';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Public product endpoint for Vercel. Product images are plain public URLs;
  // no Firebase Storage is used here.
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json(initialProducts);
}
