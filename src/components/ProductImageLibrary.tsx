import React, { useMemo, useState } from 'react';
import { Check, Image as ImageIcon, Search, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';

// Only real image files physically stored in the Git repository root.
// No Unsplash URLs, Firebase Storage, product data URLs, or other remote sources are included.
const bundledRootImages = import.meta.glob('/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

type Target = 'product-main' | 'product-gallery' | 'hero' | 'about' | 'custom-banner' | 'logo' | 'favicon' | 'gallery-item';

const TARGETS: Array<[Target, string]> = [
  ['product-main', 'Produkt – hlavní obrázek'],
  ['product-gallery', 'Produkt – galerie obrázků'],
  ['hero', 'Úvodní stránka – Hero'],
  ['about', 'Úvodní stránka – O nás'],
  ['custom-banner', 'Zakázková tvorba – banner'],
  ['logo', 'Logo webu'],
  ['favicon', 'Favicon'],
  ['gallery-item', 'Galerie – položka']
];

export const ProductImageLibrary: React.FC = () => {
  const { products, gallery, config, updateProductItem, updateConfigState, addGalleryItem, addToast } = useApp();
  const [target, setTarget] = useState<Target>('product-main');
  const [productId, setProductId] = useState('');
  const [galleryId, setGalleryId] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const library = useMemo(() => Object.entries(bundledRootImages)
    .map(([path, url]) => ({ path: path.replace(/^\//, ''), url }))
    .filter(item => /\.(jpe?g|png|webp)$/i.test(item.path))
    .sort((a, b) => a.path.localeCompare(b.path)), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? library.filter(item => item.path.toLowerCase().includes(q)) : library;
  }, [library, query]);

  const product = products.find(p => p.id === productId);
  const galleryItem = gallery.find(g => g.id === galleryId);

  const apply = async () => {
    if (!selected) return addToast('error', 'Vyberte obrázek', 'Nejdříve vyberte obrázek z knihovny.');
    setApplying(true);
    try {
      if (target === 'product-main') {
        if (!product) throw new Error('Vyberte produkt.');
        await updateProductItem(product.id, { imageUrl: selected });
      } else if (target === 'product-gallery') {
        if (!product) throw new Error('Vyberte produkt.');
        const next = product.gallery?.includes(selected) ? product.gallery : [...(product.gallery || []), selected];
        await updateProductItem(product.id, { gallery: next });
      } else if (target === 'hero') await updateConfigState({ hero: { ...config.hero, bgImageUrl: selected } });
      else if (target === 'about') await updateConfigState({ about: { ...config.about, imageUrl: selected } });
      else if (target === 'custom-banner') await updateConfigState({ customBanner: { ...config.customBanner, imageUrl: selected } });
      else if (target === 'logo') await updateConfigState({ logoImageUrl: selected });
      else if (target === 'favicon') await updateConfigState({ faviconUrl: selected });
      else {
        if (!galleryItem) throw new Error('Vyberte položku galerie.');
        await addGalleryItem({ ...galleryItem, imageUrl: selected });
      }
      addToast('success', 'Obrázek nastaven', `Použit byl soubor ${library.find(i => i.url === selected)?.path || selected}.`);
      setSelected(null);
    } catch (e: any) {
      addToast('error', 'Obrázek se nepodařilo nastavit', e?.message || 'Zkuste to prosím znovu.');
    } finally { setApplying(false); }
  };

  return <section className="rounded-3xl border border-[#e6ddd2] bg-white shadow-[0_12px_40px_rgba(74,55,40,.08)] overflow-hidden">
    <div className="p-5 sm:p-7 border-b border-[#eee6dd] bg-gradient-to-br from-[#fffaf4] to-[#f5eee6]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><div className="flex items-center gap-2 text-[#8C7355] text-xs font-black uppercase tracking-[0.18em]"><Sparkles className="w-4 h-4" /> Knihovna obrázků z GitHubu</div>
          <h2 className="mt-1 text-2xl font-bold text-[#2D2723]">Produktové obrázky</h2>
          <p className="mt-1 text-sm text-[#75685d] max-w-3xl">Zobrazují se pouze skutečné obrazové soubory uložené přímo v GitHub repozitáři. Žádné externí URL ani Firebase.</p></div>
        <div className="rounded-2xl bg-white border border-[#e6ddd2] px-4 py-3 text-xs font-bold text-[#5f5349]">{library.length} souborů</div>
      </div>
    </div>
    <div className="p-5 sm:p-7 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#e6ddd2] bg-[#fbf8f4] p-4 space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-[#6c5e53]">Kam obrázek použít?</label>
          <select value={target} onChange={e => setTarget(e.target.value as Target)} className="w-full rounded-xl border border-[#ded3c7] bg-white px-3 py-3 text-sm font-semibold text-[#2D2723]">{TARGETS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          {(target === 'product-main' || target === 'product-gallery') && <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full rounded-xl border border-[#ded3c7] bg-white px-3 py-3 text-sm"><option value="">Vyberte produkt…</option>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}
          {target === 'gallery-item' && <select value={galleryId} onChange={e => setGalleryId(e.target.value)} className="w-full rounded-xl border border-[#ded3c7] bg-white px-3 py-3 text-sm"><option value="">Vyberte položku galerie…</option>{gallery.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>}
        </div>
        <div className="rounded-2xl border border-[#d9c9b7] bg-[#2D2723] p-4 text-white">
          <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#d9c4a8] font-bold">Náhled</p><p className="text-sm font-bold mt-1">Vybraný obrázek</p></div>{selected && <button type="button" onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>}</div>
          <div className="mt-3 h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10">{selected ? <SafeImage src={selected} alt="Vybraný obrázek" className="w-full h-full object-contain" loading="eager" /> : <div className="h-full flex items-center justify-center text-white/45 text-xs">Klikněte na obrázek</div>}</div>
          <button type="button" disabled={!selected || applying} onClick={apply} className="mt-3 w-full rounded-xl bg-[#d8c0a0] text-[#2D2723] py-3 text-xs font-black disabled:opacity-40">{applying ? 'Ukládám…' : 'Použít vybraný obrázek'}</button>
        </div>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#998a7d]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Hledat soubor v GitHubu…" className="w-full rounded-xl border border-[#ded3c7] bg-[#fbf8f4] pl-10 pr-4 py-3 text-sm outline-none focus:border-[#8C7355]" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">{filtered.map(item => { const active = selected === item.url; return <button key={item.path} type="button" onClick={() => setSelected(item.url)} className={`group text-left rounded-2xl overflow-hidden border bg-white transition-all ${active ? 'border-[#8C7355] ring-2 ring-[#d8c0a0]' : 'border-[#e6ddd2] hover:border-[#c5ae94]'}`}><div className="relative aspect-square bg-[#f2eee8] overflow-hidden"><SafeImage src={item.url} alt={item.path} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />{active && <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-[#2D2723] text-white flex items-center justify-center"><Check className="w-4 h-4" /></span>}</div><div className="p-2.5"><p className="text-[10px] text-[#5f5349] line-clamp-2 break-all">{item.path}</p></div></button>; })}</div>
      {!filtered.length && <div className="text-center py-10 text-sm text-[#75685d]">V GitHubu nebyl nalezen žádný obrázkový soubor.</div>}
    </div>
  </section>;
};
