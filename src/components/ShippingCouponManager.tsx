import React, { useEffect, useState } from 'react';
import { Gift, RefreshCw, Trash2, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';

type ShippingCoupon = {
  id: string;
  code: string;
  type: 'shipping';
  value: number;
  active: boolean;
  createdAt: string;
  shippingScope?: 'all' | 'carrier';
  shippingCarrier?: 'DPD' | 'Zásilkovna';
};

export const ShippingCouponManager: React.FC = () => {
  const { adminUser, addToast } = useApp();
  const [coupons, setCoupons] = useState<ShippingCoupon[]>([]);
  const [code, setCode] = useState('');
  const [scope, setScope] = useState<'all' | 'carrier'>('all');
  const [carrier, setCarrier] = useState<'DPD' | 'Zásilkovna'>('DPD');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!adminUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/coupons/free-shipping');
      if (!res.ok) throw new Error('Nepodařilo se načíst kódy.');
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (e: any) {
      addToast('error', 'Chyba', e.message || 'Kódy se nepodařilo načíst.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [adminUser]);

  const create = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) { addToast('error', 'Chybí kód', 'Zadejte název kódu pro dopravu zdarma.'); return; }
    try {
      const res = await fetch('/api/coupons/free-shipping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, shippingScope: scope, shippingCarrier: scope === 'carrier' ? carrier : undefined, adminUser })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Kód se nepodařilo vytvořit.');
      setCode(''); addToast('success', 'Kód vytvořen', `${clean} – doprava zdarma`); await load();
    } catch (e: any) { addToast('error', 'Chyba', e.message || 'Kód se nepodařilo vytvořit.'); }
  };

  const toggle = async (coupon: ShippingCoupon) => {
    const res = await fetch(`/api/coupons/free-shipping?id=${encodeURIComponent(coupon.id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !coupon.active, adminUser })
    });
    if (!res.ok) { addToast('error', 'Chyba', 'Stav kódu se nepodařilo změnit.'); return; }
    await load();
  };

  const remove = async (coupon: ShippingCoupon) => {
    const res = await fetch(`/api/coupons/free-shipping?id=${encodeURIComponent(coupon.id)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser })
    });
    if (!res.ok) { addToast('error', 'Chyba', 'Kód se nepodařilo smazat.'); return; }
    await load(); addToast('info', 'Kód smazán', coupon.code);
  };

  if (!adminUser || adminUser.role !== 'admin') return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><Truck className="w-5 h-5 text-[#8C7355]" /><h2 className="font-editorial text-xl font-bold text-[#2D2723]">Doprava zdarma</h2></div><p className="text-xs text-[#7B6E63] mt-1">Vytvořte kód, který zákazníkovi odpustí cenu dopravy.</p></div>
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E3DACF] text-[#8C7355]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA]">
          <div><label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Kód</label><input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }} placeholder="NAPŘ. DOPRAVAZDARMA" className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs uppercase" /></div>
          <div><label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Platí pro dopravu</label><select value={scope} onChange={e => setScope(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs"><option value="all">Jakoukoliv dopravu</option><option value="carrier">Konkrétního dopravce</option></select></div>
          <div className="flex gap-2">{scope === 'carrier' && <div className="flex-1"><label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Dopravce</label><select value={carrier} onChange={e => setCarrier(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs"><option value="DPD">DPD</option><option value="Zásilkovna">Zásilkovna</option></select></div>}<button onClick={create} className="self-end px-4 py-2 bg-[#2D2723] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" />Vytvořit</button></div>
        </div>
        {coupons.length > 0 && <div className="space-y-2">{coupons.map(c => <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#E8DFC8] bg-[#FAF8F5]"><div><strong className="text-xs text-[#2D2723]">{c.code}</strong><p className="text-[10px] text-[#7B6E63]">Doprava zdarma · {c.shippingScope === 'carrier' ? c.shippingCarrier : 'jakákoliv doprava'}</p></div><div className="flex items-center gap-2"><button onClick={() => toggle(c)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>{c.active ? 'Aktivní' : 'Neaktivní'}</button><button onClick={() => remove(c)} className="p-1.5 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}</div>}
      </div>
    </section>
  );
};
