import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Tag, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';
import { subscribeCoupons } from '../services/firestoreService';

export const AllCouponsList: React.FC = () => {
  const { adminUser } = useApp();
  const [apiCoupons, setApiCoupons] = useState<Coupon[]>([]);
  const [firestoreCoupons, setFirestoreCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  const loadApiCoupons = useCallback(async () => {
    if (!adminUser || adminUser.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await fetch('/api/coupons');
      const data = res.ok ? await res.json() : [];
      setApiCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('All coupons API load error:', error);
    } finally {
      setLoading(false);
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

  const allCoupons = useMemo(() => {
    const unique = new Map<string, Coupon>();
    [...firestoreCoupons, ...apiCoupons].forEach(coupon => {
      const key = String(coupon.id || coupon.code).trim().toLowerCase();
      if (key && !unique.has(key)) unique.set(key, coupon);
    });
    return Array.from(unique.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [apiCoupons, firestoreCoupons]);

  if (!adminUser || adminUser.role !== 'admin') return null;

  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-editorial text-xl font-bold text-[#2D2723]">Všechny vytvořené slevové kódy</h2><p className="text-xs text-[#7B6E63] mt-1">Úplný přehled kódů z API i Firestore, včetně deaktivovaných a starších kódů.</p></div><button onClick={loadApiCoupons} disabled={loading} className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E3DACF] text-[#8C7355]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      {allCoupons.length === 0 ? <p className="text-xs text-stone-400 text-center py-6">Žádné vytvořené slevové kódy.</p> : <div className="space-y-2">{allCoupons.map(coupon => <div key={`${coupon.id}-${coupon.code}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E8DFC8] bg-[#FAF8F5]"><div className="flex items-center gap-3 min-w-0"><div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${coupon.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>{coupon.type === 'shipping' ? <Truck className="w-4 h-4" /> : <Tag className="w-4 h-4" />}</div><div className="min-w-0"><p className="font-bold text-sm text-[#2D2723] truncate">{coupon.code}</p><p className="text-[11px] text-stone-500">{coupon.type === 'shipping' ? `Doprava zdarma · ${coupon.shippingScope === 'carrier' ? coupon.shippingCarrier : 'jakákoliv doprava'}` : coupon.type === 'percent' ? `Sleva ${coupon.value} %` : `Sleva ${Number(coupon.value).toLocaleString('cs-CZ')} Kč`}{' · '}{coupon.active !== false ? 'Aktivní' : 'Neaktivní'}</p></div></div><span className="text-[10px] text-stone-400 shrink-0">{coupon.type === 'shipping' ? 'Doprava' : 'Sleva'}</span></div>)}</div>}
    </div>
  </section>;
};
