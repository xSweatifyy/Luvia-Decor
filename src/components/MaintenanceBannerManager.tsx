import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff, Info, Save, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MaintenanceBannerConfig } from '../types';

const emptyBanner: MaintenanceBannerConfig = {
  enabled: false,
  variant: 'maintenance',
  title: 'E-shop je dočasně mimo provoz',
  message: 'Momentálně probíhá plánovaná odstávka nebo technická údržba. Děkujeme za pochopení.',
  until: '',
};

export const MaintenanceBannerManager: React.FC = () => {
  const { config, updateConfigState, addToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<MaintenanceBannerConfig>(() => ({ ...emptyBanner, ...(config.maintenanceBanner || {}) }));
  const banner = useMemo(() => draft, [draft]);

  const update = (patch: Partial<MaintenanceBannerConfig>) => setDraft(prev => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await updateConfigState({ maintenanceBanner: draft });
      addToast('success', draft.enabled ? 'Banner aktivován' : 'Banner vypnut', draft.enabled ? 'Odstávkový banner se nyní zobrazuje na celém e-shopu.' : 'Odstávkový banner byl skryt.');
    } catch (error: any) {
      addToast('error', 'Banner se nepodařilo uložit', error?.message || 'Zkuste to prosím znovu.');
    } finally {
      setSaving(false);
    }
  };

  const Icon = banner.variant === 'warning' ? AlertTriangle : banner.variant === 'info' ? Info : Wrench;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-[#F2ECE4] pb-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8C7355]">Globální oznámení</span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] mt-1">Odstávka / přerušení e-shopu</h2>
            <p className="text-xs sm:text-sm text-[#7B6E63] mt-1 max-w-2xl">Vytvořte výrazný banner, který se automaticky zobrazí nahoře na každé veřejné podstránce e-shopu. Administrace se bannerem nezobrazuje.</p>
          </div>
          <label className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer font-bold text-xs ${banner.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
            <input type="checkbox" checked={banner.enabled} onChange={e => update({ enabled: e.target.checked })} className="w-4 h-4 rounded" />
            {banner.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {banner.enabled ? 'Banner je aktivní' : 'Banner je vypnutý'}
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 text-xs">
          <div>
            <label className="block font-semibold text-[#5C5046] mb-1.5">Typ banneru</label>
            <select value={banner.variant} onChange={e => update({ variant: e.target.value as MaintenanceBannerConfig['variant'] })} className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl font-medium">
              <option value="maintenance">Odstávka / údržba</option>
              <option value="closed">E-shop je dočasně uzavřen</option>
              <option value="warning">Důležité upozornění</option>
              <option value="info">Informační oznámení</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[#5C5046] mb-1.5">Do kdy / kdy znovu otevřeme</label>
            <input value={banner.until || ''} onChange={e => update({ until: e.target.value })} placeholder="Např. E-shop bude znovu dostupný v pondělí 15. 9. 2026 v 18:00." className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <label className="block font-semibold text-[#5C5046] mb-1.5">Nadpis banneru *</label>
            <input value={banner.title} onChange={e => update({ title: e.target.value })} placeholder="E-shop je dočasně mimo provoz" className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-sm font-bold" />
          </div>
          <div className="lg:col-span-2">
            <label className="block font-semibold text-[#5C5046] mb-1.5">Text oznámení *</label>
            <textarea rows={4} value={banner.message} onChange={e => update({ message: e.target.value })} placeholder="Momentálně probíhá plánovaná odstávka..." className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl leading-relaxed resize-y" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 bg-[#2D2723] hover:bg-[#8C7355] disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition">
            <Save className="w-4 h-4" />
            {saving ? 'Ukládám...' : 'Uložit a použít na e-shopu'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[#7B6E63]"><Eye className="w-4 h-4" /> Náhled</div>
        <div className="overflow-hidden rounded-2xl border border-stone-200">
          <div className="bg-[#26201C] px-4 py-2 text-[10px] text-[#CBB8A3]">Luvia Decor · veřejná část e-shopu</div>
          <div className={`border-b px-4 py-4 ${banner.variant === 'closed' ? 'bg-[#4A2424] border-[#6A3636]' : banner.variant === 'warning' ? 'bg-[#6B4D22] border-[#8B6A35]' : banner.variant === 'info' ? 'bg-[#3B4650] border-[#596774]' : 'bg-[#2D2723] border-[#51453D]'}`}>
            <div className="flex gap-3 items-start text-white">
              <Icon className="w-5 h-5 mt-0.5 shrink-0 text-[#E8CFAE]" />
              <div><div className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#E8CFAE]">{banner.variant === 'closed' ? 'E-shop je dočasně uzavřen' : banner.variant === 'warning' ? 'Důležité upozornění' : banner.variant === 'info' ? 'Informace' : 'Odstávka e-shopu'}</div><div className="font-bold text-sm mt-0.5">{banner.title || 'Nadpis banneru'}</div><div className="text-xs text-white/80 mt-1">{banner.message || 'Text oznámení'}</div>{banner.until && <div className="text-[10px] text-white/65 mt-2">{banner.until}</div>}</div>
            </div>
          </div>
          <div className="h-16 bg-[#FCFAF7]" />
        </div>
        <p className="text-[11px] text-stone-500 mt-3 flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Po uložení se změna synchronizuje a banner se zobrazí i při přechodu mezi podstránkami.</p>
      </div>
    </div>
  );
};
