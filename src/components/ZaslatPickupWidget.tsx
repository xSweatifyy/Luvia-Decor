import React, { useEffect, useState } from 'react';

declare global { interface Window { zslt?: { openMap: (options: any) => Promise<any> } } }

type Props = { carrier: string; country: 'cz' | 'sk'; onSelect: (point: any) => void };

const mapCarrier: Record<string,string> = { DPD:'dpd', GLS:'gls', PPL:'ppl', ZASILKOVNA:'zasilkovna', BALIKOVNA:'balikovna' };

export const ZaslatPickupWidget: React.FC<Props> = ({ carrier, country, onSelect }) => {
  const [ready, setReady] = useState(Boolean(window.zslt));
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (window.zslt) { setReady(true); return; }
    const existing = document.getElementById('zaslat-map');
    if (existing) { existing.addEventListener('load', () => setReady(true), { once:true }); return; }
    const script = document.createElement('script');
    script.id = 'zaslat-map';
    script.async = true;
    script.src = 'https://app.zaslat.cz/map/zaslat-map.umd.min.js';
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  const open = async () => {
    if (!ready || !window.zslt) return;
    setOpening(true);
    try {
      const point = await window.zslt.openMap({ addressType:'recipient', territory:country, carriers:[mapCarrier[carrier] || carrier.toLowerCase()], lang:'cz', value:null, style:{ colorPrimary:'#000' } });
      if (point) onSelect(point);
    } finally { setOpening(false); }
  };

  return <button type="button" onClick={open} disabled={!ready || opening} className="w-full rounded-2xl border border-[#DCCFC0] bg-[#FBF6EF] px-4 py-3.5 text-sm font-semibold text-[#5F4A36] disabled:opacity-60">{opening ? 'Načítám mapu…' : ready ? 'Otevřít mapu výdejních míst' : 'Načítám mapu…'}</button>;
};
