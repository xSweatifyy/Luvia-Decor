import React, { useEffect, useState } from 'react';
import { Truck, MapPin, Home, Package } from 'lucide-react';

type Delivery = { method?: string; carrier?: string; pickupPoint?: string };
type Order = { id: string; orderNumber: string; customer?: { street?: string; city?: string; zip?: string; country?: string }; delivery?: Delivery };

const methodLabel = (method?: string) => method === 'pickup_point' ? 'Výdejní místo' : method === 'personal_pickup' ? 'Osobní odběr' : 'Doručení na adresu';

export const OrderDeliveryPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data)) setOrders(data);
      } catch {}
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (!orders.length) return null;

  return (
    <section style={{ marginTop: 24, borderRadius: 18, border: '1px solid rgba(148,163,184,.22)', background: 'rgba(15,23,42,.55)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Truck size={20} />
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Dodání a doprava objednávek</h3>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {orders.map(order => {
          const delivery = order.delivery;
          const customer = order.customer || {};
          const method = delivery?.method || 'address';
          const address = [customer.street, [customer.zip, customer.city].filter(Boolean).join(' '), customer.country].filter(Boolean).join(', ');
          return (
            <div key={order.id} style={{ borderRadius: 14, border: '1px solid rgba(148,163,184,.16)', background: 'rgba(2,6,23,.35)', padding: 15 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <strong>#{order.orderNumber}</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: .9 }}><Package size={15} /> {methodLabel(method)}</span>
                {delivery?.carrier && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: .9 }}><Truck size={15} /> {delivery.carrier}</span>}
              </div>
              {method === 'address' && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}><Home size={16} style={{ marginTop: 2, flex: '0 0 auto' }} /><span><b>Dodací adresa:</b> {address || 'Adresa neuvedena'}</span></div>}
              {method === 'pickup_point' && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}><MapPin size={16} style={{ marginTop: 2, flex: '0 0 auto' }} /><span><b>Výdejní místo:</b> {delivery?.pickupPoint || 'Výdejní místo neuvedeno'}</span></div>}
              {method === 'personal_pickup' && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}><Home size={16} style={{ marginTop: 2, flex: '0 0 auto' }} /><span><b>Osobní odběr:</b> zákazník si objednávku vyzvedne osobně</span></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
};
