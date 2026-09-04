import React, { useEffect, useState } from 'react';
import { Gift, Tag, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CartPromoCode: React.FC = () => {
  const { cartTotal, addToast } = useApp();
  const [code, setCode] = useState(() => localStorage.getItem('luvia_cart_promo') || '');
  const [applied, setApplied] = useState<{ code:string; type:string; value:number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (code) validate(code, false); }, []);

  async function validate(raw: string, notify = true) {
    const clean = raw.trim().toUpperCase();
    if (!clean) { clear(); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/coupons/validate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code: clean }) });
      const d = await r.json().catch(()=>null);
      if (!r.ok || !d?.valid) throw new Error(d?.error || 'Kód je neplatný nebo neaktivní.');
      const item = { code: d.code || clean, type: d.type || 'fixed', value: Number(d.value)||0 };
      setApplied(item); setCode(item.code); localStorage.setItem('luvia_cart_promo', item.code);
      if (notify) addToast('success', 'Kód uplatněn', item.type === 'percent' ? `Sleva ${item.value} % byla přidána.` : `Sleva ${item.value.toLocaleString('cs-CZ')} Kč byla přidána.`);
    } catch (e:any) {
      setApplied(null); localStorage.removeItem('luvia_cart_promo');
      if (notify) addToast('error', 'Neplatný kód', e?.message || 'Kód se nepodařilo ověřit.');
    } finally { setLoading(false); }
  }

  function clear() { setApplied(null); setCode(''); localStorage.removeItem('luvia_cart_promo'); }
  const discount = applied ? (applied.type === 'percent' ? Math.round(cartTotal * applied.value / 100) : Math.min(cartTotal, applied.value)) : 0;

  return <div className="rounded-[1.75rem] border border-[#E6DDD3] bg-white shadow-sm p-5 sm:p-7"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#FAF3E8] text-[#8C7355] flex items-center justify-center"><Gift className="w-5 h-5"/></div><div><h2 className="font-editorial text-xl font-bold">Sleva nebo dárkový poukaz</h2><p className="text-xs text-[#7B7067]">Zadejte slevový kód nebo kód dárkového poukazu.</p></div></div><div className="flex gap-2"><div className="relative flex-1"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7B58]"/><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();validate(code)}}} placeholder="SLEVOVÝ KÓD / DÁRKOVÝ POUKAZ" className="w-full rounded-2xl border border-[#E5DCD2] bg-[#FCFAF7] pl-10 pr-4 py-3.5 text-sm outline-none focus:border-[#9A7B58]"/></div><button type="button" disabled={loading||!code.trim()} onClick={()=>validate(code)} className="rounded-2xl bg-[#302923] text-white px-5 font-semibold text-sm disabled:opacity-50">{loading?'Ověřuji…':'Uplatnit'}</button></div>{applied&&<div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#F8F3EC] border border-[#E7DCCF] px-4 py-3"><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-600"/><span><b>{applied.code}</b> · sleva <b>{discount.toLocaleString('cs-CZ')} Kč</b></span></div><button type="button" onClick={clear} className="p-1.5 text-[#8B8178] hover:text-rose-600" aria-label="Zrušit slevu"><X className="w-4 h-4"/></button></div>}</div>;
};
