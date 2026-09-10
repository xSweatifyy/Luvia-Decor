import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CreditCard, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

type CardResult = { valid: boolean; giftVoucher?: boolean; code?: string; remainingValue?: number; error?: string };

export const GiftCardPaymentEnhancer: React.FC = () => {
  const { page, addToast } = useApp();
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [payment, setPayment] = useState<'bank_transfer' | 'gift_card'>('bank_transfer');
  const [code, setCode] = useState('');
  const [card, setCard] = useState<CardResult | null>(null);
  const [checking, setChecking] = useState(false);
  const codeRef = useRef(code);
  const cardRef = useRef<CardResult | null>(card);
  const paymentRef = useRef(payment);
  codeRef.current = code; cardRef.current = card; paymentRef.current = payment;

  useEffect(() => {
    if (page !== 'cart') { setForm(null); return; }
    const find = () => setForm(document.querySelector('form') as HTMLFormElement | null);
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    if (!form) return;
    const onSubmit = async (event: Event) => {
      if (paymentRef.current !== 'gift_card') return;
      const codeValue = codeRef.current.trim().toUpperCase();
      if (!codeValue || !cardRef.current?.valid || !cardRef.current.giftVoucher) {
        event.preventDefault(); event.stopImmediatePropagation();
        addToast('error', 'Dárková karta není ověřená', 'Pro odeslání objednávky zvolte Dárková karta a ověřte platný kód.');
        return;
      }
      const current = cardRef.current;
      const totalText = Array.from(form.querySelectorAll('*')).map(n => (n.textContent || '').trim()).find(t => /^Celkem\s+/.test(t));
      const totalMatch = totalText?.match(/Celkem\s+([0-9\s.,]+)\s*Kč/);
      const checkoutTotal = totalMatch ? Number(totalMatch[1].replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')) : 0;
      if (checkoutTotal > Number(current.remainingValue || 0) + 0.009) {
        event.preventDefault(); event.stopImmediatePropagation();
        addToast('error', 'Nedostatečný zůstatek', `Na kartě je ${Number(current.remainingValue || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč, objednávka je za ${checkoutTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč.`);
        return;
      }
      localStorage.setItem('luvia_gift_card_payment', JSON.stringify({ code: codeValue, remainingValue: current.remainingValue, checkedAt: Date.now() }));
    };
    form.addEventListener('submit', onSubmit, true);
    return () => form.removeEventListener('submit', onSubmit, true);
  }, [form, addToast]);

  const verify = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return addToast('error', 'Chybí kód', 'Zadejte kód dárkové karty.');
    setChecking(true); setCard(null);
    try {
      const r = await fetch(`/api/coupons?action=validate&code=${encodeURIComponent(value)}&_=${Date.now()}`, { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.valid || !d?.giftVoucher) throw new Error(d?.error || 'Kód dárkové karty není platný.');
      const result = { ...d, valid: true };
      setCard(result); cardRef.current = result;
      addToast('success', 'Dárková karta ověřena', `Zůstatek: ${Number(d.remainingValue || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč.`);
    } catch (e: any) { addToast('error', 'Karta není platná', e?.message || 'Zkontrolujte kód.'); }
    finally { setChecking(false); }
  };

  if (page !== 'cart' || !form) return null;
  return createPortal(<div className="rounded-2xl border border-[#E5DCD2] bg-[#FCFAF7] p-4 space-y-3">
    <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#9A7B58]" /><b>Platba *</b></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button type="button" onClick={() => { setPayment('bank_transfer'); setCard(null); }} className={`rounded-2xl border p-4 text-left ${payment === 'bank_transfer' ? 'border-[#9A7B58] bg-[#FBF6EF]' : 'border-[#E8E0D8] bg-white'}`}><b>Bankovní převod</b><span className="block text-[11px] text-[#81766D] mt-1">Platba převodem podle údajů po odeslání objednávky.</span></button>
      <button type="button" onClick={() => setPayment('gift_card')} className={`rounded-2xl border p-4 text-left ${payment === 'gift_card' ? 'border-[#9A7B58] bg-[#FBF6EF]' : 'border-[#E8E0D8] bg-white'}`}><b>Dárková karta</b><span className="block text-[11px] text-[#81766D] mt-1">Kód se musí před odesláním ověřit.</span></button>
    </div>
    {payment === 'gift_card' && <div className="rounded-xl border border-[#E5DCD2] bg-white p-3"><div className="flex gap-2"><input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setCard(null); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verify(); } }} placeholder="LUVIA-AB12-CD34" className="min-w-0 flex-1 rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm font-bold" /><button type="button" onClick={verify} disabled={checking} className="rounded-xl bg-[#2D2723] text-white px-4 font-bold text-xs">{checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Ověřit'}</button></div>{card?.valid && <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-3 text-xs"><span className="flex items-center gap-2 text-emerald-700 font-semibold"><CheckCircle2 className="w-4 h-4" />Karta {card.code} je platná</span><b className="text-emerald-800">{Number(card.remainingValue || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</b></div>}<p className="text-[10px] text-[#81766D] mt-2">Neplatný nebo neověřený kód = objednávku nelze s touto platbou odeslat.</p></div>}
  </div>, form);
};
