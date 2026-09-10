import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Gift, Mail, RefreshCw, ShieldCheck, WalletCards, ShoppingCart, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../context/AppContext';

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GiftCardPage: React.FC = () => {
  const { setPage, addToast, addToCart, config } = useApp();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState<any>(null);
  const purchaseAmount = Number(amount);

  const addGiftCard = () => {
    if (!Number.isFinite(purchaseAmount) || purchaseAmount < 200) {
      return addToast('error', 'Neplatná částka', 'Dárková karta musí mít hodnotu alespoň 200 Kč.');
    }
    const product = {
      id: `gift-card-${purchaseAmount}`,
      title: 'Dárková karta',
      category: 'Dárkové karty',
      price: purchaseAmount,
      description: `Dárková karta Luvia Decor v hodnotě ${money(purchaseAmount)} Kč.`,
      shortDescription: 'Dárková karta s libovolnou hodnotou od 200 Kč.',
      imageUrl: '/Luvia-Decor.jpeg',
      inStock: true,
      featured: false,
    };
    addToCart(product, 1, `Dárková karta · hodnota ${money(purchaseAmount)} Kč`);
    setPage('cart');
  };

  const downloadGiftCardPdf = async () => {
    if (!Number.isFinite(purchaseAmount) || purchaseAmount < 200) {
      return addToast('error', 'Neplatná částka', 'Pro PDF zadejte částku od 200 Kč.');
    }
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
    pdf.setFillColor(33, 28, 24);
    pdf.rect(0, 0, 210, 148, 'F');
    try {
      const img = new Image();
      img.src = '/Luvia-Decor.jpeg';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      if (img.complete && img.naturalWidth) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 15, 14, 28, 28);
        }
      }
    } catch {}
    pdf.setTextColor(250, 246, 240);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('LUVIA DECOR', 52, 27);
    pdf.setFontSize(8);
    pdf.setTextColor(217, 196, 168);
    pdf.text('KVĚTINOVÝ ATELIÉR & DEKORACE', 52, 34);
    pdf.setTextColor(250, 246, 240);
    pdf.setFontSize(25);
    pdf.text('DÁRKOVÁ KARTA', 105, 76, { align: 'center' });
    pdf.setFontSize(30);
    pdf.text(`${money(purchaseAmount)} Kč`, 105, 96, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(225, 216, 205);
    pdf.text(config.slogan || 'S láskou tvořeno v Kroměříži', 105, 109, { align: 'center' });
    pdf.setFontSize(8);
    pdf.text('Karta je určena k uplatnění v e-shopu Luvia Decor. Kód a bezpečnostní údaje jsou vydány po zpracování objednávky.', 105, 124, { align: 'center', maxWidth: 175 });
    pdf.save(`Luvia-Decor-Darkova-karta-${purchaseAmount}Kc.pdf`);
  };

  const check = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return addToast('error', 'Chybí kód', 'Zadejte kód dárkové karty.');
    setLoading(true);
    try {
      const r = await fetch(`/api/coupons?action=validate&code=${encodeURIComponent(value)}&_=${Date.now()}`, { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.valid || !d.giftVoucher) throw new Error('Dárková karta nebyla nalezena, je neaktivní nebo nemá zůstatek.');
      setBalance(d);
    } catch (e: any) {
      setBalance(null);
      addToast('error', 'Karta nebyla nalezena', e?.message || 'Zkontrolujte kód.');
    } finally {
      setLoading(false);
    }
  };

  const requestTopup = async () => {
    const a = Number(amount);
    const value = code.trim().toUpperCase();
    const mail = email.trim().toLowerCase();
    if (!value || !/^\S+@\S+\.\S+$/.test(mail)) return addToast('error', 'Chybí údaje', 'Vyplňte kód karty a platný e-mail.');
    if (!Number.isFinite(a) || a < 200) return addToast('error', 'Neplatná částka', 'Dobití je možné od 200 Kč.');
    setLoading(true);
    try {
      const r = await fetch('/api/coupons?action=topup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value, email: mail, amount: a }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'Žádost o dobití se nepodařilo vytvořit.');
      setRequested(d);
      setAmount('');
      addToast('success', 'Žádost vytvořena', 'Po ověření platby administrace ručně připíše částku na kartu.');
    } catch (e: any) {
      addToast('error', 'Dobití se nepodařilo', e?.message || 'Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <button onClick={() => setPage('catalog')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#75685d] mb-6 hover:text-[#2D2723]">
        <ArrowLeft className="w-4 h-4" />Zpět do e-shopu
      </button>

      <div className="rounded-[2rem] overflow-hidden border border-[#E8DFD5] bg-white shadow-sm">
        <div className="bg-[#2D2723] text-white p-7 sm:p-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><Gift className="w-7 h-7 text-[#E7D4B9]" /></div>
            <div>
              <p className="text-[10px] tracking-[.25em] uppercase text-[#D9C4A8] font-bold">Luvia Decor</p>
              <h1 className="font-editorial text-3xl sm:text-4xl font-bold">Dárková karta</h1>
              <p className="text-sm text-white/65 mt-2">Zvolte libovolnou hodnotu od 200 Kč a vložte kartu přímo do košíku.</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 p-6 sm:p-10">
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#E8DFD5] p-5">
              <h2 className="font-bold text-lg mb-1">Zakoupit dárkovou kartu</h2>
              <p className="text-xs text-[#7B6E63] mb-4">Zadejte libovolnou částku od 200 Kč. Po potvrzení se produkt „Dárková karta“ vloží do košíku za zvolenou hodnotu.</p>
              <div className="flex gap-2">
                <input type="number" min="200" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Např. 500" className="min-w-0 flex-1 rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm font-bold" />
                <button type="button" onClick={addGiftCard} className="rounded-xl bg-[#2D2723] text-white px-4 font-bold text-xs flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Přidat do košíku</button>
              </div>
              <button type="button" onClick={downloadGiftCardPdf} className="mt-3 w-full rounded-xl border border-[#DCCDBD] bg-[#FCFAF7] py-3 text-xs font-bold text-[#75604B] flex items-center justify-center gap-2"><Download className="w-4 h-4" />Náhled dárkové karty jako PDF</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#FAF6F0] p-4"><WalletCards className="w-5 h-5 text-[#8C7355]" /><b className="block text-sm mt-2">Od 200 Kč</b><span className="text-[11px] text-stone-500">libovolná vyšší částka</span></div>
              <div className="rounded-2xl bg-[#FAF6F0] p-4"><RefreshCw className="w-5 h-5 text-[#8C7355]" /><b className="block text-sm mt-2">Více nákupů</b><span className="text-[11px] text-stone-500">zůstatek lze čerpat postupně</span></div>
              <div className="rounded-2xl bg-[#FAF6F0] p-4"><ShieldCheck className="w-5 h-5 text-[#8C7355]" /><b className="block text-sm mt-2">PDF karta</b><span className="text-[11px] text-stone-500">Luvia Decor + motto</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DFD5] p-5 sm:p-6 bg-[#FCFAF7]">
            <h2 className="font-bold text-lg">Zkontrolovat / dobít kartu</h2>
            <p className="text-xs text-[#7B6E63] mt-1 mb-5">Zadejte kód karty pro kontrolu zůstatku nebo vytvoření žádosti o dobití.</p>
            <div className="space-y-3">
              <label className="block text-xs font-semibold">Kód karty
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="LUVIA-AB12-CD34" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm font-bold" />
              </label>
              <button type="button" onClick={check} disabled={loading} className="w-full rounded-xl bg-[#2D2723] text-white py-3 text-xs font-bold">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Ověřit zůstatek'}
              </button>
              {balance && (
                <div className="rounded-2xl bg-[#FAF6F0] p-5">
                  <div className="text-xs text-[#7B6E63]">Karta {balance.code}</div>
                  <div className="text-3xl font-black text-[#8C7355] mt-1">{money(balance.remainingValue)} Kč</div>
                </div>
              )}
              <div className="border-t border-[#E8DFD5] pt-4">
                <label className="block text-xs font-semibold">E-mail pro žádost o dobití
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vas@email.cz" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm" />
                </label>
                <label className="block text-xs font-semibold mt-3">Částka dobití (min. 200 Kč)
                  <input type="number" min="200" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-white px-3 py-3 text-sm" />
                </label>
                <button type="button" onClick={requestTopup} disabled={loading} className="w-full mt-3 rounded-xl border border-[#2D2723] text-[#2D2723] py-3 text-xs font-bold flex items-center justify-center gap-2"><Mail className="w-4 h-4" />Vytvořit žádost o dobití</button>
                {requested && (
                  <div className="mt-3 rounded-xl bg-white border border-emerald-200 p-4 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <b className="block mt-2">Žádost je připravena</b>
                    <span>Karta {requested.code} · {money(requested.amount)} Kč</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
