import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Tag, Trash2, Check, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';
import { deleteCouponFromFirestore, saveCouponToFirestore, subscribeCoupons } from '../services/firestoreService';

export const CouponManager: React.FC = () => {
  const { adminUser, categories, addToast } = useApp();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories]);

  const load = async () => {
    if (adminUser?.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await fetch('/api/coupons', { cache: 'no-store' });
      if (!res.ok) throw new Error('Slevové kódy se nepodařilo načíst.');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCoupons(data.map((item: Coupon) => ({ ...item, categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds : [] })));
      }
    } catch (error: any) {
      addToast('error', 'Slevové kódy', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser?.role !== 'admin') return;
    load();
    return subscribeCoupons((items) => {
      if (Array.isArray(items)) {
        setCoupons(items.map(item => ({ ...item, categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds : [] })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  const toggleCategory = (id: string) => {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const createCoupon = async () => {
    const cleanCode = code.trim().toUpperCase();
    const numericValue = Number(value);
    if (!cleanCode || !numericValue || numericValue <= 0) {
      addToast('error', 'Chybí údaje', 'Zadejte kód a kladnou hodnotu slevy.');
      return;
    }
    if (type === 'percent' && numericValue > 100) {
      addToast('error', 'Neplatná hodnota', 'Procentní sleva může být nejvýše 100 %.');
      return;
    }

    try {
      const createdAt = new Date().toISOString();
      const localCoupon: Coupon = {
        id: `cup-${Date.now()}`,
        code: cleanCode,
        type,
        value: numericValue,
        active: true,
        createdAt,
        categoryIds: [...categoryIds]
      };

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, type, value: numericValue, active: true, categoryIds: [...categoryIds], adminUser })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Slevový kód se nepodařilo uložit.');

      try {
        await saveCouponToFirestore({ ...localCoupon, id: data?.id || localCoupon.id });
      } catch (firestoreError) {
        console.warn('Coupon Firestore sync notice:', firestoreError);
      }

      setCode('');
      setValue('');
      setCategoryIds([]);
      await load();
      addToast('success', 'Slevový kód vytvořen', categoryIds.length ? `${cleanCode} platí pro vybrané kategorie.` : `${cleanCode} platí pro celý sortiment.`);
    } catch (error: any) {
      addToast('error', 'Slevový kód', error.message);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active, adminUser })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Stav kódu se nepodařilo změnit.');
      await saveCouponToFirestore({ ...coupon, active: !coupon.active });
      setCoupons(prev => prev.map(item => item.id === coupon.id ? { ...item, active: !item.active } : item));
    } catch (error: any) {
      addToast('error', 'Slevový kód', error.message);
    }
  };

  const remove = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUser })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Kód se nepodařilo smazat.');
      try { await deleteCouponFromFirestore(coupon.id); } catch {}
      setCoupons(prev => prev.filter(item => item.id !== coupon.id));
      addToast('info', 'Slevový kód smazán', coupon.code);
    } catch (error: any) {
      addToast('error', 'Slevový kód', error.message);
    }
  };

  if (adminUser?.role !== 'admin') return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-[#F2ECE4] pb-4">
          <div>
            <div className="flex items-center gap-2 text-[#8C7355] text-[10px] font-bold uppercase tracking-[0.18em]">
              <Tag className="w-4 h-4" />
              Pokročilý systém slev
            </div>
            <h2 className="font-editorial text-2xl font-bold text-[#2D2723] mt-1">Slevové kódy podle kategorií</h2>
            <p className="text-xs text-[#7B6E63] mt-1">Vytvořte slevu v % nebo Kč a určete, zda platí pro celý sortiment, nebo jen pro jednu či více kategorií.</p>
          </div>
          <button type="button" onClick={load} className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E3DACF] text-[#8C7355] hover:bg-[#F2ECE4] cursor-pointer" title="Obnovit">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#E3DACF] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7355]">Vytvořit nový kód</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Kód *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="NAPŘ. LUVIA10" className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs uppercase font-bold tracking-wide" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Typ slevy</label>
              <select value={type} onChange={e => setType(e.target.value as 'percent' | 'fixed')} className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs">
                <option value="percent">Procenta (%)</option>
                <option value="fixed">Pevná částka (Kč)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Hodnota *</label>
              <input type="number" min={1} max={type === 'percent' ? 100 : undefined} value={value} onChange={e => setValue(e.target.value)} placeholder={type === 'percent' ? '10' : '500'} className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={createCoupon} className="w-full px-3 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" />Vytvořit</button>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-[#8C7355]" />
              <span className="text-xs font-bold text-[#2D2723]">Kde má kód platit?</span>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E3DACF] bg-white cursor-pointer w-fit">
              <input type="checkbox" checked={categoryIds.length === 0} onChange={() => setCategoryIds([])} className="accent-[#8C7355]" />
              <span className="text-xs font-semibold">Celý sortiment / všechny kategorie</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {categories.map(category => (
                <label key={category.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${categoryIds.includes(category.id) ? 'border-[#C5A880] bg-[#FAF5EE]' : 'border-[#E3DACF] bg-white'}`}>
                  <input type="checkbox" checked={categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} className="accent-[#8C7355]" />
                  <span className="text-xs font-medium text-[#5C5046]">{category.name}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-[#8C7355] mt-2">Když není vybraná žádná konkrétní kategorie, kód platí na vše. Můžete vybrat více kategorií současně.</p>
          </div>
        </div>

        <div className="space-y-2">
          {coupons.length === 0 ? <p className="text-xs text-stone-400 text-center py-6">Zatím nebyl vytvořen žádný kód.</p> : coupons.map(coupon => (
            <div key={coupon.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl border border-[#E8DFC8] bg-[#FAFAF8]">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}><Tag className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-[#2D2723] text-sm">{coupon.code}</p>
                  <p className="text-[11px] text-stone-500">{coupon.type === 'percent' ? `Sleva ${coupon.value} %` : `Sleva ${coupon.value.toLocaleString('cs-CZ')} Kč`} · {coupon.active ? 'Aktivní' : 'Neaktivní'}</p>
                  <p className="text-[11px] text-[#8C7355] mt-0.5">{coupon.categoryIds?.length ? `Kategorie: ${coupon.categoryIds.map(id => categoryMap.get(id) || id).join(', ')}` : 'Platí na celý sortiment'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => toggleActive(coupon)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${coupon.active ? 'bg-white text-[#5C5046] border-[#E3DACF]' : 'bg-emerald-600 text-white border-emerald-600'}`}>{coupon.active ? 'Deaktivovat' : 'Aktivovat'}</button>
                <button type="button" onClick={() => remove(coupon)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="Smazat"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-2"><Check className="w-3.5 h-3.5 text-emerald-600" />Sleva se znovu ověřuje na serveru při odeslání objednávky, takže ji nelze obejít úpravou ceny v prohlížeči.</div>
      </div>
    </section>
  );
};
