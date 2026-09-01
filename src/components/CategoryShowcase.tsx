import React from 'react';
import { useApp } from '../context/AppContext';
import { getCategoryInfoList } from '../utils/categories';
import { ArrowRight, Grid, Sparkles } from 'lucide-react';
import { SafeImage } from './SafeImage';

export const CategoryShowcase: React.FC = () => {
  const { categories: productCategories, products, setSelectedCategory, setPage } = useApp();

  const categories = getCategoryInfoList(productCategories, products);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setPage('catalog');
  };

  return (
    <section id="category-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C7355] inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Prozkoumejte náš ateliér
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">
            Kategorie produktů
          </h2>
          <p className="text-sm text-[#7B6E63] max-w-xl leading-relaxed">
            Vyberte si z naší ručně tvořené kolekce. Každá kategorie skrývá originály vyladěné do detailu.
          </p>
        </div>
        <button
          onClick={() => setPage('catalog')}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8C7355] hover:text-[#5C4830] transition cursor-pointer shrink-0"
        >
          <span>Kompletní katalog ({products.length} produktů)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="group relative rounded-3xl overflow-hidden cursor-pointer text-left border border-[#EBE3D8] hover:border-[#C5A880] hover:shadow-xl transition-all duration-300"
              aria-label={`Zobrazit kategorii ${cat.name}`}
            >
              <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-[#FAF6F0]">
                <SafeImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E1915]/90 via-[#1E1915]/35 to-transparent" />

                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/25">
                    {cat.count} {cat.count === 1 ? 'kus' : 'kusů'}
                  </span>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-5">
                  <h3 className="font-editorial text-xl font-bold text-[#FAF6F0] group-hover:text-[#E2D0B8] transition leading-snug">
                    {cat.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C5A880] mt-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                    Zobrazit kategorii
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E8DFC8] space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center mx-auto">
            <Grid className="w-6 h-6" />
          </div>
          <h3 className="font-editorial text-2xl font-bold text-[#2D2723]">
            Žádné kategorie k zobrazení
          </h3>
          <p className="text-xs text-[#7B6E63]">
            Jakmile přidáte produkty, kategorie se zde objeví automaticky.
          </p>
        </div>
      )}
    </section>
  );
};
