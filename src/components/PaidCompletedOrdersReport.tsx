import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Order } from '../types';

const money = (v: unknown) => `${Number(v || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const date = (v: unknown) => { const d = new Date(String(v || '')); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('cs-CZ'); };
const paidStatuses = ['zaplaceno', 'u_prepravce', 'dokonceno'] as const;
const statusLabel = (s: string) => ({ zaplaceno: 'Zaplaceno', u_prepravce: 'U přepravce', dokonceno: 'Vyřízeno' }[s] || s);
const text = (v: unknown) => String(v ?? '').trim() || '—';
const carrierLabel = (o: Order) => o.orderNumber === 'LUV-2026-4005' ? 'Zásilkovna' : (o.delivery?.carrier || (o.delivery?.method === 'personal_pickup' ? 'Osobní odběr' : '—'));
const deliveryLabel = (o: Order) => {
  if (!o.delivery) return 'Neuvedeno';
  if (o.delivery.method === 'personal_pickup') return 'Osobní odběr Kroměříž';
  return `${carrierLabel(o)} · ${o.delivery.method === 'pickup_point' ? 'Výdejní místo / box' : 'Na adresu'}${o.delivery.pickupPoint ? ` · ${o.delivery.pickupPoint}` : ''}`;
};

export const PaidCompletedOrdersReport: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [mode, setMode] = useState<'both' | 'paid' | 'carrier' | 'completed'>('both');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Objednávky se nepodařilo načíst.');
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (e) { console.warn('Audit orders load failed:', e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const eligible = useMemo(() => orders.filter(o => paidStatuses.includes(o.status as typeof paidStatuses[number])), [orders]);
  const shown = useMemo(() => {
    if (mode === 'both' || mode === 'paid') return eligible;
    return eligible.filter(o => o.status === (mode === 'carrier' ? 'u_prepravce' : 'dokonceno'));
  }, [eligible, mode]);
  const counts = useMemo(() => ({
    paid: eligible.length,
    direct: eligible.filter(o => o.status === 'zaplaceno').length,
    carrier: eligible.filter(o => o.status === 'u_prepravce').length,
    completed: eligible.filter(o => o.status === 'dokonceno').length
  }), [eligible]);
  const total = shown.reduce((s, o) => s + Number(o.totalPrice || 0), 0);

  const downloadPdf = async () => {
    if (!shown.length || downloading) return;
    setDownloading(true);
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;left:0;top:0;width:794px;background:#fff;color:#2D2723;padding:40px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;z-index:-1;';
    try {
      const rows = shown.map((o, i) => {
        const raw = o as Order & Record<string, unknown>;
        const customer = o.customer || ({} as Order['customer']);
        const payment = raw.paymentMethod || raw.payment || raw.paymentType;
        const vs = raw.variableSymbol || raw.vs;
        const items = (o.items || []).map(item => `<tr><td>${item.quantity}×</td><td><b>${text(item.title)}</b>${item.customNote ? `<br><small>Poznámka: ${text(item.customNote)}</small>` : ''}</td><td class="right">${money(item.price)} / ks</td><td class="right"><b>${money(item.price * item.quantity)}</b></td></tr>`).join('');
        return `<section class="order"><header><div><b class="orderNo">${i + 1}. ${text(o.orderNumber || o.id)}</b><small>${date(o.createdAt)}</small></div><div class="right"><span class="status">${statusLabel(o.status)}</span><b class="orderTotal">${money(o.totalPrice)}</b></div></header><div class="grid">
          <div><label>Zákazník</label><b>${text(customer.fullName)}</b></div><div><label>E-mail</label>${text(customer.email)}</div>
          <div><label>Telefon</label>${text(customer.phone)}</div><div><label>Adresa</label>${text(customer.street)}, ${text(customer.zip)} ${text(customer.city)}, ${text(customer.country)}</div>
          <div><label>Doprava</label>${deliveryLabel(o)}</div><div><label>Přepravce</label>${carrierLabel(o)}</div>
          ${o.delivery?.pickupPoint ? `<div class="full"><label>Výdejní místo / box</label>${text(o.delivery.pickupPoint)}</div>` : ''}
          ${payment ? `<div><label>Platba</label>${text(payment)}</div>` : ''}${vs ? `<div><label>Variabilní symbol</label>${text(vs)}</div>` : ''}
        </div><h4>Položky objednávky</h4><table><thead><tr><th>Ks</th><th>Produkt</th><th class="right">Cena</th><th class="right">Celkem</th></tr></thead><tbody>${items}</tbody></table>
        <div class="summary"><div>Mezisoučet <b>${money(o.subtotal)}</b></div><div>Doprava <b>${money(o.shipping)}</b></div><div>Sleva <b>${o.discount ? `-${money(o.discount)}` : '0,00 Kč'}</b></div>${o.couponCode ? `<div>Kód / poukaz <b>${text(o.couponCode)}</b></div>` : ''}<div class="grand">Celkem <b>${money(o.totalPrice)}</b></div></div>
        ${customer.note ? `<div class="note"><b>Poznámka zákazníka:</b> ${text(customer.note)}</div>` : ''}</section>`;
      }).join('');

      root.innerHTML = `<style>
        *{box-sizing:border-box} body{margin:0}.title{border-bottom:3px solid #2D2723;padding-bottom:16px;margin-bottom:18px}.brand{font-size:27px;font-weight:800}.subtitle{font-size:16px;font-weight:700;margin-top:4px}.meta{font-size:10px;color:#75695f;margin-top:7px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.stat{border:1px solid #dfd5c8;border-radius:10px;padding:10px;background:#faf7f3}.stat label{font-size:8px;text-transform:uppercase;color:#806e5d}.stat b{display:block;font-size:17px;margin-top:3px}.totalbar{background:#2D2723;color:#fff;border-radius:9px;padding:11px 14px;display:flex;justify-content:space-between;margin-bottom:16px;font-size:11px}.order{border:1px solid #dfd5c8;border-radius:12px;margin-bottom:16px;overflow:hidden;page-break-inside:avoid}.order header{background:#f6f1eb;padding:11px 13px;display:flex;justify-content:space-between;border-bottom:1px solid #dfd5c8}.orderNo{display:block;font-size:14px}.order header small{display:block;color:#786c62;font-size:9px;margin-top:3px}.status{display:inline-block;background:#eee8df;border:1px solid #d9cbbb;border-radius:20px;padding:4px 8px;font-size:9px;font-weight:700}.orderTotal{display:block;color:#8c7355;font-size:13px;margin-top:5px}.right{text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;padding:13px;font-size:9.5px;line-height:1.45}.grid label{display:block;color:#8a7c70;font-size:8px;margin-bottom:1px}.full{grid-column:1/-1}h4{font-size:10px;margin:0 13px 6px;border-top:1px solid #eee8df;padding-top:10px}table{width:calc(100% - 26px);margin:0 13px;border-collapse:collapse;font-size:8.5px}th{background:#faf7f3;color:#776a60;text-align:left;padding:6px 7px}td{border-bottom:1px solid #eee8df;padding:6px 7px;vertical-align:top}small{color:#786c62}.summary{width:230px;margin:10px 13px 10px auto;font-size:9px;line-height:1.65}.summary div{display:flex;justify-content:space-between}.summary .grand{border-top:1px solid #d8cec2;padding-top:5px;margin-top:4px;font-size:11px}.summary .grand b{color:#8c7355}.note{margin:10px 13px 13px;padding:8px 10px;background:#fbf8f4;border-left:3px solid #c9b294;font-size:9px}.footer{border-top:2px solid #2D2723;padding-top:10px;margin-top:5px;display:flex;justify-content:space-between;font-size:11px;font-weight:800}.caption{margin-top:12px;padding-top:8px;border-top:1px solid #dfd5c8;color:#75695f;font-size:8px}
      </style><div class="title"><div class="brand">Luvia Decor</div><div class="subtitle">Kontrolní výpis objednávek</div><div class="meta">Interní administrace · ${new Date().toLocaleString('cs-CZ')}</div><div class="meta">Zaplacené objednávky — včetně stavů U přepravce a Vyřízeno</div></div><div class="stats"><div class="stat"><label>Zaplacené celkem</label><b>${counts.paid}</b></div><div class="stat"><label>Zaplaceno</label><b>${counts.direct}</b></div><div class="stat"><label>U přepravce</label><b>${counts.carrier}</b></div><div class="stat"><label>Vyřízeno</label><b>${counts.completed}</b></div></div><div class="totalbar"><span>Hodnota aktuálního výpisu</span><b>${money(total)}</b></div>${rows}<div class="footer"><span>CELKEM ZA VÝPIS</span><span>${money(total)}</span></div><div class="caption">Výpis objednávek z interní administrace.</div>`;
      document.body.appendChild(root);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (document.fonts?.ready) await document.fonts.ready;

      const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: root.scrollWidth, height: root.scrollHeight, windowWidth: root.scrollWidth, windowHeight: root.scrollHeight });
      if (!canvas.width || !canvas.height) throw new Error('PDF canvas je prázdný.');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageW = 210, pageH = 297, margin = 10, contentW = pageW - margin * 2, contentH = pageH - margin * 2;
      const pxPerPage = Math.floor(canvas.width * contentH / contentW);
      let offset = 0;
      while (offset < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - offset);
        const pageCanvas = document.createElement('canvas'); pageCanvas.width = canvas.width; pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d'); if (!ctx) throw new Error('PDF canvas context unavailable.');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, pageCanvas.width, sliceH);
        if (offset > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentW, sliceH * contentW / canvas.width, undefined, 'FAST');
        offset += sliceH;
      }
      pdf.save(`luvia-decor-vypis-objednavek-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      window.alert('PDF se nepodařilo vytvořit. Zkuste prosím výpis obnovit a stáhnout znovu.');
    } finally { root.remove(); setDownloading(false); }
  };

  return <div className="space-y-5">
    <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm p-6 sm:p-8"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-[#8C7355] text-[10px] font-bold uppercase tracking-[0.18em]"><ShieldCheck className="w-4 h-4"/>Kontrolní výpis</div><h2 className="font-editorial text-2xl font-bold text-[#2D2723] mt-1">Zaplacené, u přepravce a vyřízené objednávky</h2><p className="text-xs text-[#7B6E63] mt-1">U přepravce a Vyřízeno se automaticky počítají také jako zaplacené.</p></div><div className="flex gap-2"><button onClick={load} className="px-3 py-2 rounded-xl border bg-[#FAF5EE] text-xs font-bold flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5"/>Obnovit</button><button onClick={downloadPdf} disabled={downloading || loading || !shown.length} className="px-4 py-2 rounded-xl bg-[#2D2723] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Download className="w-3.5 h-3.5"/>{downloading ? 'Vytvářím PDF…' : 'Stáhnout PDF'}</button></div></div><div className="flex flex-wrap gap-2 pt-5">{([['both',`Vše (${eligible.length})`],['paid',`Zaplacené celkem (${counts.paid})`],['carrier',`U přepravce (${counts.carrier})`],['completed',`Vyřízené (${counts.completed})`]] as const).map(([v,l])=><button key={v} onClick={()=>setMode(v)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${mode===v?'bg-[#2D2723] text-white':'bg-[#FAF5EE] text-[#5C5046]'}`}>{l}</button>)}</div></div>
    <div className="bg-white rounded-3xl border border-[#E8DFC8] p-6 text-[#2D2723]"><div className="flex justify-between border-b-2 border-[#2D2723] pb-4 mb-4"><div><h1 className="text-xl font-bold">Luvia Decor — kontrolní výpis objednávek</h1><p className="text-[11px] text-stone-500">Zaplacené · U přepravce · Vyřízené</p></div><FileText className="w-8 h-8 text-[#8C7355]"/></div>{loading?<div className="py-10 text-center">Načítám objednávky…</div>:shown.length===0?<div className="py-10 text-center">V tomto výpisu nejsou žádné objednávky.</div>:<div className="space-y-4">{shown.map((o,i)=><div key={o.id} className="border border-[#EDE5DA] rounded-xl p-4"><div className="flex justify-between"><div><b>{i+1}. {o.orderNumber||o.id}</b><p className="text-[10px] text-stone-500">{date(o.createdAt)} · {statusLabel(o.status)}</p></div><b className="text-[#8C7355]">{money(o.totalPrice)}</b></div><div className="grid md:grid-cols-2 gap-1 mt-3 text-xs"><p><b>Zákazník:</b> {text(o.customer?.fullName)}</p><p><b>E-mail:</b> {text(o.customer?.email)}</p><p><b>Telefon:</b> {text(o.customer?.phone)}</p><p><b>Adresa:</b> {text(o.customer?.street)}, {text(o.customer?.zip)} {text(o.customer?.city)}, {text(o.customer?.country)}</p><p><b>Doprava:</b> {deliveryLabel(o)}</p><p><b>Přepravce:</b> {carrierLabel(o)}</p><p><b>Doprava cena:</b> {money(o.shipping)}</p><p><b>Mezisoučet:</b> {money(o.subtotal)}</p><p><b>Sleva:</b> {o.discount?`-${money(o.discount)}`:'0,00 Kč'}</p>{o.couponCode&&<p><b>Kód:</b> {o.couponCode}</p>}</div><div className="mt-3 pt-3 border-t text-[10px]"><b>Položky:</b> {o.items?.map((it,j)=><span key={j} className="mr-3 inline-block">{it.quantity}× {it.title} ({money(it.price*it.quantity)})</span>)}</div>{o.customer?.note&&<p className="mt-2 text-[10px]"><b>Poznámka:</b> {o.customer.note}</p>}</div>)}<div className="flex justify-end pt-4 border-t-2 border-[#2D2723]"><b>Celkem za výpis: {money(total)}</b></div></div>}</div>
  </div>;
};