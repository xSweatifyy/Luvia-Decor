import React from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Heart,
  MapPin,
  ChevronRight,
  Instagram,
  Facebook,
  MessageCircle,
  Calendar,
  CalendarCheck,
  ExternalLink
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { config, products, setPage, setSelectedCategory } = useApp();

  const featuredProducts = products.filter(p => p.featured).slice(0, 4);
  const bestsellers = products.filter(p => p.badge === 'Bestseller' || p.featured).slice(0, 6);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setPage('catalog');
  };

  return (
    <div id="home-page" className="space-y-20 sm:space-y-28 pb-16">
      
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background image with luxury overlay */}
        <div className="absolute inset-0 z-0">
          <SafeImage
            src={config.hero.bgImageUrl || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=2000&q=85"}
            alt="Luvia Decor Ateliér"
            className="w-full h-full transform scale-105"
            loading="eager"
          />
          {/* Subtle gradient overlay to ensure WCAG AA contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E1915]/90 via-[#261F1A]/75 to-[#1E1915]/85 backdrop-blur-[1.5px]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center text-[#FAF6F0] space-y-6">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-medium tracking-wider text-[#EBDCC8] uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>{config.hero.badge || "Ateliér ruční tvorby & aranžmá Kroměříž"}</span>
          </div>

          {/* Headline */}
          <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            {config.hero.title}{' '}
            <span className="italic font-normal text-[#E2D0B8] block sm:inline">
              {config.hero.titleEmphasis}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#DCD1C4] leading-relaxed font-light">
            {config.hero.subtitle}
          </p>

          {/* CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setPage('catalog')}
              className="w-full sm:w-auto px-8 py-4 bg-[#C5A880] hover:bg-[#B3936B] text-[#1E1915] text-sm font-bold tracking-wider uppercase rounded-full shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{config.hero.primaryCtaText || "Prozkoumat kolekci"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage('custom-order')}
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-[#FAF6F0] border border-white/30 text-sm font-semibold tracking-wider uppercase rounded-full backdrop-blur-md transition cursor-pointer"
            >
              {config.hero.secondaryCtaText || "Zakázková tvorba na míru"}
            </button>
          </div>

          {/* Micro trust indicators */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#C5A880]">
            <span className="flex items-center gap-1.5 text-[#FAF6F0]">
              <ShieldCheck className="w-4 h-4 text-[#C5A880]" /> 100% ruční autorská práce
            </span>
            <span className="hidden sm:inline text-stone-500">•</span>
            <span className="flex items-center gap-1.5 text-[#FAF6F0]">
              <MapPin className="w-4 h-4 text-[#C5A880]" /> Ateliér & rozvoz Kroměříž a okolí
            </span>
            <span className="hidden sm:inline text-stone-500">•</span>
            <span className="flex items-center gap-1.5 text-[#FAF6F0]">
              <Heart className="w-4 h-4 text-[#C5A880]" /> Trvanlivé přírodní materiály
            </span>
          </div>

        </div>
      </section>

      {/* Featured & Bestseller Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C7355]">
              Ručně tvořené novinky
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723] mt-1">
              Nejoblíbenější kousky z ateliéru
            </h2>
          </div>
          <button
            onClick={() => setPage('catalog')}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#8C7355] hover:text-[#5C4830] transition cursor-pointer"
          >
            <span>Zobrazit kompletní katalog ({products.length} produktů)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bestsellers.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Custom Order Callout Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-[#241E1A] text-white p-8 sm:p-14 border border-[#3E342C] shadow-2xl">
          {/* Subtle floral background pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 hidden lg:block">
            <SafeImage
              src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1200&q=85"
              alt="Květinový ateliér"
              className="w-full h-full"
              loading="lazy"
            />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C5A880]">
              Zakázková výroba Kroměříž
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-[#FAF6F0]">
              {config.customBanner.title}
            </h2>
            <p className="text-sm text-[#D1C7BC] leading-relaxed">
              {config.customBanner.subtitle}
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={() => setPage('custom-order')}
                className="px-8 py-3.5 bg-[#C5A880] hover:bg-[#B3936B] text-[#1E1915] text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <span>{config.customBanner.buttonText || "Nezávazně poptat zakázku"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage('contact')}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-[#FAF6F0] text-xs font-semibold uppercase tracking-wider rounded-full transition cursor-pointer border border-white/20"
              >
                Kontaktovat ateliér
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Socials & Consultation Schedule Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C7355]">
            Spojte se s námi
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2D2723]">
            Sociální sítě & Osobní konzultace
          </h2>
          <p className="text-sm text-[#7B6E63]">
            Sledujte naši nejnovější tvorbu v ateliéru, napište nám přímo na WhatsApp nebo si jednoduše zarezervujte online konzultaci.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* WhatsApp Card */}
          <a
            href={`https://wa.me/${config.whatsapp ? config.whatsapp.replace(/[^0-9]/g, '') : '420702345999'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-2xl border border-[#EBE3D8] hover:border-[#25D366] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#E8F8EE] text-[#25D366] flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Rychlá zpráva</span>
                <h3 className="font-editorial text-xl font-bold text-[#2D2723] group-hover:text-[#25D366] transition">WhatsApp</h3>
                <p className="text-xs font-semibold text-[#8C7355] mt-0.5">{config.whatsappDisplay || "+420 702 345 999"}</p>
                <p className="text-xs text-[#7B6E63] mt-1">Odpovídáme obratem na dotazy i zaslané fotografie interiérů.</p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-[#25D366] gap-1 pt-2 border-t border-[#F2ECE4]">
              <span>Napsat na WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Instagram Card */}
          <a
            href={config.instagramUrl || "https://www.instagram.com/luvia_decor_"}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-2xl border border-[#EBE3D8] hover:border-[#E1306C] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#FDEEF4] text-[#E1306C] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Fotogalerie & Reels</span>
                <h3 className="font-editorial text-xl font-bold text-[#2D2723] group-hover:text-[#E1306C] transition">Instagram</h3>
                <p className="text-xs font-semibold text-[#8C7355] mt-0.5">@luvia_decor_</p>
                <p className="text-xs text-[#7B6E63] mt-1">Denní inspirace, zákulisí vazby věnců a nové kousky do nabídky.</p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-[#E1306C] gap-1 pt-2 border-t border-[#F2ECE4]">
              <span>Sledovat @luvia_decor_</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Facebook Card */}
          <a
            href={config.facebookUrl || "https://www.facebook.com/profile.php?id=61571617343463"}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-2xl border border-[#EBE3D8] hover:border-[#1877F2] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EEF4FD] text-[#1877F2] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Komunita & Novinky</span>
                <h3 className="font-editorial text-xl font-bold text-[#2D2723] group-hover:text-[#1877F2] transition">Facebook</h3>
                <p className="text-xs font-semibold text-[#8C7355] mt-0.5">Luvia Decor</p>
                <p className="text-xs text-[#7B6E63] mt-1">Aktuality z ateliéru, sezónní nabídky a informace o novinkách.</p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-[#1877F2] gap-1 pt-2 border-t border-[#F2ECE4]">
              <span>Otevřít Facebook stránku</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Consultation Google Calendar Card */}
          <a
            href={config.consultationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#241E1A] text-white p-6 rounded-2xl border border-[#3D332C] hover:border-[#C5A880] shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#C5A880]/20 text-[#C5A880] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#C5A880]/30">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#C5A880] tracking-wider">Online rezervační systém</span>
                <h3 className="font-editorial text-xl font-bold text-[#FAF6F0] group-hover:text-[#E2D0B8] transition">Konzultace</h3>
                <p className="text-xs font-semibold text-[#C5A880] mt-0.5">Google Calendar Rezervace</p>
                <p className="text-xs text-[#C5B9AC] mt-1">Zarezervujte si online či osobní konzultaci svatby či zakázky.</p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-[#C5A880] group-hover:text-[#FAF6F0] gap-1 pt-2 border-t border-[#3D332C] transition">
              <span>Rezervovat termín</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>

        </div>
      </section>

    </div>
  );
};
