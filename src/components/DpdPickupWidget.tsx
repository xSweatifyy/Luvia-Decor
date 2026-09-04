import React, { useEffect, useState } from 'react';
import { PacketaPickupWidget } from './PacketaPickupWidget';

export type DpdPoint = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  zip?: string;
  [key: string]: unknown;
};

type Carrier = 'DPD' | 'Zásilkovna';
type Props = { onSelect: (point: DpdPoint) => void; initialCarrier?: Carrier };

const DPD_WIDGET_URL = 'https://api.dpd.cz/widget/latest/index.html?countries=CZ&hideCloseButton=true';

export const DpdPickupWidget: React.FC<Props> = ({ onSelect, initialCarrier }) => {
  const [carrier, setCarrier] = useState<Carrier | null>(initialCarrier ?? null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (initialCarrier) setCarrier(initialCarrier);
  }, [initialCarrier]);

  useEffect(() => {
    if (carrier !== 'DPD') return;

    const handler = (event: MessageEvent) => {
      const data = event.data?.dpdWidget;
      if (!data || event.origin !== 'https://api.dpd.cz') return;

      const raw = data.pickupPointResult;
      const source = data.pickupPoint || data.parcelShop || raw;
      if (!source) return;

      let point: DpdPoint = {};
      if (typeof source === 'string') {
        try { point = JSON.parse(source); } catch { point = { id: source }; }
      } else if (typeof source === 'object') {
        point = source as DpdPoint;
      }

      setOpen(false);
      onSelect(point);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [carrier, onSelect]);

  const chooseCarrier = (nextCarrier: Carrier) => setCarrier(nextCarrier);

  if (!open) return null;

  if (!carrier) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8DFC8] shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8C7355]">Výdejní místo</p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] mt-2">Vyberte dopravce</h2>
            <p className="text-sm text-[#7B6E63] mt-2">Nejprve zvolte, přes kterou službu chcete zásilku vyzvednout.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => chooseCarrier('DPD')} className="p-5 rounded-2xl border border-[#E3DACF] bg-[#FAF8F5] hover:border-[#8C7355] hover:bg-[#FAF5EE] transition text-left">
              <div className="text-base font-bold text-[#2D2723]">DPD</div>
              <div className="text-xs text-[#817469] mt-1">DPD Pickup</div>
            </button>
            <button type="button" onClick={() => chooseCarrier('Zásilkovna')} className="p-5 rounded-2xl border border-[#E3DACF] bg-[#FAF8F5] hover:border-[#8C7355] hover:bg-[#FAF5EE] transition text-left">
              <div className="text-base font-bold text-[#2D2723]">Zásilkovna</div>
              <div className="text-xs text-[#817469] mt-1">Výdejní místa Zásilkovny</div>
            </button>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="w-full mt-4 py-2.5 text-xs font-semibold text-[#7B6E63] hover:text-[#2D2723] transition">Zrušit</button>
        </div>
      </div>
    );
  }

  if (carrier === 'Zásilkovna') {
    return (
      <>
        <PacketaPickupWidget onSelect={(point) => { setOpen(false); onSelect({ ...point, carrier: 'Zásilkovna' }); }} />
        {!initialCarrier && <button type="button" onClick={() => setCarrier(null)} className="fixed left-4 bottom-4 z-[220] px-4 py-2.5 rounded-xl bg-white border border-[#E3DACF] shadow-lg text-xs font-bold text-[#2D2723]">← Změnit dopravce</button>}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white">
      <div className="absolute top-4 left-4 z-[210]">
        {!initialCarrier && <button type="button" onClick={() => setCarrier(null)} className="px-4 py-2.5 rounded-xl bg-white/95 border border-[#E3DACF] shadow-lg text-xs font-bold text-[#2D2723]">← Změnit dopravce</button>}
      </div>
      <iframe
        title="DPD výdejní místa"
        src={DPD_WIDGET_URL}
        className="w-full h-full border-0"
        allow="geolocation"
      />
    </div>
  );
};
