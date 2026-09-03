import React from 'react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { OrderDeliveryPanel } from '../components/OrderDeliveryPanel';

export const AdminPage: React.FC = () => (
  <>
    <LegacyAdminPage />
    <OrderDeliveryPanel />
  </>
);
