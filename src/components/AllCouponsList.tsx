import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Tag, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';
import { subscribeCoupons } from '../services/firestoreService';

export const AllCouponsList: React.FC = () => {
  const { adminUser } = useApp();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [firestoreCoupons, setFirestoreCoupons] = useState<Coupon[]>([]);

  const loadApiCoupons = useCallback(async () => {
    if (!adminUser || adminUser.role !== 'admin') return;
    setApiLoading(true);
    try {
      const regularRes = await fetch('/api/coupons');
      const regular = regularRes.ok ? await regularRes.json() : [];
      setCoupons(Array.isArray(regular) ? regular : []);
    } catch (error) {
      console.error('All coupons API load error:', error);
    } finally {
      setApiLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    loadApiCoupons();
    const timer = window.setInterval(loadApiCoupons, 5000);
    return () => window.clearInterval(timer);
  }, [loadApiCoupons]);

  useEffect(() => {
    if (!adminUser || adminUser.role !== 'admin') return;
    return subscribeCoupons(setFirestoreCoupons);
  }, [adminUser]);

  useEffect(() => {
    const all = [...coupons, ...firestoreCoupons];
    const unique = Array.from(new Map(all.map(coupon => [String(coupon.id || coupon.code).toLowerCase(), coupon])).values());
    unique.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setCoupons(prev => {
      // Keep API data separate from the merged view; the merged result is stored only for rendering below via state.
      return prev;
    });
    (window as any).__luviaAllCoupons = unique;
  }, [coupons, firestoreCoupons]);

  if (!adminUser || adminUser.role !== 'admin') return null;
  const allCoupons: Coupon[] = Array.isArray((window as any).__luviaAllCoupons) ? (window as any).__luviaAllCoupons : [...coupons, ...firestoreCoupons];
  const uniqueCoupons = Array.from(new Map(allCoupons.map(c => [String(c.id || c.code).toLowerCase(), c])).values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-editorial text-xl font-bold text-[#2D2723]">Všechny vytvořené slevové kódy</h2><p className="text-xs text-[#7B6E63] mt-1">Zobrazuje kódy z databáze API i původní Firestore databáze — včetně deaktivovaných a starších kódů.</p></div><button onClick={loadApiCoupons} disabled={apiLoading} className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E3DACF] text-[#8C7355]"><RefreshCw className={`w-4 h-4 ${apiLoading ? 'animate-spin' : ''}`} /></button></div>
      {uniqueCoupons.length === 0 ? <p className="text-xs text-stone-400 text-center py-6">Žádné vytvořené slevové kódy.</p> : <div className="space-y-2">{uniqueCoupons.map(coupon => <div key={`${coupon.id}-${coupon.code}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E8DFC8] bg-[#FAF8F5]"><div className="flex items-center gap-3 min-w-0"><div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${coupon.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>{coupon.type === 'shipping' ? <Truck className="w-4 h-4" /> : <Tag className="w-4 h-4" />}</div><div className="min-w-0"><p className="font-bold text-sm text-[#2D2723] truncate">{coupon.code}</p><p className="text-[11px] text-stone-500">{coupon.type === 'shipping' ? `Doprava zdarma · ${coupon.shippingScope === 'carrier' ? coupon.shippingCarrier : 'jakákoliv doprava'}` : coupon.type === 'percent' ? `Sleva ${coupon.value} %` : `Sleva ${Number(coupon.value).toLocaleString('cs-CZ')} Kč`}{' · '}{coupon.active !== false ? 'Aktivní' : 'Neaktivní'}</p></div></div><span className="text-[10px] text-stone-400 shrink-0">{coupon.type === 'shipping' ? 'Doprava' : 'Sleva'}</span></div>)}</div>}
    </div>
  </section>;
};
