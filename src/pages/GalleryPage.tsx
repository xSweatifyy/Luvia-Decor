import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GalleryItem } from '../types';
import { X, ZoomIn, Sparkles, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../components/SafeImage';

export const GalleryPage: React.FC = () => {
  const { gallery, setPage } = useApp();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  const categories = ['all', 'Věnce', 'Svatby', 'Interiér', 'Doplňky', 'Květiny'];

  const filteredGallery = selectedFilter === 'all'
    ? gallery
    : gallery.filter(g => g.category.toLowerCase() === selectedFilter.toLowerCase());

  return (
    <div id="gallery-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8C7355]">
          Lookbook & Inspirace
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#2D2723]">
          Galerie našich děl a realizací
        </h1>
        <p className="text-sm text-[#7B6E63] leading-relaxed">
          Prohlédněte si ukázky ručně vázaných věnců, svatebních aranžmá a dekorací vytvořených pro naše spokojené klienty.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center items-center gap-2 flex-wrap">
        {categories.map(cat => {
          const isSelected = selectedFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition cursor-pointer ${
                isSelected
                  ? 'bg-[#2D2723] text-white shadow-sm'
                  : 'bg-[#FAF6F0] text-[#5C4F44] hover:bg-[#F2ECE4] border border-[#E8DFC8]'
              }`}
            >
              {cat === 'all' ? 'Všechny realizace' : cat}
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGallery.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(item)}
            className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#FAF5EE] border border-[#E8DFC8] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <SafeImage
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end text-white">
              <span className="text-[10px] uppercase tracking-widest text-[#E3D1BA] font-bold">
                {item.category}
              </span>
              <h3 className="font-editorial text-xl font-bold mt-1">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-stone-300 mt-1 line-clamp-2">{item.description}</p>
              )}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#E3D1BA] font-semibold">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Klikněte pro zvětšení</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setActiveItem(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-[#1F1B18] rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 text-white"
            >
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition z-20 cursor-pointer"
                aria-label="Zavřít"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-2 aspect-[4/3] md:aspect-auto max-h-[75vh]">
                  <SafeImage
                    src={activeItem.imageUrl}
                    alt={activeItem.title}
                    className="w-full h-full"
                    loading="eager"
                  />
                </div>

                <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#C5A880]">
                      {activeItem.category} • Ateliér Kroměříž
                    </span>
                    <h2 className="font-editorial text-2xl font-bold mt-2 text-[#FAF6F0]">
                      {activeItem.title}
                    </h2>
                    <p className="text-xs text-[#C7BCB0] mt-3 leading-relaxed">
                      {activeItem.description || "Ručně tvořené floristické dílo z našeho ateliéru Luvia Decor."}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <button
                      onClick={() => {
                        setActiveItem(null);
                        setPage('custom-order');
                      }}
                      className="w-full py-3 bg-[#C5A880] hover:bg-[#B3936B] text-[#1E1915] text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Poptat podobnou dekoraci na míru
                    </button>
                    <button
                      onClick={() => {
                        setActiveItem(null);
                        setPage('catalog');
                      }}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 text-[#FAF6F0] text-xs font-semibold uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Prohlédnout e-shop
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
