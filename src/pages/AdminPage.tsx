import React from 'react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { ShippingCouponManager } from '../components/ShippingCouponManager';

/**
 * Main admin entry point.
 *
 * Order management remains inside the dedicated "Objednávky" tab.
 * Free-shipping coupon management is added as an admin-only section
 * alongside the existing administration.
 */
export const AdminPage: React.FC = () => (
  <>
    <LegacyAdminPage />
    <ShippingCouponManager />
  </>
);
