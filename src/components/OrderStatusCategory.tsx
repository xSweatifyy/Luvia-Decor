import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Mail, RefreshCw, ShoppingBag, Save } from 'lucide-react';
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
      const response = await fetch('/api/orders', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) throw new Error(data?.error || 'Objednávky se nepodařilo načíst.');
      setOrders(data);
      setDrafts(Object.fromEntries(data.map((order: Order) => [order.id, order.status || 'nova'])));
    } catch (error: any) {
      addToast('error', 'Chyba', error?.message || 'Objednávky se nepodařilo načíst.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 5000);
    return () => window.clearInterval(interval);
  }, [adminUser]);

  const pendingCount = useMemo(() => orders.filter(order => (order.status || 'nova') === 'nova').length, [orders]);

  const saveStatus = async (order: Order) => {
    const status = drafts[order.id] || order.status || 'nova';
    const previousStatus = order.status || 'nova';
    if (status === previousStatus) return;
    setSavingId(order.id);
    try {
      const lookup = order.orderNumber || order.id;
      const response = await fetch(`/api/orders/${encodeURIComponent(lookup)}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success !== true) throw new Error(data?.error || `Aktualizace stavu selhala (${response.status}).`);
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, ...data, status } : item));
      if (data.statusEmail?.sent === false && !data.statusEmail?.skipped) {
        addToast('error', 'Stav uložen, e-mail selhal', `${order.orderNumber}: ${data.statusEmail.error || 'Zkontrolujte Resend.'}`);
      } else {
        addToast('success', 'Stav objednávky uložen', `${order.orderNumber}: ${statusLabel(status)}`);
      }
    } catch (error: any) {
      setDrafts(prev => ({ ...prev, [order.id]: previousStatus }));
      addToast('error', 'Chyba při aktualizaci stavu', error?.message || 'Stav objednávky se nepodařilo uložit.');
    } finally { setSavingId(null); }
  };

  if (!adminUser) return null;

  return <div id="admin-order-status-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-5 h-5 text-[#8C7355]" /><span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7355]">Správa objednávek</span></div><h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Stavy objednávek</h2><p className="text-xs text-[#7B6E63] mt-1">Vyberte nový stav a klikněte na Uložit. Zákazníkovi se po skutečné změně odešle informační e-mail.</p></div>
        <div className="flex items-center gap-2">{pendingCount > 0 && <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">{pendingCount} nových</span>}<button type="button" onClick={() => void loadOrders()} disabled={loading} className="px-3 py-2 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-xs font-semibold rounded-xl border border-[#E3DACF] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Obnovit</button></div>
      </div>
    </div>
    <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
      {orders.length === 0 ? <p className="text-xs text-stone-500 py-16 text-center">Žádné objednávky.</p> : <div className="divide-y divide-[#EDE5DA]">{orders.map(order => {
        const currentStatus = order.status || 'nova'; const draftStatus = drafts[order.id] || currentStatus; const saving = savingId === order.id; const changed = draftStatus !== currentStatus;
        return <div key={order.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-sm text-[#2D2723]">{order.orderNumber}</span><span className="px-2.5 py-1 rounded-full bg-[#FAF5EE] border border-[#E3DACF] text-[10px] font-bold text-[#6B5C4F]">{statusLabel(currentStatus)}</span></div><p className="text-xs text-[#5C5046] mt-1">{order.customer?.fullName || 'Zákazník'} · {order.customer?.email || 'Bez e-mailu'}</p><p className="text-[11px] text-stone-500 mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleString('cs-CZ') : ''}</p></div>
          <div className="flex items-center gap-2 w-full lg:w-auto"><select value={draftStatus} disabled={saving} onChange={event => setDrafts(prev => ({ ...prev, [order.id]: event.target.value as Order['status'] }))} className="flex-1 lg:w-56 px-3 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60">{STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => void saveStatus(order)} disabled={saving || !changed} className="px-3 py-2.5 rounded-xl bg-[#302923] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"><Save className="w-3.5 h-3.5" />{saving ? 'Ukládám…' : 'Uložit'}</button></div>
        </div>;
      })}</div>}
    </div>
    <div className="flex items-center justify-center gap-2 text-[11px] text-[#7B6E63]"><Mail className="w-3.5 h-3.5" /> Každá skutečná změna stavu odešle zákazníkovi e-mail.</div>
  </div>;
};
