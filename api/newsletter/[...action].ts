import type { VercelRequest, VercelResponse } from '@vercel/node';
import newsletterApi from '../[...all]';

/**
 * Explicit route for /api/newsletter/*.
 * Vercel's catch-all route remains the shared implementation; this wrapper
 * forwards newsletter subpaths to it so these endpoints are registered
 * explicitly and consistently in production.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action;
  req.query.all = Array.isArray(action)
    ? action.map(String)
    : action
      ? [String(action)]
      : [];
  return newsletterApi(req, res);
}
