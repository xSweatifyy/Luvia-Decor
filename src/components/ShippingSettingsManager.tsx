import React, { useEffect, useRef, useState } from 'react';
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
    'Zásilkovna': { enabled: true, address: 89, pickup_point: 62, box: 62 },
  },
  personalPickup: { enabled: true, price: 0, label: 'Osobní odběr – Kroměříž' },
};

const normalize = (value: unknown): ShippingConfig => {
  const source = value as Partial<ShippingConfig> | null | undefined;
  const rawCarriers = source?.carriers && typeof source.carriers === 'object'
    ? source.carriers
    : DEFAULT_SHIPPING.carriers;

  const carriers: Record<string, ShippingCarrierConfig> = {};
  Object.entries(rawCarriers).forEach(([name, cfg]) => {
    const c = cfg as Partial<ShippingCarrierConfig> | undefined;
    carriers[name] = {
      enabled: c?.enabled !== false,
      address: Math.max(0, Number(c?.address ?? 0)),
      pickup_point: Math.max(0, Number(c?.pickup_point ?? 0)),
      box: Math.max(0, Number(c?.box ?? c?.pickup_point ?? 0)),
    };
  });

  const pp = source?.personalPickup;
  return {
    carriers,
    personalPickup: {
      enabled: pp?.enabled !== false,
      price: Math.max(0, Number(pp?.price ?? 0)),
      label: String(pp?.label || DEFAULT_SHIPPING.personalPickup.label),
    },
  };
};

export const ShippingSettingsManager: React.FC = () => {
  const { config, updateConfigState, addToast } = useApp();
  const [shipping, setShipping] = useState<ShippingConfig>(() => normalize(config?.shipping));
  const [saving, setSaving] = useState(false);
  const [newCarrier, setNewCarrier] = useState('');
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current && !saving) setShipping(normalize(config?.shipping));
  }, [config?.shipping, saving]);

  const updateShipping = (updater: (prev: ShippingConfig) => ShippingConfig) => {
    dirtyRef.current = true;
    setShipping(updater);
  };

  const updateCarrier = (name: string, patch: Partial<ShippingCarrierConfig>) => {
    updateShipping(prev => ({
      ...prev,
      carriers: {
        ...prev.carriers,
        [name]: { ...prev.carriers[name], ...patch },
      },
    }));
  };

  const addCarrier = () => {
    const name = newCarrier.trim();
    if (!name || shipping.carriers[name]) return;
    updateShipping(prev => ({
      ...prev,
      carriers: {
        ...prev.carriers,
        [name]: { enabled: true, address: 0, pickup_point: 0, box: 0 },
      },
    }));
    setNewCarrier('');
  };

  const removeCarrier = (name: string) => {
    updateShipping(prev => {
      const carriers = { ...prev.carriers };
      delete carriers[name];
      return { ...prev, carriers };
    });
  };

  const save = async () => {
    if (saving) return;
    const payload = normalize(shipping);
    setSaving(true);

    try {
      let updated: any = null;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const res = await fetch('/api/config', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
            cache: 'no-store',
            body: JSON.stringify({ shipping: payload }),
          });

          const text = await res.text();
          let data: any = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = null;
          }

          if (!res.ok || !data?.shipping) {
            throw new Error(data?.error || `Server odmítl uložení nastavení dopravy (HTTP ${res.status}).`);
          }

          updated = data;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }

      if (!updated?.shipping) {
        throw lastError instanceof Error
          ? lastError
          : new Error('Nastavení dopravy se nepodařilo uložit.');
      }

      dirtyRef.current = false;
      setShipping(normalize(updated.shipping));
      await updateConfigState(updated);
      addToast('success', 'Doprava uložena', 'Přepravci, ceny a osobní odběr byly úspěšně uloženy.');
    } catch (error: unknown) {
      addToast(
        'error',
        'Chyba při ukládání',
        error instanceof Error ? error.message : 'Nastavení dopravy se nepodařilo uložit.'
      );
    } finally {
      setSaving(false);
    }
  };

  const input = (value: number, onChange: (n: number) => void) => (
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-sm text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
    />
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-[#EFE7DE] bg-[#FAF7F2]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[#8C7355] text-xs font-bold uppercase tracking-wider">
                <Truck className="w-4 h-4" /> Doprava a přepravci
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] mt-2">
                Nastavení dopravy
              </h2>
              <p className="text-sm text-[#7B6E63] mt-1 max-w-2xl">
                Přidávejte, upravujte, aktivujte/deaktivujte nebo mažte přepravce a nastavujte ceny na adresu, výdejní místo a box.
              </p>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Ukládám…' : 'Uložit nastavení'}
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid gap-4">
            {Object.entries(shipping.carriers).map(([name, carrier]) => (
              <div key={name} className="rounded-2xl border border-[#E3DACF] p-5 bg-white">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${carrier.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-[#2D2723]">{name}</div>
                      <div className="text-[11px] text-[#817469]">Přepravce pro objednávky</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C5046]">
                      <input
                        type="checkbox"
                        checked={carrier.enabled}
                        onChange={e => updateCarrier(name, { enabled: e.target.checked })}
                        className="accent-[#8C7355]"
                      /> Aktivní
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCarrier(name)}
                      className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer"
                      title="Smazat přepravce"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="text-xs font-semibold text-[#5C5046]">
                    Na adresu
                    <span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Cena v Kč</span>
                    {input(carrier.address, n => updateCarrier(name, { address: n }))}
                  </label>
                  <label className="text-xs font-semibold text-[#5C5046]">
                    Výdejní místo
                    <span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Cena v Kč</span>
                    {input(carrier.pickup_point, n => updateCarrier(name, { pickup_point: n }))}
                  </label>
                  <label className="text-xs font-semibold text-[#5C5046]">
                    Box
                    <span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Cena v Kč</span>
                    {input(carrier.box, n => updateCarrier(name, { box: n }))}
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#E3DACF] p-5 bg-[#FAF8F5]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="font-bold text-[#2D2723]">Osobní odběr</div>
                <div className="text-[11px] text-[#817469]">Bez přepravce</div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C5046]">
                <input
                  type="checkbox"
                  checked={shipping.personalPickup.enabled}
                  onChange={e => updateShipping(prev => ({
                    ...prev,
                    personalPickup: { ...prev.personalPickup, enabled: e.target.checked },
                  }))}
                  className="accent-[#8C7355]"
                /> Aktivní
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold text-[#5C5046]">
                Název
                <span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Zobrazí se zákazníkovi</span>
                <input
                  required
                  value={shipping.personalPickup.label}
                  onChange={e => updateShipping(prev => ({
                    ...prev,
                    personalPickup: { ...prev.personalPickup, label: e.target.value },
                  }))}
                  className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-[#5C5046]">
                Cena v Kč
                <span className="block text-[10px] font-normal text-[#8A7D72] mb-1.5">Obvykle 0 Kč</span>
                {input(shipping.personalPickup.price, n => updateShipping(prev => ({
                  ...prev,
                  personalPickup: { ...prev.personalPickup, price: n },
                })))}
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-[#EFE7DE]">
            <div className="font-bold text-[#2D2723] mb-3">Přidat dalšího přepravce</div>
            <div className="flex gap-2 max-w-xl">
              <input
                value={newCarrier}
                onChange={e => setNewCarrier(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCarrier();
                  }
                }}
                placeholder="Např. PPL"
                className="flex-1 px-3 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={addCarrier}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FAF5EE] border border-[#E3DACF] rounded-xl text-xs font-bold text-[#5C4830] cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Přidat
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-4 bg-[#FAF8F5] border-t border-[#EFE7DE] flex items-center gap-2 text-[11px] text-[#7B6E63]">
          <Check className="w-4 h-4 text-emerald-600" /> Nastavení se ukládá do společné konfigurace e-shopu a je dostupné zákazníkům.
        </div>
      </div>
    </section>
  );
};
