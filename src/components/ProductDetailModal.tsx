import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShoppingBag, Check, Sparkles, Truck, Shield, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafeImage } from './SafeImage';

export const ProductDetailModal: React.FC = () => {
  const { quickViewProduct, setQuickViewProduct, addToCart, setPage } = useApp();
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [customNote, setCustomNote] = useState('');

  if (!quickViewProduct) return null;

  const images = quickViewProduct.gallery && quickViewProduct.gallery.length > 0
    ? quickViewProduct.gallery
    : [quickViewProduct.imageUrl];

  const currentActiveImg = selectedImg || images[0];

  const handleAddToCart = () => {
    addToCart(quickViewProduct, quantity, customNote || undefined);
    setQuickViewProduct(null);
    setQuantity(1);
    setCustomNote('');
  };

  const handleCustomOrderInquiry = () => {
    setQuickViewProduct(null);
    setPage('custom-order');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setQuickViewProduct(null)}
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E3DACF] z-10 p-6 sm:p-8"
        >
          {/* Close button */}
          <button
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-[#FAF5EE] text-[#2D2723] hover:bg-[#F2ECE4] transition cursor-pointer z-10"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Gallery / Image Column */}
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#FAF6F0] border border-[#EBE3D8]">
                <SafeImage
                  src={currentActiveImg}
                  alt={quickViewProduct.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImg(img)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                        currentActiveImg === img ? 'border-[#8C7355] ring-2 ring-[#8C7355]/20' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <SafeImage src={img} alt={`Náhled ${idx + 1}`} className="w-full h-full" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info Column */}
            <div className="flex flex-col justify-between space-y-6">
              <div>
                {/* Category & Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#8C7355]">
                    Luvia Decor Ateliér
                  </span>
                  {quickViewProduct.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2ECE4] text-[#5A4B3A]">
                      {quickViewProduct.badge}
                    </span>
                  )}
                </div>

                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] leading-tight">
                  {quickViewProduct.title}
                </h2>

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-[#2D2723]">
                    {quickViewProduct.isPriceFrom ? `${quickViewProduct.pricePrefix || 'Od'} ` : ''}
                    {quickViewProduct.price.toLocaleString('cs-CZ')} Kč
                  </span>
                  {quickViewProduct.compareAtPrice && (
                    <span className="text-sm text-stone-400 line-through">
                      {quickViewProduct.compareAtPrice.toLocaleString('cs-CZ')} Kč
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-[#5C5046] mt-4 leading-relaxed">
                  {quickViewProduct.description}
                </p>

                {/* Details list */}
                {quickViewProduct.details && quickViewProduct.details.length > 0 && (
                  <div className="mt-4 bg-[#FAF8F5] p-4 rounded-xl border border-[#EDE5DA] text-xs text-[#5C5046] space-y-1.5">
                    <p className="font-bold text-[#2D2723] uppercase tracking-wider text-[11px]">Parametry & specifikace:</p>
                    {quickViewProduct.details.map((det, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
                        <span>{det}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Note input */}
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-[#5C5046] mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#8C7355]" />
                    Poznámka k výrobku (nepovinné, např. barva stuhy):
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Např. prosím o lněnou stuhu v odstínu ivory..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E3DACF] bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30 focus:border-[#8C7355]"
                  />
                </div>
              </div>

              {/* Quantity and Actions */}
              <div className="space-y-4 pt-4 border-t border-[#F0EAE1]">
                <div className="flex items-center gap-4">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-[#E3DACF] rounded-xl bg-[#FAF8F5] p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg hover:bg-[#EBE2D7] text-sm font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-[#2D2723]">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg hover:bg-[#EBE2D7] text-sm font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!quickViewProduct.inStock}
                    className="flex-1 py-3.5 px-6 bg-[#2D2723] hover:bg-[#8C7355] text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:hover:bg-stone-300"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {quickViewProduct.inStock
                      ? `Vložit do košíku (${(quickViewProduct.price * quantity).toLocaleString('cs-CZ')} Kč)`
                      : 'Není skladem'}
                  </button>
                </div>

                {/* Value props */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#7B6E63]">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Doručení: Kroměříž a okolí & odběr v ateliéru</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>100% ruční autorská práce</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
