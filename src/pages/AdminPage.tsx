import React from 'react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { ShippingCouponManager } from '../components/ShippingCouponManager';
import { OrderStatusEnhancer } from '../components/OrderStatusEnhancer';
import { AllCouponsList } from '../components/AllCouponsList';
import { OrderTrackingManager } from '../components/OrderTrackingManager';

export const AdminPage: React.FC = () => (
  <>
    <OrderStatusEnhancer />
    <LegacyAdminPage />
    <ShippingCouponManager />
    <AllCouponsList />
    <OrderTrackingManager />
  </>
);
