import React from 'react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';
import { OrderDeliveryPanel } from '../components/OrderDeliveryPanel';
import { useApp } from '../context/AppContext';

export const AdminPage: React.FC = () => {
  const { adminUser } = useApp();

  return (
    <>
      <LegacyAdminPage />
      {adminUser && <OrderDeliveryPanel />}
    </>
  );
};
