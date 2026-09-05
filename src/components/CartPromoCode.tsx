import React, { useEffect, useState } from 'react';
import { Gift, Tag, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

type AppliedPromo = { code: string; type: string; value: number; categoryIds: string[]; giftVoucher?: boolean };

const normalizeCategory = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const savePromo = (promo: AppliedPromo | null) => {
  try { if (promo) localStorage.setItem('luvia_cart_promo_data', JSON.stringify(promo)); else localStorage.removeItem('luvia_cart_promo_data'); } catch {}
  window.dispatchEvent(new Event('luvia-promo-changed'));
};

export const CartPromoCode: React.FC = () => {
  const { cart, addToast } = useApp();
  const [code, setCode] = useState(() => localStorage.getItem('luvia_cart_promo') || '');
  const [applied, setApplied] = useState<AppliedPromo | null>(() => { try { const raw = localStorage.getItem('luvia_cart_promo_data'); const p = raw ? JSON.parse(raw) : null; return p ? { ...p, categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds.map(String) : [] } : null; } catch { return null; } });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/orders') && init?.method?.toUpperCase() === 'POST') {
        const promoCode = localStorage.getItem('luvia_cart_promo');
        if (promoCode) { try { const body = JSON.parse(String(init.body || '{}')); body.couponCode = promoCode; init = { ...init, body: JSON.stringify(body) }; } catch {} }
      }
      return originalFetch(input, init);
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  useEffect(() => { if (code && !applied) validate(code, false); }, []);

  async function validate(raw: string, notify = true) {
    const clean = raw.trim().toUpperCase(); if (!clean) { clear(); return; }
    setLoading(true);
    try {
      const items = cart.map(i => ({ category: i.product.category || '', quantity: Number(i.quantity) || 0, price: Number(i.product.price) || 0 }));
      const r = await fetch('/api/coupons/validate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code: clean, items }) });
      const d = await r.json().catch(()=>null);
      if (!r.ok || !d?.valid) throw new Error(d?.error || 'Kód je neplatný nebo neaktivní.');
      const item: AppliedPromo = { code: d.code || clean, type: d.type || 'fixed', value: Number(d.value)||0, categoryIds: Array.isArray(d.categoryIds) ? d.categoryIds.map(String) : [], giftVoucher: Boolean(d.giftVoucher) };
      setApplied(item); setCode(item.code); localStorage.setItem('luvia_cart_promo', item.code); savePromo(item);
      if (notify) addToast('success', 'Kód uplatněn', item.type === 'percent' ? `Sleva ${item.value} % byla přidána.` : `Sleva ${item.value.toLocaleString('cs-CZ')} Kč byla přidána.`);
    } catch (e:any) { setApplied(null); localStorage.removeItem('luvia_cart_promo'); savePromo(null); if (notify) addToast('error', 'Neplatný kód', e?.message || 'Kód se nepodařilo ověřit.'); }
    finally { setLoading(false); }
  }

  function clear() { setApplied(null); setCode(''); localStorage.removeItem('luvia_cart_promo'); savePromo(null); }
  const categorySet = new Set((applied?.categoryIds || []).map(normalizeCategory).filter(Boolean));
  const eligibleTotal = applied && categorySet.size ? cart.reduce((sum, item) => categorySet.has(normalizeCategory(item.product.category)) ? sum + Number(item.product.price || 0) * Math.max(0, Number(item.quantity) || 0) : sum, 0) : cart.reduce((sum, item) => sum + Number(item.product.price || 0) * Math.max(0, Number(item.quantity) || 0), 0);
  const discount = applied ? (applied.type === 'percent' ? Math.round(eligibleTotal * applied.value / 100) : Math.min(eligibleTotal, applied.value)) : 0;

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><div className="rounded-[1.75rem] border border-[#E6DDD3] bg-white shadow-sm p-5 sm:p-7"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#FAF3E8] text-[#8C7355] flex items-center justify-center"><Gift className="w-5 h-5"/></div><div><h2 className="font-editorial text-xl font-bold">Sleva nebo dárkový poukaz</h2><p className="text-xs text-[#7B7067]">Zadejte slevový kód nebo kód dárkového poukazu.</p></div></div><div className="flex gap-2"><div className="relative flex-1"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7B58]"/><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();validate(code)}}} placeholder="SLEVOVÝ KÓD / DÁRKOVÝ POUKAZ" className="w-full rounded-2xl border border-[#E5DCD2] bg-[#FCFAF7] pl-10 pr-4 py-3.5 text-sm outline-none focus:border-[#9A7B58]"/></div><button type="button" disabled={loading||!code.trim()} onClick={()=>validate(code)} className="rounded-2xl bg-[#302923] text-white px-5 font-semibold text-sm disabled:opacity-50">{loading?'Ověřuji…':'Uplatnit'}</button></div>{applied&&<div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#F8F3EC] border border-[#E7DCCF] px-4 py-3"><div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-600"/><span><b>{applied.code}</b> · sleva <b>{discount.toLocaleString('cs-CZ')} Kč</b>{categorySet.size ? ' · pouze vybrané kategorie' : ''}</span></div><button type="button" onClick={clear} className="p-1.5 text-[#8B8178] hover:text-rose-600" aria-label="Zrušit slevu"><X className="w-4 h-4"/></button></div>}</div></div>;
};
