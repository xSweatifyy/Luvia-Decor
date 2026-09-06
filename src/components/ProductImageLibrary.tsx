import React, { useMemo, useState } from 'react';
import { Check, Image as ImageIcon, Plus, Search, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { initialGallery, initialProducts, initialSiteConfig } from '../data/initialData';
import { Product, SiteConfig } from '../types';
import { SafeImage } from './SafeImage';

const bundledRootImages = import.meta.glob('/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

type Target =
  | 'product-main'
  | 'product-gallery'
  | 'hero'
  | 'about'
  | 'custom-banner'
  | 'logo'
  | 'favicon'
  | 'gallery-item';

interface LibraryImage {
  url: string;
  label: string;
  source: 'kód' | 'repo';
}

const unique = (values: Array<string | undefined | null>) =>
  [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];

export const ProductImageLibrary: React.FC = () => {
  const {
    products,
    gallery,
    config,
    updateProductItem,
    updateConfigState,
    addGalleryItem,
    addToast
  } = useApp();

  const [target, setTarget] = useState<Target>('product-main');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [query, setQuery] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const library = useMemo<LibraryImage[]>(() => {
    const codeUrls = unique([
      initialSiteConfig.logoImageUrl,
      initialSiteConfig.faviconUrl,
      initialSiteConfig.hero?.bgImageUrl,
      initialSiteConfig.about?.imageUrl,
      initialSiteConfig.customBanner?.imageUrl,
      ...initialProducts.flatMap(p => [p.imageUrl, ...(p.gallery || [])]),
      ...initialGallery.map(item => item.imageUrl),
      config.logoImageUrl,
      config.faviconUrl,
      config.hero?.bgImageUrl,
      config.about?.imageUrl,
      config.customBanner?.imageUrl,
      ...products.flatMap(p => [p.imageUrl, ...(p.gallery || [])]),
      ...gallery.map(item => item.imageUrl)
    ]);

    const repoUrls = Object.entries(bundledRootImages).map(([path, url]) => ({
      url,
      label: path.replace(/^\//, ''),
      source: 'repo' as const
    }));

    const codeImages = codeUrls.map(url => ({
      url,
      label: url.startsWith('/') ? url.slice(1) : url,
      source: 'kód' as const
    }));

    const seen = new Set<string>();
    return [...repoUrls, ...codeImages].filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [config, products, gallery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return library;
    return library.filter(item => item.label.toLowerCase().includes(q) || item.url.toLowerCase().includes(q));
  }, [library, query]);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedGallery = gallery.find(item => item.id === selectedGalleryId);

  const applyImage = async () => {
    if (!selectedUrl) {
      addToast('error', 'Vyberte obrázek', 'Nejdříve vyberte obrázek z knihovny.');
      return;
    }

    setApplying(true);
    try {
      if (target === 'product-main') {
        if (!selectedProduct) throw new Error('Vyberte produkt.');
        await updateProductItem(selectedProduct.id, { imageUrl: selectedUrl });
        addToast('success', 'Obrázek nastaven', `Hlavní obrázek produktu „${selectedProduct.title}“ byl změněn.`);
      } else if (target === 'product-gallery') {
        if (!selectedProduct) throw new Error('Vyberte produkt.');
        const current = selectedProduct.gallery || [];
        const nextGallery = current.includes(selectedUrl) ? current : [...current, selectedUrl];
        await updateProductItem(selectedProduct.id, { gallery: nextGallery });
        addToast('success', 'Obrázek přidán', `Obrázek byl přidán do galerie produktu „${selectedProduct.title}“.`);
      } else if (target === 'hero') {
        await updateConfigState({ hero: { ...config.hero, bgImageUrl: selectedUrl } });
        addToast('success', 'Hero obrázek nastaven', 'Nový obrázek se používá na úvodní stránce.');
      } else if (target === 'about') {
        await updateConfigState({ about: { ...config.about, imageUrl: selectedUrl } });
        addToast('success', 'Obrázek nastaven', 'Obrázek sekce O nás byl změněn.');
      } else if (target === 'custom-banner') {
        await updateConfigState({ customBanner: { ...config.customBanner, imageUrl: selectedUrl } });
        addToast('success', 'Obrázek nastaven', 'Obrázek zakázkové tvorby byl změněn.');
      } else if (target === 'logo') {
        await updateConfigState({ logoImageUrl: selectedUrl });
        addToast('success', 'Logo nastaveno', 'Logo obrázek byl nastaven.');
      } else if (target === 'favicon') {
        await updateConfigState({ faviconUrl: selectedUrl });
        addToast('success', 'Favicon nastaven', 'Favicon byl nastaven.');
      } else if (target === 'gallery-item') {
        if (!selectedGallery) throw new Error('Vyberte položku galerie.');
        await addGalleryItem({ ...selectedGallery, imageUrl: selectedUrl });
        addToast('success', 'Obrázek nastaven', `Obrázek galerie „${selectedGallery.title}“ byl změněn.`);
      }
      setSelectedUrl(null);
    } catch (error: any) {
      addToast('error', 'Obrázek se nepodařilo nastavit', error?.message || 'Zkuste to prosím znovu.');
    } finally {
      setApplying(false);
    }
  };

  const currentTargetPreview = useMemo(() => {
    if (target === 'product-main') return selectedProduct?.imageUrl;
    if (target === 'product-gallery') return selectedProduct?.gallery?.[0];
    if (target === 'hero') return config.hero.bgImageUrl;
    if (target === 'about') return config.about.imageUrl;
    if (target === 'custom-banner') return config.customBanner.imageUrl;
    if (target === 'logo') return config.logoImageUrl;
    if (target === 'favicon') return config.faviconUrl;
    return selectedGallery?.imageUrl;
  }, [target, selectedProduct, selectedGallery, config]);

  const targetOptions: Array<[Target, string]> = [
    ['product-main', 'Produkt – hlavní obrázek'],
    ['product-gallery', 'Produkt – galerie obrázků'],
    ['hero', 'Úvodní stránka – Hero'],
    ['about', 'Úvodní stránka – O nás'],
    ['custom-banner', 'Zakázková tvorba – banner'],
    ['logo', 'Logo webu'],
    ['favicon', 'Favicon'],
    ['gallery-item', 'Galerie – položka']
  ];

  return (
    <section className="rounded-3xl border border-[#e6ddd2] bg-white shadow-[0_12px_40px_rgba(74,55,40,.08)] overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-[#eee6dd] bg-gradient-to-br from-[#fffaf4] to-[#f5eee6]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#8C7355] text-xs font-black uppercase tracking-[0.18em]">
              <Sparkles className="w-4 h-4" />
              Centrální knihovna obrázků
            </div>
            <h2 className="mt-1 text-2xl font-bold text-[#2D2723]">Produktové obrázky</h2>
            <p className="mt-1 text-sm text-[#75685d] max-w-3xl">
              Knihovna automaticky sbírá obrázky přímo z kódu a z aktuálních produktů, galerie a nastavení webu. Před použitím vždy vidíte náhled.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#e6ddd2] px-4 py-3 text-xs font-bold text-[#5f5349]">
            {library.length} dostupných obrázků
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
          <div className="rounded-2xl border border-[#e6ddd2] bg-[#fbf8f4] p-4 space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-[#6c5e53]">Kam obrázek použít?</label>
            <select value={target} onChange={e => setTarget(e.target.value as Target)} className="w-full rounded-xl border border-[#ded3c7] bg-white px-3 py-3 text-sm font-semibold text-[#2D2723]">
              {targetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>

            {(target === 'product-main' || target === 'product-gallery') && (
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full rounded-xl border border-[#ded3c7] bg-white px-3 py-3 text-sm text-[#2D2723]">
                <option value="">Vyberte produkt…</option>
                {products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}
              </select>
            )}

            {target === 'gallery-item' && (
              <select value={selectedGalleryId} onChange={e => setSelectedGalleryId(e.target.value)} className="w-full rounded-xl border border-[#ded3c7] bg-white px-3 py-3 text-sm text-[#2D2723]">
                <option value="">Vyberte položku galerie…</option>
                {gallery.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            )}

            <div className="flex gap-3 items-center">
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-[#ded3c7] bg-white shrink-0">
                {currentTargetPreview ? <SafeImage src={currentTargetPreview} alt="Aktuální obrázek" className="w-full h-full object-cover" loading="eager" /> : <div className="w-full h-full flex items-center justify-center text-[#9b8d80]"><ImageIcon className="w-7 h-7" /></div>}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider font-black text-[#8C7355]">Aktuální obrázek</p>
                <p className="text-xs text-[#75685d] break-all mt-1 line-clamp-3">{currentTargetPreview || 'Zatím není nastaven.'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d9c9b7] bg-[#2D2723] p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#d9c4a8] font-bold">Vybraný obrázek</p>
                <p className="text-sm font-bold mt-1">Náhled před použitím</p>
              </div>
              {selectedUrl && <button type="button" onClick={() => setSelectedUrl(null)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Zrušit výběr"><X className="w-4 h-4" /></button>}
            </div>
            <div className="mt-3 h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              {selectedUrl ? <SafeImage src={selectedUrl} alt="Vybraný obrázek" className="w-full h-full object-contain" loading="eager" /> : <div className="h-full flex items-center justify-center text-white/45 text-xs">Klikněte na obrázek v knihovně</div>}
            </div>
            <button type="button" disabled={!selectedUrl || applying} onClick={applyImage} className="mt-3 w-full rounded-xl bg-[#d8c0a0] text-[#2D2723] py-3 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ead8bf] transition">
              {applying ? 'Ukládám…' : 'Použít vybraný obrázek'}
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#998a7d]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Hledat podle názvu nebo URL…" className="w-full rounded-xl border border-[#ded3c7] bg-[#fbf8f4] pl-10 pr-4 py-3 text-sm outline-none focus:border-[#8C7355]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {filtered.map(item => {
            const active = selectedUrl === item.url;
            return (
              <button key={`${item.source}-${item.url}`} type="button" onClick={() => setSelectedUrl(item.url)} className={`group text-left rounded-2xl overflow-hidden border bg-white transition-all ${active ? 'border-[#8C7355] ring-2 ring-[#d8c0a0]' : 'border-[#e6ddd2] hover:border-[#c5ae94] hover:-translate-y-0.5'}`}>
                <div className="relative aspect-square bg-[#f2eee8] overflow-hidden">
                  <SafeImage src={item.url} alt={item.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  {active && <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-[#2D2723] text-white flex items-center justify-center"><Check className="w-4 h-4" /></span>}
                  <span className="absolute left-2 bottom-2 rounded-md bg-black/60 text-white px-1.5 py-1 text-[9px] font-bold">{item.source}</span>
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] text-[#5f5349] line-clamp-2 break-all">{item.label}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#8C7355]"><Plus className="w-3 h-3" /> Vybrat</span>
                </div>
              </button>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="py-14 text-center text-sm text-[#75685d]">Žádný obrázek neodpovídá hledání.</div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-5xl max-h-[90vh] bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-3 flex items-center justify-between border-b">
              <span className="text-xs font-bold text-[#2D2723] break-all">Náhled obrázku</span>
              <button type="button" onClick={() => setPreviewUrl(null)} className="p-2 rounded-lg hover:bg-[#f5efe8]"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 max-h-[80vh] flex items-center justify-center"><SafeImage src={previewUrl} alt="Velký náhled" className="max-w-full max-h-[75vh] object-contain" loading="eager" /></div>
          </div>
        </div>
      )}
    </section>
  );
};
