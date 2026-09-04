import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CheckCircle2, Truck, Send, Tag, X, MapPin, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order } from '../types';
import { SafeImage } from '../components/SafeImage';
import { PacketaPickupWidget } from '../components/PacketaPickupWidget';
import { DpdPickupWidget } from '../components/DpdPickupWidget';
import { findCouponByCodeInFirestore } from '../services/firestoreService';
import { useApp } from '../context/AppContext';

const DEFAULT_SHIPPING = {
  carriers: {
    DPD: { enabled: true, address: 105, pickup_point: 75, box: 75 },
    'Zásilkovna': { enabled: true, address: 89, pickup_point: 62, box: 62 }
  },
  personalPickup: { enabled: true, price: 0, label: 'Osobní odběr – Kroměříž' }
};

type DeliveryMethod = 'address' | 'pickup_point' | 'box' | 'personal_pickup';

const BANK_ACCOUNT = '963625011';
const BANK_CODE = '5500';
const getVariableSymbol = (order: any) => String(order?.orderNumber || order?.id || '').replace(/\D/g, '');
const paymentQrUrl = (order: any, size = 300) => {
  const number = String(order?.orderNumber || order?.id || '');
  const amount = Number(order?.totalPrice || 0).toFixed(2);
  const vs = getVariableSymbol(order);
  return `https://api.paylibo.com/paylibo/generator/czech/image?compress=false&size=${size}&accountNumber=${BANK_ACCOUNT}&bankCode=${BANK_CODE}&amount=${encodeURIComponent(amount)}&currency=CZK&vs=${encodeURIComponent(vs)}&message=${encodeURIComponent(number)}`;
};

export const CartPage: React.FC = () => {
  const { cart, cartTotal, removeFromCart, updateCartQuantity, clearCart, setPage, addToast, config } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [note, setNote] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('address');
  const [carrier, setCarrier] = useState('DPD');
  const [pickupPoint, setPickupPoint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'percent' | 'fixed'; value: number; categoryIds: string[] } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const trustpilotSentRef = useRef<string | null>(null);

  const shippingConfig = (config as any)?.shipping || DEFAULT_SHIPPING;
  const carrierEntries = Object.entries(shippingConfig?.carriers || DEFAULT_SHIPPING.carriers) as Array<[string, any]>;
  const activeCarriers = carrierEntries.filter(([, value]) => value?.enabled !== false);
  const getCarrierConfig = (name: string) => shippingConfig?.carriers?.[name] || DEFAULT_SHIPPING.carriers[name as keyof typeof DEFAULT_SHIPPING.carriers];
  const carrierConfig = getCarrierConfig(carrier) || {};

  useEffect(() => {
    if (!activeCarriers.some(([name]) => name === carrier)) setCarrier(activeCarriers[0]?.[0] || 'DPD');
  }, [shippingConfig?.carriers]);

  useEffect(() => {
    if (!orderCompleted) return;
    const emailAddress = orderCompleted?.customer?.email || email;
    const referenceId = String(orderCompleted?.orderNumber || orderCompleted?.id || '');
    if (!emailAddress || !referenceId || trustpilotSentRef.current === referenceId) return;
    let cancelled = false;
    let attempts = 0;
    const sendInvitation = () => {
      if (cancelled) return;
      const tp = (window as any).tp;
      if (typeof tp === 'function') {
        trustpilotSentRef.current = referenceId;
        try {
          tp('createInvitation', {
            recipientEmail: emailAddress,
            recipientName: orderCompleted?.customer?.fullName || fullName || '',
            referenceId,
            source: 'InvitationScript',
            productSkus: (orderCompleted.items || []).map((item: any) => String(item.productId || item.sku || '')).filter(Boolean)
          });
        } catch (error) {
          trustpilotSentRef.current = null;
          console.warn('Trustpilot invitation failed:', error);
        }
        return;
      }
      if (attempts++ < 50) window.setTimeout(sendInvitation, 200);
    };
    sendInvitation();
    return () => { cancelled = true; };
  }, [orderCompleted, email, fullName]);

  const eligibleCouponSubtotal = appliedCoupon && appliedCoupon.categoryIds.length > 0
    ? cart.reduce((sum, item) => appliedCoupon.categoryIds.includes(item.product.category) ? sum + item.product.price * item.quantity : sum, 0)
    : cartTotal;
  const discount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Math.round(eligibleCouponSubtotal * (appliedCoupon.value / 100))
      : Math.min(appliedCoupon.value, eligibleCouponSubtotal)
    : 0;
  const shipping = deliveryMethod === 'personal_pickup'
    ? Number(shippingConfig?.personalPickup?.price || 0)
    : deliveryMethod === 'address'
      ? Number(carrierConfig?.address || 0)
      : deliveryMethod === 'box'
        ? Number(carrierConfig?.box ?? carrierConfig?.pickup_point ?? 0)
        : Number(carrierConfig?.pickup_point || 0);
  const grandTotal = Math.max(0, cartTotal - discount + shipping);

  const chooseCarrier = (name: string) => {
    setCarrier(name);
    setDeliveryMethod('address');
    setPickupPoint('');
  };

  const chooseDelivery = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    setPickupPoint('');
  };

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
        body: JSON.stringify({ code, items: cart.map(item => ({ productId: item.product.id, category: item.product.category, price: item.product.price, quantity: item.quantity })) })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.valid) {
        setAppliedCoupon({ code: data.code, type: data.type === 'fixed' ? 'fixed' : 'percent', value: Number(data.value) || 0, categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [] });
        addToast('success', 'Slevový kód použit', data.type === 'percent' ? `Sleva ${Number(data.value) || 0} % z ceny objednávky.` : `Sleva ${(Number(data.value) || 0).toLocaleString('cs-CZ')} Kč z ceny objednávky.`);
        return;
      }
      const fallback = await findCouponByCodeInFirestore(code);
      if (fallback) {
        const type = fallback.type === 'fixed' ? 'fixed' : 'percent';
        const value = Number(fallback.value) || 0;
        setAppliedCoupon({ code: String(fallback.code).toUpperCase(), type, value, categoryIds: Array.isArray(fallback.categoryIds) ? fallback.categoryIds : [] });
        addToast('success', 'Slevový kód použit', type === 'percent' ? `Sleva ${value} % z ceny objednávky.` : `Sleva ${value.toLocaleString('cs-CZ')} Kč z ceny objednávky.`);
        return;
      }
      setAppliedCoupon(null);
      addToast('error', 'Kód se nepodařilo použít', data?.error || 'Slevový kód je neplatný nebo vypršel.');
    } catch {
      setAppliedCoupon(null);
      addToast('error', 'Chyba', 'Slevový kód se nepodařilo ověřit. Zkuste to prosím znovu.');
    } finally {
      setCouponChecking(false);
    }
  };

  const handleSubmitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cart.length) {
      addToast('error', 'Košík je prázdný', 'Vložte do košíku alespoň jeden produkt.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      addToast('error', 'Vyplňte kontaktní údaje', 'Jméno, e-mail a telefon jsou povinné.');
      return;
    }
    if (deliveryMethod === 'address' && (!street.trim() || !city.trim() || !zip.trim())) {
      addToast('error', 'Chybí doručovací adresa', 'Pro doručení na adresu vyplňte ulici, město a PSČ.');
      return;
    }
    if ((deliveryMethod === 'pickup_point' || deliveryMethod === 'box') && !pickupPoint.trim()) {
      addToast('error', deliveryMethod === 'box' ? 'Vyberte box' : 'Vyberte výdejní místo', `Nejprve vyberte ${deliveryMethod === 'box' ? 'box' : 'výdejní místo'} ${carrier}.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          street: deliveryMethod === 'personal_pickup' ? '' : street.trim(),
          city: deliveryMethod === 'personal_pickup' ? '' : city.trim(),
          zip: deliveryMethod === 'personal_pickup' ? '' : zip.trim(),
          country: 'Česká republika',
          note: note.trim()
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
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod: 'bank_transfer',
        delivery: deliveryMethod === 'personal_pickup'
          ? { method: 'personal_pickup' }
          : { method: deliveryMethod, carrier, ...((deliveryMethod === 'pickup_point' || deliveryMethod === 'box') ? { pickupPoint: pickupPoint.trim() } : {}) }
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.order) throw new Error(data?.error || 'Objednávku se nepodařilo odeslat.');
      setOrderCompleted(data.order as Order);
      clearCart();
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#C5A880', '#2D2723', '#8C7355', '#EBDCC8'] }); } catch {}
      addToast('success', 'Objednávka přijata', 'Objednávka byla úspěšně odeslána.');
    } catch (error: any) {
      console.error('Order submission error:', error);
      addToast('error', 'Chyba při odesílání', error?.message || 'Nepodařilo se odeslat objednávku.');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderCompleted) {
    const delivery = orderCompleted.delivery || {};
    const deliveryLabel = delivery.method === 'personal_pickup'
      ? 'Osobní odběr – Kroměříž'
      : delivery.method === 'box'
        ? `Box – ${delivery.carrier || ''}`
        : delivery.method === 'pickup_point'
          ? `Výdejní místo – ${delivery.carrier || ''}`
          : `Doručení na adresu – ${delivery.carrier || ''}`;
    return (
      <div id="cart-success-view" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8DFC8] shadow-lg text-center space-y-8">
          <div className="w-20 h-20 rounded-full bg-[#F4F9F4] text-emerald-600 flex items-center justify-center mx-auto border-2 border-[#D3E8D6]"><CheckCircle2 className="w-10 h-10" /></div>
          <div className="space-y-3"><span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8C7355]">Číslo objednávky: {orderCompleted.orderNumber}</span><h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">Objednávka byla úspěšně přijata.</h1><p className="text-sm text-[#7B6E63]">Již brzy Vás budeme kontaktovat. Děkujeme za Váš nákup v ateliéru Luvia Decor.</p></div>
          <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-[#EDE5DA] text-left text-xs text-[#5C5046] space-y-2 max-w-md mx-auto"><p className="font-bold text-[#2D2723] uppercase text-[11px] border-b border-[#E8DFC8] pb-2 mb-2">Detaily objednávky</p><p><strong>Zákazník:</strong> {orderCompleted.customer?.fullName}</p><p><strong>Telefon:</strong> {orderCompleted.customer?.phone}</p><p><strong>Doprava:</strong> {deliveryLabel}</p>{delivery.pickupPoint && <p><strong>{delivery.method === 'box' ? 'Vybraný box' : 'Výdejní místo'}:</strong> {delivery.pickupPoint}</p>}{delivery.method !== 'personal_pickup' && orderCompleted.customer?.street && <p><strong>Adresa:</strong> {orderCompleted.customer.street}, {orderCompleted.customer.zip} {orderCompleted.customer.city}</p>}<p><strong>Platba:</strong> Bankovním převodem</p><p><strong>Doprava:</strong> {Number(orderCompleted.shipping || 0).toLocaleString('cs-CZ')} Kč</p><p><strong>Celkem:</strong> {Number(orderCompleted.totalPrice || 0).toLocaleString('cs-CZ')} Kč</p></div>
          <div className="bg-[#FBF8F4] rounded-2xl border border-[#E3D8CA] p-6 max-w-md mx-auto"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8C7355] mb-2">Platba bankovním převodem</div><h2 className="font-editorial text-2xl font-bold text-[#2D2723]">QR Platba</h2><p className="text-xs text-[#7B6E63] mt-2 mb-4">Naskenujte QR kód ve své bankovní aplikaci.</p><img src={paymentQrUrl(orderCompleted)} alt="QR Platba" className="w-[260px] h-[260px] max-w-full mx-auto bg-white p-2 rounded-xl border border-[#E8DFC8]" /><div className="mt-5 text-left text-xs text-[#5C5046] space-y-2"><div className="flex justify-between gap-4"><strong>Účet:</strong><span>{BANK_ACCOUNT}/{BANK_CODE}</span></div><div className="flex justify-between gap-4"><strong>Částka:</strong><span>{Number(orderCompleted.totalPrice || 0).toLocaleString('cs-CZ')} Kč</span></div><div className="flex justify-between gap-4"><strong>Variabilní symbol:</strong><span>{getVariableSymbol(orderCompleted)}</span></div><div className="flex justify-between gap-4"><strong>Poznámka:</strong><span>{orderCompleted.orderNumber}</span></div></div></div>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"><button onClick={() => { setOrderCompleted(null); setPage('catalog'); }} className="w-full sm:w-auto px-8 py-3.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md transition cursor-pointer">Pokračovat v prohlížení</button><button onClick={() => { setOrderCompleted(null); setPage('home'); }} className="w-full sm:w-auto px-6 py-3.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-[#2D2723] text-xs font-semibold rounded-full border border-[#E3DACF]">Zpět na hlavní stránku</button></div>
        </div>
      </div>
    );
  }

  if (!cart.length) return <div id="cart-empty-view" className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6"><div className="w-20 h-20 rounded-full bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center mx-auto border border-[#E8DFC8]"><ShoppingBag className="w-10 h-10" /></div><div className="space-y-2"><h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">Váš košík je prázdný</h1><p className="text-sm text-[#7B6E63] max-w-md mx-auto">Zatím jste do košíku nevložili žádnou dekoraci. Prohlédněte si naši nabídku.</p></div><button onClick={() => setPage('catalog')} className="px-8 py-3.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-full">Prozkoumat nabídku dekorací</button></div>;

  return (
    <div id="cart-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-6"><div><button onClick={() => setPage('catalog')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7355] hover:underline mb-2"><ArrowLeft className="w-3.5 h-3.5" />Zpět k výběru dekorací</button><h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">Nákupní košík & objednávka</h1></div><button type="button" onClick={clearCart} className="text-xs text-stone-500 hover:text-rose-600">Vyprázdnit košík</button></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8C7355]">Vybrané dekorace ({cart.length})</h2>
          <div className="space-y-3">{cart.map(item => <div key={item.product.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8DFC8] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div className="flex items-center gap-4 flex-1 min-w-0"><div className="w-20 h-20 rounded-xl overflow-hidden border border-[#EBE3D8] shrink-0"><SafeImage src={item.product.imageUrl} alt={item.product.title} className="w-full h-full" loading="lazy" /></div><div className="min-w-0"><h3 className="font-editorial text-base sm:text-lg font-bold text-[#2D2723] truncate">{item.product.title}</h3><p className="text-xs font-bold text-[#8C7355] mt-0.5">{item.product.price > 0 ? `${item.product.pricePrefix || ''} ${item.product.price.toLocaleString('cs-CZ')} Kč / ks`.trim() : 'Cena dle dohody'}</p>{item.customNote && <p className="text-[11px] text-stone-500 italic mt-1">Pozn.: {item.customNote}</p>}</div></div><div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4"><div className="flex items-center border border-[#E3DACF] rounded-xl bg-[#FAF8F5] p-0.5"><button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg hover:bg-[#EBE2D7] flex items-center justify-center"><Minus className="w-3 h-3" /></button><span className="w-8 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg hover:bg-[#EBE2D7] flex items-center justify-center"><Plus className="w-3 h-3" /></button></div><div className="text-right min-w-[90px]"><span className="text-sm font-bold">{item.product.price > 0 ? `${(item.product.price * item.quantity).toLocaleString('cs-CZ')} Kč` : 'Dle dohody'}</span></div><button type="button" onClick={() => removeFromCart(item.product.id)} className="p-2 text-stone-400 hover:text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>
          <div className="bg-[#FAF6F0] rounded-2xl p-5 border border-[#E3DACF] text-xs text-[#5C5046]"><div className="flex items-center gap-2 text-[#8C7355] font-semibold"><Truck className="w-4 h-4" /><span>Doručení kdekoliv + osobní odběr Kroměříž</span></div><p className="mt-2 text-[11px] text-[#7B6E63]">Zvolte dopravce, způsob doručení a případně výdejní místo nebo box. Cena dopravy se automaticky přepočítá.</p></div>
        </div>

        <div className="lg:col-span-5"><div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-md space-y-6"><h2 className="font-editorial text-2xl font-bold text-[#2D2723] border-b border-[#F2ECE4] pb-3">Doručení a objednávka</h2><form onSubmit={handleSubmitOrder} className="space-y-4">
          <div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Jméno a příjmení *</label><input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">E-mail *</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Telefon *</label><input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div></div>
          <div className="space-y-3"><label className="block text-xs font-semibold text-[#5C5046]">1. Vyberte dopravce *</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{activeCarriers.map(([name, cc]) => <button key={name} type="button" onClick={() => chooseCarrier(name)} className={`p-3 rounded-xl border text-left ${carrier === name && deliveryMethod !== 'personal_pickup' ? 'border-[#8C7355] bg-[#FAF5EE] ring-1 ring-[#8C7355]/20' : 'border-[#E3DACF] bg-[#FAF8F5]'}`}><div className="text-xs font-bold text-[#2D2723]">{name}</div><div className="text-[10px] text-[#817469] mt-1">Adresa od {Number(cc?.address || 0).toLocaleString('cs-CZ')} Kč · výdejní místo od {Number(cc?.pickup_point || 0).toLocaleString('cs-CZ')} Kč</div></button>)}{shippingConfig?.personalPickup?.enabled !== false && <button type="button" onClick={() => { setDeliveryMethod('personal_pickup'); setPickupPoint(''); }} className={`p-3 rounded-xl border text-left sm:col-span-2 ${deliveryMethod === 'personal_pickup' ? 'border-[#8C7355] bg-[#FAF5EE] ring-1 ring-[#8C7355]/20' : 'border-[#E3DACF] bg-[#FAF8F5]'}`}><div className="text-xs font-bold">{shippingConfig?.personalPickup?.label || 'Osobní odběr – Kroměříž'}</div><div className="text-[10px] text-[#817469] mt-1">{Number(shippingConfig?.personalPickup?.price || 0) === 0 ? 'Zdarma' : `${Number(shippingConfig?.personalPickup?.price || 0).toLocaleString('cs-CZ')} Kč`}</div></button>}</div></div>
          {deliveryMethod !== 'personal_pickup' && <>
            <div className="space-y-3"><label className="block text-xs font-semibold text-[#5C5046]">2. Zvolte způsob doručení *</label><div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{([['address','Na adresu','Kurýr'],['pickup_point','Výdejní místo','Pobočka'],['box','Box','Výdejní box']] as const).map(([value,label,desc]) => <button key={value} type="button" onClick={() => chooseDelivery(value)} className={`p-3 rounded-xl border text-left ${deliveryMethod === value ? 'border-[#8C7355] bg-[#FAF5EE] ring-1 ring-[#8C7355]/20' : 'border-[#E3DACF] bg-[#FAF8F5]'}`}><div className="text-xs font-bold">{label}</div><div className="text-[10px] text-[#817469] mt-1">{desc} · {(value === 'address' ? Number(carrierConfig?.address || 0) : value === 'pickup_point' ? Number(carrierConfig?.pickup_point || 0) : Number(carrierConfig?.box ?? carrierConfig?.pickup_point ?? 0)).toLocaleString('cs-CZ')} Kč</div></button>)}</div></div>
            {(deliveryMethod === 'pickup_point' || deliveryMethod === 'box') && <div className="rounded-2xl border border-[#E3DACF] bg-[#FAF8F5] p-4"><div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#8C7355]" /><div><p className="text-xs font-bold">Vyberte {deliveryMethod === 'box' ? 'box' : 'výdejní místo'} · {carrier}</p><p className="text-[11px] text-[#817469] mt-1">Otevře se mapa výdejních míst a boxů přes API dopravce.</p></div></div>{pickupPoint && <div className="mt-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800"><strong>Vybráno:</strong> {pickupPoint}</div>}{carrier === 'Zásilkovna' ? <PacketaPickupWidget onSelect={(point) => { const label = [point.name, point.street, [point.zip, point.city].filter(Boolean).join(' ')].filter(Boolean).join(', '); setPickupPoint(label || String(point.id || 'Vybrané výdejní místo')); }} /> : carrier === 'DPD' ? <DpdPickupWidget onSelect={(point) => { const label = [point.name, point.address, [point.zip, point.city].filter(Boolean).join(' ')].filter(Boolean).join(' '); setPickupPoint(label || String(point.id || 'Vybrané DPD místo')); }} /> : <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">Mapa pro tohoto nového dopravce zatím není napojená. Výdejní místo/box zadejte po dohodě ručně.</div>}</div>}
          </>}
          {deliveryMethod !== 'personal_pickup' && <><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Ulice a číslo {deliveryMethod === 'address' ? '*' : ''}</label><input required={deliveryMethod === 'address'} value={street} onChange={e => setStreet(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Město {deliveryMethod === 'address' ? '*' : ''}</label><input required={deliveryMethod === 'address'} value={city} onChange={e => setCity(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div><div><label className="block text-xs font-semibold text-[#5C5046] mb-1">PSČ {deliveryMethod === 'address' ? '*' : ''}</label><input required={deliveryMethod === 'address'} value={zip} onChange={e => setZip(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div></div></>}
          {deliveryMethod === 'personal_pickup' && <div className="rounded-2xl bg-[#FAF5EE] border border-[#E3DACF] p-4 text-xs text-[#5C5046]"><strong>{shippingConfig?.personalPickup?.label || 'Osobní odběr – Kroměříž'}</strong><p className="mt-1 text-[11px] text-[#7B6E63]">Po odeslání objednávky Vás budeme kontaktovat a domluvíme přesný termín a místo předání.</p></div>}
          <div><label className="block text-xs font-semibold text-[#5C5046] mb-1">Poznámka k objednávce</label><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" /></div>
          <div className="space-y-2"><label className="block text-xs font-semibold text-[#5C5046]">Slevový kód</label>{appliedCoupon ? <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl"><span className="flex items-center gap-2 text-xs font-bold text-emerald-700"><Tag className="w-4 h-4" />{appliedCoupon.code} <span>(−{appliedCoupon.type === 'percent' ? `${appliedCoupon.value} %` : `${appliedCoupon.value.toLocaleString('cs-CZ')} Kč`})</span></span><button type="button" onClick={() => setAppliedCoupon(null)}><X className="w-4 h-4" /></button></div> : <div className="flex gap-2"><input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs uppercase" placeholder="Např. JARO10" /><button type="button" onClick={handleApplyCoupon} disabled={couponChecking} className="px-4 py-2.5 bg-[#FAF5EE] border border-[#E3DACF] rounded-xl text-xs font-bold">{couponChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Použít'}</button></div>}</div>
          <div className="rounded-2xl border border-[#E3DACF] bg-[#FAF8F5] p-4"><div className="text-xs font-bold">Způsob platby</div><div className="mt-2 text-sm font-semibold text-[#8C7355]">Bankovní převod</div><p className="mt-1 text-[11px] text-[#7B6E63]">Objednávku odešlete s povinností platby bankovním převodem.</p></div>
          <div className="pt-4 border-t border-[#F2ECE4] space-y-2 text-xs"><div className="flex justify-between"><span>Mezisoučet produktů:</span><span>{cartTotal.toLocaleString('cs-CZ')} Kč</span></div><div className="flex justify-between"><span>Doprava:</span><span className={shipping > 0 ? 'font-semibold' : 'text-emerald-700 font-semibold'}>{shipping > 0 ? `${shipping.toLocaleString('cs-CZ')} Kč` : 'Zdarma'}</span></div>{discount > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Sleva ({appliedCoupon?.code}):</span><span>−{discount.toLocaleString('cs-CZ')} Kč</span></div>}<div className="flex justify-between items-baseline pt-2 border-t border-[#F0EAE1] text-base font-bold"><span>Celková cena:</span><span className="text-xl text-[#8C7355]">{grandTotal.toLocaleString('cs-CZ')} Kč</span></div></div>
          <button type="submit" disabled={submitting} className="w-full py-4 px-6 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /><span>{submitting ? 'Odesílám objednávku...' : 'Odeslat objednávku s povinností platby.'}</span></button>
        </form></div></div>
      </div>
    </div>
  );
};