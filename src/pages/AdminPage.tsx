import React, { useState } from 'react';
import { PackageSearch, ShoppingBag } from 'lucide-react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { ShippingCouponManager } from '../components/ShippingCouponManager';
import { OrderStatusEnhancer } from '../components/OrderStatusEnhancer';
import { AllCouponsList } from '../components/AllCouponsList';
import { OrderTrackingManager } from '../components/OrderTrackingManager';
import { OrderStatusCategory } from '../components/OrderStatusCategory';
import { useApp } from '../context/AppContext';

export const AdminPage: React.FC = () => {
  const { adminUser } = useApp();
  const [activeAdminCategory, setActiveAdminCategory] = useState<'main' | 'statuses' | 'tracking'>('main');

  return (
    <>
      <OrderStatusEnhancer />

      {adminUser && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8DFC8]">
            <button type="button" onClick={() => setActiveAdminCategory('main')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${activeAdminCategory === 'main' ? 'bg-[#2D2723] text-white shadow-sm' : 'bg-white text-[#5C4F44] hover:bg-[#FAF6F0] border border-[#E8DFC8]'}`}>
              Administrace
            </button>
            <button type="button" onClick={() => setActiveAdminCategory('statuses')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${activeAdminCategory === 'statuses' ? 'bg-[#2D2723] text-white shadow-sm' : 'bg-white text-[#5C4F44] hover:bg-[#FAF6F0] border border-[#E8DFC8]'}`}>
              <ShoppingBag className="w-4 h-4" /> Stavy objednávek
            </button>
            <button type="button" onClick={() => setActiveAdminCategory('tracking')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${activeAdminCategory === 'tracking' ? 'bg-[#2D2723] text-white shadow-sm' : 'bg-white text-[#5C4F44] hover:bg-[#FAF6F0] border border-[#E8DFC8]'}`}>
              <PackageSearch className="w-4 h-4" /> Sledování zásilek
            </button>
          </div>
        </div>
      )}

      {activeAdminCategory === 'statuses' && adminUser ? (
        <OrderStatusCategory />
      ) : activeAdminCategory === 'tracking' && adminUser ? (
        <OrderTrackingManager />
      ) : (
        <>
          <LegacyAdminPage />
          <ShippingCouponManager />
          <AllCouponsList />
        </>
      )}
    </>
  );
};
