import React, { useState } from 'react';
import { CheckCircle2, Minus, Plus, Trash2, ArrowLeft, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DpdPickupWidget } from '../components/DpdPickupWidget';

const SHIPPING = { DPD: { address: 105, pickup_point: 75, box: 75 }, 'Zásilkovna': { address: 89, pickup_point: 62, box: 62 } };
type Method = 'address' | 'pickup_point' | 'box' | 'personal_pickup';
const bankIban = 'CZ45550000000000963625011';
const qr = (order: any) => {
  const number = String(order?.orderNumber || order?.id || '');
  const vs = number.replace(/\D/g, '');
  const amount = Number(order?.totalPrice || 0).toFixed(2);
  const payload = `SPD*1.0*ACC:${bankIban}*AM:${amount}*CC:CZK*X-VS:${vs}*X-MSG:${number}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(payload)}`;
};

export const StableCartPage: React.FC = () => {
  const { cart, cartTotal, removeFromCart, updateCartQuantity, clearCart, setPage, addToast } = useApp();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [street, setStreet] = useState(''); const [city, setCity] = useState(''); const [zip, setZip] = useState(''); const [note, setNote] = useState('');
  const [carrier, setCarrier] = useState<'DPD' | 'Zásilkovna'>('DPD'); const [method, setMethod] = useState<Method>('address'); const [point, setPoint] = useState<any>(null); const [picker, setPicker] = useState(false);
  const [sending, setSending] = useState(false); const [done, setDone] = useState<any>(null);
  const shipping = method === 'personal_pickup' ? 0 : SHIPPING[carrier][method];
  const total = cartTotal + shipping;
  const selectMethod = (m: Method) => { setMethod(m); setPoint(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) return addToast('error', 'Košík je prázdný', 'Přidejte nejprve produkt.');
    if (!name.trim() || !email.trim() || !phone.trim()) return addToast('error', 'Chybí údaje', 'Vyplňte jméno, e-mail a telefon.');
    if (method === 'address' && (!street.trim() || !city.trim() || !zip.trim())) return addToast('error', 'Chybí adresa', 'Vyplňte ulici, město a PSČ.');
    if ((method === 'pickup_point' || method === 'box') && !point) return addToast('error', 'Vyberte místo', 'Otevřete mapu a vyberte výdejní místo nebo box.');
    setSending(true);
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        customer: { fullName: name.trim(), email: email.trim(), phone: phone.trim(), street: method === 'personal_pickup' ? '' : street.trim(), city: method === 'personal_pickup' ? '' : city.trim(), zip: method === 'personal_pickup' ? '' : zip.trim(), country: 'Česká republika', note: note.trim() },
        items: cart.map(i => ({ productId: i.product.id, title: i.product.title, price: i.product.price, quantity: i.quantity, category: i.product.category, imageUrl: i.product.imageUrl, customNote: i.customNote })),
        paymentMethod: 'bank_transfer',
        delivery: method === 'personal_pickup' ? { method: 'personal_pickup' } : { method, carrier, pickupPoint: point ? String(point.name || point.address || point.id || 'Vybrané místo') : undefined }
      }) });
      const d = await r.json();
      if (!r.ok || !d.order) throw new Error(d.error || 'Objednávku se nepodařilo odeslat.');
      setDone(d.order); clearCart(); addToast('success', 'Objednávka přijata', 'Objednávka byla úspěšně odeslána.');
    } catch (err: any) { addToast('error', 'Chyba při odesílání', err?.message || 'Zkuste to znovu.'); }
    finally { setSending(false); }
  };

  if (done) {
    const vs = String(done.orderNumber || done.id || '').replace(/\D/g, '');
    return <div className="max-w-3xl mx-auto px-4 py-14"><div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-lg p-8 sm:p-12 text-center">
      <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600 mb-5"/><p className="text-xs uppercase tracking-[.2em] text-[#8C7355]">Číslo objednávky: {done.orderNumber}</p>
      <h1 className="font-editorial text-3xl font-bold mt-3 text-[#2D2723]">Objednávka byla úspěšně přijata.</h1>
      <p className="text-sm text-[#7B6E63] mt-3">Děkujeme za Váš nákup. Níže najdete údaje pro bankovní převod.</p>
      <div className="mt-8 rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-6 text-left space-y-2 text-sm"><p><b>Číslo účtu:</b> 963625011/5500</p><p><b>IBAN:</b> CZ45 5500 0000 0096 3625 011</p><p><b>Variabilní symbol:</b> {vs}</p><p><b>Částka:</b> {Number(done.totalPrice || 0).toLocaleString('cs-CZ')} Kč</p><p><b>Poznámka pro příjemce:</b> {done.orderNumber}</p></div>
      <div className="mt-6 flex justify-center"><img src={qr(done)} alt="QR platba" width="260" height="260" className="rounded-xl border border-[#E3D8CA]"/></div>
      <p className="mt-4 text-xs text-[#7B6E63]">QR platba obsahuje číslo objednávky také jako poznámku pro příjemce.</p>
      <button type="button" onClick={() => setPage('home')} className="mt-8 px-6 py-3 rounded-xl bg-[#2D2723] text-white text-sm font-bold">Zpět na úvod</button>
    </div></div>;
  }

  if (!cart.length) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><h1 className="font-editorial text-4xl font-bold text-[#2D2723]">Košík je prázdný</h1><p className="mt-3 text-[#7B6E63]">Vyberte si něco krásného z naší nabídky.</p><button onClick={() => setPage('catalog')} className="mt-7 px-6 py-3 rounded-xl bg-[#2D2723] text-white font-bold">Prohlédnout produkty</button></div>;

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><button type="button" onClick={() => setPage('catalog')} className="flex items-center gap-2 text-sm text-[#7B6E63] mb-6"><ArrowLeft className="w-4 h-4"/> Zpět do nabídky</button>
    <h1 className="font-editorial text-4xl font-bold text-[#2D2723]">Váš košík</h1><div className="grid lg:grid-cols-[1fr_420px] gap-8 mt-8"><div className="space-y-3">{cart.map(i => <div key={i.product.id} className="bg-white rounded-2xl border border-[#E8DFC8] p-4 flex gap-4 items-center"><div className="w-20 h-20 rounded-xl bg-[#F5F1EC] overflow-hidden">{i.product.imageUrl && <img src={i.product.imageUrl} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1"><div className="font-bold text-[#2D2723]">{i.product.title}</div><div className="text-sm text-[#8C7355] mt-1">{Number(i.product.price).toLocaleString('cs-CZ')} Kč</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => updateCartQuantity(i.product.id, i.quantity - 1)} className="p-2 rounded-lg border"><Minus className="w-4 h-4"/></button><span>{i.quantity}</span><button type="button" onClick={() => updateCartQuantity(i.product.id, i.quantity + 1)} className="p-2 rounded-lg border"><Plus className="w-4 h-4"/></button><button type="button" onClick={() => removeFromCart(i.product.id)} className="p-2 text-rose-600"><Trash2 className="w-4 h-4"/></button></div></div>)}</div>
      <form onSubmit={submit} className="bg-white rounded-3xl border border-[#E8DFC8] p-6 sm:p-8 space-y-5"><h2 className="font-editorial text-2xl font-bold">Dodací údaje</h2>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Jméno a příjmení" className="w-full rounded-xl border p-3"/><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-xl border p-3"/><input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon" className="w-full rounded-xl border p-3"/>
        <div className="grid grid-cols-2 gap-2">{(['DPD','Zásilkovna'] as const).map(c => <button type="button" key={c} onClick={() => { setCarrier(c); setMethod('address'); setPoint(null); }} className={`rounded-xl border p-3 font-bold ${carrier === c ? 'border-[#8C7355] bg-[#FAF5EE]' : ''}`}>{c}</button>)}</div>
        <div className="grid grid-cols-2 gap-2">{([['address','Na adresu'],['pickup_point','Výdejní místo'],['box','Box'],['personal_pickup','Osobní odběr Kroměříž']] as [Method,string][]).map(([m,l]) => <button type="button" key={m} onClick={() => selectMethod(m)} className={`rounded-xl border p-3 text-sm ${method === m ? 'border-[#8C7355] bg-[#FAF5EE]' : ''}`}>{l}</button>)}</div>
        {method === 'address' && <><input required value={street} onChange={e => setStreet(e.target.value)} placeholder="Ulice a číslo" className="w-full rounded-xl border p-3"/><div className="grid grid-cols-2 gap-2"><input required value={city} onChange={e => setCity(e.target.value)} placeholder="Město" className="w-full rounded-xl border p-3"/><input required value={zip} onChange={e => setZip(e.target.value)} placeholder="PSČ" className="w-full rounded-xl border p-3"/></div></>}
        {(method === 'pickup_point' || method === 'box') && <><button type="button" onClick={() => setPicker(true)} className="w-full rounded-xl border border-[#8C7355] p-4 font-bold flex items-center justify-center gap-2"><MapPin className="w-4 h-4"/> {point ? 'Změnit vybrané místo' : 'Vybrat na mapě'}</button>{point && <div className="text-xs bg-[#FAF8F5] rounded-xl p-3">Vybrané místo: <b>{String(point.name || point.address || point.id || 'Vybrané místo')}</b></div>}</>}
        {picker && <DpdPickupWidget onSelect={p => { setPoint(p); setPicker(false); }}/>}<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Poznámka k objednávce (nepovinné)" className="w-full rounded-xl border p-3 min-h-24"/>
        <div className="border-t pt-5 space-y-2"><div className="flex justify-between text-sm"><span>Zboží</span><b>{cartTotal.toLocaleString('cs-CZ')} Kč</b></div><div className="flex justify-between text-sm"><span>Doprava</span><b>{shipping.toLocaleString('cs-CZ')} Kč</b></div><div className="flex justify-between text-lg"><span>Celkem</span><b>{total.toLocaleString('cs-CZ')} Kč</b></div><div className="text-xs text-[#7B6E63]">Platba: bankovní převod</div></div>
        <button type="submit" disabled={sending} className="w-full rounded-xl bg-[#2D2723] text-white py-4 font-bold disabled:opacity-50">{sending ? 'Odesílám objednávku…' : 'Odeslat objednávku'}</button>
      </form></div></div>;
};
