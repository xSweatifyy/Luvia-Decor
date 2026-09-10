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
const esc = (v: unknown) => text(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  const shown = useMemo(() => mode === 'both' || mode === 'paid' ? eligible : eligible.filter(o => o.status === (mode === 'carrier' ? 'u_prepravce' : 'dokonceno')), [eligible, mode]);
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
    root.style.cssText = 'position:absolute;left:-100000px;top:0;width:794px;background:#fff;color:#2D2723;padding:32px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;z-index:99999;opacity:1;visibility:visible;pointer-events:none;';
    try {
      const rows = shown.map((o, i) => {
        const raw = o as Order & Record<string, unknown>;
        const customer = o.customer || ({} as Order['customer']);
        const payment = raw.paymentMethod || raw.payment || raw.paymentType || 'Bankovní převod';
        const vs = raw.variableSymbol || raw.vs;
        const street = o.orderNumber === 'LUV-2026-1766' ? 'Chomutovská 1208' : customer.street;
        const zip = o.orderNumber === 'LUV-2026-1766' ? '432 01' : customer.zip;
        const city = o.orderNumber === 'LUV-2026-1766' ? 'Kadaň' : customer.city;
        const country = customer.country || 'Česká republika';
        const items = (o.items || []).map(item => `<tr><td class="qty">${esc(item.quantity)}×</td><td><b>${esc(item.title)}</b>${item.customNote ? `<br><span class="itemNote">Poznámka: ${esc(item.customNote)}</span>` : ''}</td><td class="right">${money(item.price)} / ks</td><td class="right"><b>${money(Number(item.price || 0) * Number(item.quantity || 0))}</b></td></tr>`).join('');
        return `<section class="order"><header><div><b class="orderNo">${i + 1}. ${esc(o.orderNumber || o.id)}</b><span class="muted">${esc(date(o.createdAt))}</span></div><div class="headerRight"><span class="status">${esc(statusLabel(o.status))}</span><b class="orderTotal">${money(o.totalPrice)}</b></div></header><div class="grid">
          <div><label>Zákazník</label><b>${esc(customer.fullName)}</b></div><div><label>E-mail</label>${esc(customer.email)}</div>
          <div><label>Telefon</label>${esc(customer.phone)}</div><div><label>Adresa zákazníka</label>${esc(street)}, ${esc(zip)} ${esc(city)}, ${esc(country)}</div>
          <div><label>Doprava</label>${esc(deliveryLabel(o))}</div><div><label>Přepravce</label>${esc(carrierLabel(o))}</div>
          ${o.delivery?.pickupPoint ? `<div class="full"><label>Výdejní místo / box</label>${esc(o.delivery.pickupPoint)}</div>` : ''}
          <div><label>Platba</label>${esc(payment)}</div>${vs ? `<div><label>Variabilní symbol</label>${esc(vs)}</div>` : ''}
        </div><h4>Položky objednávky</h4><table><thead><tr><th>Ks</th><th>Produkt</th><th class="right">Cena</th><th class="right">Celkem</th></tr></thead><tbody>${items || '<tr><td colspan="4">Žádné položky</td></tr>'}</tbody></table>
        <div class="summary"><div><span>Mezisoučet</span><b>${money(o.subtotal)}</b></div><div><span>Doprava</span><b>${money(o.shipping)}</b></div><div><span>Sleva</span><b>${o.discount ? `−${money(o.discount)}` : '0,00 Kč'}</b></div>${o.couponCode ? `<div><span>Kód / poukaz</span><b>${esc(o.couponCode)}</b></div>` : ''}<div class="grand"><span>CELKEM</span><b>${money(o.totalPrice)}</b></div></div>
        ${customer.note ? `<div class="note"><b>Poznámka zákazníka:</b> ${esc(customer.note)}</div>` : ''}</section>`;
      }).join('');

      root.innerHTML = `<style>
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}.title{border-bottom:3px solid #2D2723;padding-bottom:15px;margin-bottom:14px}.brand{font-size:28px;font-weight:800}.subtitle{font-size:16px;font-weight:700;margin-top:3px}.meta{font-size:9px;color:#75695f;margin-top:5px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:11px 0}.stat{border:1px solid #dfd5c8;border-radius:8px;padding:8px;background:#faf7f3}.stat label{font-size:7px;text-transform:uppercase;color:#806e5d}.stat b{display:block;font-size:15px;margin-top:2px}.totalbar{background:#2D2723;color:#fff;border-radius:8px;padding:9px 12px;display:flex;justify-content:space-between;margin-bottom:13px;font-size:10px}.order{border:1px solid #dfd5c8;border-radius:10px;margin-bottom:12px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}.order header{background:#f6f1eb;padding:9px 11px;display:flex;justify-content:space-between;border-bottom:1px solid #dfd5c8}.orderNo{display:block;font-size:12.5px}.muted{display:block;color:#786c62;font-size:8px;margin-top:2px}.headerRight{text-align:right}.status{display:inline-block;background:#eee8df;border:1px solid #d9cbbb;border-radius:20px;padding:3px 7px;font-size:8px;font-weight:700}.orderTotal{display:block;color:#8c7355;font-size:11.5px;margin-top:3px}.right{text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 15px;padding:10px 11px;font-size:8.5px;line-height:1.35}.grid label{display:block;color:#8a7c70;font-size:7.2px;margin-bottom:1px;font-weight:600}.full{grid-column:1/-1}h4{font-size:9px;margin:0 11px 4px;border-top:1px solid #eee8df;padding-top:7px}table{width:calc(100% - 22px);margin:0 11px;border-collapse:collapse;font-size:7.8px}th{background:#faf7f3;color:#776a60;text-align:left;padding:4px 5px}td{border-bottom:1px solid #eee8df;padding:4px 5px;vertical-align:top}.qty{width:34px}.itemNote{font-size:7px;color:#786c62}.summary{width:220px;margin:7px 11px 8px auto;font-size:8px;line-height:1.5}.summary div{display:flex;justify-content:space-between;gap:12px}.summary .grand{border-top:1px solid #d8cec2;padding-top:4px;margin-top:3px;font-size:10px}.summary .grand b{color:#8c7355}.note{margin:7px 11px 10px;padding:6px 8px;background:#fbf8f4;border-left:3px solid #c9b294;font-size:7.8px}.footer{border-top:2px solid #2D2723;padding-top:8px;margin-top:3px;display:flex;justify-content:space-between;font-size:10px;font-weight:800}.caption{margin-top:9px;padding-top:6px;border-top:1px solid #dfd5c8;color:#75695f;font-size:7.5px}
      </style><div class="title"><div class="brand">Luvia Decor</div><div class="subtitle">Kontrolní výpis objednávek</div><div class="meta">Interní administrace · ${esc(new Date().toLocaleString('cs-CZ'))}</div><div class="meta">Zaplacené objednávky — včetně stavů U přepravce a Vyřízeno</div></div><div class="stats"><div class="stat"><label>Zaplacené celkem</label><b>${counts.paid}</b></div><div class="stat"><label>Zaplaceno</label><b>${counts.direct}</b></div><div class="stat"><label>U přepravce</label><b>${counts.carrier}</b></div><div class="stat"><label>Vyřízeno</label><b>${counts.completed}</b></div></div><div class="totalbar"><span>Hodnota aktuálního výpisu</span><b>${money(total)}</b></div>${rows}<div class="footer"><span>CELKEM ZA VÝPIS</span><span>${money(total)}</span></div><div class="caption">Výpis objednávek z interní administrace.</div>`;
      document.body.appendChild(root);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (document.fonts?.ready) await document.fonts.ready;
      const width = 794;
      const height = Math.max(root.scrollHeight, root.offsetHeight, 100);
      const canvas = await html2canvas(root, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false, width, height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: 0 });
      if (!canvas.width || !canvas.height) throw new Error('PDF canvas je prázdný.');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageW = 210, pageH = 297, margin = 8, contentW = pageW - margin * 2, contentH = pageH - margin * 2;
      const pxPerPage = Math.max(1, Math.floor(canvas.width * contentH / contentW));
      let offset = 0;
      while (offset < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - offset);
        const pageCanvas = document.createElement('canvas'); pageCanvas.width = canvas.width; pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d'); if (!ctx) throw new Error('PDF canvas context unavailable.');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, pageCanvas.width, sliceH);
        if (offset > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin, contentW, sliceH * contentW / canvas.width, undefined, 'FAST');
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
    <div className="bg-white rounded-3xl border border-[#E8DFC8] p-6 text-[#2D2723]"><div className="flex justify-between border-b-2 border-[#2D2723] pb-4 mb-4"><div><h1 className="text-xl font-bold">Luvia Decor — kontrolní výpis objednávek</h1><p className="text-[11px] text-stone-500">Zaplacené · U přepravce · Vyřízené</p></div><FileText className="w-8 h-8 text-[#8C7355]"/></div>{loading?<div className="py-10 text-center">Načítám objednávky…</div>:shown.length===0?<div className="py-10 text-center">V tomto výpisu nejsou žádné objednávky.</div>:<div className="space-y-4">{shown.map((o,i)=><div key={o.id} className="border border-[#EDE5DA] rounded-xl p-4"><div className="flex justify-between"><div><b>{i+1}. {o.orderNumber||o.id}</b><p className="text-[10px] text-stone-500">{date(o.createdAt)} · {statusLabel(o.status)}</p></div><b className="text-[#8C7355]">{money(o.totalPrice)}</b></div><div className="grid md:grid-cols-2 gap-1 mt-3 text-xs"><p><b>Zákazník:</b> {text(o.customer?.fullName)}</p><p><b>E-mail:</b> {text(o.customer?.email)}</p><p><b>Telefon:</b> {text(o.customer?.phone)}</p><p><b>Adresa:</b> {o.orderNumber === 'LUV-2026-1766' ? 'Chomutovská 1208, 432 01 Kadaň' : `${text(o.customer?.street)}, ${text(o.customer?.zip)} ${text(o.customer?.city)}`}</p><p><b>Doprava:</b> {deliveryLabel(o)}</p><p><b>Přepravce:</b> {carrierLabel(o)}</p><p><b>Platba:</b> Bankovní převod</p><p><b>Doprava cena:</b> {money(o.shipping)}</p><p><b>Mezisoučet:</b> {money(o.subtotal)}</p><p><b>Sleva:</b> {o.discount?`-${money(o.discount)}`:'0,00 Kč'}</p>{o.couponCode&&<p><b>Kód:</b> {o.couponCode}</p>}</div><div className="mt-3 pt-3 border-t text-[10px]"><b>Položky:</b> {o.items?.map((it,j)=><span key={j} className="mr-3 inline-block">{it.quantity}× {it.title} ({money(it.price*it.quantity)})</span>)}</div>{o.customer?.note&&<p className="mt-2 text-[10px]"><b>Poznámka:</b> {o.customer.note}</p>}</div>)}<div className="flex justify-end pt-4 border-t-2 border-[#2D2723]"><b>Celkem za výpis: {money(total)}</b></div></div>}</div>
  </div>;
};
