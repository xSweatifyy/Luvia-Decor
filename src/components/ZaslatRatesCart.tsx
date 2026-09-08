import React, { useEffect, useState } from 'react';
import { RefreshCw, Truck, MapPin, Home, Package } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Rate = { carrier: string; service?: string; service_id?: number; price?: { value?: number; currency?: string }; price_vat?: { value?: number; currency?: string }; pickup_date?: string; delivery_date?: string; pickup_branch?: boolean };
const CARRIERS = ['PPL','DPD','GLS','TOPTRANS','UPS','GLS-SK','LIFTAGO','FEDEX','WEDO','BALIKOVNA','ZASILKOVNA','SPS'];
const LABELS: Record<string, string> = { PPL:'PPL', DPD:'DPD', GLS:'GLS', TOPTRANS:'TOPTRANS', UPS:'UPS', 'GLS-SK':'GLS-SK', LIFTAGO:'grid.online', FEDEX:'FedEx', WEDO:'One By Allegro', BALIKOVNA:'Balíkovna', ZASILKOVNA:'Zásilkovna', SPS:'SPS' };

const RateCard: React.FC<{ rate: Rate }> = ({ rate }) => {
  const carrier = String(rate.carrier || '').trim().toUpperCase();
  const price = Number(rate.price_vat?.value ?? rate.price?.value ?? 0);
  const currency = String(rate.price_vat?.currency ?? rate.price?.currency ?? 'CZK');
  const pickup = Boolean(rate.pickup_branch);
  return <div className="rounded-2xl border border-[#E8E0D8] bg-white p-4 hover:border-[#C8B39B] transition">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#8C7355] shrink-0"/><b className="text-sm">{LABELS[carrier] || carrier}</b></div>
        <div className="text-xs text-[#5F554D] mt-1 truncate">{rate.service || 'Doručení'}</div>
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-[#817469]">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2 py-1">{pickup ? <MapPin className="w-3 h-3"/> : <Home className="w-3 h-3"/>}{pickup ? 'Výdejní místo / box' : 'Na adresu'}</span>
          {rate.service_id != null && <span className="rounded-lg bg-[#FAF7F2] px-2 py-1">ID služby {rate.service_id}</span>}
          {rate.delivery_date && <span className="rounded-lg bg-[#FAF7F2] px-2 py-1">Doručení {rate.delivery_date}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right"><div className="text-lg font-bold text-[#8C7355]">{price.toLocaleString('cs-CZ')} {currency}</div><div className="text-[10px] text-[#817469]">včetně DPH</div></div>
    </div>
  </div>;
};

const CountryRates: React.FC<{ country: 'CZ' | 'SK'; rates: Rate[]; loading: boolean; error: string }> = ({ country, rates, loading, error }) => {
  const sorted = [...rates].sort((a,b) => Number(a.price_vat?.value ?? a.price?.value ?? Infinity) - Number(b.price_vat?.value ?? b.price?.value ?? Infinity));
  const returnedCarriers = new Set(sorted.map(r => String(r.carrier || '').trim().toUpperCase()));
  return <div className="rounded-2xl border border-[#E8E0D8] bg-[#FCFAF7] p-4">
    <div className="flex items-center justify-between gap-3 mb-3"><div><div className="font-bold text-sm">{country === 'CZ' ? '🇨🇿 Česko' : '🇸🇰 Slovensko'}</div><div className="text-[10px] text-[#817469] mt-0.5">Zaslat API · balík 5 kg · 20 × 20 × 20 cm</div></div>{loading && <RefreshCw className="w-4 h-4 animate-spin text-[#8C7355]"/>}</div>
    {loading && !rates.length ? <div className="rounded-xl bg-white border border-[#E8E0D8] px-3 py-4 text-xs text-[#817469]">Načítám všechny aktuální nabídky…</div> : rates.length ? <div className="space-y-2">{sorted.map((rate, i) => <RateCard key={`${country}-${rate.carrier}-${rate.service_id ?? i}-${rate.service ?? ''}`} rate={rate}/>)}</div> : <div className="rounded-xl border border-dashed border-[#DED4C8] bg-[#FAF7F2] px-3 py-4 text-xs text-[#817469]">Zaslat API nevrátilo žádnou nabídku.</div>}
    {rates.length > 0 && <div className="mt-3 text-[10px] text-[#817469] flex items-center gap-1"><Package className="w-3 h-3"/> Vráceno API: {rates.length} nabídek · {returnedCarriers.size} dopravců</div>}
    {error && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] leading-5 text-amber-800">{error}</div>}
    {!loading && rates.length > 0 && CARRIERS.some(c => !returnedCarriers.has(c)) && <div className="mt-3 text-[10px] leading-5 text-[#817469]">Dopravci, které Zaslat API pro tuto trasu/účet nenabídlo: {CARRIERS.filter(c => !returnedCarriers.has(c)).map(c => LABELS[c]).join(', ')}.</div>}
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
        const response = await fetch('/api/orders?action=rates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromCountry:'CZ',toCountry:country,currency:'CZK',packages:[{weight:5,width:20,height:20,length:20}]})});
        const data = await response.json().catch(()=>null);
        if (!response.ok) throw new Error(data?.error || data?.message || 'Ceny dopravy se nepodařilo načíst.');
        return Array.isArray(data?.rates) ? data.rates.filter((r: Rate) => r?.carrier) : [];
      };
      const [cz,sk] = await Promise.all([request('CZ'),request('SK')]);
      setCzRates(cz); setSkRates(sk);
      if(!cz.length) setCzError('Zaslat API pro Česko nevrátilo cenu. Dostupné dopravce určuje cenová skupina a oprávnění API účtu.');
      if(!sk.length) setSkError('Zaslat API pro Slovensko nevrátilo cenu. Dostupné dopravce určuje cenová skupina a oprávnění API účtu.');
    } catch(e:any){ const message=e?.message||'Ceny dopravy se nepodařilo načíst.'; setCzRates([]);setSkRates([]);setCzError(message);setSkError(message);addToast('error','Zaslat API',message); } finally { setLoading(false); }
  };
  useEffect(()=>{loadRates();},[]);
  return <div className="mt-5 rounded-[1.75rem] border border-[#E3DACF] bg-white p-4 sm:p-5 shadow-sm"><div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#8C7355]"/><div><div className="text-xs font-bold uppercase tracking-wider text-[#5C5046]">Způsob doručení *</div><div className="text-[11px] text-[#817469] mt-0.5">Všechny nabídky a aktuální ceny ze Zaslat.cz pro balík 5 kg</div></div></div><button type="button" onClick={loadRates} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DACF] bg-[#FAF8F5] px-3 py-2 text-[11px] font-semibold text-[#5C5046] hover:bg-[#F3EEE8] disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/> Obnovit</button></div><div className="grid lg:grid-cols-2 gap-4"><CountryRates country="CZ" rates={czRates} loading={loading} error={czError}/><CountryRates country="SK" rates={skRates} loading={loading} error={skError}/></div><div className="mt-4 rounded-xl bg-[#FAF7F2] px-3 py-3 text-[10px] leading-5 text-[#817469]">Ceny se berou přímo z odpovědi Zaslat API a zobrazují cenu <b>včetně DPH</b>. API vrací pouze nabídky dostupné pro aktuální cenovou skupinu a povolené dopravce Vašeho účtu.</div></div>;
};
