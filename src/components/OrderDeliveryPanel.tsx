import React, { useEffect, useState } from 'react';
import { Truck, MapPin, Home, Package, RefreshCw, CheckCircle2 } from 'lucide-react';

type Delivery = { method?: string; carrier?: string; pickupPoint?: unknown; address?: unknown; };
type Customer = { fullName?: string; street?: string; city?: string; zip?: string; country?: string };
type Order = { id: string; orderNumber?: string; status?: string; customer?: Customer; delivery?: Delivery; shipping?: unknown; };

const STATUS_OPTIONS = [
  ['nova', 'Nová objednávka'],
  ['zpracovava_se', 'Objednávka se zpracovává'],
  ['zaplaceno', 'Zaplaceno'],
  ['odeslano', 'Odesláno'],
  ['dokonceno', 'Objednávka dokončena'],
  ['zruseno', 'Objednávka zrušena']
] as const;
const statusLabel = (status?: string) => STATUS_OPTIONS.find(([key]) => key === status)?.[1] || status || 'Nová objednávka';
const methodLabel = (method?: string) => method === 'pickup_point' ? 'Výdejní místo' : method === 'personal_pickup' ? 'Osobní odběr' : 'Doručení na adresu';
const text = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return String(v.name || v.title || v.address || v.label || v.place || JSON.stringify(value));
  }
  return String(value);
};

export const OrderDeliveryPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?admin=1', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Načtení objednávek selhalo (${res.status}).`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('API nevrátilo seznam objednávek.');
      setOrders(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Objednávky se nepodařilo načíst.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const updateStatus = async (order: Order, status: string) => {
    if (savingId) return;
    setSavingId(order.id);
    try {
      const res = await fetch('/api/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Stav objednávky se nepodařilo uložit.');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...data.order } : o));
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Stav objednávky se nepodařilo uložit.');
    } finally { setSavingId(null); }
  };

  if (!orders.length && !loading && !error) return null;

  return (
    <section style={{ marginTop: 24, borderRadius: 18, border: '1px solid rgba(148,163,184,.22)', background: 'rgba(15,23,42,.55)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Truck size={20} /><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Dodání, doprava a stav objednávek</h3></div>
        <button type="button" onClick={load} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid rgba(148,163,184,.3)', background: 'rgba(255,255,255,.06)', color: 'inherit', borderRadius: 9, padding: '7px 10px', cursor: 'pointer' }}><RefreshCw size={15} /> Obnovit</button>
      </div>
      {error && <div style={{ marginBottom: 14, padding: 11, borderRadius: 10, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {orders.map(order => {
          const delivery = order.delivery || {};
          const customer = order.customer || {};
          const method = delivery.method || (delivery.pickupPoint ? 'pickup_point' : 'address');
          const address = [customer.street, [customer.zip, customer.city].filter(Boolean).join(' '), customer.country].filter(Boolean).join(', ');
          const pickup = text(delivery.pickupPoint || delivery.address);
          return (
            <div key={order.id} style={{ borderRadius: 14, border: '1px solid rgba(148,163,184,.16)', background: 'rgba(2,6,23,.35)', padding: 15 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <strong>#{order.orderNumber || order.id}</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Package size={15} /> {methodLabel(method)}</span>
                {delivery.carrier && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Truck size={15} /> Dopravce: <b>{text(delivery.carrier)}</b></span>}
              </div>
              <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                {method === 'address' && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><Home size={16} /><span><b>Dodací adresa:</b> {address || 'Adresa neuvedena'}</span></div>}
                {method === 'pickup_point' && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><MapPin size={16} /><span><b>Výdejní místo:</b> {pickup || 'Výdejní místo neuvedeno'}</span></div>}
                {method === 'personal_pickup' && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><Home size={16} /><span><b>Osobní odběr:</b> Kroměříž</span></div>}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(148,163,184,.14)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 13, opacity: .8 }}><b>Stav:</b> {statusLabel(order.status)}</span>
                <select value={order.status || 'nova'} disabled={savingId === order.id} onChange={e => updateStatus(order, e.target.value)} style={{ minWidth: 220, borderRadius: 9, padding: '8px 10px', background: '#111827', color: 'inherit', border: '1px solid rgba(148,163,184,.3)' }}>
                  {STATUS_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                {savingId === order.id ? <span style={{ fontSize: 12, opacity: .7 }}>Ukládám…</span> : <CheckCircle2 size={17} style={{ opacity: .65 }} />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
