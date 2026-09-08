import React, { useEffect, useState } from 'react';
import { Gift, Tag, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

type AppliedPromo = { code: string; type: string; value: number; categoryIds: string[]; giftVoucher?: boolean };
const normalizeCategory = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const savePromo = (promo: AppliedPromo | null) => { try { if (promo) localStorage.setItem('luvia_cart_promo_data', JSON.stringify(promo)); else localStorage.removeItem('luvia_cart_promo_data'); } catch {} window.dispatchEvent(new Event('luvia-promo-changed')); };

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

  useEffect(() => {
    const updateDeliveryNoteLabel = () => {
      document.querySelectorAll('label').forEach(label => {
        if ((label.textContent || '').trim().startsWith('Poznámka')) label.childNodes[0].textContent = 'Poznámka k doručení ';
      });
    };
    updateDeliveryNoteLabel();
    const observer = new MutationObserver(updateDeliveryNoteLabel);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (code && !applied) validate(code, false); }, []);

  async function validate(raw: string, notify = true) {
    const clean = raw.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!clean) { clear(); return; }
    setLoading(true);
    try {
      const items = cart.map(i => ({ category: i.product.category || '', quantity: Number(i.quantity) || 0, price: Number(i.product.price) || 0 }));
      let d: any = null;
      let r = await fetch(`/api/coupons?action=validate&code=${encodeURIComponent(clean)}&_=${Date.now()}`, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
      d = await r.json().catch(() => null);
      if (!r.ok || d?.valid !== true) {
        const fallback = await fetch('/api/coupons?action=validate', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ code: clean }) });
        const fallbackData = await fallback.json().catch(() => null);
        if (fallback.ok && fallbackData?.valid === true) { r = fallback; d = fallbackData; }
      }
      if (!r.ok || d?.valid !== true) throw new Error(d?.error || 'Slevový kód nebo dárkový poukaz nebyl nalezen, je neaktivní nebo vypršel.');
      const item: AppliedPromo = { code: String(d.code || clean).trim().toUpperCase(), type: d.type === 'percent' ? 'percent' : 'fixed', value: Number(d.value) || 0, categoryIds: Array.isArray(d.categoryIds) ? d.categoryIds.map(String) : [], giftVoucher: Boolean(d.giftVoucher) };
      if (item.value <= 0) throw new Error('Tento kód nemá žádnou využitelnou hodnotu.');
      const allowed = new Set(item.categoryIds.map(normalizeCategory).filter(Boolean));
      if (allowed.size && !items.some(i => allowed.has(normalizeCategory(i.category)))) throw new Error('Tento slevový kód nelze použít na žádný produkt v košíku.');
      setApplied(item); setCode(item.code); localStorage.setItem('luvia_cart_promo', item.code); savePromo(item);
      if (notify) addToast('success', 'Kód uplatněn', item.type === 'percent' ? `Sleva ${item.value} % byla přidána.` : `Sleva ${item.value.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč byla přidána.`);
    } catch (e: any) {
      setApplied(null); localStorage.removeItem('luvia_cart_promo'); savePromo(null);
      if (notify) addToast('error', 'Kód se nepodařilo použít', e?.message || 'Kód se nepodařilo ověřit.');
    } finally { setLoading(false); }
  }

  function clear() { setApplied(null); setCode(''); localStorage.removeItem('luvia_cart_promo'); savePromo(null); }
  const categorySet = new Set((applied?.categoryIds || []).map(normalizeCategory).filter(Boolean));
  const eligibleTotal = applied && categorySet.size ? cart.reduce((sum, item) => categorySet.has(normalizeCategory(item.product.category)) ? sum + Number(item.product.price || 0) * Math.max(0, Number(item.quantity) || 0) : sum, 0) : cart.reduce((sum, item) => sum + Number(item.product.price || 0) * Math.max(0, Number(item.quantity) || 0), 0);
  const discount = applied ? (applied.type === 'percent' ? Math.round(eligibleTotal * applied.value / 100) : Math.min(eligibleTotal, applied.value)) : 0;

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><div className="rounded-[1.75rem] border border-[#E6DDD3] bg-white shadow-sm p-5 sm:p-7"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#FAF3E8] text-[#8C7355] flex items-center justify-center"><Gift className="w-5 h-5"/></div><div><h2 className="font-editorial text-xl font-bold">Slevový kód / dárkový poukaz</h2></div></div></div></div>;
};
