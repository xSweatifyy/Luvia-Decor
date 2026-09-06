import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { SafeImage } from './SafeImage';

// Central image library: only real image files bundled with the repository.
const bundledImages = import.meta.glob('/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

type ImageItem = { url: string; label: string };

export const ProductImageLibraryBridge: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const library = useMemo<ImageItem[]>(() => Object.entries(bundledImages)
    .map(([path, url]) => ({ url, label: path.replace(/^\//, '') }))
    .filter(item => /\.(jpe?g|png|webp)$/i.test(item.label))
    .sort((a, b) => a.label.localeCompare(b.label)), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? library.filter(item => item.label.toLowerCase().includes(q)) : library;
  }, [library, query]);

  useEffect(() => {
    const hideElement = (element: HTMLElement | null) => {
      if (!element) return;
      element.style.display = 'none';
      element.setAttribute('aria-hidden', 'true');
    };

    const hideManualUrlField = (found: HTMLInputElement) => {
      found.required = false;
      found.removeAttribute('required');

      // Hide the complete manual URL field, including its explanatory text.
      let container: HTMLElement | null = found.parentElement;
      for (let i = 0; i < 5 && container?.parentElement; i++) {
        const text = (container.textContent || '').toLowerCase();
        if (text.includes('url obrázku') || text.includes('obrázek') || text.includes('images.unsplash.com')) {
          const buttons = container.querySelectorAll('button');
          const hasLibraryButton = Array.from(buttons).some(btn => btn.hasAttribute('data-luvia-image-library-button'));
          if (!hasLibraryButton) hideElement(container);
        }
        container = container.parentElement;
      }

      hideElement(found);
      const parent = found.parentElement;
      if (parent) {
        Array.from(parent.querySelectorAll('label')).forEach(label => hideElement(label));
      }
      let previous = found.previousElementSibling;
      while (previous) {
        if (previous.tagName === 'LABEL') hideElement(previous as HTMLElement);
        previous = previous.previousElementSibling;
      }

      // Remove/hide old sample URL choices and Firebase upload controls so the
      // product editor offers only the central repository image library.
      const root = found.parentElement?.parentElement?.parentElement?.parentElement;
      if (root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        const candidates: HTMLElement[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) candidates.push(node as HTMLElement);
        candidates.forEach(el => {
          const text = (el.textContent || '').trim().toLowerCase();
          if (text === 'nahrát do firebase' || text.includes('ukládají pouze jako veřejné https url')) {
            hideElement(el.closest('div') as HTMLElement || el);
          }
        });
      }
    };

    const findImageInput = () => {
      const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
      return inputs.find(el =>
        el.placeholder?.includes('images.unsplash.com') && el.offsetParent !== null
      ) || inputs.find(el => el.placeholder?.toLowerCase().includes('url obrázku') && el.offsetParent !== null) || null;
    };

    const update = () => {
      const found = findImageInput();
      setInput(found);
      if (found) hideManualUrlField(found);
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const interval = window.setInterval(update, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!input) return;
    const parent = input.parentElement;
    if (!parent || parent.querySelector('[data-luvia-image-library-button]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.luviaImageLibraryButton = 'true';
    button.className = 'w-full mt-2 px-3 py-2.5 rounded-xl bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2';
    button.innerHTML = '<span>▣</span> Vybrat z knihovny produktových obrázků';
    button.onclick = () => {
      setSelected(null);
      setQuery('');
      setOpen(true);
    };
    parent.appendChild(button);

    return () => button.remove();
  }, [input]);

  const apply = () => {
    if (!selected || !input) return;

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, selected);
    input.required = false;
    input.removeAttribute('required');
    input.setCustomValidity('');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-[#E8DFC8] flex flex-col">
        <div className="p-5 border-b border-[#eee6dd] bg-gradient-to-br from-[#fffaf4] to-[#f5eee6] flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[#8C7355]">Luvia Decor</div>
            <h3 className="text-xl font-bold text-[#2D2723]">Knihovna produktových obrázků</h3>
            <p className="text-xs text-[#75685d] mt-1">Vyberte obrázek z centrální knihovny Luvia Decor.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl bg-white hover:bg-[#efe7dc]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Hledat obrázek v knihovně…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#ded3c7] bg-[#fbf8f4] text-sm outline-none focus:border-[#8C7355]"
            />
          </div>

          {selected && (
            <div className="mb-4 rounded-2xl border border-[#d9c9b7] bg-[#2D2723] p-3 text-white flex gap-3 items-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0">
                <SafeImage src={selected} alt="Vybraný obrázek" className="w-full h-full object-contain" loading="eager" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-[#d9c4a8] font-bold">Vybraný obrázek</div>
                <div className="text-xs break-all mt-1 text-white/70">{library.find(i => i.url === selected)?.label || selected}</div>
              </div>
              <button type="button" onClick={apply} className="shrink-0 px-4 py-2.5 rounded-xl bg-[#d8c0a0] text-[#2D2723] text-xs font-black">Použít obrázek</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {filtered.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelected(item.url)}
                className={`text-left rounded-2xl overflow-hidden border bg-white ${selected === item.url ? 'border-[#8C7355] ring-2 ring-[#d8c0a0]' : 'border-[#e6ddd2]'}`}
              >
                <div className="aspect-square bg-[#f2eee8] relative">
                  <SafeImage src={item.url} alt={item.label} className="w-full h-full object-cover" loading="lazy" />
                  {selected === item.url && (
                    <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-[#2D2723] text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <div className="p-2 text-[9px] text-[#5f5349] line-clamp-2 break-all">{item.label}</div>
              </button>
            ))}
          </div>

          {!filtered.length && (
            <div className="py-12 text-center text-sm text-stone-500">V knihovně nebyl nalezen žádný obrázkový soubor.</div>
          )}
        </div>
      </div>
    </div>
  );
};
