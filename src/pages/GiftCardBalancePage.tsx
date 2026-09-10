import React, { useState } from 'react';
import { ArrowLeft, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GiftCardBalancePage: React.FC = () => {
  const { setPage, addToast } = useApp();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const check = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return addToast('error', 'Chybí kód', 'Zadejte kód dárkové karty.');
    setLoading(true);
    try {
      const r = await fetch(`/api/coupons?action=validate&code=${encodeURIComponent(value)}&_=${Date.now()}`, { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.valid || !d.giftVoucher) throw new Error('Dárková karta nebyla nalezena, je neaktivní nebo nemá zůstatek.');
      setResult(d);
    } catch (e: any) { setResult(null); addToast('error', 'Kartu se nepodařilo ověřit', e?.message || 'Zkontrolujte kód.'); }
    finally { setLoading(false); }
  };
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16"><button type="button" onClick={() => setPage('gift-card')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#75685d] mb-7"><ArrowLeft className="w-4 h-4" />Zpět na dárkovou kartu</button><div className="rounded-[2rem] border border-[#E8DFD5] bg-white shadow-sm overflow-hidden"><div className="bg-[#2D2723] text-white p-8 sm:p-10"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><CreditCard className="w-7 h-7 text-[#E7D4B9]" /></div><div><p className="text-[10px] tracking-[.25em] uppercase text-[#D9C4A8] font-bold">Luvia Decor</p><h1 className="font-editorial text-3xl sm:text-4xl font-bold">Ověření zůstatku</h1><p className="text-sm text-white/65 mt-2">Zkontrolujte aktuální zůstatek své digitální dárkové karty.</p></div></div></div><div className="p-6 sm:p-10"><label className="block text-sm font-bold">Kód dárkové karty<input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }} onKeyDown={e => { if (e.key === 'Enter') check(); }} placeholder="LUVIA-AB12-CD34" className="mt-2 w-full rounded-2xl border border-[#E3DACF] bg-[#FCFAF7] px-4 py-4 text-base font-bold tracking-wide" /></label><button type="button" onClick={check} disabled={loading} className="mt-4 w-full rounded-2xl bg-[#2D2723] text-white py-4 font-bold flex items-center justify-center gap-2">{loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}Ověřit kartu</button>{result && <div className="mt-7 rounded-2xl bg-[#FAF6F0] border border-[#E8DFD5] p-6 text-center"><ShieldCheck className="w-8 h-8 mx-auto text-[#8C7355]" /><p className="text-xs text-[#75685d] mt-3">Karta {result.code}</p><div className="text-4xl font-black text-[#8C7355] mt-1">{money(result.remainingValue)} Kč</div><p className="text-xs text-[#75685d] mt-2">aktuální dostupný zůstatek</p></div>}<div className="mt-7 text-xs leading-5 text-[#75685d] bg-[#FCFAF7] rounded-2xl p-4">Karta může být využita postupně při více nákupech. Dobití od 200 Kč provádí administrace ručně až po ověření zaplacení.</div></div></div></div>;
};
