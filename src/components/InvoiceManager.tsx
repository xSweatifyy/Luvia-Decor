import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Download, Trash2, Printer, Save, ReceiptText, Palette } from 'lucide-react';

type InvoiceItem = { name: string; qty: number; price: number; vat: number };
type Invoice = {
  id: string; number: string; date: string; dueDate: string; variableSymbol: string;
  sellerName: string; sellerAddress: string; sellerIco: string; sellerDic: string;
  buyerName: string; buyerAddress: string; buyerIco: string; buyerDic: string; buyerEmail: string;
  paymentMethod: string; bankAccount: string; iban: string; bic: string; note: string;
  style: string; items: InvoiceItem[]; shipping: number; discount: number;
};

const styles = [
  { id: 'classic', name: 'Classic', accent: '#2D2723' },
  { id: 'minimal', name: 'Minimal', accent: '#8C7355' },
  { id: 'luxury', name: 'Luxury', accent: '#9A7B45' },
  { id: 'modern', name: 'Modern', accent: '#334155' },
  { id: 'soft', name: 'Soft', accent: '#8B6F63' },
  { id: 'dark', name: 'Dark', accent: '#111827' },
];

const money = (n: number) => `${n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const blankItem = (): InvoiceItem => ({ name: '', qty: 1, price: 0, vat: 21 });

export const InvoiceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => { try { return JSON.parse(localStorage.getItem('luvia_invoices') || '[]'); } catch { return []; } });
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [form, setForm] = useState<Invoice>({
    id: '', number: `FV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, date: today(), dueDate: plusDays(14), variableSymbol: '',
    sellerName: 'Luvia Decor', sellerAddress: '', sellerIco: '', sellerDic: '', buyerName: '', buyerAddress: '', buyerIco: '', buyerDic: '', buyerEmail: '',
    paymentMethod: 'Bankovní převod', bankAccount: '963625003/5500', iban: 'CZ96 5500 0000 0009 6362 5003', bic: 'RZBCCZPP', note: '', style: 'classic', items: [blankItem()], shipping: 0, discount: 0
  });

  useEffect(() => { localStorage.setItem('luvia_invoices', JSON.stringify(invoices)); }, [invoices]);
  const subtotal = useMemo(() => form.items.reduce((s, i) => s + Math.max(0, Number(i.qty) || 0) * Math.max(0, Number(i.price) || 0), 0), [form.items]);
  const total = Math.max(0, subtotal + Number(form.shipping || 0) - Number(form.discount || 0));

  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) => setForm(f => ({ ...f, [key]: value }));
  const setItem = (idx: number, key: keyof InvoiceItem, value: string | number) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));

  const save = () => {
    const invoice = { ...form, id: form.id || crypto.randomUUID(), variableSymbol: form.variableSymbol || form.number.replace(/\D/g, '').slice(-10) };
    setInvoices(prev => [invoice, ...prev.filter(x => x.id !== invoice.id)]);
    setForm(invoice);
    setSelected(invoice);
  };
  const remove = (id: string) => { setInvoices(prev => prev.filter(x => x.id !== id)); if (selected?.id === id) setSelected(null); };
  const newInvoice = () => setForm({ ...form, id: '', number: `FV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, date: today(), dueDate: plusDays(14), variableSymbol: '', buyerName: '', buyerAddress: '', buyerIco: '', buyerDic: '', buyerEmail: '', items: [blankItem()], shipping: 0, discount: 0, note: '' });

  const printInvoice = (invoice: Invoice = form) => {
    const st = styles.find(s => s.id === invoice.style) || styles[0];
    const rows = invoice.items.filter(i => i.name.trim()).map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.qty * i.price)}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Faktura ${esc(invoice.number)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#27221e;margin:0;font-size:12px}.top{border-top:8px solid ${st.accent};padding-top:22px}.head{display:flex;justify-content:space-between;gap:30px}.brand{font-size:28px;font-weight:800;color:${st.accent}}h1{font-size:25px;margin:0 0 8px}.muted{color:#777}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:32px 0}.box{border:1px solid #ddd;border-radius:8px;padding:15px}.label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:7px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:${st.accent};color:#fff;text-align:left;padding:10px}td{padding:10px;border-bottom:1px solid #e5e5e5}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.totals{margin-left:auto;width:310px;margin-top:20px}.line{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:19px;font-weight:800;border-top:2px solid ${st.accent};padding-top:10px;margin-top:5px}.foot{margin-top:35px;border-top:1px solid #ddd;padding-top:14px;display:flex;justify-content:space-between}.note{margin-top:25px;padding:12px;background:#faf8f5;border-radius:6px;white-space:pre-wrap}</style></head><body><div class="top"><div class="head"><div><div class="brand">${esc(invoice.sellerName)}</div><div class="muted">${esc(invoice.sellerAddress)}<br>IČO: ${esc(invoice.sellerIco)} ${invoice.sellerDic ? ' · DIČ: '+esc(invoice.sellerDic) : ''}</div></div><div><h1>FAKTURA</h1><div>Číslo: <b>${esc(invoice.number)}</b></div><div>Datum vystavení: ${esc(invoice.date)}</div><div>Datum splatnosti: ${esc(invoice.dueDate)}</div></div></div><div class="grid"><div class="box"><div class="label">Dodavatel</div><b>${esc(invoice.sellerName)}</b><br>${esc(invoice.sellerAddress)}<br>IČO: ${esc(invoice.sellerIco)}<br>${invoice.sellerDic ? 'DIČ: '+esc(invoice.sellerDic) : ''}</div><div class="box"><div class="label">Odběratel</div><b>${esc(invoice.buyerName)}</b><br>${esc(invoice.buyerAddress)}<br>IČO: ${esc(invoice.buyerIco)}<br>${invoice.buyerDic ? 'DIČ: '+esc(invoice.buyerDic) : ''}<br>${esc(invoice.buyerEmail)}</div></div><table><thead><tr><th>Položka</th><th>Množství</th><th>Cena/ks</th><th>Celkem</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div class="line"><span>Mezisoučet</span><b>${money(subtotal)}</b></div>${invoice.shipping ? `<div class="line"><span>Doprava</span><b>${money(invoice.shipping)}</b></div>` : ''}${invoice.discount ? `<div class="line"><span>Sleva</span><b>−${money(invoice.discount)}</b></div>` : ''}<div class="line grand"><span>CELKEM</span><span>${money(total)}</span></div></div><div class="box" style="margin-top:30px"><div class="label">Platební údaje</div><b>${esc(invoice.paymentMethod)}</b><br>Číslo účtu: ${esc(invoice.bankAccount)}<br>IBAN: ${esc(invoice.iban)}<br>SWIFT/BIC: ${esc(invoice.bic)}<br>Variabilní symbol: <b>${esc(invoice.variableSymbol)}</b></div>${invoice.note ? `<div class="note">${esc(invoice.note)}</div>` : ''}<div class="foot"><span>Děkujeme za Vaši objednávku.</span><span>${esc(invoice.number)}</span></div></div><script>window.onload=()=>{window.print();}</script></body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000'); if (!w) return; w.document.write(html); w.document.close();
  };

  return <div className="space-y-5">
    <div className="rounded-2xl bg-white border border-[#e6ddd2] shadow-sm p-5 sm:p-7">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><div className="flex items-center gap-2"><ReceiptText className="w-6 h-6"/><h2 className="text-xl font-black">Faktury</h2></div><p className="text-sm text-[#75685d] mt-1">Vytvoř, ulož a vytiskni / ulož jako PDF vlastní fakturu v několika stylech.</p></div><button onClick={newInvoice} className="rounded-xl bg-[#2D2723] text-white px-4 py-2.5 font-bold flex items-center gap-2"><FilePlus2 className="w-4 h-4"/>Nová faktura</button></div>
    </div>
    <div className="grid xl:grid-cols-[1fr_360px] gap-5">
      <div className="rounded-2xl bg-white border border-[#e6ddd2] p-5 space-y-5">
        <div className="grid md:grid-cols-4 gap-3">{(['number','date','dueDate','variableSymbol'] as const).map(k => <label key={k} className="text-xs font-bold text-[#66594f]">{k==='number'?'Číslo faktury':k==='date'?'Datum vystavení':k==='dueDate'?'Splatnost':'Variabilní symbol'}<input value={form[k] as string} onChange={e=>set(k,e.target.value)} type={k==='date'||k==='dueDate'?'date':'text'} className="mt-1 w-full rounded-xl border p-2.5 text-sm"/></label>)}</div>
        <div className="grid md:grid-cols-2 gap-4"><fieldset className="rounded-xl border p-4 space-y-2"><legend className="px-2 font-black">Dodavatel</legend>{[['sellerName','Název'],['sellerAddress','Adresa'],['sellerIco','IČO'],['sellerDic','DIČ']] .map(([k,l])=><input key={k} placeholder={l} value={form[k as keyof Invoice] as string} onChange={e=>set(k as keyof Invoice,e.target.value)} className="w-full rounded-lg border p-2.5 text-sm"/>)}</fieldset><fieldset className="rounded-xl border p-4 space-y-2"><legend className="px-2 font-black">Odběratel</legend>{[['buyerName','Název / jméno'],['buyerAddress','Adresa'],['buyerIco','IČO'],['buyerDic','DIČ'],['buyerEmail','E-mail']] .map(([k,l])=><input key={k} placeholder={l} value={form[k as keyof Invoice] as string} onChange={e=>set(k as keyof Invoice,e.target.value)} className="w-full rounded-lg border p-2.5 text-sm"/>)}</fieldset></div>
        <div><div className="flex items-center justify-between mb-2"><h3 className="font-black">Položky</h3><button onClick={()=>setForm(f=>({...f,items:[...f.items,blankItem()]}))} className="text-xs font-bold rounded-lg border px-3 py-2">+ Přidat položku</button></div><div className="space-y-2">{form.items.map((it,i)=><div key={i} className="grid grid-cols-[1fr_80px_120px_42px] gap-2"><input placeholder="Název položky" value={it.name} onChange={e=>setItem(i,'name',e.target.value)} className="rounded-lg border p-2.5 text-sm"/><input type="number" min="0" value={it.qty} onChange={e=>setItem(i,'qty',Number(e.target.value))} className="rounded-lg border p-2.5 text-sm"/><input type="number" min="0" step="0.01" value={it.price} onChange={e=>setItem(i,'price',Number(e.target.value))} className="rounded-lg border p-2.5 text-sm"/><button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,x)=>x!==i)}))} className="rounded-lg border text-red-600">×</button></div>)}</div></div>
        <div className="grid md:grid-cols-3 gap-3"><label className="text-xs font-bold">Doprava<input type="number" step="0.01" value={form.shipping} onChange={e=>set('shipping',Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-xs font-bold">Sleva<input type="number" step="0.01" value={form.discount} onChange={e=>set('discount',Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-xs font-bold">Způsob platby<input value={form.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label></div>
        <div className="grid md:grid-cols-3 gap-3"><input placeholder="Číslo účtu" value={form.bankAccount} onChange={e=>set('bankAccount',e.target.value)} className="rounded-lg border p-2.5 text-sm"/><input placeholder="IBAN" value={form.iban} onChange={e=>set('iban',e.target.value)} className="rounded-lg border p-2.5 text-sm"/><input placeholder="SWIFT / BIC" value={form.bic} onChange={e=>set('bic',e.target.value)} className="rounded-lg border p-2.5 text-sm"/></div>
        <textarea placeholder="Poznámka na faktuře" value={form.note} onChange={e=>set('note',e.target.value)} className="w-full rounded-lg border p-3 text-sm min-h-20"/>
        <div className="flex flex-wrap gap-2 pt-2"><button onClick={save} className="rounded-xl bg-[#2D2723] text-white px-5 py-3 font-black flex items-center gap-2"><Save className="w-4 h-4"/>Uložit fakturu</button><button onClick={()=>printInvoice()} className="rounded-xl border px-5 py-3 font-black flex items-center gap-2"><Download className="w-4 h-4"/>Stáhnout / uložit PDF</button><button onClick={()=>printInvoice()} className="rounded-xl border px-5 py-3 font-bold flex items-center gap-2"><Printer className="w-4 h-4"/>Náhled / tisk</button></div>
      </div>
      <aside className="rounded-2xl bg-white border border-[#e6ddd2] p-5 h-fit"><div className="flex items-center gap-2 font-black mb-3"><Palette className="w-4 h-4"/>Styl faktury</div><div className="grid grid-cols-2 gap-2">{styles.map(s=><button key={s.id} onClick={()=>set('style',s.id)} className={`rounded-xl border p-3 text-left ${form.style===s.id?'ring-2 ring-[#2D2723]':''}`}><div className="h-7 rounded-md mb-2" style={{background:s.accent}}/><b className="text-xs">{s.name}</b></button>)}</div><div className="mt-5 pt-4 border-t"><div className="text-xs text-[#75685d]">Celkem</div><div className="text-2xl font-black mt-1">{money(total)}</div></div></aside>
    </div>
    <div className="rounded-2xl bg-white border border-[#e6ddd2] p-5"><h3 className="font-black mb-3">Uložené faktury</h3>{invoices.length===0?<p className="text-sm text-[#75685d]">Zatím zde nejsou žádné uložené faktury.</p>:<div className="space-y-2">{invoices.map(inv=><div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-3"><div><b>{inv.number}</b><div className="text-xs text-[#75685d]">{inv.buyerName || 'Bez odběratele'} · {money(inv.items.reduce((s,i)=>s+i.qty*i.price,0)+inv.shipping-inv.discount)}</div></div><div className="flex gap-2"><button onClick={()=>{setForm(inv);setSelected(inv)}} className="rounded-lg border px-3 py-2 text-xs font-bold">Upravit</button><button onClick={()=>printInvoice(inv)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Download className="w-3.5 h-3.5 inline mr-1"/>PDF</button><button onClick={()=>remove(inv.id)} className="rounded-lg border px-3 py-2 text-red-600"><Trash2 className="w-3.5 h-3.5"/></button></div></div>)}</div>}</div>
  </div>;
};

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
