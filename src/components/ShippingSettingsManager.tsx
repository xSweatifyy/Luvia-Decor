import React, { useEffect, useState } from 'react';
import { Check, Truck, Save, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ShippingCarrierConfig = {
  enabled: boolean;
  address: number;
  pickup_point: number;
  box: number;
};

export type ShippingConfig = {
  carriers: Record<string, ShippingCarrierConfig>;
  personalPickup: { enabled: boolean; price: number; label: string };
};

const DEFAULT_SHIPPING: ShippingConfig = {
  carriers: {
    DPD: { enabled: true, address: 105, pickup_point: 75, box: 75 },
    'Zásilkovna': { enabled: true, address: 89, pickup_point: 62, box: 62 }
  },
  personalPickup: { enabled: true, price: 0, label: 'Osobní odběr – Kroměříž' }
};

const normalize = (value: any): ShippingConfig => ({
  carriers: Object.fromEntries(Object.entries(value?.carriers || DEFAULT_SHIPPING.carriers).map(([name, cfg]: [string, any]) => [name, {
    enabled: cfg?.enabled !== false,
    address: Number(cfg?.address ?? 0),
    pickup_point: Number(cfg?.pickup_point ?? 0),
    box: Number(cfg?.box ?? cfg?.pickup_point ?? 0)
  }])),
  personalPickup: {
    enabled: value?.personalPickup?.enabled !== false,
    price: Number(value?.personalPickup?.price ?? 0),
    label: String(value?.personalPickup?.label || DEFAULT_SHIPPING.personalPickup.label)
  }
});

export const ShippingSettingsManager: React.FC = () => {
  const { config, updateConfigState, addToast } = useApp();
  const [shipping, setShipping] = useState<ShippingConfig>(() => normalize((config as any)?.shipping));
  const [saving, setSaving] = useState(false);
  const [newCarrier, setNewCarrier] = useState('');

  useEffect(() => setShipping(normalize((config as any)?.shipping)), [config]);

  const updateCarrier = (name: string, patch: Partial<ShippingCarrierConfig>) => {
    setShipping(prev => ({ ...prev, carriers: { ...prev.carriers, [name]: { ...prev.carriers[name], ...patch } } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipping }) });
      if (!res.ok) throw new Error('Nastavení dopravy se nepodařilo uložit.');
      const updated = await res.json();
      updateConfigState(updated);
      setShipping(normalize(updated.shipping));
      addToast('success', 'Doprava uložena', 'Přepravci, jejich aktivita a ceny byly aktualizovány.');
    } catch (error: any) {
      addToast('error', 'Chyba při ukládání', error?.message || 'Nastavení dopravy se nepodařilo uložit.');
    } finally { setSaving(false); }
  };

  const addCarrier = () => {
    const name = newCarrier.trim();
    if (!name || shipping.carriers[name]) return;
    setShipping(prev => ({ ...prev, carriers: { ...prev.carriers, [name]: { enabled: true, address: 0, pickup_point: 0, box: 0 } } }));
    setNewCarrier('');
  };

  const removeCarrier = (name: string) => {
    if (name === 'DPD' || name === 'Zásilkovna') return;
    setShipping(prev => { const carriers = { ...prev.carriers }; delete carriers[name]; return { ...prev, carriers }; });
  };

  const input = (value: number, onChange: (n: number) => void) => <input type="number" min="0" step="1" value={value} onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))} className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-sm text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30" />;

  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-[#EFE7DE] bg-[#FAF7F2]">
        <div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-[#8C7355] text-xs font-bold uppercase tracking-wider"><Truck className="w-4 h-4" /> Doprava a přepravci</div><h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] mt-2">Nastavení dopravy</h2><p className="text-sm text-[#7B6E63] mt-1 max-w-2xl">Zapněte přepravce, upravte ceny doručení na adresu, výdejní místo a box. Změny se použijí v košíku i při výpočtu objednávky.</p></div><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"><Save className="w-4 h-4" />{saving ? 'Ukládám…' : 'Uložit nastavení'}</button></div>
      </div>
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid gap-4">{Object.entries(shipping.carriers).map(([name, carrier]) => <div key={name} className="rounded-2xl border border-[#E3DACF] p-5 bg-white">
          <div className="flex items-center justify-between gap-3 mb-5"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${carrier.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}><Truck className="w-5 h-5" /></div><div><div className="font-bold text-[#2D2723]">{name}</div><div className="text-[11px] text-[#817469]">Přepravce pro objednávky</div></div></div><div className="flex items-center gap-2"><label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C5046]"><input type="checkbox" checked={carrier.enabled} onChange={e => updateCarrier(name, { enabled: e.target.checked })} className="accent-[#8C7355]" /> Aktivní</label>{!['DPD','Zásilkovna'].includes(name) && <button onClick={() => removeCarrier(name)} className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer" title="Odebrat přepravce"><Trash2 className="w-4 h-4" /></button>}</div></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><label className="text-xs font-semibold text-[#5C5046]">Na adresu<span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Cena v Kč</span>{input(carrier.address, n => updateCarrier(name, { address: n }))}</label><label className="text-xs font-semibold text-[#5C5046]">Výdejní místo<span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Cena v Kč</span>{input(carrier.pickup_point, n => updateCarrier(name, { pickup_point: n }))}</label><label className="text-xs font-semibold text-[#5C5046]">Box<span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Cena v Kč</span>{input(carrier.box, n => updateCarrier(name, { box: n }))}</label></div>
        </div>)}</div>
        <div className="rounded-2xl border border-[#E3DACF] p-5 bg-[#FAF8F5]"><div className="flex items-center justify-between gap-3 mb-4"><div><div className="font-bold text-[#2D2723]">Osobní odběr</div><div className="text-[11px] text-[#817469]">Bez přepravce</div></div><label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C5046]"><input type="checkbox" checked={shipping.personalPickup.enabled} onChange={e => setShipping(prev => ({ ...prev, personalPickup: { ...prev.personalPickup, enabled: e.target.checked } }))} className="accent-[#8C7355]" /> Aktivní</label></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-xs font-semibold text-[#5C5046]">Název<span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Zobrazí se zákazníkovi</span><input value={shipping.personalPickup.label} onChange={e => setShipping(prev => ({ ...prev, personalPickup: { ...prev.personalPickup, label: e.target.value } }))} className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-sm" /></label><label className="text-xs font-semibold text-[#5C5046]">Cena v Kč<span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Obvykle 0 Kč</span>{input(shipping.personalPickup.price, n => setShipping(prev => ({ ...prev, personalPickup: { ...prev.personalPickup, price: n } })))}</label></div></div>
        <div className="pt-2 border-t border-[#EFE7DE]"><div className="font-bold text-[#2D2723] mb-3">Přidat dalšího přepravce</div><div className="flex gap-2 max-w-xl"><input value={newCarrier} onChange={e => setNewCarrier(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCarrier(); } }} placeholder="Např. PPL" className="flex-1 px-3 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-sm" /><button onClick={addCarrier} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FAF5EE] border border-[#E3DACF] rounded-xl text-xs font-bold text-[#5C4830] cursor-pointer"><Plus className="w-4 h-4" /> Přidat</button></div></div>
      </div>
      <div className="px-6 sm:px-8 py-4 bg-[#FAF8F5] border-t border-[#EFE7DE] flex items-center gap-2 text-[11px] text-[#7B6E63]"><Check className="w-4 h-4 text-emerald-600" /> Nastavení se ukládá do společné konfigurace e-shopu a je dostupné zákazníkům.</div>
    </div>
  </section>;
};
