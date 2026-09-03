import React, { useEffect, useRef, useState } from 'react';

type PacketaPoint = {
  id?: string | number;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
};

type Props = {
  onSelect: (point: PacketaPoint) => void;
};

const PACKETA_API_KEY = '3a3de6256b8299aa';
const SCRIPT_SRC = 'https://widget.packeta.com/v6/www/js/library.js';

export const PacketaPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if ((window as any).Packeta?.Widget) {
      setReady(true);
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      const handleLoad = () => setReady(true);
      existing.addEventListener('load', handleLoad, { once: true });
      return () => existing.removeEventListener('load', handleLoad);
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;

    const href = link.href || '';
    if (!href.includes('zasilkovna.cz/vydejni-mista')) return;

    event.preventDefault();
    event.stopPropagation();
    if (ready) setOpen(true);
  };

  document.addEventListener('click', handleDocumentClick, true);
  return () => document.removeEventListener('click', handleDocumentClick, true);
}, [ready]);

  useEffect(() => {
    if (!open || !ready || !mapContainerRef.current) return;

    const Packeta = (window as any).Packeta;
    const container = mapContainerRef.current;
    container.innerHTML = '';

    Packeta.Widget.pick(
      PACKETA_API_KEY,
      (point: PacketaPoint | null) => {
        if (point) {
          onSelect(point);
          setOpen(false);
        } else {
          setOpen(false);
        }
      },
      {
        country: 'cz',
        language: 'cs'
      },
      container
    );

    return () => {
      try {
        Packeta.Widget.close();
      } catch {}
      container.innerHTML = '';
    };
  }, [open, ready, onSelect]);

  const openPicker = () => {
    if (!ready) return;
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={!ready}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCCDB8] bg-[#FAF5EE] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#2D2723] transition hover:bg-[#F2ECE4] disabled:opacity-60 disabled:cursor-wait"
      >
        <span>{ready ? 'Vybrat výdejní místo na mapě' : 'Načítám mapu…'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-5xl h-[90vh] sm:h-[720px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#E8DFC8]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-[110] rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[#2D2723] shadow-md border border-[#E8DFC8] hover:bg-[#FAF5EE]"
            >
              Zavřít mapu
            </button>
            <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
          </div>
        </div>
      )}
    </>
  );
};
