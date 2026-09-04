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
import { CartPage } from './pages/CartPage';
import { TermsPage } from './pages/TermsPage';
import { AdminPage } from './pages/AdminPage';
import { CookieConsent, getCookieConsent } from './components/CookieConsent';
import { TermsAgreementEnhancer } from './components/TermsAgreementEnhancer';

const AppContent: React.FC = () => {
  const { page, setPage } = useApp();
  const [analyticsConsent, setAnalyticsConsent] = useState(getCookieConsent() === 'all');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  useEffect(() => {
    const openTerms = () => setPage('terms');
    window.addEventListener('open-terms', openTerms);
    return () => window.removeEventListener('open-terms', openTerms);
  }, [setPage]);

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-[#2D2723] flex flex-col font-sans selection:bg-[#8C7355] selection:text-white">
      <Navbar />
      <main className="flex-1">
        {page === 'home' && <HomePage />}
        {page === 'catalog' && <CatalogPage />}
        {page === 'custom-order' && <CustomOrderPage />}
        {page === 'gallery' && <GalleryPage />}
        {page === 'contact' && <ContactPage />}
        {page === 'cart' && <CartPage />}
        {page === 'terms' && <TermsPage />}
        {page === 'admin' && <AdminPage />}
      </main>
      <Footer />
      <ProductDetailModal />
      <ToastContainer />
      <TermsAgreementEnhancer />
      {analyticsConsent && <Analytics />}
      <CookieConsent onConsent={(choice) => setAnalyticsConsent(choice === 'all')} />
    </div>
  );
};

export default function App() {
  return <AppProvider><AppContent /></AppProvider>;
}
