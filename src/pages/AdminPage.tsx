import React from 'react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { ShippingCouponManager } from '../components/ShippingCouponManager';
import { OrderStatusEnhancer } from '../components/OrderStatusEnhancer';

/**
 * Main admin entry point.
 * Order management remains inside the dedicated "Objednávky" tab.
 * Free-shipping coupon management is added as an admin-only section.
 * OrderStatusEnhancer keeps the legacy order selector compatible with the
 * complete set of order statuses without changing the existing admin layout.
 */
export const AdminPage: React.FC = () => (
  <>
    <OrderStatusEnhancer />
    <LegacyAdminPage />
    <ShippingCouponManager />
  </>
);
