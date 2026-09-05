import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Tag, Trash2, Check, Layers, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Coupon, ProductCategory } from '../types';

export const CouponManager: React.FC = () => {
  const { adminUser, categories, products, addToast } = useApp();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent'|'fixed'>('percent');
  const [value, setValue] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const normalizeCategory = (value:string) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const effectiveCategories = useMemo<ProductCategory[]>(() => {
    const map = new Map<string, ProductCategory>();
    categories.forEach(c => {
      const name = String(c?.name || '').trim();
      if (!name) return;
      // Always use the canonical category name as the stored value. The UI id is only for selection.
      const id = String(c.id || normalizeCategory(name) || name);
      map.set(id, { ...c, id, name });
    });
    products.forEach(p => {
      const name = String(p?.category || '').trim();
      if (!name) return;
      const existing = [...map.values()].find(c => normalizeCategory(c.name) === normalizeCategory(name));
      if (!existing) {
        const id = normalizeCategory(name) || name;
        map.set(id, { id, name });
      }
    });
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'cs'));
  }, [categories, products]);

  const visibleCategories = useMemo(() => {
    const q = categorySearch.trim().toLocaleLowerCase('cs');
    if (!q) return effectiveCategories;
    return effectiveCategories.filter(c => c.name.toLocaleLowerCase('cs').includes(q));
  }, [effectiveCategories, categorySearch]);

  const load = async () => {
    if (adminUser?.role !== 'admin') return;
    setLoading(true); setLoadError('');
    try {
      const res = await fetch('/api/coupons', { cache: 'no-store' });
      const text = await res.text();
      let data:any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(data?.error || `Server vrátil chybu HTTP ${res.status}.`);
      if (!Array.isArray(data)) throw new Error('Server vrátil neplatná data slevových kódů.');
      setCoupons(data.filter((x:Coupon)=>x.note!=='gift-voucher'));
    } catch(e:any) {
      const msg=e?.message||'Slevové kódy se nepodařilo načíst.';
      setLoadError(msg); addToast('error','Slevové kódy',msg);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); const t=window.setInterval(load,5000); return()=>window.clearInterval(t)},[adminUser]);

  const toggleCategory=(id:string)=>setCategoryIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const createCoupon=async()=>{
    const clean=code.trim().toUpperCase();
    const amount=Number(value);
    if(!clean||amount<=0)return addToast('error','Chybí údaje','Zadejte kód a kladnou hodnotu slevy.');
    if(type==='percent'&&amount>100)return addToast('error','Neplatná hodnota','Procentní sleva může být nejvýše 100 %.');

    // IMPORTANT: categoryIds is only the UI selection. Send canonical category NAMES,
    // because products use their category name and the API stores exactly what it receives.
    const selectedCategoryNames = categoryIds
      .map(id => effectiveCategories.find(c => String(c.id) === String(id)))
      .map(category => String(category?.name || '').trim())
      .filter(Boolean)
      .filter((name, index, arr) => arr.findIndex(x => normalizeCategory(x) === normalizeCategory(name)) === index);

    try{
      const r=await fetch('/api/coupons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:clean,type,value:amount,active:true,categoryIds:selectedCategoryNames,note:''})});
      const d=await r.json().catch(()=>null);
      if(!r.ok)throw new Error(d?.error||'Slevový kód se nepodařilo uložit.');
      setCode(''); setValue(''); setCategoryIds([]); setCategorySearch(''); await load();
      addToast('success','Slevový kód vytvořen',selectedCategoryNames.length?`${clean} platí pro vybrané kategorie.`:`${clean} platí pro celý sortiment.`)
    }catch(e:any){addToast('error','Slevový kód',e?.message||'Slevový kód se nepodařilo uložit.')}
  };

  const toggleActive=async(c:Coupon)=>{try{const r=await fetch(`/api/coupons?id=${encodeURIComponent(c.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!c.active})});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||'Stav kódu se nepodařilo změnit.');await load();addToast('info',c.active?'Kód deaktivován':'Kód aktivován',c.code)}catch(e:any){addToast('error','Slevový kód',e?.message||'Stav kódu se nepodařilo změnit.')}};
  const remove=async(c:Coupon)=>{if(!window.confirm(`Opravdu smazat slevový kód ${c.code}?`))return;try{const r=await fetch(`/api/coupons?id=${encodeURIComponent(c.id)}`,{method:'DELETE'});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||'Kód se nepodařilo smazat.');setCoupons(p=>p.filter(x=>x.id!==c.id));addToast('info','Slevový kód smazán',c.code)}catch(e:any){addToast('error','Slevový kód',e?.message||'Kód se nepodařilo smazat.')}};

  if(adminUser?.role!=='admin')return null;
  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"><div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6"><div className="flex items-start justify-between gap-4 border-b border-[#F2ECE4] pb-4"><div><div className="flex items-center gap-2 text-[#8C7355] text-[10px] font-bold uppercase tracking-[0.18em]"><Tag className="w-4 h-4"/>Pokročilý systém slev</div><h2 className="font-editorial text-2xl font-bold text-[#2D2723] mt-1">Slevové kódy podle kategorií</h2><p className="text-xs text-[#7B6E63] mt-1">Kategorie slevových kódů jsou stejné jako kategorie produktů. Kód může platit pro všechny produkty nebo pouze pro vybrané kategorie.</p></div><button type="button" onClick={load} disabled={loading} className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E3DACF] text-[#8C7355]"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button></div>{loadError&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">Nepodařilo se načíst slevové kódy: {loadError}. Zkuste Obnovit.</div>}<div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#E3DACF] space-y-4"><h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7355]">Vytvořit nový kód</h3><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div><label className="block text-[11px] font-semibold mb-1">Kód *</label><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="NAPŘ. JARO10" className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs font-bold"/></div><div><label className="block text-[11px] font-semibold mb-1">Typ slevy</label><select value={type} onChange={e=>setType(e.target.value as 'percent'|'fixed')} className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs"><option value="percent">Procentní (%)</option><option value="fixed">Pevná částka (Kč)</option></select></div><div><label className="block text-[11px] font-semibold mb-1">Hodnota *</label><input type="number" min="1" max={type==='percent'?100:undefined} value={value} onChange={e=>setValue(e.target.value)} placeholder={type==='percent'?'10':'500'} className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs"/></div><div className="flex items-end"><button type="button" onClick={createCoupon} className="w-full px-3 py-2.5 bg-[#2D2723] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><Plus className="w-4 h-4"/>Vytvořit</button></div></div><div><div className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4 text-[#8C7355]"/><span className="text-xs font-bold text-[#2D2723]">Kategorie produktů, pro které kód platí</span></div><label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E3DACF] bg-white cursor-pointer w-fit"><input type="checkbox" checked={categoryIds.length===0} onChange={()=>setCategoryIds([])} className="accent-[#8C7355]"/><span className="text-xs font-semibold">Všechny kategorie</span></label><div className="relative mt-3"><Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"/><input value={categorySearch} onChange={e=>setCategorySearch(e.target.value)} placeholder="Vyhledat kategorii produktu..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs"/></div>{visibleCategories.length?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">{visibleCategories.map(c=><label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${categoryIds.includes(c.id)?'border-[#C5A880] bg-[#FAF5EE]':'border-[#E3DACF] bg-white'}`}><input type="checkbox" checked={categoryIds.includes(c.id)} onChange={()=>toggleCategory(c.id)} className="accent-[#8C7355]"/><span className="text-xs font-medium text-[#5C5046]">{c.name}</span></label>)}</div>:<p className="text-xs text-stone-500 mt-3">{effectiveCategories.length?'Žádná kategorie neodpovídá vyhledávání.':'Žádné kategorie produktů zatím nejsou načtené.'}</p>}<p className="text-[10px] text-[#8C7355] mt-2">Bez vybrané kategorie = platí na celý sortiment. Výběr více kategorií je možný.</p></div></div><div className="space-y-2">{coupons.length===0&&!loadError?<p className="text-xs text-stone-400 text-center py-6">Zatím nebyl vytvořen žádný slevový kód.</p>:coupons.map(c=><div key={c.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl border border-[#E8DFC8] bg-[#FAFAF8]"><div className="flex items-start gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.active?'bg-emerald-100 text-emerald-700':'bg-stone-200 text-stone-400'}`}><Tag className="w-4 h-4"/></div><div><p className="font-bold text-[#2D2723] text-sm">{c.code}</p><p className="text-[11px] text-stone-500">{c.type==='percent'?`Sleva ${c.value} %`:`Sleva ${c.value.toLocaleString('cs-CZ')} Kč`} · {c.active?'Aktivní':'Neaktivní'}</p><p className="text-[11px] text-[#8C7355] mt-0.5">{c.categoryIds?.length?`Kategorie: ${c.categoryIds.join(', ')}`:'Platí na všechny kategorie'}</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={()=>toggleActive(c)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#E3DACF]">{c.active?'Deaktivovat':'Aktivovat'}</button><button type="button" onClick={()=>remove(c)} className="p-2 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4"/></button></div></div>)}</div><div className="flex items-center gap-2 text-[11px] text-stone-500 pt-2"><Check className="w-3.5 h-3.5 text-emerald-600"/>Sleva se znovu ověřuje na serveru při vytvoření objednávky.</div></div></section>;
};