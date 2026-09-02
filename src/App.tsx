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
import { AdminPage } from './pages/AdminPage';
import { CouponManager } from './components/CouponManager';
import { CookieConsent, getCookieConsent } from './components/CookieConsent';

const AppContent: React.FC = () => {
  const { page } = useApp();
  const [analyticsConsent, setAnalyticsConsent] = useState(getCookieConsent() === 'all');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

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
        {page === 'admin' && <AdminPage />}
        {page === 'admin' && <CouponManager />}
      </main>
      <Footer />
      <ProductDetailModal />
      <ToastContainer />
      {analyticsConsent && <Analytics />}
      <CookieConsent onConsent={(choice) => setAnalyticsConsent(choice === 'all')} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
