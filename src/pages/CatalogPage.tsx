import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { getFullCategoryList } from '../utils/categories';
import { Search, SlidersHorizontal, Filter, RefreshCw, Gift, ShoppingBag } from 'lucide-react';

const GIFT_CARD_CATEGORY = { id: 'gift-cards', name: 'Dárkové karty' };
const createGiftCardProduct = (price: number) => ({
  id: 'gift-card-custom', title: 'Dárková karta', category: GIFT_CARD_CATEGORY.id, price,
  description: 'Digitální dárková karta v libovolné hodnotě od 200 Kč. Zůstatek lze využít postupně při více nákupech.',
  shortDescription: 'Zvolte si libovolnou částku od 200 Kč.', imageUrl: '', inStock: true, featured: true,
} as any);

const GiftCardProduct: React.FC = () => {
  const { addToCart, addToast } = useApp();
  const [amount, setAmount] = useState('200');
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= 200;
  const add = () => {
    if (!valid) return addToast('error', 'Neplatná částka', 'Dárková karta je od 200 Kč.');
    addToCart(createGiftCardProduct(Math.round(value * 100) / 100), 1);
  };
  return <div className="group relative bg-white rounded-2xl overflow-hidden border border-[#DCCDBD] hover:border-[#BBA487] transition-all duration-300 hover:shadow-xl flex flex-col">
    <div className="aspect-square w-full bg-[#2D2723] flex items-center justify-center p-8">
      <div className="w-full max-w-[260px] aspect-[1.6/1] rounded-2xl border border-[#D9C4A8]/40 bg-[#3A322C] shadow-2xl flex flex-col justify-center px-6 text-center">
        <Gift className="w-9 h-9 mx-auto text-[#E7D4B9] mb-3" /><div className="text-[10px] uppercase tracking-[.28em] text-[#D9C4A8] font-bold">Luvia Decor</div><div className="font-editorial text-2xl font-bold text-white mt-1">Dárková karta</div>
      </div>
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="text-xs text-[#8C7355] font-medium uppercase tracking-wider mb-1.5">Dárkové karty</div>
      <h3 className="font-editorial text-xl font-bold text-[#2D2723]">Dárková karta</h3>
      <p className="text-xs text-[#7B6E63] mt-2 leading-relaxed">Zadejte vlastní částku od 200 Kč. Po přidání do košíku se zobrazí jako položka <b>Dárková karta</b>.</p>
      <div className="mt-4"><label className="text-[11px] font-bold text-[#5C4F44]">Částka (Kč)</label><input type="number" min="200" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FAF8F5] px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" placeholder="200" /></div>
      <div className="mt-5 pt-4 border-t border-[#F2ECE4] flex items-center justify-between gap-2"><span className="text-lg font-bold text-[#2D2723]">{valid ? value.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'} Kč</span><button onClick={add} disabled={!valid} className="px-4 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:bg-stone-300 disabled:cursor-not-allowed"><ShoppingBag className="w-4 h-4" />Do košíku</button></div>
    </div>
  </div>;
};

export const CatalogPage: React.FC = () => {
  const { products, categories: productCategories, selectedCategory, setSelectedCategory } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const categories = [{ id: 'all', name: 'Všechny produkty' }, GIFT_CARD_CATEGORY, ...getFullCategoryList(productCategories, products).filter(c => c.id !== GIFT_CARD_CATEGORY.id)];
  const filteredProducts = useMemo(() => {
    return products.filter(product => { if (selectedCategory !== 'all' && product.category !== selectedCategory) return false; if (onlyInStock && !product.inStock) return false; if (searchQuery.trim()) { const q=searchQuery.toLowerCase().trim(); if (!(product.id?.toLowerCase().includes(q)||product.title.toLowerCase().includes(q)||product.description.toLowerCase().includes(q)||product.materials?.toLowerCase().includes(q))) return false; } return true; }).sort((a,b) => sortBy==='price-asc'?a.price-b.price:sortBy==='price-desc'?b.price-a.price:sortBy==='newest'?(b.badge==='Novinka'?1:0)-(a.badge==='Novinka'?1:0):(b.featured?1:0)-(a.featured?1:0));
  }, [products, selectedCategory, searchQuery, sortBy, onlyInStock]);
  const resetFilters=()=>{setSelectedCategory('all');setSearchQuery('');setSortBy('featured');setOnlyInStock(false)};
  const showGiftCard=selectedCategory==='all'||selectedCategory===GIFT_CARD_CATEGORY.id;
  return <div id="catalog-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
    <div className="text-center max-w-3xl mx-auto space-y-3"><span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8C7355]">Kolekce & E-shop</span><h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#2D2723]">Ručně tvořené dekorace a aranžmá</h1><p className="text-sm text-[#7B6E63] leading-relaxed">Každý náš výrobek je originál s důrazem na precizní řemeslo a dlouhou životnost. Vyberte si dekoraci, která rozzáří váš domov.</p></div>
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-[#E8DFC8] shadow-sm"><div className="flex flex-wrap items-center gap-2">{categories.map(cat=><button key={cat.id} onClick={()=>setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${selectedCategory===cat.id?'bg-[#2D2723] text-white shadow-sm':'bg-[#FAF6F0] text-[#5C4F44] hover:bg-[#F2ECE4] border border-[#E8DFC8]'}`}>{cat.name}</button>)}</div>
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-[#F2ECE4]"><div className="relative flex-1 max-w-md"><Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"/><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Hledat věnec, aranžmá, svíčku, materiál nebo ID produktu..." className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30 focus:border-[#8C7355]"/></div><div className="flex flex-wrap items-center gap-4 text-xs"><label className="flex items-center gap-2 text-[#5C5046] font-medium cursor-pointer select-none"><input type="checkbox" checked={onlyInStock} onChange={e=>setOnlyInStock(e.target.checked)} className="w-4 h-4 rounded text-[#8C7355] focus:ring-[#8C7355] border-[#E3DACF] cursor-pointer"/>Pouze skladem</label><div className="flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355]"/><select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} aria-label="Řazení produktů" className="bg-[#FAF8F5] border border-[#E3DACF] rounded-xl px-3 py-2 text-xs font-semibold text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"><option value="featured">Doporučené & Bestsellery</option><option value="price-asc">Cena: Od nejlevnějšího</option><option value="price-desc">Cena: Od nejdražšího</option><option value="newest">Nejnovější kousky</option></select></div></div></div>
    </div>
    <div className="flex items-center justify-between text-xs text-[#7B6E63] px-1"><span>Nalezeno <strong>{filteredProducts.length + (showGiftCard ? 1 : 0)}</strong> z celkem {products.length + 1} produktů</span>{(selectedCategory!=='all'||searchQuery||onlyInStock)&&<button onClick={resetFilters} className="text-[#8C7355] hover:underline flex items-center gap-1 font-semibold cursor-pointer"><RefreshCw className="w-3 h-3"/>Resetovat filtry</button>}</div>
    {(filteredProducts.length>0||showGiftCard)?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{showGiftCard&&(!searchQuery.trim()||'dárková karta'.includes(searchQuery.toLowerCase().trim()))&&<GiftCardProduct/>}{filteredProducts.map(product=><ProductCard key={product.id} product={product}/>)}</div>:<div className="bg-white rounded-3xl p-12 text-center border border-[#E8DFC8] space-y-4 max-w-lg mx-auto"><div className="w-12 h-12 rounded-full bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center mx-auto"><Filter className="w-6 h-6"/></div><h3 className="font-editorial text-2xl font-bold text-[#2D2723]">Žádné produkty neodpovídají filtrům</h3><p className="text-xs text-[#7B6E63]">Zkuste změnit hledaný výraz nebo zvolit jinou kategorii.</p><button onClick={resetFilters} className="px-6 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-semibold rounded-full transition cursor-pointer">Zobrazit všechny produkty</button></div>}
  </div>;
};
