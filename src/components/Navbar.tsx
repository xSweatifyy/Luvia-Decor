import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Menu,
  X,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  Home,
  Grid,
  Palette,
  Image as ImageIcon,
  HeartHandshake,
  MapPin,
  Clock,
  ArrowRight,
  Instagram,
  Facebook,
  MessageCircle,
  CalendarCheck
} from 'lucide-react';
import { PageRoute } from '../types';
import { SafeImage } from './SafeImage';

export const Navbar: React.FC = () => {
  const { page, setPage, cartCount, cartTotal, config } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll for subtle shadow & elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: { label: string; page: PageRoute; icon: React.ElementType; badge?: string }[] = [
    { label: 'Domů', page: 'home', icon: Home },
    { label: 'E-shop', page: 'catalog', icon: Grid },
    { label: 'Zakázková tvorba', page: 'custom-order', icon: Palette, badge: 'Na míru' },
    { label: 'Galerie', page: 'gallery', icon: ImageIcon },
    { label: 'Kontakt', page: 'contact', icon: MapPin },
  ];

  const handleNavClick = (targetPage: PageRoute) => {
    setPage(targetPage);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 w-full transition-all duration-300"
    >
      {/* 1. TOP UTILITY STRIP */}
      {page !== 'admin' && (
        <div className="bg-[#26201C] text-[#EDE4DA] text-xs border-b border-[#3B322C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
            
            {/* Left: Studio origin & Social channels */}
            <div className="flex items-center gap-3 text-[#CBB8A3] text-[11px]">
              <div className="hidden lg:flex items-center gap-2 tracking-wider uppercase font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C5A880]" />
                <span>Ateliér Kroměříž</span>
              </div>
              <div className="flex items-center gap-2.5 pl-0 lg:pl-2 lg:border-l lg:border-[#4E4238]">
                <a
                  href={`https://wa.me/${config.whatsapp ? config.whatsapp.replace(/[^0-9]/g, '') : '420702345999'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#25D366] transition flex items-center gap-1 text-[11px]"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
                <a
                  href={config.instagramUrl || "https://www.instagram.com/luvia_decor_"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E1306C] transition flex items-center gap-1 text-[11px]"
                  title="Instagram @luvia_decor_"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                  <span className="hidden sm:inline">Instagram</span>
                </a>
                <a
                  href={config.facebookUrl || "https://www.facebook.com/profile.php?id=61571617343463"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1877F2] transition flex items-center gap-1 text-[11px]"
                  title="Facebook"
                >
                  <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span className="hidden sm:inline">Facebook</span>
                </a>
              </div>
            </div>

            {/* Center: Announcement text if enabled */}
            {config.announcement?.enabled && config.announcement.text ? (
              <div className="hidden md:flex flex-1 text-center items-center justify-center gap-2 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 animate-pulse" />
                <span className="text-stone-200 text-xs truncate max-w-[280px] lg:max-w-none">
                  {config.announcement.text}
                </span>
                {config.announcement.linkText && (
                  <button
                    onClick={() => handleNavClick(config.announcement.linkPage || 'catalog')}
                    className="text-[#E0C9A6] hover:text-white underline underline-offset-2 ml-1 text-xs font-semibold cursor-pointer inline-flex items-center gap-0.5 shrink-0"
                  >
                    {config.announcement.linkText} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="hidden md:block text-center flex-1 text-[11px] text-[#CBB8A3] tracking-wide">
                Květinový ateliér & dekorace Kroměříž
              </div>
            )}

            {/* Right: Quick Direct Contact + Consultation Link */}
            <div className="flex items-center gap-3 text-xs shrink-0">
              <a
                href={config.consultationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C5A880]/20 hover:bg-[#C5A880]/30 text-[#FAF6F0] hover:text-white text-[11px] font-semibold border border-[#C5A880]/40 transition"
              >
                <CalendarCheck className="w-3 h-3 text-[#C5A880]" />
                <span>Konzultace</span>
              </a>

              <a
                href={`tel:${config.phone}`}
                className="hidden sm:flex items-center gap-1.5 text-[#E6DCD1] hover:text-[#D4AF37] transition font-medium"
                title="Zavolejte nám do ateliéru"
              >
                <Phone className="w-3 h-3 text-[#C5A880]" />
                <span>{config.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN NAVIGATION BAR */}
      <div
        className={`w-full bg-[#FCFAF7]/95 backdrop-blur-md border-b transition-all duration-300 ${
          scrolled
            ? 'border-[#E0D4C3] shadow-md shadow-stone-900/5 py-1'
            : 'border-[#EDE5D8] py-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Mobile Menu Trigger (Left on Mobile) */}
            <div className="flex items-center lg:hidden">
              <button
                id="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2.5 rounded-xl text-[#2D2723] bg-[#F2ECE4]/70 hover:bg-[#EAE2D6] border border-[#E3DACF] transition cursor-pointer"
                aria-label="Otevřít hlavní menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Brand Identity / Logo */}
            <div className="flex-1 lg:flex-initial flex items-center justify-center lg:justify-start">
              <button
                id="brand-logo-btn"
                onClick={() => handleNavClick('home')}
                className="group flex flex-col items-center lg:items-start text-left focus:outline-none cursor-pointer select-none"
              >
                {config.logoImageUrl ? (
                  <div className="h-11 w-auto transition-transform group-hover:scale-[1.02]">
                    <SafeImage
                      src={config.logoImageUrl}
                      alt={config.siteName}
                      className="h-11 w-auto object-contain"
                      loading="eager"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center lg:items-start">
                    <span className="font-editorial text-2xl sm:text-[28px] font-bold tracking-[0.22em] text-[#241E1A] group-hover:text-[#8C7355] transition-colors duration-200 uppercase leading-none">
                      {config.logoText || config.siteName || "LUVIA DECOR"}
                    </span>
                    <span className="text-[9.5px] uppercase tracking-[0.28em] text-[#8C7355] font-semibold mt-1">
                      Květinový ateliér & dekorace
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Desktop Navigation Links (Center) */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {navLinks.map((link) => {
                const isActive = page === link.page;
                return (
                  <button
                    key={link.page}
                    id={`nav-link-${link.page}`}
                    onClick={() => handleNavClick(link.page)}
                    className={`relative px-4 py-2 rounded-full text-[13.5px] tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'text-[#241E1A] font-bold bg-[#EFE7DB] shadow-xs'
                        : 'text-[#52453A] font-medium hover:text-[#241E1A] hover:bg-[#F4EDE3]/70'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#8C7355] text-white font-semibold uppercase tracking-wider scale-90">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#8C7355] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Area (Cart + CTA) */}
            <div className="flex items-center space-x-3">
              {/* Custom Order quick pill (desktop) */}
              <button
                onClick={() => handleNavClick('custom-order')}
                className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7355] hover:text-[#6E5940] hover:bg-[#F2ECE4] px-3.5 py-2 rounded-full transition border border-[#DECDBB] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vázání na míru</span>
              </button>

              {/* Shopping Cart Pill Button */}
              <button
                id="cart-nav-btn"
                onClick={() => handleNavClick('cart')}
                className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all duration-200 cursor-pointer shadow-xs ${
                  page === 'cart'
                    ? 'bg-[#241E1A] text-[#FAF8F5] ring-2 ring-[#8C7355]/40'
                    : 'bg-[#241E1A] text-[#FAF8F5] hover:bg-[#3D332C] hover:shadow-md'
                }`}
                aria-label="Nákupní košík"
              >
                <div className="relative flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-[#D6C1A5]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 bg-[#8C7355] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center shadow-xs">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase hidden sm:inline text-[#FAF6F0]">
                  Košík
                </span>
                {cartCount > 0 && (
                  <span className="hidden sm:inline text-xs font-medium text-[#D6C1A5] border-l border-[#4E4035] pl-2">
                    {cartTotal.toLocaleString('cs-CZ')} Kč
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 3. MOBILE SLIDE-OVER DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative ml-0 mr-auto w-4/5 max-w-sm bg-[#FCFAF7] h-full shadow-2xl flex flex-col border-r border-[#E3DACF] z-10">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EBE3D7] bg-[#F7F2EB]">
              <div>
                <span className="font-editorial text-xl font-bold tracking-[0.18em] text-[#241E1A] uppercase">
                  {config.logoText || config.siteName || "LUVIA DECOR"}
                </span>
                <p className="text-[10px] text-[#8C7355] uppercase tracking-[0.2em] font-semibold mt-0.5">
                  Květinový ateliér Kroměříž
                </p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-[#EBE1D4] hover:bg-[#DFD3C3] text-[#241E1A] transition cursor-pointer"
                aria-label="Zavřít menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 py-4 px-4 space-y-1.5 overflow-y-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#9C8B7C] px-3 py-1">
                Navigace
              </div>

              {navLinks.map((link) => {
                const isActive = page === link.page;
                const IconComponent = link.icon;
                return (
                  <button
                    key={link.page}
                    onClick={() => handleNavClick(link.page)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-[#241E1A] text-[#FAF8F5]'
                        : 'text-[#3E352C] hover:bg-[#F2ECE4]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-[#8C7355]'}`} />
                      <span>{link.label}</span>
                      {link.badge && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#8C7355] text-white font-bold uppercase">
                          {link.badge}
                        </span>
                      )}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#CDBEB0]' : 'text-stone-400'}`} />
                  </button>
                );
              })}

              {/* Mobile Cart Link in Drawer */}
              <div className="pt-3">
                <button
                  onClick={() => handleNavClick('cart')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left text-sm font-medium transition cursor-pointer ${
                    page === 'cart'
                      ? 'bg-[#8C7355] text-white'
                      : 'bg-[#241E1A] text-[#FAF8F5]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-[#D6C1A5]" />
                    <span>Váš nákupní košík</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#8C7355] text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {cartCount} ks
                    </span>
                    <span className="text-xs text-[#E6DCD1] font-semibold">
                      {cartTotal.toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </button>
              </div>

              {/* Custom Order Callout in Drawer */}
              <div className="mt-4 p-4 rounded-xl bg-[#F4EDE4] border border-[#E0D3C3] text-center">
                <p className="text-xs font-semibold text-[#241E1A] mb-1">Chcete vazbu přesně na míru?</p>
                <p className="text-[11px] text-[#6B5C4F] mb-3">Vytvoříme svatební, sezónní i smuteční aranžmá dle vašeho přání.</p>
                <button
                  onClick={() => handleNavClick('custom-order')}
                  className="w-full py-2 px-3 bg-[#8C7355] hover:bg-[#786146] text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Poptat tvorbu na míru
                </button>
              </div>
            </div>

            {/* Drawer Footer Contact Information */}
            <div className="p-4 border-t border-[#E8DFC8] bg-[#F7F3EC] text-xs text-[#52453A] space-y-2">
              <a
                href={`tel:${config.phone}`}
                className="flex items-center gap-2 text-[#8C7355] font-bold py-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{config.phoneDisplay}</span>
              </a>
              <a
                href={`mailto:${config.ordersEmail}`}
                className="flex items-center gap-2 text-stone-600 hover:text-stone-900"
              >
                <Mail className="w-3.5 h-3.5 text-[#8C7355]" />
                <span className="truncate">{config.ordersEmail}</span>
              </a>
              <div className="flex items-start gap-2 text-[11px] text-stone-500 pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#8C7355] shrink-0 mt-0.5" />
                <span>{config.registeredOffice}</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};
