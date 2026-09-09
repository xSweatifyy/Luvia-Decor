import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Order } from '../types';

const money = (value: unknown) => `${Number(value || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const date = (value: unknown) => {
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('cs-CZ');
};

const statusLabel = (status: string) => ({
  zaplaceno: 'Zaplaceno',
  u_prepravce: 'U přepravce',
  dokonceno: 'Vyřízeno'
}[status] || status);

const deliveryLabel = (order: Order) => {
  const delivery = order.delivery;
  if (!delivery) return 'Neuvedeno';
  if (delivery.method === 'personal_pickup') return 'Osobní odběr Kroměříž';
  const method = delivery.method === 'pickup_point' ? 'Výdejní místo / box' : 'Na adresu';
  return `${delivery.carrier || 'Přepravce'} · ${method}${delivery.pickupPoint ? ` · ${delivery.pickupPoint}` : ''}`;
};

const text = (value: unknown) => String(value ?? '').trim() || '—';

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
    } catch (error) {
      console.warn('Audit orders load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const eligible = useMemo(
    () => orders.filter(o => ['zaplaceno', 'u_prepravce', 'dokonceno'].includes(o.status)),
    [orders]
  );
  const shown = useMemo(() => {
    if (mode === 'both') return eligible;
    const wanted = mode === 'paid' ? 'zaplaceno' : mode === 'carrier' ? 'u_prepravce' : 'dokonceno';
    return eligible.filter(o => o.status === wanted);
  }, [eligible, mode]);

  const counts = useMemo(() => ({
    paid: eligible.filter(o => o.status === 'zaplaceno').length,
    carrier: eligible.filter(o => o.status === 'u_prepravce').length,
    completed: eligible.filter(o => o.status === 'dokonceno').length,
  }), [eligible]);

  const total = shown.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

  const downloadPdf = () => {
    if (!shown.length || downloading) return;
    setDownloading(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 14;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;
      let pageNumber = 1;

      const ensureSpace = (height: number) => {
        if (y + height > pageHeight - 16) {
          pdf.addPage();
          pageNumber += 1;
          y = margin;
          pdf.setFontSize(8);
          pdf.setTextColor(120, 110, 100);
          pdf.text(`Luvia Decor — kontrolní výpis · strana ${pageNumber}`, margin, 9);
        }
      };

      const addWrapped = (value: string, x: number, width: number, fontSize = 8.5, gap = 3.8) => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(45, 39, 35);
        const lines = pdf.splitTextToSize(value, width) as string[];
        ensureSpace(lines.length * gap + 1);
        pdf.text(lines, x, y);
        y += lines.length * gap;
      };

      const addLabelValue = (label: string, value: unknown, width = contentWidth) => {
        pdf.setFontSize(8);
        pdf.setTextColor(105, 93, 82);
        pdf.text(`${label}:`, margin, y);
        pdf.setFontSize(8.5);
        pdf.setTextColor(45, 39, 35);
        const lines = pdf.splitTextToSize(text(value), width - 28) as string[];
        ensureSpace(Math.max(4, lines.length * 3.8));
        pdf.text(lines, margin + 28, y);
        y += Math.max(4, lines.length * 3.8);
      };

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(17);
      pdf.setTextColor(45, 39, 35);
      pdf.text('Luvia Decor', margin, y);
      y += 7;
      pdf.setFontSize(12);
      pdf.text('Kontrolní výpis objednávek', margin, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(105, 93, 82);
      pdf.text(`Zaplacené, u přepravce a vyřízené objednávky · vytvořeno ${new Date().toLocaleString('cs-CZ')}`, margin, y);
      y += 7;
      pdf.setDrawColor(45, 39, 35);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      addLabelValue('Počet objednávek', shown.length);
      addLabelValue('Zaplaceno', counts.paid);
      addLabelValue('U přepravce', counts.carrier);
      addLabelValue('Vyřízeno', counts.completed);
      addLabelValue('Celková hodnota výpisu', money(total));
      y += 3;

      shown.forEach((order, index) => {
        const raw = order as Order & Record<string, unknown>;
        const customer = order.customer || ({} as Order['customer']);
        const delivery = order.delivery;
        const paymentMethod = raw.paymentMethod || raw.payment || raw.paymentType;
        const variableSymbol = raw.variableSymbol || raw.vs;

        ensureSpace(38);
        pdf.setFillColor(247, 243, 238);
        pdf.rect(margin, y, contentWidth, 9, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(45, 39, 35);
        pdf.text(`${index + 1}. ${text(order.orderNumber || order.id)}`, margin + 3, y + 5.8);
        pdf.text(money(order.totalPrice), pageWidth - margin - pdf.getTextWidth(money(order.totalPrice)) - 3, y + 5.8);
        y += 13;
        pdf.setFont('helvetica', 'normal');

        addLabelValue('Datum objednávky', date(order.createdAt));
        addLabelValue('Stav', statusLabel(order.status));
        addLabelValue('Zákazník', customer.fullName);
        addLabelValue('E-mail', customer.email);
        addLabelValue('Telefon', customer.phone);
        addLabelValue('Adresa', `${text(customer.street)}, ${text(customer.zip)} ${text(customer.city)}, ${text(customer.country)}`);
        addLabelValue('Doprava', deliveryLabel(order));
        addLabelValue('Přepravce', delivery?.carrier || (delivery?.method === 'personal_pickup' ? 'Osobní odběr' : '—'));
        if (delivery?.pickupPoint) addLabelValue('Výdejní místo / box', delivery.pickupPoint);
        addLabelValue('Cena dopravy', money(order.shipping));
        addLabelValue('Mezisoučet', money(order.subtotal));
        addLabelValue('Sleva', order.discount ? `-${money(order.discount)}` : '0,00 Kč');
        addLabelValue('Slevový kód / poukaz', order.couponCode);
        if (paymentMethod) addLabelValue('Platba', paymentMethod);
        if (variableSymbol) addLabelValue('Variabilní symbol', variableSymbol);

        ensureSpace(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text('Položky objednávky:', margin, y);
        y += 4.5;
        pdf.setFont('helvetica', 'normal');
        order.items.forEach(item => {
          const line = `${item.quantity}× ${text(item.title)} · ${money(item.price)} / ks · celkem ${money(item.price * item.quantity)}`;
          addWrapped(line, margin + 3, contentWidth - 3, 8, 3.7);
          if (item.customNote) addWrapped(`Poznámka k položce: ${item.customNote}`, margin + 7, contentWidth - 7, 7.5, 3.5);
        });

        const orderNote = customer.note || raw.note || raw.customerNote;
        if (orderNote) addWrapped(`Poznámka zákazníka: ${text(orderNote)}`, margin + 3, contentWidth - 3, 8, 3.7);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(`Celkem objednávky: ${money(order.totalPrice)}`, pageWidth - margin - 65, y);
        y += 6;
        pdf.setDrawColor(220, 211, 201);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
      });

      ensureSpace(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(45, 39, 35);
      pdf.text(`CELKEM ZA VÝPIS: ${money(total)}`, margin, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 110, 100);
      addWrapped('Tento dokument je interní administrativní výpis z objednávek e-shopu. Nenahrazuje účetní ani daňovou evidenci, pokud je podle právních předpisů vedena samostatně.', margin, contentWidth, 7, 3.2);

      pdf.save(`luvia-decor-vypis-objednavek-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      window.alert('PDF se nepodařilo vytvořit. Zkuste prosím výpis obnovit a stáhnout znovu.');
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
            <h2 className="font-editorial text-2xl font-bold text-[#2D2723] mt-1">Zaplacené, u přepravce a vyřízené objednávky</h2>
            <p className="text-xs text-[#7B6E63] mt-1 max-w-2xl">Samostatný přehled objednávek ve stavech Zaplaceno, U přepravce a Dokončeno. Každá objednávka obsahuje detail zákazníka, dopravy, položek a částek.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="px-3 py-2 rounded-xl border border-[#E3DACF] bg-[#FAF5EE] text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Obnovit</button>
            <button type="button" onClick={downloadPdf} disabled={downloading || loading || !shown.length} className="px-4 py-2 rounded-xl bg-[#2D2723] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> {downloading ? 'Vytvářím PDF…' : 'Stáhnout PDF'}</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-5">
          {([
            ['both', `Vše (${eligible.length})`],
            ['paid', `Zaplacené (${counts.paid})`],
            ['carrier', `U přepravce (${counts.carrier})`],
            ['completed', `Vyřízené (${counts.completed})`]
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${mode === value ? 'bg-[#2D2723] text-white border-[#2D2723]' : 'bg-[#FAF5EE] text-[#5C5046] border-[#E3DACF]'}`}>{label}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Výpis</span><p className="text-2xl font-bold mt-1">{shown.length}</p><p className="text-[11px] text-stone-500">objednávek</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Zaplacené</span><p className="text-2xl font-bold mt-1">{counts.paid}</p><p className="text-[11px] text-stone-500">objednávek</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">U přepravce</span><p className="text-2xl font-bold mt-1">{counts.carrier}</p><p className="text-[11px] text-stone-500">objednávek</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Celkem</span><p className="text-xl font-bold mt-1 text-[#8C7355]">{money(total)}</p><p className="text-[11px] text-stone-500">podle výpisu</p></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E8DFC8] p-6 sm:p-8 text-[#2D2723]">
        <div className="flex justify-between gap-4 border-b-2 border-[#2D2723] pb-4 mb-4">
          <div><h1 className="text-xl font-bold">Luvia Decor — kontrolní výpis objednávek</h1><p className="text-[11px] text-stone-500">Zaplacené · U přepravce · Vyřízené · vytvořeno {new Date().toLocaleString('cs-CZ')}</p></div>
          <FileText className="w-8 h-8 text-[#8C7355] shrink-0" />
        </div>
        {loading ? <div className="py-10 text-center text-sm text-stone-500">Načítám objednávky…</div> : shown.length === 0 ? <div className="py-10 text-center text-sm text-stone-500">V tomto výpisu nejsou žádné objednávky.</div> : (
          <div className="space-y-4">
            {shown.map((order, index) => (
              <div key={order.id} className="border border-[#EDE5DA] rounded-xl p-4 break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div><p className="font-bold text-sm">{index + 1}. {order.orderNumber || order.id}</p><p className="text-[10px] text-stone-500">{date(order.createdAt)} · {statusLabel(order.status)}</p></div>
                  <p className="font-bold text-[#8C7355]">{money(order.totalPrice)}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs">
                  <p><strong>Zákazník:</strong> {text(order.customer?.fullName)}</p>
                  <p><strong>E-mail:</strong> {text(order.customer?.email)}</p>
                  <p><strong>Telefon:</strong> {text(order.customer?.phone)}</p>
                  <p><strong>Adresa:</strong> {text(order.customer?.street)}, {text(order.customer?.zip)} {text(order.customer?.city)}, {text(order.customer?.country)}</p>
                  <p><strong>Doprava:</strong> {deliveryLabel(order)}</p>
                  <p><strong>Přepravce:</strong> {text(order.delivery?.carrier || (order.delivery?.method === 'personal_pickup' ? 'Osobní odběr' : '—'))}</p>
                  {order.delivery?.pickupPoint && <p className="md:col-span-2"><strong>Výdejní místo / box:</strong> {order.delivery.pickupPoint}</p>}
                  <p><strong>Doprava cena:</strong> {money(order.shipping)}</p>
                  <p><strong>Mezisoučet:</strong> {money(order.subtotal)}</p>
                  <p><strong>Sleva:</strong> {order.discount ? `-${money(order.discount)}` : '0,00 Kč'}</p>
                  {order.couponCode && <p><strong>Kód:</strong> {order.couponCode}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-[#F2ECE4] text-[10px] text-stone-600">
                  <strong>Položky:</strong> {order.items?.map((item, i) => <span key={i} className="mr-3 inline-block">{item.quantity}× {item.title} ({money(item.price * item.quantity)})</span>)}
                </div>
                {order.customer?.note && <p className="mt-2 text-[10px] text-stone-600"><strong>Poznámka:</strong> {order.customer.note}</p>}
              </div>
            ))}
            <div className="flex justify-end pt-4 border-t-2 border-[#2D2723]"><strong>Celkem za výpis: {money(total)}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};
