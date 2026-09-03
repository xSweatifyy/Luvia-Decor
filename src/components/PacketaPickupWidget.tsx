import React, { useEffect, useState } from 'react';

type PacketaPoint = { id?: string | number; name?: string; street?: string; city?: string; zip?: string; nameStreet?: string; carrierId?: string; carrierPickupPointId?: string };
type Props = { onSelect: (point: PacketaPoint) => void };

const PACKETA_API_KEY = '3a3de6256b8299aa';
const SCRIPT_SRC = 'https://widget.packeta.com/v6/www/js/library.js';

function loadPacketaWidget(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).Packeta?.Widget?.pick) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadPacketaWidget().then(() => active && setReady(true)).catch(console.error).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const openPicker = async () => {
    try {
      setLoading(true);
      await loadPacketaWidget();
      const widget = (window as any).Packeta?.Widget;
      if (!widget?.pick) throw new Error('Packeta Widget API není dostupné.');
      widget.pick(
        PACKETA_API_KEY,
        (point: PacketaPoint | null) => { if (point) onSelect(point); },
        { language: 'cs', vendors: [{ country: 'cz' }] }
      );
    } catch (error) {
      console.error('Unable to open Packeta Widget:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={openPicker} disabled={!ready || loading}
      className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCCDB8] bg-[#FAF5EE] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#2D2723] transition hover:bg-[#F2ECE4] disabled:opacity-60 disabled:cursor-wait">
      <span>{loading ? 'Načítám mapu…' : 'Vybrat výdejní místo na mapě'}</span>
    </button>
  );
};
