import { Product, ProductCategory } from '../types';

export interface CategoryInfo {
  id: string;
  name: string;
  imageUrl: string;
  count: number;
}

/**
 * Fallback display names for known category slugs.
 * Used when the categories API is unavailable or returns an incomplete list,
 * so every product category is always shown on the eshop.
 */
export const KNOWN_CATEGORY_NAMES: Record<string, string> = {
  vence: 'Věnce & dekorace',
  aranzma: 'Květinová vazba & boxy',
  'vazy-doplnky': 'Vázy & keramika',
  'svicky-vune': 'Svíčky & vůně',
  zakazkove: 'Zakázková tvorba',
};

/** Elegant cover image per category slug (used when no product has a representative image). */
const CATEGORY_IMAGES: Record<string, string> = {
  vence: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  aranzma: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
  'vazy-doplnky': 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
  'svicky-vune': 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
  zakazkove: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
};

/**
 * Returns a complete, de-duplicated, ordered list of categories that MUST be
 * visible on the eshop: every category from the API plus every category that
 * is actually used by at least one product. Guarantees that no category ever
 * disappears, regardless of how many there are or what the API returns.
 */
export function getFullCategoryList(
  categories: ProductCategory[],
  products: Product[]
): ProductCategory[] {
  const result: ProductCategory[] = [];
  const seen = new Set<string>();

  const push = (id: string, name: string) => {
    const cleanId = String(id || '').trim();
    if (!cleanId || seen.has(cleanId)) return;
    seen.add(cleanId);
    result.push({ id: cleanId, name: name || cleanId });
  };

  // API ordering first.
  for (const c of categories) push(c.id, c.name);

  // Then categories used by products but missing from the API list.
  const apiNames = new Map(categories.map((c) => [c.id, c.name]));
  const usedIds: string[] = [];
  for (const p of products) {
    if (p.category && !usedIds.includes(p.category)) usedIds.push(p.category);
  }
  for (const id of usedIds) {
    push(id, apiNames.get(id) || KNOWN_CATEGORY_NAMES[id] || id);
  }

  return result;
}

/**
 * Builds a complete, ordered list of product categories enriched with a
 * representative cover image and the number of products in each category.
 *
 * It merges categories coming from the API with categories that are actually
 * used by products on the eshop. This guarantees that ALL product categories
 * are rendered, even if the API returns an empty or partial list.
 */
export function getCategoryInfoList(categories: ProductCategory[], products: Product[]): CategoryInfo[] {
  const apiNames = new Map(categories.map((c) => [c.id, c.name]));

  const productsByCategory = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.category) continue;
    const list = productsByCategory.get(p.category) ?? [];
    list.push(p);
    productsByCategory.set(p.category, list);
  }

  // Complete list: API categories + every category used by products.
  return getFullCategoryList(categories, products).map(({ id, name }) => {
    const categoryProducts = productsByCategory.get(id) ?? [];
    const cover =
      CATEGORY_IMAGES[id] ||
      categoryProducts[0]?.imageUrl ||
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80';
    return { id, name: name || apiNames.get(id) || KNOWN_CATEGORY_NAMES[id] || id, imageUrl: cover, count: categoryProducts.length };
  });
}
