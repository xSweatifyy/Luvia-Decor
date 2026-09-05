import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, PackageSearch, RefreshCw, Save, Trash2, Truck } from 'lucide-react';
const carriers = ['PPL', 'DPD', 'Zásilkovna'] as const;
type Carrier = typeof carriers[number];
const statusOptions = ['Zásilka evidována', 'Převzata přepravcem', 'Na depu', 'V přepravě', 'Doručována', 'Připravena k vyzvednutí', 'Doručena', 'Vrácena', 'Problém se zásilkou'];
type FormValues = { carrier: Carrier; trackingNumber: string; status: string };
const normalizeCarrier = (value: unknown): Carrier => { const v = String(value || '').trim().toLowerCase(); if (v.includes('zasil') || v.includes('packeta')) return 'Zásilkovna'; if (v.includes('dpd')) return 'DPD'; return 'PPL'; };

export const OrderTrackingManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, FormValues>>({});
  const refreshing = useRef(false);
  const savingIds = useRef(new Set<string>());
  const dirtyIds = useRef(new Set<string>());
  const mutationVersion = useRef(new Map<string, number>());
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const load = useCallback(async (refreshTracking = false) => {
    if (refreshTracking && refreshing.current) return;
    if (refreshTracking) refreshing.current = true;
    if (!refreshTracking) setLoading(true);
    const requestVersions = new Map(mutationVersion.current);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Objednávky se nepodařilo načíst.');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      setOrders(prev => list.map(serverOrder => {
        const id = serverOrder.id;
        const changedDuringRequest = mutationVersion.current.get(id) !== requestVersions.get(id);
        if (changedDuringRequest || savingIds.current.has(id) || dirtyIds.current.has(id)) {
          return prev.find(item => item.id === id) || serverOrder;
        }
        return serverOrder;
      }));

      setForm(prev => {
        const next = { ...prev };
        list.forEach(order => {
          const id = order.id;
          const changedDuringRequest = mutationVersion.current.get(id) !== requestVersions.get(id);
          if (changedDuringRequest || savingIds.current.has(id) || dirtyIds.current.has(id)) return;
          const t = order.tracking || {};
          next[id] = {
            carrier: normalizeCarrier(t.carrier || order.delivery?.carrier || 'PPL'),
            trackingNumber: t.trackingNumber || '',
            status: t.status || 'Zásilka evidována',
          };
        });
        formRef.current = next;
        return next;
      });

      if (refreshTracking) {
        const tracked = list.filter(order => order.tracking?.trackingNumber && !savingIds.current.has(order.id) && !dirtyIds.current.has(order.id));
        for (let i = 0; i < tracked.length; i += 4) {
          const batch = tracked.slice(i, i + 4);
          await Promise.all(batch.map(async order => {
            const id = order.id;
            if (savingIds.current.has(id) || dirtyIds.current.has(id) || mutationVersion.current.get(id) !== requestVersions.get(id)) return null;
            try {
              const t = order.tracking || {};
              const carrier = normalizeCarrier(t.carrier);
              const trackingNumber = String(t.trackingNumber || '').trim();
              if (!trackingNumber) return null;
              const r = await fetch(`/api/orders/${encodeURIComponent(id)}/tracking`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
                body: JSON.stringify({ carrier, trackingNumber, refresh: true, autoRefresh: true }),
              });
              return r.ok ? await r.json() : null;
            } catch { return null; }
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!refreshTracking) setLoading(false);
      if (refreshTracking) refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    load(false);
    const timer = window.setInterval(() => { void load(true); }, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const updateForm = (id: string, patch: Partial<FormValues>) => {
    dirtyIds.current.add(id);
    mutationVersion.current.set(id, (mutationVersion.current.get(id) || 0) + 1);
    setForm(prev => {
      const updated = { ...prev, [id]: { ...(prev[id] || { carrier: 'PPL', trackingNumber: '', status: 'Zásilka evidována' }), ...patch } };
      formRef.current = updated;
      return updated;
    });
  };

  const save = async (order: any, refresh = false) => {
    const values = formRef.current[order.id];
    if (!values?.trackingNumber.trim()) return;
    const id = order.id;
    mutationVersion.current.set(id, (mutationVersion.current.get(id) || 0) + 1);
    const saveVersion = mutationVersion.current.get(id);
    savingIds.current.add(id);
    setSavingId(id);
    try {
      const payload = { carrier: normalizeCarrier(values.carrier), trackingNumber: values.trackingNumber.trim(), status: values.status, refresh, autoRefresh: false };
      const endpoint = `/api/orders/${encodeURIComponent(id)}/tracking`;
      let res = await fetch(endpoint, { method: refresh ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(payload) });
      if (!res.ok && !refresh) {
        res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(payload) });
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Uložení sledování selhalo (HTTP ${res.status}).`);
      if (mutationVersion.current.get(id) !== saveVersion) return;
      setOrders(prev => prev.map(item => item.id === id ? data : item));
      const t = data.tracking || {};
      setForm(prev => {
        const updated = { ...prev, [id]: { carrier: normalizeCarrier(t.carrier || payload.carrier), trackingNumber: t.trackingNumber || payload.trackingNumber, status: t.status || payload.status } };
        formRef.current = updated;
        return updated;
      });
      dirtyIds.current.delete(id);
    } catch (e: any) {
      window.alert(e?.message || 'Chyba při ukládání sledování.');
    } finally {
      savingIds.current.delete(id);
      setSavingId(null);
    }
  };

  const clear = async (order: any) => {
    const id = order.id;
    mutationVersion.current.set(id, (mutationVersion.current.get(id) || 0) + 1);
    savingIds.current.add(id);
    setSavingId(id);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}/tracking`, { method: 'DELETE', cache: 'no-store' });
      if (!res.ok) throw new Error('Smazání sledování selhalo.');
      setOrders(prev => prev.map(item => item.id === id ? { ...item, tracking: undefined } : item));
      setForm(prev => {
        const updated = { ...prev, [id]: { ...(prev[id] || { carrier: 'PPL' as Carrier, trackingNumber: '', status: 'Zásilka evidována' }), trackingNumber: '', status: 'Zásilka evidována' } };
        formRef.current = updated;
        return updated;
      });
      dirtyIds.current.delete(id);
    } catch (e: any) {
      window.alert(e?.message || 'Chyba při mazání sledování.');
    } finally {
      savingIds.current.delete(id);
      setSavingId(null);
    }
  };

  return <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2ECE4] pb-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FAF5EE] border border-[#E8DFC8] flex items-center justify-center text-[#8C7355]"><Truck className="w-5 h-5" /></div><div><h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Sledování zásilek</h2><p className="text-xs text-[#7B6E63]">Stav zásilek se automaticky kontroluje každou minutu.</p></div></div><button type="button" onClick={() => load(false)} disabled={loading} className="px-3 py-2 bg-[#FAF5EE] border border-[#E3DACF] rounded-xl text-xs font-semibold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Obnovit</button></div>{orders.length === 0 ? <p className="text-xs text-stone-500 text-center py-8">Žádné objednávky.</p> : <div className="space-y-3">{orders.map(order => { const values = form[order.id] || { carrier: 'PPL' as Carrier, trackingNumber: '', status: 'Zásilka evidována' }; const tracking = order.tracking; const external = tracking?.externalStatus; return <div key={order.id} className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4 space-y-3"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2"><div><div className="font-bold text-sm text-[#2D2723]">{order.orderNumber}</div><div className="text-[11px] text-stone-500">{order.customer?.fullName || 'Zákazník'} · {order.customer?.email || ''}</div></div>{tracking?.trackingUrl && <a href={tracking.trackingUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#8C7355] flex items-center gap-1">Otevřít tracking <ExternalLink className="w-3 h-3" /></a>}</div><div className="grid grid-cols-1 md:grid-cols-[150px_1fr_220px_auto] gap-2 items-end"><label className="text-[10px] font-semibold text-[#5C5046]">Přepravce<select value={values.carrier} onChange={e => updateForm(order.id, { carrier: e.target.value as Carrier })} className="mt-1 w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs"><option>PPL</option><option>DPD</option><option>Zásilkovna</option></select></label><label className="text-[10px] font-semibold text-[#5C5046]">Číslo zásilky<input value={values.trackingNumber} onChange={e => updateForm(order.id, { trackingNumber: e.target.value })} placeholder="Tracking číslo" className="mt-1 w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs" /></label><label className="text-[10px] font-semibold text-[#5C5046]">Stav<select value={values.status} onChange={e => updateForm(order.id, { status: e.target.value })} className="mt-1 w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs">{statusOptions.map(s => <option key={s}>{s}</option>)}</select></label><div className="flex gap-2"><button type="button" disabled={savingId === order.id || !values.trackingNumber.trim()} onClick={() => save(order)} className="px-3 py-2 bg-[#2D2723] text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Save className="w-3.5 h-3.5" />Uložit</button><button type="button" disabled={savingId === order.id || !values.trackingNumber.trim()} onClick={() => save(order, true)} title="Aktualizovat stav z API" className="p-2 bg-white border border-[#E3DACF] rounded-xl disabled:opacity-50"><PackageSearch className="w-4 h-4 text-[#8C7355]" /></button><button type="button" disabled={savingId === order.id || !tracking} onClick={() => clear(order)} title="Odebrat tracking" className="p-2 bg-rose-50 border border-rose-200 rounded-xl disabled:opacity-50"><Trash2 className="w-4 h-4 text-rose-600" /></button></div></div>{tracking && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1"><div className="bg-white rounded-xl border border-[#EDE5DA] p-3 text-[11px]"><div className="font-bold text-[#2D2723]">Stav zásilky: <span className="text-[#8C7355]">{tracking.status}</span></div><div className="text-stone-500 mt-1">{tracking.carrier} · {tracking.trackingNumber} · aktualizováno {new Date(tracking.updatedAt).toLocaleString('cs-CZ')}</div>{tracking.refreshError && <div className="mt-2 text-amber-700">Automatická aktualizace: {tracking.refreshError}</div>}</div><div className="bg-white rounded-xl border border-[#EDE5DA] p-3 text-[11px]"><div className="font-bold text-[#2D2723]">Stav od přepravce</div>{external ? <><div className="mt-1 font-semibold">{external.statusText || external.codeText || 'Dostupný stav'}</div>{external.dateTime && <div className="text-stone-500 mt-1">{new Date(external.dateTime).toLocaleString('cs-CZ')}</div>}{external.carrierName && <div className="text-stone-500">{external.carrierName}</div></> : <div className="text-stone-500 mt-1">Automatický stav je dostupný u přepravců s nakonfigurovaným API. Tracking odkaz je dostupný ihned.</div>}</div></div>}</div>; })}</div>}</section>;
};
