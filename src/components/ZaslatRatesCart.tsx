import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Rate = {
  carrier: string;
  service?: string;
  service_id?: number;
  price?: { value?: number; currency?: string };
  price_vat?: { value?: number; currency?: string };
};

const LABELS: Record<string, string> = {
  PPL: 'PPL',
  DPD: 'DPD',
  GLS: 'GLS',
  TOPTRANS: 'TOPTRANS',
  UPS: 'UPS',
  'GLS-SK': 'GLS-SK',
  LIFTAGO: 'grid.online',
  FEDEX: 'FedEx',
  WEDO: 'One By Allegro',
  BALIKOVNA: 'Balíkovna',
  ZASILKOVNA: 'Zásilkovna',
  SPS: 'SPS'
};

export const ZaslatRatesCart: React.FC = () => {
  const { addToast } = useApp();
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orders?action=rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCountry: 'CZ',
          toCountry: 'CZ',
          packages: [{ weight: 5, width: 20, height: 20, length: 20 }]
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || 'Ceny dopravy se nepodařilo načíst.');
      const incoming = Array.isArray(data?.rates) ? data.rates : [];
      setRates(incoming.filter((rate: Rate) => rate?.carrier));
      if (!incoming.length) setError('Zaslat.cz momentálně nevrátilo žádnou nabídku pro zásilku 5 kg.');
    } catch (e: any) {
      const message = e?.message || 'Ceny dopravy se nepodařilo načíst.';
      setError(message);
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const groupedRates = useMemo(() => {
    const map = new Map<string, Rate>();
    for (const rate of rates) {
      const carrier = String(rate.carrier || '').toUpperCase();
      const existing = map.get(carrier);
      const currentPrice = Number(rate.price_vat?.value ?? rate.price?.value ?? Number.POSITIVE_INFINITY);
      const existingPrice = existing ? Number(existing.price_vat?.value ?? existing.price?.value ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      if (!existing || currentPrice < existingPrice) map.set(carrier, rate);
    }
    return Array.from(map.values());
  }, [rates]);

  return (
    <div className="mt-5 rounded-2xl border border-[#E3DACF] bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#8C7355]" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#5C5046]">Aktuální ceny dopravy</div>
            <div className="text-[11px] text-[#817469] mt-0.5">Zaslat.cz · balík 5 kg · ceny včetně DPH</div>
          </div>
        </div>
        <button type="button" onClick={loadRates} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DACF] bg-[#FAF8F5] px-3 py-2 text-[11px] font-semibold text-[#5C5046] hover:bg-[#F3EEE8] disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Obnovit
        </button>
      </div>

      {loading && !rates.length ? (
        <div className="mt-4 rounded-xl bg-[#FAF8F5] px-3 py-3 text-xs text-[#817469]">Načítám aktuální ceny dopravy…</div>
      ) : groupedRates.length ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {groupedRates.map((rate) => {
            const carrier = String(rate.carrier || '').toUpperCase();
            const price = Number(rate.price_vat?.value ?? rate.price?.value ?? 0);
            return (
              <div key={`${carrier}-${rate.service_id || rate.service || 'rate'}`} className="rounded-xl border border-[#E8E0D8] bg-[#FCFAF7] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#302923] truncate">{LABELS[carrier] || carrier}</div>
                    <div className="text-[10px] text-[#817469] mt-0.5 truncate">{rate.service || 'Doručení'}</div>
                  </div>
                  <div className="shrink-0 text-sm font-bold text-[#8C7355]">{price.toLocaleString('cs-CZ')} Kč</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] leading-5 text-amber-800">{error || 'Ceny dopravy se zatím nepodařilo načíst.'}</div>
      )}
    </div>
  );
};
