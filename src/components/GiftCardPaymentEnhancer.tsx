import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CreditCard, RefreshCw, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Card = { code: string; securityCode: string; remainingValue: number };

const parseMoney = (text: string) => {
  const m = text.match(/Celkem\s+([0-9\s.,]+)\s*Kč/i);
  if (!m) return 0;
  return Number(m[1].replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')) || 0;
};

const topupData = (body: string, email: string) => {
  try {
    const data = JSON.parse(body);
    const items = Array.isArray(data.items) ? data.items : [];
    return items
      .filter((item: any) => String(item.title || '') === 'Dobití dárkové karty')
      .map((item: any) => {
        const note = String(item.customNote || '');
        const code = note.match(/karta\s+([^·]+)/i)?.[1]?.trim()?.toUpperCase() || '';
        const securityCode = note.match(/bezpečnostní kód\s+([^·]+)/i)?.[1]?.trim()?.toUpperCase() || '';
        return {
          code,
          securityCode,
          amount: Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
          email,
        };
      })
      .filter((item: any) => item.code && item.securityCode && item.amount > 0);
  } catch {
    return [];
  }
};

export const GiftCardPaymentEnhancer: React.FC = () => {
  const { page, addToast } = useApp();
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [payment, setPayment] = useState<'bank_transfer' | 'gift_card'>('bank_transfer');
  const [cards, setCards] = useState<Card[]>([{ code: '', securityCode: '', remainingValue: 0 }]);
  const [checking, setChecking] = useState<number | null>(null);
  const [allowBankRemainder, setAllowBankRemainder] = useState(false);
  const paymentRef = useRef(payment);
  const cardsRef = useRef<Card[]>(cards);
  const allowBankRef = useRef(allowBankRemainder);

  paymentRef.current = payment;
  cardsRef.current = cards;
  allowBankRef.current = allowBankRemainder;

  useEffect(() => {
    if (page !== 'cart') {
      setForm(null);
      return;
    }

    const find = () => {
      setForm(document.querySelector('form') as HTMLFormElement | null);
    };

    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    if (!form) return;

    const onSubmit = (event: Event) => {
      if (paymentRef.current !== 'gift_card') return;

      const total = parseMoney(form.innerText || '');
      const validCards = cardsRef.current.filter(
        (card) => card.code && card.securityCode && card.remainingValue > 0
      );
      const available = validCards.reduce((sum, card) => sum + card.remainingValue, 0);

      if (!validCards.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        addToast('error', 'Dárková karta není ověřená', 'Zadejte a ověřte alespoň jednu dárkovou kartu.');
        return;
      }

      if (available + 0.009 < total && !allowBankRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        addToast(
          'error',
          'Nedostatečný zůstatek',
          `Karty mají dohromady ${available.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč. Přidejte další kartu nebo povolte doplatek bankovním převodem.`
        );
      }
    };

    form.addEventListener('submit', onSubmit, true);
    return () => form.removeEventListener('submit', onSubmit, true);
  }, [form, addToast]);

  const update = (index: number, key: keyof Card, value: string) => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index
          ? { ...card, [key]: key === 'remainingValue' ? Number(value) || 0 : value.toUpperCase() }
          : card
      )
    );
  };

  const verify = async (index: number) => {
    const card = cards[index];
    if (!card.code || !card.securityCode) {
      addToast('error', 'Chybí údaje', 'Zadejte číslo dárkové karty a bezpečnostní kód.');
      return;
    }

    setChecking(index);
    try {
      const response = await fetch(
        `/api/gift-card?action=validate&code=${encodeURIComponent(card.code)}&securityCode=${encodeURIComponent(card.securityCode)}&_=${Date.now()}`,
        { cache: 'no-store' }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.valid) {
        throw new Error(data?.error || 'Dárková karta není platná.');
      }

      setCards((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, code: data.code, remainingValue: Number(data.remainingValue || 0) }
            : item
        )
      );

      addToast(
        'success',
        'Karta ověřena',
        `${data.code} · ${Number(data.remainingValue || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`
      );
    } catch (error: any) {
      setCards((prev) => prev.map((item, i) => (i === index ? { ...item, remainingValue: 0 } : item)));
      addToast('error', 'Ověření karty se nepodařilo', error?.message || 'Zkontrolujte oba kódy.');
    } finally {
      setChecking(null);
    }
  };

  const redeemAfterOrder = async (payload: any, order: any) => {
    const total = parseMoney(form?.innerText || '') || Number(order.totalPrice || 0);
    let due = total;
    let updated = order;

    for (const card of cardsRef.current.filter(
      (item) => item.code && item.securityCode && item.remainingValue > 0
    )) {
      if (due <= 0) break;
      const use = Math.min(due, card.remainingValue);
      const response = await fetch('/api/gift-card-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          code: card.code,
          securityCode: card.securityCode,
          amount: use,
          remainingDue: Math.max(0, due - use),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.order) {
        throw new Error(data?.error || 'Platbu dárkovou kartou se nepodařilo dokončit.');
      }
      updated = data.order;
      due = Math.max(0, due - use);
    }

    return { ...payload, success: true, order: updated };
  };

  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isOrder = url.includes('/api/orders') && (init?.method || 'GET').toUpperCase() === 'POST';
      if (!isOrder) return nativeFetch(input, init);

      const response = await nativeFetch(input, init);
      if (!response.ok) return response;

      try {
        const payload = await response.clone().json();
        if (!payload?.order) return response;

        let result = payload;
        if (paymentRef.current === 'gift_card') {
          result = await redeemAfterOrder(payload, payload.order);
        }

        if (typeof init?.body === 'string') {
          const emailMatch = init.body.match(/\"email\":\"([^\"]+)\"/);
          for (const topup of topupData(init.body, emailMatch?.[1] || '')) {
            const topupResponse = await nativeFetch('/api/coupons?action=topup-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(topup),
            });
            if (!topupResponse.ok) {
              const data = await topupResponse.json().catch(() => null);
              addToast('error', 'Dobití se nepodařilo zaregistrovat', data?.error || 'Zkontrolujte kartu.');
            }
          }
        }

        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      } catch (error: any) {
        addToast('error', 'Platba dárkovou kartou se nedokončila', error?.message || 'Zkuste to znovu.');
        return new Response(JSON.stringify({ error: error?.message || 'Platbu se nepodařilo dokončit.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    };

    window.fetch = wrapped as typeof window.fetch;
    return () => {
      window.fetch = nativeFetch;
    };
  }, [addToast, form]);

  if (page !== 'cart' || !form) return null;

  return createPortal(
    <div className="rounded-2xl border border-[#E5DCD2] bg-[#FCFAF7] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-[#9A7B58]" />
        <b>Platba *</b>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPayment('bank_transfer')}
          className={`rounded-2xl border p-4 text-left ${payment === 'bank_transfer' ? 'border-[#9A7B58] bg-[#FBF6EF]' : 'border-[#E8E0D8] bg-white'}`}
        >
          <b>Bankovní převod</b>
          <span className="block text-[11px] text-[#81766D] mt-1">Platba převodem podle údajů po odeslání objednávky.</span>
        </button>

        <button
          type="button"
          onClick={() => setPayment('gift_card')}
          className={`rounded-2xl border p-4 text-left ${payment === 'gift_card' ? 'border-[#9A7B58] bg-[#FBF6EF]' : 'border-[#E8E0D8] bg-white'}`}
        >
          <b>Dárková karta</b>
          <span className="block text-[11px] text-[#81766D] mt-1">Jedna nebo více karet, vždy s číslem a bezpečnostním kódem.</span>
        </button>
      </div>

      {payment === 'gift_card' && (
        <div className="space-y-3">
          {cards.map((card, index) => (
            <div key={index} className="rounded-xl border border-[#E5DCD2] bg-white p-3 space-y-2">
              <div className="flex justify-between items-center">
                <b className="text-xs">Dárková karta {index + 1}</b>
                {cards.length > 1 && (
                  <button type="button" onClick={() => setCards((prev) => prev.filter((_, i) => i !== index))} className="text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={card.code}
                  onChange={(event) => update(index, 'code', event.target.value)}
                  placeholder="Číslo dárkové karty"
                  className="min-w-0 rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm font-bold"
                />
                <input
                  value={card.securityCode}
                  onChange={(event) => update(index, 'securityCode', event.target.value)}
                  placeholder="Bezpečnostní kód"
                  className="min-w-0 rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm font-bold"
                />
              </div>

              <button
                type="button"
                onClick={() => verify(index)}
                disabled={checking === index}
                className="w-full rounded-xl bg-[#2D2723] text-white px-4 py-3 font-bold text-xs flex items-center justify-center gap-2"
              >
                {checking === index ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Ověřit kartu
                  </>
                )}
              </button>

              {card.remainingValue > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-3 text-xs">
                  <span className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Ověřeno
                  </span>
                  <b className="text-emerald-800">
                    {card.remainingValue.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                  </b>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setCards((prev) => [...prev, { code: '', securityCode: '', remainingValue: 0 }])}
            className="w-full rounded-xl border border-[#2D2723] py-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Přidat další dárkovou kartu
          </button>

          <label className="flex items-start gap-2 text-xs rounded-xl bg-white border border-[#E5DCD2] p-3">
            <input
              type="checkbox"
              checked={allowBankRemainder}
              onChange={(event) => setAllowBankRemainder(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              <b>Doplatek bankovním převodem</b>
              <span className="block text-[#81766D] mt-1">Pokud kredity nestačí, zbytek objednávky uhradím bankovním převodem.</span>
            </span>
          </label>
        </div>
      )}
    </div>,
    form
  );
};
