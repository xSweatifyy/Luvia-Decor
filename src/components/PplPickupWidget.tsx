import React, { useEffect, useRef, useState } from 'react';

export type PplPoint = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  zip?: string;
  [key: string]: unknown;
};

type Props = { onSelect: (point: PplPoint) => void };
const PPL_LOADER = 'https://www.ppl.cz/accesspointwidget/loader.js';
const PPL_MAP_URL = 'https://www.ppl.cz/mapa-vydejnich-mist';

export const PplPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const apiKey = String((import.meta as any).env?.VITE_PPL_API_KEY || '').trim();

  useEffect(() => {
    if (!apiKey || !hostRef.current) return;
    let cancelled = false;
    let widget: HTMLElement | null = null;
    const setup = () => {
      if (cancelled || !hostRef.current) return;
      widget = document.createElement('ppl-access-point-widget');
      widget.setAttribute('api-key', apiKey);
      widget.setAttribute('config', JSON.stringify({ viewMode: 'inline', language: 'cs', country: 'CZ' }));
      const onSelectEvent = (event: Event) => {
        const point = (event as CustomEvent).detail;
        if (point) onSelect(point as PplPoint);
      };
      const onReady = () => setReady(true);
      widget.addEventListener('ppl-accesspointwidget-select', onSelectEvent);
      widget.addEventListener('ppl-accesspointwidget-ready', onReady);
      hostRef.current.replaceChildren(widget);
    };
    const existing = document.querySelector(`script[src="${PPL_LOADER}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (customElements.get('ppl-access-point-widget')) setup();
      else existing.addEventListener('load', setup, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = PPL_LOADER;
      script.async = true;
      script.addEventListener('load', setup, { once: true });
      document.head.appendChild(script);
    }
    return () => { cancelled = true; widget?.remove(); };
  }, [apiKey, onSelect]);

  if (!apiKey) return (
    <div className="rounded-2xl border border-[#E5DCD2] bg-[#FCFAF7] overflow-hidden">
      <div className="p-4 border-b border-[#E5DCD2]">
        <p className="font-semibold text-[#302923]">PPL výdejní místa</p>
        <p className="text-xs text-[#7B7067] mt-1">PPL mapa potřebuje API klíč PPL. Přidejte ho do Vercelu jako <b>VITE_PPL_API_KEY</b>.</p>
      </div>
      <iframe title="PPL mapa výdejních míst" src={PPL_MAP_URL} className="w-full h-[520px] border-0" loading="lazy" allow="geolocation" />
      <div className="p-3 border-t border-[#E5DCD2] text-center"><a href={PPL_MAP_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#806746] hover:underline">Otevřít mapu PPL v novém okně</a></div>
    </div>
  );

  return <div className="rounded-2xl overflow-hidden border border-[#E5DCD2] bg-white"><div ref={hostRef} className="w-full h-[560px] min-h-[420px]" aria-label="PPL výdejní místa" />{!ready && <div className="p-3 text-center text-xs text-[#7B7067]">Načítám PPL mapu výdejních míst…</div>}</div>;
};
