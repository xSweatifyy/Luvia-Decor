import React, { useEffect, useState } from 'react';
import { Gift, Plus, Trash2, Power } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';

export const GiftVoucherManager: React.FC = () => {
  const { adminUser, addToast } = useApp();
  const [vouchers, setVouchers] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (adminUser?.role !== 'admin') return;
    setLoading(true);
    try {
      const r = await fetch('/api/coupons', { cache: 'no-store' });
      if (!r.ok) throw new Error('Dárkové poukazy se nepodařilo načíst.');
      const data = await r.json();
      setVouchers(Array.isArray(data) ? data.filter((x: Coupon) => x.note === 'gift-voucher') : []);
    } catch (e: any) { addToast('error', 'Dárkové poukazy', e?.message || 'Chyba načítání.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [adminUser]);

  const create = async () => {
    const clean = code.trim().toUpperCase();
    const amount = Number(value);
    if (!clean || !amount || amount <= 0) return addToast('error', 'Chybí údaje', 'Zadejte kód poukazu a kladnou hodnotu.');
    try {
      const r = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: clean, type: 'fixed', value: amount, active: true, note: 'gift-voucher', categoryIds: [], adminUser }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'Poukaz se nepodařilo vytvořit.');
      setCode(''); setValue(''); await load();
      addToast('success', 'Dárkový poukaz vytvořen', `${clean} · ${amount.toLocaleString('cs-CZ')} Kč`);
    } catch (e: any) { addToast('error', 'Dárkový poukaz', e?.message || 'Chyba.'); }
  };

  const toggle = async (v: Coupon) => {
    try {
      const r = await fetch(`/api/coupons/${v.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !v.active, adminUser }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'Stav se nepodařilo změnit.');
      await load();
      addToast('info', v.active ? 'Poukaz deaktivován' : 'Poukaz aktivován', v.code);
    } catch (e: any) { addToast('error', 'Dárkový poukaz', e?.message || 'Chyba.'); }
  };

  const remove = async (v: Coupon) => {
    if (!confirm(`Opravdu smazat poukaz ${v.code}?`)) return;
    try {
      const r = await fetch(`/api/coupons/${v.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'Poukaz se nepodařilo smazat.');
      setVouchers(p => p.filter(x => x.id !== v.id));
      addToast('info', 'Dárkový poukaz smazán', v.code);
    } catch (e: any) { addToast('error', 'Dárkový poukaz', e?.message || 'Chyba.'); }
  };

  if (adminUser?.role !== 'admin') return null;
  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"><div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-5"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FAF3E8] flex items-center justify-center text-[#8C7355]"><Gift className="w-5 h-5"/></div><div><h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Dárkové poukazy</h2><p className="text-xs text-[#7B6E63]">Poukaz se při objednávce automaticky odečítá ze zbývajícího kreditu. Pokud je objednávka nižší než zůstatek, zbytek zůstává k dalšímu použití.</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5 rounded-2xl bg-[#FAF6F0] border border-[#E3DACF]"><div><label className="block text-[11px] font-semibold mb-1">Kód poukazu *</label><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="NAPŘ. LUVIA500" className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs font-bold"/></div><div><label className="block text-[11px] font-semibold mb-1">Počáteční hodnota (Kč) *</label><input type="number" min="1" value={value} onChange={e=>setValue(e.target.value)} placeholder="500" className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs"/></div><button type="button" disabled={loading} onClick={create} className="self-end px-4 py-2.5 rounded-xl bg-[#2D2723] text-white text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4"/>Vytvořit poukaz</button></div><div className="space-y-2">{vouchers.length===0?<p className="text-xs text-stone-400 text-center py-4">Zatím žádné dárkové poukazy.</p>:vouchers.map(v=><div key={v.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-[#E8DFC8] bg-[#FAFAF8]"><div><b className="text-sm">{v.code}</b><p className="text-[11px] text-stone-500">Původně {Number(v.value).toLocaleString('cs-CZ')} Kč · <strong className="text-[#8C7355]">Zbývá {Number(v.remainingValue ?? v.value).toLocaleString('cs-CZ')} Kč</strong> · {v.active?'Aktivní':'Neaktivní'}</p></div><div className="flex items-center gap-2"><button type="button" onClick={()=>toggle(v)} className="px-3 py-1.5 rounded-lg border border-[#E3DACF] text-[11px] font-semibold flex items-center gap-1"><Power className="w-3.5 h-3.5"/>{v.active?'Deaktivovat':'Aktivovat'}</button><button type="button" onClick={()=>remove(v)} className="p-2 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4"/></button></div></div>)}</div></div></section>;
};
