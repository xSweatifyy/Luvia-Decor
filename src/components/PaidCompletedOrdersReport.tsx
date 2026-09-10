import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Order } from '../types';

const money = (value: unknown) => `${Number(value || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const date = (value: unknown) => {
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('cs-CZ');
};

const paidStatuses = ['zaplaceno', 'u_prepravce', 'dokonceno'] as const;

const statusLabel = (status: string) => ({
  zaplaceno: 'Zaplaceno',
  u_prepravce: 'U přepravce',
  dokonceno: 'Vyřízeno'
}[status] || status);

const statusTone = (status: string) => ({
  zaplaceno: { bg: '#EAF6EE', color: '#176B3A', border: '#BFE4CB' },
  u_prepravce: { bg: '#EEF4FF', color: '#2456A6', border: '#C9D9F5' },
  dokonceno: { bg: '#F5F0FF', color: '#6542A4', border: '#D9CBF2' }
}[status] || { bg: '#F5F5F5', color: '#555', border: '#DDD' });

const carrierLabel = (order: Order) => {
  // Historicky uložená objednávka LUV-2026-4005 má být v kontrolním výpisu vedena jako Zásilkovna.
  if (order.orderNumber === 'LUV-2026-4005') return 'Zásilkovna';
  return order.delivery?.carrier || (order.delivery?.method === 'personal_pickup' ? 'Osobní odběr' : '—');
};

const deliveryLabel = (order: Order) => {
  const delivery = order.delivery;
  if (!delivery) return 'Neuvedeno';
  if (delivery.method === 'personal_pickup') return 'Osobní odběr Kroměříž';
  const method = delivery.method === 'pickup_point' ? 'Výdejní místo / box' : 'Na adresu';
  return `${carrierLabel(order)} · ${method}${delivery.pickupPoint ? ` · ${delivery.pickupPoint}` : ''}`;
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

  // U přepravce a Vyřízeno jsou objednávky logicky také zaplacené.
  const eligible = useMemo(
    () => orders.filter(o => paidStatuses.includes(o.status as typeof paidStatuses[number])),
    [orders]
  );

  const shown = useMemo(() => {
    if (mode === 'both' || mode === 'paid') return eligible;
    const wanted = mode === 'carrier' ? 'u_prepravce' : 'dokonceno';
    return eligible.filter(o => o.status === wanted);
  }, [eligible, mode]);

  const counts = useMemo(() => ({
    paid: eligible.length,
    paidDirect: eligible.filter(o => o.status === 'zaplaceno').length,
    carrier: eligible.filter(o => o.status === 'u_prepravce').length,
    completed: eligible.filter(o => o.status === 'dokonceno').length,
  }), [eligible]);

  const total = shown.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

  const downloadPdf = async () => {
    if (!shown.length || downloading) return;
    setDownloading(true);

    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.left = '-100000px';
    root.style.top = '0';
    root.style.width = '180mm';
    root.style.background = '#ffffff';
    root.style.color = '#2D2723';
    root.style.fontFamily = 'Arial, Helvetica, sans-serif';
    root.style.padding = '0';
    root.style.boxSizing = 'border-box';

    try {
      const generatedAt = new Date().toLocaleString('cs-CZ');
      const statusChip = (status: string) => {
        const tone = statusTone(status);
        return `<span style="display:inline-block;padding:4px 9px;border-radius:999px;background:${tone.bg};color:${tone.color};border:1px solid ${tone.border};font-size:10px;font-weight:700;">${statusLabel(status)}</span>`;
      };

      const rows = shown.map((order, index) => {
        const raw = order as Order & Record<string, unknown>;
        const customer = order.customer || ({} as Order['customer']);
        const delivery = order.delivery;
        const paymentMethod = raw.paymentMethod || raw.payment || raw.paymentType;
        const variableSymbol = raw.variableSymbol || raw.vs;
        const carrier = carrierLabel(order);
        const itemRows = (order.items || []).map(item => `
          <tr>
            <td style="padding:7px 8px;border-bottom:1px solid #EEE8DF;vertical-align:top;">${item.quantity}×</td>
            <td style="padding:7px 8px;border-bottom:1px solid #EEE8DF;vertical-align:top;"><strong>${text(item.title)}</strong>${item.customNote ? `<div style="font-size:9px;color:#7B6E63;margin-top:3px;">Poznámka: ${text(item.customNote)}</div>` : ''}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #EEE8DF;text-align:right;vertical-align:top;white-space:nowrap;">${money(item.price)} / ks</td>
            <td style="padding:7px 8px;border-bottom:1px solid #EEE8DF;text-align:right;vertical-align:top;white-space:nowrap;font-weight:700;">${money(item.price * item.quantity)}</td>
          </tr>`).join('');

        const orderNote = customer.note || raw.note || raw.customerNote;
        return `
          <section style="margin:0 0 18px 0;border:1px solid #E5DDD2;border-radius:12px;overflow:hidden;page-break-inside:avoid;background:#fff;">
            <div style="background:#F7F2EC;padding:11px 13px;border-bottom:1px solid #E5DDD2;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:13px;font-weight:800;letter-spacing:.1px;">${index + 1}. ${text(order.orderNumber || order.id)}</div>
                <div style="font-size:9px;color:#7B6E63;margin-top:3px;">${date(order.createdAt)}</div>
              </div>
              <div style="text-align:right;">${statusChip(order.status)}<div style="font-size:13px;font-weight:800;color:#8C7355;margin-top:5px;">${money(order.totalPrice)}</div></div>
            </div>
            <div style="padding:13px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:9.5px;line-height:1.45;">
                <div><span style="color:#8A7C70;">Zákazník</span><br><strong>${text(customer.fullName)}</strong></div>
                <div><span style="color:#8A7C70;">E-mail</span><br>${text(customer.email)}</div>
                <div><span style="color:#8A7C70;">Telefon</span><br>${text(customer.phone)}</div>
                <div><span style="color:#8A7C70;">Adresa</span><br>${text(customer.street)}, ${text(customer.zip)} ${text(customer.city)}, ${text(customer.country)}</div>
                <div><span style="color:#8A7C70;">Doprava</span><br>${deliveryLabel(order)}</div>
                <div><span style="color:#8A7C70;">Přepravce</span><br>${text(carrier)}</div>
                ${delivery?.pickupPoint ? `<div style="grid-column:1 / -1;"><span style="color:#8A7C70;">Výdejní místo / box</span><br>${text(delivery.pickupPoint)}</div>` : ''}
                ${paymentMethod ? `<div><span style="color:#8A7C70;">Platba</span><br>${text(paymentMethod)}</div>` : ''}
                ${variableSymbol ? `<div><span style="color:#8A7C70;">Variabilní symbol</span><br>${text(variableSymbol)}</div>` : ''}
              </div>

              <div style="margin-top:12px;border-top:1px solid #EEE8DF;padding-top:10px;">
                <div style="font-size:10px;font-weight:800;margin-bottom:5px;">Položky objednávky</div>
                <table style="width:100%;border-collapse:collapse;font-size:9px;">
                  <thead><tr style="background:#FAF7F3;color:#7B6E63;"><th style="padding:6px 8px;text-align:left;width:9%;">Ks</th><th style="padding:6px 8px;text-align:left;">Produkt</th><th style="padding:6px 8px;text-align:right;">Cena</th><th style="padding:6px 8px;text-align:right;">Celkem</th></tr></thead>
                  <tbody>${itemRows}</tbody>
                </table>
              </div>

              <div style="display:flex;justify-content:flex-end;margin-top:9px;font-size:9.5px;line-height:1.6;">
                <div style="min-width:190px;">
                  <div style="display:flex;justify-content:space-between;"><span>Mezisoučet</span><strong>${money(order.subtotal)}</strong></div>
                  <div style="display:flex;justify-content:space-between;"><span>Doprava</span><strong>${money(order.shipping)}</strong></div>
                  <div style="display:flex;justify-content:space-between;"><span>Sleva</span><strong>${order.discount ? `-${money(order.discount)}` : '0,00 Kč'}</strong></div>
                  ${order.couponCode ? `<div style="display:flex;justify-content:space-between;"><span>Kód / poukaz</span><strong>${text(order.couponCode)}</strong></div>` : ''}
                  <div style="display:flex;justify-content:space-between;border-top:1px solid #DCD2C6;margin-top:4px;padding-top:5px;font-size:11px;"><span><strong>Celkem</strong></span><strong style="color:#8C7355;">${money(order.totalPrice)}</strong></div>
                </div>
              </div>
              ${orderNote ? `<div style="margin-top:9px;padding:8px 10px;background:#FBF8F4;border-left:3px solid #C9B294;border-radius:4px;font-size:9px;"><strong>Poznámka zákazníka:</strong> ${text(orderNote)}</div>` : ''}
            </div>
          </section>`;
      }).join('');

      root.innerHTML = `
        <div style="background:#fff;padding:0 0 20px 0;">
          <div style="padding:18px 0 12px;border-bottom:2px solid #2D2723;">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;">
              <div><div style="font-size:23px;font-weight:800;letter-spacing:-.3px;">Luvia Decor</div><div style="font-size:13px;font-weight:700;margin-top:3px;">Kontrolní výpis objednávek</div></div>
              <div style="font-size:9px;color:#7B6E63;text-align:right;">Interní administrace<br>${generatedAt}</div>
            </div>
            <div style="font-size:9.5px;color:#6F6258;margin-top:9px;">Zaplacené objednávky — včetně stavů U přepravce a Vyřízeno</div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 16px;">
            <div style="border:1px solid #E5DDD2;border-radius:9px;padding:9px;background:#FAF7F3;"><div style="font-size:8px;color:#8A7C70;text-transform:uppercase;font-weight:700;">Zaplacené celkem</div><div style="font-size:16px;font-weight:800;margin-top:3px;">${counts.paid}</div></div>
            <div style="border:1px solid #E5DDD2;border-radius:9px;padding:9px;background:#FAF7F3;"><div style="font-size:8px;color:#8A7C70;text-transform:uppercase;font-weight:700;">Zaplaceno</div><div style="font-size:16px;font-weight:800;margin-top:3px;">${counts.paidDirect}</div></div>
            <div style="border:1px solid #E5DDD2;border-radius:9px;padding:9px;background:#FAF7F3;"><div style="font-size:8px;color:#8A7C70;text-transform:uppercase;font-weight:700;">U přepravce</div><div style="font-size:16px;font-weight:800;margin-top:3px;">${counts.carrier}</div></div>
            <div style="border:1px solid #E5DDD2;border-radius:9px;padding:9px;background:#FAF7F3;"><div style="font-size:8px;color:#8A7C70;text-transform:uppercase;font-weight:700;">Vyřízeno</div><div style="font-size:16px;font-weight:800;margin-top:3px;">${counts.completed}</div></div>
          </div>

          <div style="margin-bottom:14px;padding:10px 12px;background:#2D2723;color:#fff;border-radius:9px;display:flex;justify-content:space-between;align-items:center;font-size:10px;"><span>Hodnota aktuálního výpisu</span><strong style="font-size:13px;">${money(total)}</strong></div>
          ${rows}
          <div style="border-top:2px solid #2D2723;padding-top:9px;margin-top:4px;display:flex;justify-content:space-between;font-size:12px;font-weight:800;"><span>CELKEM ZA VÝPIS</span><span style="color:#8C7355;">${money(total)}</span></div>
          <div style="margin-top:13px;padding-top:9px;border-top:1px solid #E5DDD2;font-size:8px;color:#7B6E63;">Výpis objednávek z interní administrace.</div>
        </div>`;

      document.body.appendChild(root);

      // Počkáme na fonty prohlížeče a PDF generujeme přes HTML renderer. Ten vykresluje
      // češtinu jako grafiku, takže se neztrácí Ř, Č, Š, Ž, Ě ani ostatní diakritika.
      if (document.fonts?.ready) await document.fonts.ready;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      await new Promise<void>((resolve, reject) => {
        pdf.html(root, {
          x: 15,
          y: 12,
          width: 180,
          windowWidth: 680,
          autoPaging: 'text',
          margin: [12, 15, 12, 15],
          html2canvas: {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollX: 0,
            scrollY: 0
          },
          callback: () => resolve(),
          error: (error: Error) => reject(error)
        });
      });

      pdf.save(`luvia-decor-vypis-objednavek-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      window.alert('PDF se nepodařilo vytvořit. Zkuste prosím výpis obnovit a stáhnout znovu.');
    } finally {
      root.remove();
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
            <p className="text-xs text-[#7B6E63] mt-1 max-w-2xl">Objednávky ve stavech Zaplaceno, U přepravce a Vyřízeno. Stavy U přepravce a Vyřízeno se automaticky počítají také mezi zaplacené objednávky.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="px-3 py-2 rounded-xl border border-[#E3DACF] bg-[#FAF5EE] text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Obnovit</button>
            <button type="button" onClick={downloadPdf} disabled={downloading || loading || !shown.length} className="px-4 py-2 rounded-xl bg-[#2D2723] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> {downloading ? 'Vytvářím PDF…' : 'Stáhnout PDF'}</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-5">
          {([
            ['both', `Vše (${eligible.length})`],
            ['paid', `Zaplacené celkem (${counts.paid})`],
            ['carrier', `U přepravce (${counts.carrier})`],
            ['completed', `Vyřízené (${counts.completed})`]
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${mode === value ? 'bg-[#2D2723] text-white border-[#2D2723]' : 'bg-[#FAF5EE] text-[#5C5046] border-[#E3DACF]'}`}>{label}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Zaplacené celkem</span><p className="text-2xl font-bold mt-1">{counts.paid}</p><p className="text-[11px] text-stone-500">včetně přepravce a vyřízených</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Zaplaceno</span><p className="text-2xl font-bold mt-1">{counts.paidDirect}</p><p className="text-[11px] text-stone-500">aktuálně ve stavu Zaplaceno</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">U přepravce</span><p className="text-2xl font-bold mt-1">{counts.carrier}</p><p className="text-[11px] text-stone-500">již zaplacené</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#EDE5DA] p-4"><span className="text-[10px] uppercase font-bold text-[#8C7355]">Vyřízeno</span><p className="text-2xl font-bold mt-1">{counts.completed}</p><p className="text-[11px] text-stone-500">již zaplacené</p></div>
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
                  <p><strong>Přepravce:</strong> {text(carrierLabel(order))}</p>
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
