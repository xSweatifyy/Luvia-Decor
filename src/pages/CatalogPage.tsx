import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { getFullCategoryList } from '../utils/categories';
import { Search, SlidersHorizontal, Sparkles, Filter, RefreshCw } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { products, categories: productCategories, selectedCategory, setSelectedCategory } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Always show ALL categories: those from the API merged with every category
  // actually used by products, so nothing can disappear regardless of count.
  const categories = [
    { id: 'all', name: 'Všechny produkty' },
    ...getFullCategoryList(productCategories, products),
  ];

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Category filter
        if (selectedCategory !== 'all' && product.category !== selectedCategory) {
          return false;
        }
        // In stock filter
        if (onlyInStock && !product.inStock) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = product.title.toLowerCase().includes(q);
          const matchDesc = product.description.toLowerCase().includes(q);
          const matchMat = product.materials?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchMat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'newest') return (b.badge === 'Novinka' ? 1 : 0) - (a.badge === 'Novinka' ? 1 : 0);
        // default: featured and bestsellers first
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, selectedCategory, searchQuery, sortBy, onlyInStock]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('featured');
    setOnlyInStock(false);
  };

  return (
    <div id="catalog-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8C7355]">
          Kolekce & E-shop
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#2D2723]">
          Ručně tvořené dekorace a aranžmá
        </h1>
        <p className="text-sm text-[#7B6E63] leading-relaxed">
          Každý náš výrobek je originál s důrazem na precizní řemeslo a dlouhou životnost. Vyberte si dekoraci, která rozzáří váš domov.
        </p>
      </div>

      {/* Filter and Control Bar */}
      <div className="space-y-4 bg-white p-6 rounded-2xl border border-[#E8DFC8] shadow-sm">

        {/* Top: Category Pills — wrapped so every category is always visible */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#2D2723] text-white shadow-sm'
                    : 'bg-[#FAF6F0] text-[#5C4F44] hover:bg-[#F2ECE4] border border-[#E8DFC8]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Bottom row: Search + In Stock toggle + Sorting */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-[#F2ECE4]">

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat věnec, aranžmá, svíčku, materiál..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30 focus:border-[#8C7355]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* In-Stock Checkbox */}
            <label className="flex items-center gap-2 text-[#5C5046] font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-[#8C7355] focus:ring-[#8C7355] border-[#E3DACF] cursor-pointer"
              />
              <span>Pouze skladem</span>
            </label>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Řazení produktů"
                className="bg-[#FAF8F5] border border-[#E3DACF] rounded-xl px-3 py-2 text-xs font-semibold text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
              >
                <option value="featured">Doporučené & Bestsellery</option>
                <option value="price-asc">Cena: Od nejlevnějšího</option>
                <option value="price-desc">Cena: Od nejdražšího</option>
                <option value="newest">Nejnovější kousky</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#7B6E63] px-1">
        <span>
          Nalezeno <strong>{filteredProducts.length}</strong> z celkem {products.length} produktů
        </span>
        {(selectedCategory !== 'all' || searchQuery || onlyInStock) && (
          <button
            onClick={resetFilters}
            className="text-[#8C7355] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Resetovat filtry
          </button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E8DFC8] space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="font-editorial text-2xl font-bold text-[#2D2723]">
            Žádné produkty neodpovídají filtrům
          </h3>
          <p className="text-xs text-[#7B6E63]">
            Zkuste změnit hledaný výraz nebo zvolit jinou kategorii.
          </p>
          <button
            onClick={resetFilters}
            className="px-6 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-semibold rounded-full transition cursor-pointer"
          >
            Zobrazit všechny produkty
          </button>
        </div>
      )}

    </div>
  );
};
