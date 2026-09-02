import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CheckCircle2, ShieldCheck, Truck, Sparkles, Send, Tag, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order } from '../types';
import { SafeImage } from '../components/SafeImage';
import { findCouponByCodeInFirestore } from '../services/firestoreService';

export const CartPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setPage,
    addToast,
    config
  } = useApp();

  // Customer form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [note, setNote] = useState('');

  // Submission & Success state
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);

  // Coupon (slevový kód) state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'percent' | 'fixed'; value: number; categoryIds: string[] } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  const eligibleCouponSubtotal = appliedCoupon && appliedCoupon.categoryIds.length > 0
    ? cart.reduce((sum, item) => appliedCoupon.categoryIds.includes(item.product.category) ? sum + item.product.price * item.quantity : sum, 0)
    : cartTotal;

  const discount = appliedCoupon
    ? (appliedCoupon.type === 'percent'
        ? Math.round(eligibleCouponSubtotal * (appliedCoupon.value / 100))
        : Math.min(appliedCoupon.value, eligibleCouponSubtotal))
    : 0;
  const grandTotal = Math.max(0, cartTotal - discount);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      addToast('error', 'Zadejte slevový kód', 'Do pole napište kód a poté klikněte na Použít.');
      return;
    }
    setCouponChecking(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          items: cart.map(item => ({
            productId: item.product.id,
            category: item.product.category,
            price: item.product.price,
            quantity: item.quantity
          }))
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.valid) {
        // Fallback: kód může existovat jen ve Firestore (když se nepovedl zápis do Postgres API)
        const fbCoupon = await findCouponByCodeInFirestore(code);
        if (fbCoupon) {
          const type = fbCoupon.type === 'fixed' ? 'fixed' : 'percent';
          const value = Number(fbCoupon.value) || 0;
          setAppliedCoupon({ code: String(fbCoupon.code).toUpperCase(), type, value });
          addToast('success', 'Slevový kód použit', type === 'percent'
            ? `Sleva ${value} % z ceny objednávky.`
            : `Sleva ${value.toLocaleString('cs-CZ')} Kč z ceny objednávky.`);
          return;
        }
        setAppliedCoupon(null);
        addToast('error', 'Kód se nepodařilo použít', data?.error || 'Slevový kód je neplatný nebo vypršel.');
        return;
      }
      setAppliedCoupon({ code: data.code, type: data.type, value: Number(data.value) || 0, categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [] });
      addToast('success', 'Slevový kód použit', Array.isArray(data.categoryIds) && data.categoryIds.length > 0
        ? 'Sleva se vztahuje pouze na vybrané kategorie v košíku.'
        : (data.type === 'percent' ? `Sleva ${(Number(data.value) || 0)}% z ceny objednávky.` : `Sleva ${(Number(data.value) || 0).toLocaleString('cs-CZ')} Kč z ceny objednávky.`));
    } catch (err: any) {
      setAppliedCoupon(null);
      addToast('error', 'Chyba', 'Slevový kód se nepodařilo ověřit. Zkuste to prosím znovu.');
    } finally {
      setCouponChecking(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      addToast('error', 'Košík je prázdný', 'Vložte do košíku alespoň jeden produkt.');
      return;
    }

    if (!fullName || !email || !phone) {
      addToast('error', 'Vyplňte kontaktní údaje', 'Jméno, e-mail a telefon jsou povinné.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customer: {
          fullName,
          email,
          phone,
          street,
          city,
          zip,
          country: 'Česká republika',
          note
        },
        items: cart.map(item => ({
          productId: item.product.id,
          title: item.product.title,
          price: item.product.price,
          quantity: item.quantity,
          category: item.product.category,
          imageUrl: item.product.imageUrl,
          customNote: item.customNote
        })),
        couponCode: appliedCoupon?.code || undefined
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || 'Objednávku se nepodařilo odeslat.');
      }

      const data = await res.json();
      const responseOrder = data.order as Order;

      // Success
      setOrderCompleted(responseOrder);
      clearCart();

      // Fire confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C5A880', '#2D2723', '#8C7355', '#EBDCC8']
        });
      } catch (cErr) {
        // ignore if not supported
      }

      addToast('success', 'Objednávka přijata', 'Objednávka byla úspěšně odeslána.');
    } catch (err: any) {
      console.error("Order submission error:", err);
      addToast('error', 'Chyba při odesílání', err.message || 'Nepodařilo se odeslat objednávku.');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (orderCompleted) {
    return (
      <div id="cart-success-view" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8DFC8] shadow-lg text-center space-y-8">

          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-[#F4F9F4] text-emerald-600 flex items-center justify-center mx-auto border-2 border-[#D3E8D6] shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          {/* EXACT REQUESTED MESSAGE FROM PROMPT */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8C7355]">
              Číslo objednávky: {orderCompleted.orderNumber || 'LUV-2026'}
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2723] leading-tight">
              Objednávka byla úspěšně přijata. Již brzy Vás budeme kontaktovat.
            </h1>
            <p className="text-sm text-[#7B6E63] max-w-lg mx-auto leading-relaxed">
              Děkujeme za Váš nákup v ateliéru Luvia Decor.
            </p>
          </div>

          {/* Order info summary */}
          <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-[#EDE5DA] text-left text-xs text-[#5C5046] space-y-2 max-w-md mx-auto">
            <p className="font-bold text-[#2D2723] uppercase text-[11px] border-b border-[#E8DFC8] pb-2 mb-2">
              Detaily předání & doručení:
            </p>
            <p><strong>Zákazník:</strong> {fullName || orderCompleted.customer?.fullName}</p>
            <p><strong>Telefon:</strong> {phone || orderCompleted.customer?.phone}</p>
            {street && <p><strong>Doručovací adresa:</strong> {street}, {zip} {city}</p>}
            <p><strong>Platba:</strong> Bez nutnosti online platby předem</p>
            <p><strong>Celková částka:</strong> {(orderCompleted.totalPrice || cartTotal).toLocaleString('cs-CZ')} Kč</p>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setOrderCompleted(null);
                setPage('catalog');
              }}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md transition cursor-pointer"
            >
              Pokračovat v prohlížení e-shopu
            </button>
            <button
              onClick={() => {
                setOrderCompleted(null);
                setPage('home');
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-[#2D2723] text-xs font-semibold rounded-full border border-[#E3DACF] transition cursor-pointer"
            >
              Zpět na hlavní stránku
            </button>
          </div>

          <p className="text-[11px] text-[#8C7355] pt-4">
            V případě dotazů volejte naši linku {config.phoneDisplay} nebo pište na {config.ordersEmail}
          </p>

        </div>
      </div>
    );
  }

  // EMPTY CART SCREEN
  if (cart.length === 0) {
    return (
      <div id="cart-empty-view" className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center mx-auto border border-[#E8DFC8]"><ShoppingBag className="w-10 h-10" /></div>
        <div className="space-y-2">
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">Váš košík je prázdný</h1>
          <p className="text-sm text-[#7B6E63] max-w-md mx-auto">Zatím jste do košíku nevložili žádnou dekoraci. Prohlédněte si naši nabídku věnců, aranžmá a doplňků.</p>
        </div>
        <button onClick={() => setPage('catalog')} className="px-8 py-3.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md transition cursor-pointer">Prozkoumat nabídku dekorací</button>
      </div>
    );
  }

  // ACTIVE CART VIEW
  return (
    <div id="cart-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-6">
        <div>
          <button onClick={() => setPage('catalog')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7355] hover:underline mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Zpět k výběru dekorací</button>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">Nákupní košík & objednávka</h1>
        </div>
        <button onClick={clearCart} className="text-xs text-stone-500 hover:text-rose-600 transition cursor-pointer">Vyprázdnit košík</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8C7355]">Vybrané dekorace ({cart.length})</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.product.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8DFC8] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#EBE3D8] shrink-0"><SafeImage src={item.product.imageUrl} alt={item.product.title} className="w-full h-full" loading="lazy" /></div>
                  <div><h3 className="font-editorial text-base sm:text-lg font-bold text-[#2D2723] line-clamp-1">{item.product.title}</h3><p className="text-xs font-bold text-[#8C7355] mt-0.5">{item.product.price > 0 ? `${item.product.pricePrefix || ''} ${item.product.price.toLocaleString('cs-CZ')} Kč / ks`.trim() : 'Cena dle dohody (nezávazná poptávka)'}</p>{item.customNote && <p className="text-[11px] text-stone-500 italic mt-1">Pozn.: {item.customNote}</p>}</div>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                  <div className="flex items-center border border-[#E3DACF] rounded-xl bg-[#FAF8F5] p-0.5"><button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg hover:bg-[#EBE2D7] text-xs font-bold flex items-center justify-center transition cursor-pointer" aria-label="Snížit množství"><Minus className="w-3 h-3" /></button><span className="w-8 text-center text-xs font-bold text-[#2D2723]">{item.quantity}</span><button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg hover:bg-[#EBE2D7] text-xs font-bold flex items-center justify-center transition cursor-pointer" aria-label="Zvýšit množství"><Plus className="w-3 h-3" /></button></div>
                  <div className="text-right min-w-[90px]"><span className="text-sm font-bold text-[#2D2723]">{item.product.price > 0 ? `${(item.product.price * item.quantity).toLocaleString('cs-CZ')} Kč` : 'Dle dohody'}</span></div>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Odebrat položku"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#FAF6F0] rounded-2xl p-5 border border-[#E3DACF] space-y-2 text-xs text-[#5C5046]"><div className="flex items-center gap-2 text-[#8C7355] font-semibold"><Truck className="w-4 h-4" /><span>Doručení: Kroměříž a okolí nebo osobní převzetí v ateliéru</span></div><p className="text-[11px] text-[#7B6E63]">Objednávka je nezávazná bez okamžité platby kartou. Před doručením či předáním vás budeme kontaktovat a potvrdíme přesný termín i adresu předání v Kroměříži a okolí.</p></div>
        </div>

        <div className="lg:col-span-5"><div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-md space-y-6">
          <h2 className="font-editorial text-2xl font-bold text-[#2D2723] border-b border-[#F2ECE4] pb-3">Doručovací & kontaktní údaje</h2>
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Jméno a příjmení *</label><input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Např. Kateřina Dvořáková" className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">E-mail pro potvrzení *</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="katerina@seznam.cz" className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Telefon *</label><input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+420 777 123 456" className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div></div>
            <div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Ulice a číslo popisné</label><input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Kovářská 15" className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Město</label><input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Kroměříž" className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">PSČ</label><input type="text" value={zip} onChange={e => setZip(e.target.value)} placeholder="767 01" className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div></div>
            <div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Poznámka k objednávce</label><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Např. osobní vyzvednutí v ateliéru / speciální přání k balení..." className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /></div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#5C5046]">Slevový kód</label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-700"><Tag className="w-4 h-4" />{appliedCoupon.code}<span className="font-semibold">(−{appliedCoupon.type === 'percent' ? `${appliedCoupon.value} %` : `${appliedCoupon.value.toLocaleString('cs-CZ')} Kč`})</span></span>
                  <button type="button" onClick={() => setAppliedCoupon(null)} className="p-1 text-emerald-700 hover:text-rose-600 transition cursor-pointer" aria-label="Odebrat slevový kód" title="Odebrat slevový kód"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2"><input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }} placeholder="Např. JARO10" className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" /><button type="button" onClick={handleApplyCoupon} disabled={couponChecking} className="px-4 py-2.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] border border-[#E3DACF] text-[#5C4830] text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap">{couponChecking ? 'Ověřuji…' : 'Použít'}</button></div>
              )}
            </div>

            <div className="pt-4 border-t border-[#F2ECE4] space-y-2 text-xs">
              <div className="flex justify-between text-[#5C5046]"><span>Mezisoučet produktů:</span><span>{cartTotal.toLocaleString('cs-CZ')} Kč</span></div>
              <div className="flex justify-between text-[#5C5046]"><span>Doprava:</span><span className="text-emerald-700 font-semibold">Kroměříž a okolí / Osobní odběr</span></div>
              {discount > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Sleva ({appliedCoupon?.code}):</span><span>−{discount.toLocaleString('cs-CZ')} Kč</span></div>}
              {appliedCoupon && appliedCoupon.categoryIds.length > 0 && <p className="text-[10px] text-[#8C7355]">Kód platí pouze na vybrané kategorie. Sleva se započítává jen z oprávněných položek.</p>}
              <div className="flex justify-between items-baseline pt-2 border-t border-[#F0EAE1] text-base font-bold text-[#2D2723]"><span>Celková cena:</span><span className="text-xl text-[#8C7355]">{grandTotal.toLocaleString('cs-CZ')} Kč</span></div>
            </div>

            <button type="submit" disabled={submitting} className="w-full py-4 px-6 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"><Send className="w-4 h-4" /><span>{submitting ? 'Odesílám objednávku...' : 'Odeslat objednávku (bez nutnosti platby)'}</span></button>
          </form>
        </div></div>
      </div>
    </div>
  );
};
