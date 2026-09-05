import React, { useState } from 'react';
import { PackageSearch, ShoppingBag, Truck, Sparkles, LayoutDashboard } from 'lucide-react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { GiftVoucherManager } from '../components/GiftVoucherManager';
import { ShippingCouponManager } from '../components/ShippingCouponManager';
import { AllCouponsList } from '../components/AllCouponsList';
import { CouponManager } from '../components/CouponManager';
import { OrderTrackingManager } from '../components/OrderTrackingManager';
import { OrderStatusCategory } from '../components/OrderStatusCategory';
import { ShippingSettingsManager } from '../components/ShippingSettingsManager';
import { useApp } from '../context/AppContext';

export const AdminPage: React.FC = () => {
  const { adminUser } = useApp();
  const [active, setActive] = useState<'main' | 'statuses' | 'tracking' | 'shipping'>('main');

  const tabs = [
    { id: 'main' as const, label: 'Přehled administrace', icon: LayoutDashboard },
    { id: 'statuses' as const, label: 'Stavy objednávek', icon: ShoppingBag },
    { id: 'tracking' as const, label: 'Sledování zásilek', icon: PackageSearch },
    { id: 'shipping' as const, label: 'Doprava a přepravci', icon: Truck },
  ];

  return (
    <div className="admin-panel min-h-screen bg-[#f7f3ee] text-[#2D2723]">
      <div className="relative overflow-hidden bg-[#2D2723] text-white">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_0%,#b79a78,transparent_35%),radial-gradient(circle_at_90%_100%,#765d45,transparent_40%)]" />
        <div className="relative max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center shadow-xl">
                <Sparkles className="w-7 h-7 text-[#ead8bf]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#d9c4a8] font-bold">Luvia Decor</p>
                <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight">Administrace e-shopu</h1>
                <p className="text-xs text-white/60 mt-1">Centrální správa produktů, objednávek, dopravy a obsahu.</p>
              </div>
            </div>
            {adminUser && (
              <div className="flex items-center gap-3 self-start lg:self-center rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur">
                <div className="h-9 w-9 rounded-full bg-[#d8c0a0] text-[#2D2723] flex items-center justify-center text-xs font-black">
                  {(adminUser.name || adminUser.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate max-w-[210px]">{adminUser.name || 'Administrátor'}</p>
                  <p className="text-[10px] text-white/55 truncate max-w-[210px]">{adminUser.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {adminUser && (
        <div className="sticky top-0 z-40 px-3 sm:px-6 lg:px-8 -mt-1 pt-3">
          <div className="max-w-[1500px] mx-auto rounded-2xl border border-[#e6ddd2] bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(74,55,40,.12)] p-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => {
                const selected = active === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActive(id)}
                    className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs font-bold transition-all ${selected ? 'bg-[#2D2723] text-white shadow-md translate-y-[-1px]' : 'text-[#67594e] hover:bg-[#f5efe8]'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1500px] mx-auto px-2 sm:px-4 lg:px-6 pt-5 pb-14">
        {active === 'statuses' && adminUser ? <OrderStatusCategory />
          : active === 'tracking' && adminUser ? <OrderTrackingManager />
          : active === 'shipping' && adminUser ? <ShippingSettingsManager />
          : <div className="space-y-5"><LegacyAdminPage /><CouponManager /><GiftVoucherManager /><ShippingCouponManager /><AllCouponsList /></div>}
      </div>
    </div>
  );
};
