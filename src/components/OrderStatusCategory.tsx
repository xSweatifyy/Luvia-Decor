import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';

const STATUS_OPTIONS: Array<{ value: Order['status']; label: string }> = [
  { value: 'nova', label: 'Nová' },
  { value: 'zpracovava_se', label: 'Zpracovává se' },
  { value: 'zaplaceno', label: 'Zaplaceno' },
  { value: 'u_prepravce', label: 'U přepravce' },
  { value: 'odeslano', label: 'Odesláno' },
  { value: 'dokonceno', label: 'Dokončeno' },
  { value: 'zruseno', label: 'Zrušeno' },
];

const statusLabel = (status: string) => STATUS_OPTIONS.find(option => option.value === status)?.label || status;

export const OrderStatusCategory: React.FC = () => {
  const { adminUser, addToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Order['status']>>({});

  const loadOrders = async () => {
    if (!adminUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Objednávky se nepodařilo načíst.');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Neplatná odpověď serveru.');
      setOrders(data);
      setDrafts(Object.fromEntries(data.map((order: Order) => [order.id, order.status || 'nova'])));
    } catch (error: any) {
      addToast('error', 'Chyba', error?.message || 'Objednávky se nepodařilo načíst.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = window.setInterval(loadOrders, 5000);
    return () => window.clearInterval(interval);
  }, [adminUser]);

  const pendingCount = useMemo(() => orders.filter(order => (order.status || 'nova') === 'nova').length, [orders]);

  const saveStatus = async (order: Order) => {
    const status = drafts[order.id] || order.status || 'nova';
    if (status === order.status) return;

    setSavingId(order.id);
    try {
      // Update the order first through the simple, dedicated endpoint. This keeps
      // the database change independent from e-mail delivery failures.
      const updateRes = await fetch('/api/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, status })
      });

      const updateData = await updateRes.json().catch(() => null);
      if (!updateRes.ok || updateData?.success === false) {
        throw new Error(updateData?.error || 'Aktualizace stavu selhala.');
      }

      const updatedOrder = updateData?.order || updateData;
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, ...updatedOrder, status } : item));
      setDrafts(prev => ({ ...prev, [order.id]: status }));

      // Send status notification separately. A Resend/API problem must not undo
      // the already successful status update.
      try {
        const emailRes = await fetch('/api/order-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, status })
        });
        if (!emailRes.ok) {
          const emailData = await emailRes.json().catch(() => null);
          addToast('warning', 'Stav uložen, e-mail se nepodařilo odeslat', emailData?.error || 'Objednávka byla aktualizována, ale oznámení e-mailem selhalo.');
          return;
        }
      } catch (emailError) {
        console.warn('Order status email failed:', emailError);
        addToast('warning', 'Stav uložen, e-mail se nepodařilo odeslat', 'Objednávka byla aktualizována, ale oznámení e-mailem selhalo.');
        return;
      }

      addToast('success', 'Stav objednávky aktualizován', `${order.orderNumber}: ${statusLabel(status)}`);
    } catch (error: any) {
      setDrafts(prev => ({ ...prev, [order.id]: order.status || 'nova' }));
      addToast('error', 'Chyba', error?.message || 'Aktualizace stavu selhala.');
    } finally {
      setSavingId(null);
    }
  };

  if (!adminUser) return null;

  return (
    <div id="admin-order-status-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-5 h-5 text-[#8C7355]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7355]">Samostatná kategorie</span>
            </div>
            <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Stavy objednávek</h2>
            <p className="text-xs text-[#7B6E63] mt-1">Změna stavu se nejprve uloží do objednávky a následně se odešle e-mail zákazníkovi i prodejci.</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">{pendingCount} nových</span>}
            <button onClick={loadOrders} disabled={loading} className="px-3 py-2 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-xs font-semibold rounded-xl border border-[#E3DACF] flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Obnovit
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
        {orders.length === 0 ? <p className="text-xs text-stone-500 py-16 text-center">Žádné objednávky.</p> : (
          <div className="divide-y divide-[#EDE5DA]">
            {orders.map(order => {
              const currentStatus = order.status || 'nova';
              return <div key={order.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#2D2723]">{order.orderNumber}</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#FAF5EE] border border-[#E3DACF] text-[10px] font-bold text-[#6B5C4F]">{statusLabel(currentStatus)}</span>
                  </div>
                  <p className="text-xs text-[#5C5046] mt-1">{order.customer?.fullName || 'Zákazník'} · {order.customer?.email || 'Bez e-mailu'}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleString('cs-CZ') : ''}</p>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <select value={drafts[order.id] || currentStatus} onChange={event => setDrafts(prev => ({ ...prev, [order.id]: event.target.value as Order['status'] }))} className="flex-1 lg:w-56 px-3 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs font-semibold cursor-pointer">
                    {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button onClick={() => saveStatus(order)} disabled={savingId === order.id || (drafts[order.id] || currentStatus) === currentStatus} className="px-3.5 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <Save className="w-3.5 h-3.5" /> {savingId === order.id ? 'Ukládám…' : 'Uložit'}
                  </button>
                </div>
              </div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
