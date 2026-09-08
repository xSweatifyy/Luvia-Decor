import React, { useEffect, useState } from 'react';
import { RefreshCw, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Rate = { carrier: string; service?: string; service_id?: number; price?: { value?: number; currency?: string }; price_vat?: { value?: number; currency?: string } };
const CARRIERS = ['PPL','DPD','GLS','TOPTRANS','UPS','GLS-SK','LIFTAGO','FEDEX','WEDO','BALIKOVNA','ZASILKOVNA','SPS'];
const LABELS: Record<string, string> = { PPL:'PPL', DPD:'DPD', GLS:'GLS', TOPTRANS:'TOPTRANS', UPS:'UPS', 'GLS-SK':'GLS-SK', LIFTAGO:'grid.online', FEDEX:'FedEx', WEDO:'One By Allegro', BALIKOVNA:'Balíkovna', ZASILKOVNA:'Zásilkovna', SPS:'SPS' };

const PackageRates: React.FC<{ country: 'CZ' | 'SK'; rates: Rate[]; loading: boolean; error: string }> = ({ country, rates, loading, error }) => {
  const grouped = new Map<string, Rate>();
  for (const rate of rates) {
    const carrier = String(rate.carrier || '').trim().toUpperCase();
    if (!carrier) continue;
    const current = Number(rate.price_vat?.value ?? rate.price?.value ?? Number.POSITIVE_INFINITY);
    const previous = grouped.get(carrier);
    const previousPrice = previous ? Number(previous.price_vat?.value ?? previous.price?.value ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    if (!previous || current < previousPrice) grouped.set(carrier, rate);
  }

  return <div className="rounded-2xl border border-[#E8E0D8] bg-[#FCFAF7] p-4">
    <div className="flex items-center justify-between gap-3 mb-3"><div><div className="font-bold text-sm">{country === 'CZ' ? '🇨🇿 Česko' : '🇸🇰 Slovensko'}</div><div className="text-[10px] text-[#817469] mt-0.5">Zaslat.cz · zásilka 5 kg · ceny včetně DPH</div></div>{loading && <RefreshCw className="w-4 h-4 animate-spin text-[#8C7355]" />}</div>
    {loading && !rates.length ? <div className="rounded-xl bg-white border border-[#E8E0D8] px-3 py-3 text-xs text-[#817469]">Načítám ceny dopravy…</div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{CARRIERS.map(carrier => { const rate = grouped.get(carrier); const price = rate ? Number(rate.price_vat?.value ?? rate.price?.value ?? 0) : 0; return <div key={`${country}-${carrier}`} className={`rounded-xl border px-3 py-3 ${rate ? 'border-[#E8E0D8] bg-white' : 'border-dashed border-[#DED4C8] bg-[#FAF7F2]'}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-bold text-[#302923] truncate">{LABELS[carrier] || carrier}</div><div className="text-[10px] text-[#817469] mt-0.5 truncate">{rate?.service || (rate ? 'Doručení' : 'Nabídka není dostupná')}</div></div><div className={`shrink-0 text-sm font-bold ${rate ? 'text-[#8C7355]' : 'text-[#A79C91]'}`}>{rate ? `${price.toLocaleString('cs-CZ')} Kč` : '—'}</div></div></div>; })}</div>}
    {error && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] leading-5 text-amber-800">{error}</div>}
  </div>;
};

export const ZaslatRatesCart: React.FC = () => {
  const { addToast } = useApp();
  const [czRates, setCzRates] = useState<Rate[]>([]); const [skRates, setSkRates] = useState<Rate[]>([]);
  const [czError, setCzError] = useState(''); const [skError, setSkError] = useState(''); const [loading, setLoading] = useState(false);
  const loadRates = async () => {
    setLoading(true); setCzError(''); setSkError('');
    try {
      const request = async (country: 'CZ' | 'SK') => {
        const response = await fetch('/api/orders?action=rates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromCountry:'CZ',toCountry:country,packages:[{weight:5,width:20,height:20,length:20}]})});
        const data = await response.json().catch(()=>null);
        if (!response.ok) throw new Error(data?.error || data?.message || 'Ceny dopravy se nepodařilo načíst.');
        return Array.isArray(data?.rates) ? data.rates.filter((r: Rate) => r?.carrier) : [];
      };
      const [cz,sk] = await Promise.all([request('CZ'),request('SK')]); setCzRates(cz); setSkRates(sk);
      if(!cz.length) setCzError('Zaslat API pro Česko nevrátilo cenu. Dopravci jsou zobrazeni výše, ale bez ceny nelze jejich dopravu zvolit.');
      if(!sk.length) setSkError('Zaslat API pro Slovensko nevrátilo cenu. Dopravci jsou zobrazeni výše, ale bez ceny nelze jejich dopravu zvolit.');
    } catch(e:any){ const message=e?.message||'Ceny dopravy se nepodařilo načíst.'; setCzRates([]);setSkRates([]);setCzError(message);setSkError(message);addToast('error','Zaslat API',message); } finally { setLoading(false); }
  };
  useEffect(()=>{loadRates();},[]);
  return <div className="mt-5 rounded-[1.75rem] border border-[#E3DACF] bg-white p-4 sm:p-5 shadow-sm"><div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#8C7355]"/><div><div className="text-xs font-bold uppercase tracking-wider text-[#5C5046]">Doprava podle země</div><div className="text-[11px] text-[#817469] mt-0.5">Aktuální ceny ze Zaslat.cz pro balík 5 kg</div></div></div><button type="button" onClick={loadRates} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DACF] bg-[#FAF8F5] px-3 py-2 text-[11px] font-semibold text-[#5C5046] hover:bg-[#F3EEE8] disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/> Obnovit</button></div><div className="grid lg:grid-cols-2 gap-4"><PackageRates country="CZ" rates={czRates} loading={loading} error={czError}/><PackageRates country="SK" rates={skRates} loading={loading} error={skError}/></div></div>;
};
