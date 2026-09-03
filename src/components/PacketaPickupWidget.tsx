import React, { useEffect, useRef, useState } from 'react';

export type PacketaPoint = {
  id?: string | number;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
  nameStreet?: string;
  carrierId?: string;
  carrierPickupPointId?: string;
};

type Props = { onSelect: (point: PacketaPoint) => void };

const PACKETA_API_KEY = '3a3de6256b8299aa';
const SCRIPT_SRC = 'https://widget.packeta.com/v6/www/js/library.js';

function loadPacketaWidget(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).Packeta?.Widget?.pick) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).Packeta?.Widget?.pick) return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Packeta Widget se nepodařilo načíst.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Packeta Widget se nepodařilo načíst.'));
    document.head.appendChild(script);
  });
}

export const PacketaPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const openingRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadPacketaWidget()
      .then(() => active && setReady(true))
      .catch((err) => {
        console.error('Packeta Widget load error:', err);
        if (active) setError('Mapu se nepodařilo načíst. Zkuste to prosím znovu.');
      });
    return () => { active = false; };
  }, []);

  const closePicker = () => {
    try { (window as any).Packeta?.Widget?.close?.(); } catch {}
    openingRef.current = false;
    setOpen(false);
  };

  const openPicker = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setError('');

    try {
      await loadPacketaWidget();
      setReady(true);
      setOpen(true);
    } catch (err) {
      console.error('Unable to load Packeta Widget:', err);
      setError('Mapu se nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu.');
      openingRef.current = false;
    }
  };

  useEffect(() => {
    if (!open || !ready || !mapContainerRef.current) return;

    let cancelled = false;
    const openMap = async () => {
      try {
        await loadPacketaWidget();
        if (cancelled || !mapContainerRef.current) return;
        const widget = (window as any).Packeta?.Widget;
        if (!widget?.pick) throw new Error('Packeta Widget API není dostupné.');

        widget.pick(
          PACKETA_API_KEY,
          (point: PacketaPoint | null) => {
            openingRef.current = false;
            setOpen(false);
            if (point) onSelect(point);
          },
          {
            language: 'cs',
            vendors: [{ country: 'cz' }],
            webUrl: window.location.origin,
            appIdentity: 'luvia-decor'
          },
          mapContainerRef.current
        );
      } catch (err) {
        console.error('Unable to open Packeta map:', err);
        openingRef.current = false;
        setOpen(false);
        setError('Mapu se nepodařilo otevřít. Zkuste to prosím znovu.');
      }
    };

    const timer = window.setTimeout(openMap, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, ready, onSelect]);

  // Backwards compatibility: if an old Zásilkovna link is still rendered elsewhere
  // while this component is mounted, turn it into the real Packeta map action.
  useEffect(() => {
    if (!ready) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || !link.href.includes('zasilkovna.cz/vydejni-mista')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void openPicker();
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [ready]);

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={!ready || openingRef.current}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCCDB8] bg-[#FAF5EE] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#2D2723] transition hover:bg-[#F2ECE4] disabled:opacity-60 disabled:cursor-wait"
      >
        <span>{!ready ? 'Načítám mapu…' : 'Vybrat výdejní místo na mapě'}</span>
      </button>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-2 sm:p-5 flex items-center justify-center">
          <div className="relative w-full h-full max-w-6xl max-h-[94vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#E3DACF]">
            <button
              type="button"
              onClick={closePicker}
              aria-label="Zavřít mapu výdejních míst"
              className="absolute right-3 top-3 z-[10001] w-10 h-10 rounded-full bg-white/95 shadow-md border border-[#E3DACF] text-[#2D2723] text-xl leading-none hover:bg-[#FAF5EE]"
            >
              ×
            </button>
            <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />
          </div>
        </div>
      )}
    </>
  );
};
