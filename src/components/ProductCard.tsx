import React from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Eye, Sparkles } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, setQuickViewProduct, categories } = useApp();

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-white rounded-2xl overflow-hidden border border-[#EBE3D8] hover:border-[#D1C2B0] transition-all duration-300 hover:shadow-xl flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#FAF6F0]">
        <SafeImage
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${
              product.badge === 'Bestseller'
                ? 'bg-[#2D2723] text-[#FAF8F5]'
                : product.badge === 'Novinka'
                ? 'bg-[#8C7355] text-white'
                : product.badge === 'Limitovaná edice'
                ? 'bg-[#A35D43] text-white'
                : 'bg-[#FAF5EE] text-[#5A4B3A] border border-[#E3DACF]'
            }`}>
              <Sparkles className="w-3 h-3" />
              {product.badge}
            </span>
          </div>
        )}

        {/* Quick View overlay button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
          <button
            onClick={() => setQuickViewProduct(product)}
            className="px-4 py-2 bg-white/95 text-[#2D2723] hover:bg-white text-xs font-semibold rounded-full shadow-md flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Rychlý náhled
          </button>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#8C7355] font-medium uppercase tracking-wider mb-1.5">
            <span>
              {categories.find(category => category.id === product.category)?.name || product.category}
            </span>
            {product.inStock ? (
              <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Skladem
              </span>
            ) : (
              <span className="text-rose-700 text-[11px] font-semibold">Není skladem</span>
            )}
          </div>

          <h3
            onClick={() => setQuickViewProduct(product)}
            className="font-editorial text-lg sm:text-xl font-bold text-[#2D2723] hover:text-[#8C7355] transition line-clamp-2 cursor-pointer leading-snug"
          >
            {product.title}
          </h3>

          <p className="text-xs text-[#7B6E63] mt-2 line-clamp-2 leading-relaxed">
            {product.shortDescription || product.description}
          </p>
        </div>

        {/* Price & Add to Cart button */}
        <div className="mt-5 pt-4 border-t border-[#F2ECE4] flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#2D2723]">
                {product.isPriceFrom ? `${product.pricePrefix || 'Od'} ` : ''}
                {product.price.toLocaleString('cs-CZ')} Kč
              </span>
              {product.compareAtPrice && (
                <span className="text-xs text-stone-400 line-through">
                  {product.compareAtPrice.toLocaleString('cs-CZ')} Kč
                </span>
              )}
            </div>
            {product.estimatedDelivery && (
              <span className="text-[10px] text-stone-500 block">
                {product.estimatedDelivery}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={!product.inStock}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:hover:bg-stone-300"
            title={product.inStock ? 'Přidat do košíku' : 'Produkt není skladem'}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Do košíku</span>
          </button>
        </div>
      </div>
    </div>
  );
};
