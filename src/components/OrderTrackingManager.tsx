import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, PackageSearch, RefreshCw, Save, Trash2, Truck } from 'lucide-react';

const carriers = ['PPL', 'DPD', 'Zásilkovna'] as const;
type Carrier = typeof carriers[number];

const statusOptions = ['Zásilka evidována', 'Převzata přepravcem', 'Na depu', 'V přepravě', 'Doručována', 'Připravena k vyzvednutí', 'Doručena', 'Vrácena', 'Problém se zásilkou'];

export const OrderTrackingManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, { carrier: Carrier; trackingNumber: string; status: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Objednávky se nepodařilo načíst.');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      setForm(prev => {
        const next = { ...prev };
        list.forEach(order => {
          const t = order.tracking || {};
          if (!next[order.id]) next[order.id] = {
            carrier: (t.carrier || order.delivery?.carrier || 'PPL') as Carrier,
            trackingNumber: t.trackingNumber || '',
            status: t.status || 'Zásilka evidována'
          };
        });
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const updateForm = (id: string, patch: Partial<{ carrier: Carrier; trackingNumber: string; status: string }>) => {
    setForm(prev => ({ ...prev, [id]: { ...(prev[id] || { carrier: 'PPL', trackingNumber: '', status: 'Zásilka evidována' }), ...patch } }));
  };

  const save = async (order: any, refresh = false) => {
    const values = form[order.id];
    if (!values?.trackingNumber.trim()) return;
    setSavingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/tracking`, {
        method: refresh ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, refresh })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uložení sledování selhalo.');
      setOrders(prev => prev.map(item => item.id === order.id ? data : item));
      const t = data.tracking || {};
      updateForm(order.id, { carrier: t.carrier, trackingNumber: t.trackingNumber, status: t.status });
    } catch (e: any) {
      window.alert(e?.message || 'Chyba při ukládání sledování.');
    } finally {
      setSavingId(null);
    }
  };

  const clear = async (order: any) => {
    setSavingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/tracking`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Smazání sledování selhalo.');
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, tracking: undefined } : item));
      updateForm(order.id, { trackingNumber: '', status: 'Zásilka evidována' });
    } catch (e: any) {
      window.alert(e?.message || 'Chyba při mazání sledování.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2ECE4] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FAF5EE] border border-[#E8DFC8] flex items-center justify-center text-[#8C7355]"><Truck className="w-5 h-5" /></div>
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Sledování zásilek</h2>
            <p className="text-xs text-[#7B6E63]">Přidej číslo zásilky a sleduj stav přímo v administraci.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-2 bg-[#FAF5EE] border border-[#E3DACF] rounded-xl text-xs font-semibold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Obnovit</button>
      </div>

      {orders.length === 0 ? <p className="text-xs text-stone-500 text-center py-8">Žádné objednávky.</p> : (
        <div className="space-y-3">
          {orders.map(order => {
            const values = form[order.id] || { carrier: 'PPL' as Carrier, trackingNumber: '', status: 'Zásilka evidována' };
            const tracking = order.tracking;
            const external = tracking?.externalStatus;
            return (
              <div key={order.id} className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-[#2D2723]">{order.orderNumber}</div>
                    <div className="text-[11px] text-stone-500">{order.customer?.fullName || 'Zákazník'} · {order.customer?.email || ''}</div>
                  </div>
                  {tracking?.trackingUrl && <a href={tracking.trackingUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#8C7355] flex items-center gap-1">Otevřít tracking <ExternalLink className="w-3 h-3" /></a>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_220px_auto] gap-2 items-end">
                  <label className="text-[10px] font-semibold text-[#5C5046]">Přepravce<select value={values.carrier} onChange={e => updateForm(order.id, { carrier: e.target.value as Carrier })} className="mt-1 w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs"><option>PPL</option><option>DPD</option><option>Zásilkovna</option></select></label>
                  <label className="text-[10px] font-semibold text-[#5C5046]">Číslo zásilky<input value={values.trackingNumber} onChange={e => updateForm(order.id, { trackingNumber: e.target.value })} placeholder="Tracking číslo" className="mt-1 w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs" /></label>
                  <label className="text-[10px] font-semibold text-[#5C5046]">Stav<select value={values.status} onChange={e => updateForm(order.id, { status: e.target.value })} className="mt-1 w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs">{statusOptions.map(s => <option key={s}>{s}</option>)}</select></label>
                  <div className="flex gap-2"><button disabled={savingId === order.id || !values.trackingNumber.trim()} onClick={() => save(order)} className="px-3 py-2 bg-[#2D2723] text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Save className="w-3.5 h-3.5" />Uložit</button><button disabled={savingId === order.id || !values.trackingNumber.trim()} onClick={() => save(order, true)} title="Aktualizovat stav z API" className="p-2 bg-white border border-[#E3DACF] rounded-xl disabled:opacity-50"><PackageSearch className="w-4 h-4 text-[#8C7355]" /></button><button disabled={savingId === order.id || !tracking} onClick={() => clear(order)} title="Odebrat tracking" className="p-2 bg-rose-50 border border-rose-200 rounded-xl disabled:opacity-50"><Trash2 className="w-4 h-4 text-rose-600" /></button></div>
                </div>
                {tracking && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white rounded-xl border border-[#EDE5DA] p-3 text-[11px]">
                      <div className="font-bold text-[#2D2723]">Stav zásilky: <span className="text-[#8C7355]">{tracking.status}</span></div>
                      <div className="text-stone-500 mt-1">{tracking.carrier} · {tracking.trackingNumber} · aktualizováno {new Date(tracking.updatedAt).toLocaleString('cs-CZ')}</div>
                      {tracking.refreshError && <div className="mt-2 text-amber-700">Automatická aktualizace: {tracking.refreshError}</div>}
                    </div>
                    <div className="bg-white rounded-xl border border-[#EDE5DA] p-3 text-[11px]">
                      <div className="font-bold text-[#2D2723]">Stav od přepravce</div>
                      {external ? <><div className="mt-1 font-semibold">{external.statusText || external.codeText || 'Dostupný stav'}</div>{external.dateTime && <div className="text-stone-500 mt-1">{new Date(external.dateTime).toLocaleString('cs-CZ')}</div>}{external.carrierName && <div className="text-stone-500">{external.carrierName}</div>}</> : <div className="text-stone-500 mt-1">Pro automatický stav je potřeba API přístup daného přepravce. Tracking odkaz je dostupný ihned.</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
