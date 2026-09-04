/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ToastContainer } from './components/Toast';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CustomOrderPage } from './pages/CustomOrderPage';
import { GalleryPage } from './pages/GalleryPage';
import { ContactPage } from './pages/ContactPage';
import { CheckoutCartPage } from './pages/CheckoutCartPage';
import { TermsPage } from './pages/TermsPage';
import { AdminPage } from './pages/AdminPage';
import { CookieConsent, getCookieConsent } from './components/CookieConsent';
import { TermsAgreementEnhancer } from './components/TermsAgreementEnhancer';
import { NonPickupTermsSection } from './components/NonPickupTermsSection';

const AppContent: React.FC = () => {
  const { page, setPage } = useApp();
  const [analyticsConsent, setAnalyticsConsent] = useState(getCookieConsent() === 'all');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  useEffect(() => {
    const openTerms = () => setPage('terms');
    window.addEventListener('open-terms', openTerms);
    const handleTermsClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest('button, a');
      if (!control) return;
      if ((control.textContent || '').toLowerCase().includes('obchodní podmínky')) {
        event.preventDefault(); event.stopPropagation(); setPage('terms');
      }
    };
    document.addEventListener('click', handleTermsClick, true);
    return () => { window.removeEventListener('open-terms', openTerms); document.removeEventListener('click', handleTermsClick, true); };
  }, [setPage]);
  return <div className="min-h-screen bg-[#FCFAF7] text-[#2D2723] flex flex-col font-sans selection:bg-[#8C7355] selection:text-white">
    <Navbar /><main className="flex-1">
      {page === 'home' && <HomePage />}{page === 'catalog' && <CatalogPage />}{page === 'custom-order' && <CustomOrderPage />}
      {page === 'gallery' && <GalleryPage />}{page === 'contact' && <ContactPage />}{page === 'cart' && <CheckoutCartPage />}
      {page === 'terms' && <><TermsPage /><NonPickupTermsSection /></>}{page === 'admin' && <AdminPage />}
    </main><Footer /><ProductDetailModal /><ToastContainer /><TermsAgreementEnhancer />
    {analyticsConsent && <Analytics />}<CookieConsent onConsent={(choice) => setAnalyticsConsent(choice === 'all')} />
  </div>;
};
export default function App() { return <AppProvider><AppContent /></AppProvider>; }
