import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Order } from '../types';

const money = (value: number) => `${Number(value || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const date = (value: string) => new Date(value).toLocaleString('cs-CZ');

export const PaidCompletedOrdersReport: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [mode, setMode] = useState<'both' | 'paid' | 'completed'>('both');
  const reportRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const eligible = useMemo(() => orders.filter(o => o.status === 'zaplaceno' || o.status === 'dokonceno'), [orders]);
  const shown = useMemo(() => mode === 'both' ? eligible : eligible.filter(o => mode === 'paid' ? o.status === 'zaplaceno' : o.status === 'dokonceno'), [eligible, mode]);
  const paid = eligible.filter(o => o.status === 'zaplaceno');
  const completed = eligible.filter(o => o.status === 'dokonceno');
  const total = shown.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

  const downloadPdf = async () => {
    if (!reportRef.current || !shown.length) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const imageHeight = canvas.height * usableWidth / canvas.width;
      const usablePageHeight = pageHeight - margin * 2;
      let remaining = imageHeight;
      let offset = 0;
      let page = 0;
      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        const sliceHeightPx = Math.min(canvas.height - offset, usablePageHeight * canvas.width / usableWidth);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.ceil(sliceHeightPx);
        const ctx = slice.getContext('2d');
        if (!ctx) break;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, offset, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const sliceImage = slice.toDataURL('image/jpeg', 0.92);
        const sliceMmHeight = sliceHeightPx * usableWidth / canvas.width;
        pdf.addImage(sliceImage, 'JPEG', margin, margin, usableWidth, sliceMmHeight);
        offset += sliceHeightPx;
        remaining -= usablePageHeight;
        page++;
      }
      pdf.save(`luvia-decor-vypis-objednavek-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#F2ECE4] pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#8C7355] text-[10px] font-bold uppercase tracking-[0.18em]"><ShieldCheck className="w-4 h-4" /> Kontrolní výpis</div>
            <h2 className="font-editorial text-2xl font-bold text-[#2D2723] mt-1">Zaplacené a vyřízené objednávky</h2>
            <p className="text-xs text-[#7B6E63] mt-1 max-w-2xl">Samostatný přehled pouze objednávek se stavem Zaplaceno nebo Dokončeno. Slouží jako praktický administrativní výpis pro kontrolu evidence objednávek.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="px-3 py-2 rounded-xl border border-[#E3DACF] bg-[#FAF5EE] text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Obnovit</button>
            <button type="button" onClick={downloadPdf} disabled={downloading || !shown.length} className="px-4 py-2 rounded-xl bg-[#2D2723] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> {downloading ? 'Vytvářím PDF…' : 'Stáhnout PDF'}</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-5">
          {([
            ['both', `Zaplacené + vyřízené (${eligible.length})`],
            ['paid', `Zaplacené (${paid.length})`],
            ['completed', `Vyřízené (${completed.length})`]
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${mode === value ? 'bg-[#2D2723] text-white border-[#2D2723]' : 'bg-[#FAF5EE] text-[#5C5046] border-[#E3DACF]'}`}>{label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Výpis</span><p className="text-2xl font-bold mt-1">{shown.length}</p><p className="text-[11px] text-stone-500">objednávek</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Zaplacené</span><p className="text-2xl font-bold mt-1">{paid.length}</p><p className="text-[11px] text-stone-500">stav Zaplaceno</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Celková hodnota</span><p className="text-2xl font-bold mt-1 text-[#8C7355]">{money(total)}</p><p className="text-[11px] text-stone-500">podle aktuálního výpisu</p></div>
        </div>
      </div>

      <div ref={reportRef} className="bg-white rounded-3xl border border-[#E8DFC8] p-6 sm:p-8 text-[#2D2723]">
        <div className="flex justify-between gap-4 border-b-2 border-[#2D2723] pb-4 mb-4">
          <div><h1 className="text-xl font-bold">Luvia Decor — kontrolní výpis objednávek</h1><p className="text-[11px] text-stone-500">Zaplacené a vyřízené objednávky · vytvořeno {new Date().toLocaleString('cs-CZ')}</p></div>
          <FileText className="w-8 h-8 text-[#8C7355] shrink-0" />
        </div>
        {loading ? <div className="py-10 text-center text-sm text-stone-500">Načítám objednávky…</div> : shown.length === 0 ? <div className="py-10 text-center text-sm text-stone-500">V tomto výpisu nejsou žádné zaplacené ani vyřízené objednávky.</div> : (
          <div className="space-y-3">
            {shown.map((order, index) => (
              <div key={order.id} className="border border-[#EDE5DA] rounded-xl p-4 break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div><p className="font-bold text-sm">{index + 1}. {order.orderNumber || order.id}</p><p className="text-[10px] text-stone-500">{date(order.createdAt)} · {order.status === 'zaplaceno' ? 'Zaplaceno' : 'Vyřízeno'}</p></div>
                  <p className="font-bold text-[#8C7355]">{money(order.totalPrice)}</p>
                </div>
                <p className="text-xs mt-2"><strong>Zákazník:</strong> {order.customer?.fullName || 'Neuvedeno'} · {order.customer?.email || '—'} · {order.customer?.phone || '—'}</p>
                <p className="text-xs mt-1"><strong>Doručení:</strong> {order.delivery?.carrier || order.delivery?.method || '—'}{order.delivery?.pickupPoint ? ` · ${order.delivery.pickupPoint}` : ''}</p>
                <div className="mt-2 pt-2 border-t border-[#F2ECE4] text-[10px] text-stone-600">{order.items?.map((item, i) => <span key={i} className="mr-3">{item.quantity}× {item.title} ({money(item.price * item.quantity)})</span>)}</div>
              </div>
            ))}
            <div className="flex justify-end pt-4 border-t-2 border-[#2D2723]"><strong>Celkem za výpis: {money(total)}</strong></div>
            <p className="text-[9px] text-stone-400 pt-2">Tento výpis je interní administrativní přehled vytvořený z objednávek evidovaných v e-shopu. Nenahrazuje účetní ani daňovou evidenci, pokud je podle právních předpisů vedena samostatně.</p>
          </div>
        )}
      </div>
    </div>
  );
};
