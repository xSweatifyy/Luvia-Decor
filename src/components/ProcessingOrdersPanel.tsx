import React, { useEffect, useState } from 'react';
import { RefreshCw, Clock3, ShoppingBag } from 'lucide-react';
import { Order } from '../types';

export const ProcessingOrdersPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (response.ok && Array.isArray(data)) setOrders(data.filter((order: Order) => order.status === 'zpracovava_se'));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm p-6 sm:p-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[#8C7355] text-[10px] font-bold uppercase tracking-[0.18em]"><Clock3 className="w-4 h-4" />Právě se zpracovává</div>
        <h3 className="font-editorial text-xl font-bold text-[#2D2723] mt-1">Objednávky ve stavu „Zpracovává se“</h3>
        <p className="text-xs text-[#7B6E63] mt-1">Tyto objednávky jsou nyní ve zpracování a jsou součástí kontroly objednávek.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading} className="px-3 py-2 rounded-xl border border-[#E3DACF] bg-[#FAF5EE] text-xs font-bold flex items-center gap-2 disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Obnovit</button>
    </div>
    {loading ? <div className="py-8 text-center text-xs text-stone-500">Načítám…</div> : orders.length === 0 ? <div className="py-8 text-center text-xs text-stone-500">Momentálně se nezpracovává žádná objednávka.</div> : <div className="mt-5 space-y-2">{orders.map(order => <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-[#EDE5DA] bg-[#FCFAF7] px-4 py-3"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-[#F1E9DE] flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-[#8C7355]" /></div><div><b className="text-sm text-[#2D2723]">{order.orderNumber || order.id}</b><p className="text-[11px] text-[#7B6E63]">{order.customer?.fullName || 'Zákazník'} · {order.customer?.email || 'Bez e-mailu'}</p></div></div><span className="self-start sm:self-center px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">Zpracovává se</span></div>)}</div>}
  </div>;
};
