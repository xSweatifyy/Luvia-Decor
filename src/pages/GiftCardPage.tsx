import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Gift, RefreshCw, ShoppingCart, Download, Plus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../context/AppContext';

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GiftCardPage: React.FC = () => {
  const { setPage, addToast, addToCart, config } = useApp();
  const [code, setCode] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const purchaseAmount = Number(amount);

  const verify = async () => {
    const value = code.trim().toUpperCase(); const security = securityCode.trim().toUpperCase();
    if (!value || !security) return addToast('error', 'Chybí údaje', 'Zadejte číslo dárkové karty i bezpečnostní kód.');
    setLoading(true);
    try { const r = await fetch(`/api/gift-card?action=validate&code=${encodeURIComponent(value)}&securityCode=${encodeURIComponent(security)}&_=${Date.now()}`, { cache: 'no-store' }); const d = await r.json().catch(() => null); if (!r.ok || !d?.valid || !d?.giftVoucher || Number(d.remainingValue) <= 0) throw new Error(d?.error || 'Dárková karta není platná nebo nemá zůstatek.'); setBalance(d); addToast('success', 'Dárková karta ověřena', `Aktuální zůstatek: ${money(d.remainingValue)} Kč.`); }
    catch (e: any) { setBalance(null); addToast('error', 'Ověření se nepodařilo', e?.message || 'Zkontrolujte údaje karty.'); } finally { setLoading(false); }
  };

  const addGiftCard = () => {
    if (!Number.isFinite(purchaseAmount) || purchaseAmount < 200) return addToast('error', 'Neplatná částka', 'Dárková karta musí mít hodnotu alespoň 200 Kč.');
    const product = { id: `gift-card-${purchaseAmount}-${Date.now()}`, title: 'Dárková karta', category: 'Dárkové karty', price: purchaseAmount, description: `Dárková karta Luvia Decor v hodnotě ${money(purchaseAmount)} Kč.`, shortDescription: 'Digitální dárková karta doručená e-mailem.', imageUrl: '/Luvia-Decor.jpeg', inStock: true, featured: false };
    addToCart(product, 1, `Dárková karta · ${money(purchaseAmount)} Kč`); setPage('cart');
  };

  const addTopup = () => {
    if (!balance) return addToast('error', 'Nejdříve ověřte kartu', 'Pro dobití nejdříve ověřte číslo a bezpečnostní kód karty.');
    if (!Number.isFinite(purchaseAmount) || purchaseAmount < 200) return addToast('error', 'Neplatná částka', 'Dobití je možné od 200 Kč.');
    const product = { id: `gift-card-topup-${balance.code}-${purchaseAmount}-${Date.now()}`, title: 'Dobití dárkové karty', category: 'Dárkové karty', price: purchaseAmount, description: `Dobití dárkové karty ${balance.code} o ${money(purchaseAmount)} Kč.`, shortDescription: 'Dobití kreditu na existující dárkové kartě.', imageUrl: '/Luvia-Decor.jpeg', inStock: true, featured: false };
    addToCart(product, 1, `Dobití dárkové karty · karta ${balance.code} · bezpečnostní kód ${securityCode.trim().toUpperCase()} · ${money(purchaseAmount)} Kč`); setPage('cart');
  };

  const downloadPreviewPdf = async () => {
    if (!Number.isFinite(purchaseAmount) || purchaseAmount < 200) return addToast('error', 'Neplatná částka', 'Pro PDF zadejte částku od 200 Kč.');
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
      pdf.setFillColor(33,28,24); pdf.rect(0,0,210,148,'F');
      pdf.setDrawColor(217,196,168); pdf.setLineWidth(0.7); pdf.roundedRect(7,7,196,134,5,5,'S');
      pdf.setDrawColor(217,196,168); pdf.setLineWidth(0.25); pdf.roundedRect(10,10,190,128,4,4,'S');
      pdf.setTextColor(250,246,240); pdf.setFont('helvetica','bold'); pdf.setFontSize(21); pdf.text('LUVIA DECOR',105,28,{align:'center'});
      pdf.setTextColor(217,196,168); pdf.setFontSize(7); pdf.text('KVĚTINOVÝ ATELIÉR · DEKORACE · KROMĚŘÍŽ',105,37,{align:'center'});
      pdf.setTextColor(217,196,168); pdf.setFontSize(8); pdf.text('DARUJTE RADOST · VYBERTE SI KRÁSNĚ',105,52,{align:'center'});
      pdf.setTextColor(250,246,240); pdf.setFontSize(24); pdf.text('DÁRKOVÁ KARTA',105,69,{align:'center'});
      pdf.setTextColor(217,196,168); pdf.setFontSize(8); pdf.text('S LÁSKOU PRO VÁS',105,79,{align:'center'});
      pdf.setTextColor(250,246,240); pdf.setFontSize(27); pdf.text(`${money(purchaseAmount)} Kč`,105,96,{align:'center'});
      pdf.setTextColor(225,216,205); pdf.setFontSize(9); pdf.text(config.slogan||'Ručně tvořené dekorace a květinový ateliér v Kroměříži',105,108,{align:'center',maxWidth:165});
      pdf.setTextColor(225,216,205); pdf.setFontSize(7.5); pdf.text('Digitální dárková karta · doručení e-mailem · kód a bezpečnostní kód obdržíte po zpracování objednávky.',105,123,{align:'center',maxWidth:175});
      pdf.setTextColor(217,196,168); pdf.setFontSize(7); pdf.text('Dárkovou kartu lze čerpat postupně při více nákupech až do vyčerpání její hodnoty.',105,132,{align:'center',maxWidth:175});
      pdf.save(`Luvia-Decor-Darkova-karta-${purchaseAmount}Kc.pdf`);
    } catch (e: any) { addToast('error','PDF dárkové karty se nepodařilo vytvořit',e?.message||'Zkuste to znovu.'); }
  };

  return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"><button onClick={()=>setPage('catalog')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#75685d] mb-6"><ArrowLeft className="w-4 h-4"/>Zpět do e-shopu</button><div className="rounded-[2rem] overflow-hidden border border-[#E8DFD5] bg-white shadow-sm"><div className="bg-[#2D2723] text-white p-7 sm:p-10"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><Gift className="w-7 h-7 text-[#E7D4B9]"/></div><div><p className="text-[10px] tracking-[.25em] uppercase text-[#D9C4A8] font-bold">Luvia Decor</p><h1 className="font-editorial text-3xl sm:text-4xl font-bold">Dárková karta</h1><p className="text-sm text-white/65 mt-2">Digitální dárková karta s doručením e-mailem.</p></div></div></div><div className="grid lg:grid-cols-2 gap-6 p-6 sm:p-10"><div className="space-y-5"><div className="rounded-2xl border border-[#E8DFD5] p-5"><h2 className="font-bold text-lg mb-1">Zakoupit dárkovou kartu</h2><p className="text-xs text-[#7B6E63] mb-4">Zadejte libovolnou částku od 200 Kč a vložte kartu do košíku.</p><div className="flex gap-2"><input type="number" min="200" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Např. 500" className="min-w-0 flex-1 rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm font-bold"/><button type="button" onClick={addGiftCard} className="rounded-xl bg-[#2D2723] text-white px-4 font-bold text-xs flex items-center gap-2"><ShoppingCart className="w-4 h-4"/>Přidat do košíku</button></div><button type="button" onClick={downloadPreviewPdf} className="mt-3 w-full rounded-xl border border-[#DCCDBD] bg-[#FCFAF7] py-3 text-xs font-bold text-[#75604B] flex items-center justify-center gap-2"><Download className="w-4 h-4"/>Náhled dárkové karty jako PDF</button></div><div className="rounded-2xl bg-[#FAF6F0] p-5"><h2 className="font-bold text-lg">Dobití dárkové karty</h2><p className="text-xs text-[#7B6E63] mt-1 mb-4">Ověřte kartu a vyberte částku. Dobití se vloží do košíku jako produkt „Dobití dárkové karty“.</p><div className="flex gap-2"><input type="number" min="200" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Částka od 200 Kč" className="min-w-0 flex-1 rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm"/><button type="button" onClick={addTopup} className="rounded-xl bg-[#8C7355] text-white px-4 font-bold text-xs flex items-center gap-2"><Plus className="w-4 h-4"/>Přidat do košíku</button></div></div></div><div className="rounded-2xl border border-[#E8DFD5] p-5 sm:p-6 bg-[#FCFAF7]"><h2 className="font-bold text-lg">Ověření zůstatku</h2><p className="text-xs text-[#7B6E63] mt-1 mb-5">Pro ověření zadejte číslo dárkové karty a bezpečnostní kód karty.</p><div className="space-y-3"><label className="block text-xs font-semibold">Číslo dárkové karty<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="LUVIA-AB12-CD34" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm font-bold"/></label><label className="block text-xs font-semibold">Bezpečnostní kód karty<input value={securityCode} onChange={e=>setSecurityCode(e.target.value.toUpperCase())} placeholder="LUVIA-SEC-..." className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm font-bold"/></label><button type="button" onClick={verify} disabled={loading} className="w-full rounded-xl bg-[#2D2723] text-white py-3 text-xs font-bold">{loading?<RefreshCw className="w-4 h-4 animate-spin mx-auto"/>:'Ověřit dárkovou kartu'}</button>{balance&&<div className="rounded-2xl bg-[#FAF6F0] p-5"><div className="text-xs text-[#7B6E63]">Karta {balance.code}</div><div className="text-3xl font-black text-[#8C7355] mt-1">{money(balance.remainingValue)} Kč</div><div className="mt-4 text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600"/>Karta je ověřená</div></div>}<div className="border-t border-[#E8DFD5] pt-4"><p className="text-xs text-[#7B6E63]">Karta může být využita postupně při více nákupech.</p></div></div></div></div></div></div>;
};
