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
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminPage } from './pages/AdminPage';
import { GiftCardPage } from './pages/GiftCardPage';
import { GiftCardBalancePage } from './pages/GiftCardBalancePage';
import { ComplaintPage } from './pages/ComplaintPage';
import { GiftCardPaymentEnhancer } from './components/GiftCardPaymentEnhancer';
import { CookieConsent, getCookieConsent } from './components/CookieConsent';
import { TermsAgreementEnhancer } from './components/TermsAgreementEnhancer';
import { NonPickupTermsSection } from './components/NonPickupTermsSection';
import { CouponApiCompat } from './components/CouponApiCompat';

const GiftCardShortcut: React.FC = () => { const { page, setPage } = useApp(); if(page==='admin'||page==='gift-card'||page==='gift-card-balance') return null; return <div className="border-b border-[#E8DFD5] bg-[#FAF6F0]"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-center"><button type="button" onClick={()=>setPage('gift-card')} className="text-[11px] sm:text-xs font-bold tracking-wide text-[#75604B] hover:text-[#2D2723] transition">🎁 Dárková karta · od 200 Kč · doručení e-mailem</button></div></div>; };

const AppContent: React.FC = () => {
  const { page, setPage } = useApp();
  const [analyticsConsent, setAnalyticsConsent] = useState(getCookieConsent() === 'all');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  useEffect(() => {
    const openTerms = () => setPage('terms'); const openPrivacy = () => setPage('privacy');
    window.addEventListener('open-terms', openTerms); window.addEventListener('open-privacy', openPrivacy);
    const handleTermsClick = (event: MouseEvent) => { const target = event.target as HTMLElement | null; const control = target?.closest('button, a'); if (!control) return; const text = (control.textContent || '').toLowerCase(); if (text.includes('obchodní podmínky')) { event.preventDefault(); event.stopPropagation(); setPage('terms'); } else if (text.includes('ochrana osobních údajů') || text.includes('gdpr')) { event.preventDefault(); event.stopPropagation(); setPage('privacy'); } };
    document.addEventListener('click', handleTermsClick, true);
    return () => { window.removeEventListener('open-terms', openTerms); window.removeEventListener('open-privacy', openPrivacy); document.removeEventListener('click', handleTermsClick, true); };
  }, [setPage]);
  return <div className="min-h-screen bg-[#FCFAF7] text-[#2D2723] flex flex-col font-sans selection:bg-[#8C7355] selection:text-white"><CouponApiCompat/><Navbar/><GiftCardShortcut/><main className="flex-1">
    {page === 'home' && <HomePage/>}{page === 'catalog' && <CatalogPage/>}{page === 'custom-order' && <CustomOrderPage/>}{page === 'gallery' && <GalleryPage/>}{page === 'contact' && <ContactPage/>}{page === 'cart' && <CheckoutCartPage/>}{page === 'gift-card' && <GiftCardPage/>}{page === 'gift-card-balance' && <GiftCardBalancePage/>}{page === 'terms' && <><TermsPage/><NonPickupTermsSection/></>}{page === 'privacy' && <PrivacyPage/>}{page === 'complaint' && <ComplaintPage/>}{page === 'admin' && <AdminPage/>}
  </main><Footer/><ProductDetailModal/><ToastContainer/><GiftCardPaymentEnhancer/><TermsAgreementEnhancer/>{analyticsConsent&&<Analytics/>}<CookieConsent onConsent={(choice)=>setAnalyticsConsent(choice==='all')}/></div>;
};
export default function App(){return <AppProvider><AppContent/></AppProvider>}
