import React, { useEffect, useState } from 'react';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ((window as any).Packeta?.Widget) {
      setReady(true);
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => setReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.head.appendChild(script);
  }, []);

  const openPicker = () => {
    const Packeta = (window as any).Packeta;
    if (!Packeta?.Widget) return;
    setLoading(true);
    Packeta.Widget.pick(
      PACKETA_API_KEY,
      (point: PacketaPoint | null) => {
        setLoading(false);
        if (point) onSelect(point);
      },
      { country: 'cz', language: 'cs' }
    );
  };

  return (
    <button
      type="button"
      onClick={openPicker}
      disabled={!ready || loading}
      className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCCDB8] bg-[#FAF5EE] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#2D2723] transition hover:bg-[#F2ECE4] disabled:opacity-60 disabled:cursor-wait"
    >
      <span>{loading ? 'Načítám mapu…' : ready ? 'Vybrat výdejní místo na mapě' : 'Načítám mapu…'}</span>
    </button>
  );
};
