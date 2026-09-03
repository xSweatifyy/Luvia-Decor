import React from 'react';
import { AdminPage as LegacyAdminPage } from './AdminPageLegacy';

/**
 * Main admin entry point.
 *
 * Order management is intentionally rendered inside the dedicated
 * "Objednávky" tab of AdminPageLegacy so it stays with the rest of the
 * administration instead of appearing as a second panel at the bottom.
 */
export const AdminPage: React.FC = () => <LegacyAdminPage />;
