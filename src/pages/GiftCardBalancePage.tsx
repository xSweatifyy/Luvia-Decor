import React, { useState } from 'react';
import { ArrowLeft, CreditCard, RefreshCw, ShieldCheck, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GiftCardBalancePage: React.FC = () => {
  const { setPage, addToast, addToCart } = useApp();
  const [code, setCode] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    const cardCode = code.trim().toUpperCase();
    const secret = securityCode.trim().toUpperCase();
    if (!cardCode || !secret) return addToast('error', 'Chybí údaje', 'Zadejte číslo dárkové karty i bezpečnostní kód.');
    setLoading(true);
    try {
      const r = await fetch(`/api/gift-card?action=validate&code=${encodeURIComponent(cardCode)}&securityCode=${encodeURIComponent(secret)}&_=${Date.now()}`, { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.valid || !d.giftVoucher) throw new Error(d?.error || 'Dárková karta nebyla nalezena nebo ověřena.');
      setResult(d);
      addToast('success', 'Dárková karta ověřena', `Aktuální zůstatek: ${money(d.remainingValue)} Kč.`);
    } catch (e: any) {
      setResult(null);
      addToast('error', 'Kartu se nepodařilo ověřit', e?.message || 'Zkontrolujte oba kódy.');
    } finally { setLoading(false); }
  };

  const topup = () => {
    if (!result) return addToast('error', 'Nejdříve ověřte kartu', 'Zadejte číslo a bezpečnostní kód a kartu ověřte.');
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 200) return addToast('error', 'Neplatná částka', 'Dobití musí být alespoň 200 Kč.');
    const product = {
      id: `gift-card-topup-${result.code}-${value}-${Date.now()}`,
      title: 'Dobití dárkové karty',
      category: 'Dárkové karty',
      price: value,
      description: `Dobití dárkové karty ${result.code} o ${money(value)} Kč.`,
      shortDescription: 'Dobití kreditu na existující dárkové kartě.',
      imageUrl: '/Luvia-Decor.jpeg',
      inStock: true,
      featured: false
    };
    addToCart(product, 1, `Dobití dárkové karty · karta ${result.code} · bezpečnostní kód ${securityCode.trim().toUpperCase()} · ${money(value)} Kč`);
    addToast('success', 'Dobití přidáno do košíku', `${money(value)} Kč pro kartu ${result.code}.`);
    setPage('cart');
  };

  return <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
    <button type="button" onClick={() => setPage('gift-card')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#75685d] mb-7"><ArrowLeft className="w-4 h-4" />Zpět na dárkovou kartu</button>
    <div className="rounded-[2rem] border border-[#E8DFD5] bg-white shadow-sm overflow-hidden">
      <div className="bg-[#2D2723] text-white p-8 sm:p-10"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><CreditCard className="w-7 h-7 text-[#E7D4B9]" /></div><div><p className="text-[10px] tracking-[.25em] uppercase text-[#D9C4A8] font-bold">Luvia Decor</p><h1 className="font-editorial text-3xl sm:text-4xl font-bold">Ověření zůstatku</h1><p className="text-sm text-white/65 mt-2">Zkontrolujte aktuální zůstatek své digitální dárkové karty.</p></div></div></div>
      <div className="p-6 sm:p-10 space-y-5">
        <label className="block text-sm font-bold">Číslo dárkové karty<input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }} placeholder="LUVIA-AB12-CD34" className="mt-2 w-full rounded-2xl border border-[#E3DACF] bg-[#FCFAF7] px-4 py-4 text-base font-bold tracking-wide" /></label>
        <label className="block text-sm font-bold">Bezpečnostní kód karty<input value={securityCode} onChange={e => { setSecurityCode(e.target.value.toUpperCase()); setResult(null); }} onKeyDown={e => { if (e.key === 'Enter') check(); }} placeholder="LUVIA-SEC-..." className="mt-2 w-full rounded-2xl border border-[#E3DACF] bg-[#FCFAF7] px-4 py-4 text-base font-bold tracking-wide" /></label>
        <button type="button" onClick={check} disabled={loading} className="w-full rounded-2xl bg-[#2D2723] text-white py-4 font-bold flex items-center justify-center gap-2">{loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}Ověřit dárkovou kartu</button>
        {result && <div className="rounded-2xl bg-[#FAF6F0] border border-[#E8DFD5] p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs text-[#75685d]">Karta {result.code}</p><div className="text-4xl font-black text-[#8C7355] mt-1">{money(result.remainingValue)} Kč</div><p className="text-xs text-[#75685d] mt-2">aktuální dostupný zůstatek</p></div><ShieldCheck className="w-9 h-9 text-emerald-600" /></div></div>}
        <div className="rounded-2xl border border-[#E3DACF] bg-[#FCFAF7] p-5"><h2 className="font-bold text-base">Dobití kreditu</h2><p className="text-xs text-[#75685d] mt-1 mb-4">Kartu nejprve ověřte. Potom vyberte částku a přidejte produkt „Dobití dárkové karty“ do košíku.</p><div className="flex gap-2"><input type="number" min="200" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Částka od 200 Kč" className="min-w-0 flex-1 rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm font-bold"/><button type="button" onClick={topup} className="rounded-xl bg-[#8C7355] text-white px-4 py-3 text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Přidat do košíku</button></div></div>
        <p className="text-xs leading-5 text-[#75685d] bg-[#FCFAF7] rounded-2xl p-4">Karta může být využita postupně při více nákupech.</p>
      </div>
    </div>
  </div>;
};
