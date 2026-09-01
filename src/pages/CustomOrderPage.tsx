import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Send, CheckCircle2, MessageSquare, Calendar, Palette, HeartHandshake, CalendarCheck, ArrowRight, MessageCircle } from 'lucide-react';

export const CustomOrderPage: React.FC = () => {
  const { config, addToCart, setPage, addToast } = useApp();

  const [type, setType] = useState('Věnec na zakázku');
  const [palette, setPalette] = useState('Přírodní eukalyptus & bavlna');
  const [size, setSize] = useState('Střední (cca 40–45 cm)');
  const [dateNeeded, setDateNeeded] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const decorTypes = [
    'Věnec na dveře',
    'Stolní aranžmá',
    'Svatební kytice & výzdoba',
    'Dárkový květinový box',
    'Výzdoba komerčních prostor',
    'Jiná zakázka na míru'
  ];

  const colorPalettes = [
    'Přírodní eukalyptus & bavlna',
    'Boho krémová & pampas (Ivory)',
    'Terakota, skořice & teplé dřevo',
    'Romantická pudrová & jemná růžová',
    'Zimní / adventní přírodní tóny',
    'Individuální barevnost dle domluvy'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !clientPhone) {
      addToast('error', 'Vyplňte kontaktní údaje', 'Prosím zadejte své jméno, e-mail a telefon.');
      return;
    }

    setSubmitting(true);

    const from = parseInt(priceFrom, 10);
    const to = parseInt(priceTo, 10);
    const estimate =
      !isNaN(from) && !isNaN(to) && to >= from ? `${from.toLocaleString('cs-CZ')} – ${to.toLocaleString('cs-CZ')} Kč`
      : !isNaN(from) ? `od ${from.toLocaleString('cs-CZ')} Kč`
      : !isNaN(to) ? `do ${to.toLocaleString('cs-CZ')} Kč`
      : 'dle domluvy';

    const customProduct = {
      id: `custom-${Date.now()}`,
      title: `Zakázková tvorba: ${type}`,
      category: 'zakazkove' as const,
      // Only the customer's rough estimate – final price is agreed individually.
      price: !isNaN(from) && from > 0 ? from : 0,
      isPriceFrom: !isNaN(from) && from > 0,
      pricePrefix: 'odhad',
      description: `Zakázka na míru: ${type}. Barevnost: ${palette}. Velikost: ${size}. Termín: ${dateNeeded || 'Dle domluvy'}. Odhadovaná cena od zákazníka: ${estimate}. Poznámka: ${clientNote}`,
      imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
      inStock: true,
      badge: 'Na zakázku' as const
    };

    try {
      // Add custom configured item to cart
      addToCart(customProduct, 1, `Barevnost: ${palette} | Velikost: ${size} | Termín: ${dateNeeded} | Odhad ceny: ${estimate} | Poznámka: ${clientNote}`);
      setSubmitted(true);
      addToast('success', 'Zakázka přidána do košíku', 'Váš požadavek byl připraven v košíku k odeslání.');
    } catch (err) {
      addToast('error', 'Chyba', 'Nepodařilo se přidat zakázku.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="custom-order-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF5EE] text-[#8C7355] text-xs font-bold uppercase tracking-wider border border-[#E8DFC8]">
          <Sparkles className="w-3.5 h-3.5" />
          Zakázková floristika & výroba
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#2D2723]">
          Vytvoříme dekoraci přesně podle vašich představ
        </h1>
        <p className="text-sm text-[#7B6E63] max-w-2xl mx-auto leading-relaxed">
          Ať už plánujete svatbu, potřebujete věnec v nestandardním rozměru, nebo hledáte reprezentativní výzdobu, rádi pro vás v ateliéru Luvia Decor vytvoříme jedinečný originál.
        </p>
      </div>

      {/* Online Consultation & WhatsApp Quick Banner */}
      <div className="bg-[#241E1A] text-white rounded-3xl p-6 sm:p-8 border border-[#3E342B] flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold text-[#C5A880] tracking-wider">
            <CalendarCheck className="w-4 h-4" />
            <span>Osobní i online konzultace zdarma</span>
          </div>
          <h3 className="font-editorial text-2xl font-bold text-[#FAF6F0]">
            Přejete si nezávaznou konzultaci v kalendáři?
          </h3>
          <p className="text-xs text-[#C5B9AC] max-w-xl">
            Vyberte si pohodlně volný termín v našem Google kalendáři nebo nám napište na WhatsApp s fotografiemi Vašeho interiéru.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href={config.consultationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-[#C5A880] hover:bg-[#B3936B] text-[#1E1915] text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Rezervovat termín</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <a
            href={`https://wa.me/${config.whatsapp ? config.whatsapp.replace(/[^0-9]/g, '') : '420702345999'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 border border-[#25D366]/40 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp chat</span>
          </a>
        </div>
      </div>

      {submitted ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E3DACF] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#F4F9F4] text-emerald-600 flex items-center justify-center mx-auto border border-[#D3E8D6]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-editorial text-3xl font-bold text-[#2D2723]">
              Poptávka byla vložena do košíku!
            </h2>
            <p className="text-sm text-[#7B6E63] max-w-md mx-auto">
              Nyní můžete přejít do košíku a odeslat nezávaznou objednávku. Obratem se vám ozveme ohledně detailů a přesné kalkulace.
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => setPage('cart')}
              className="px-8 py-3.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md transition cursor-pointer"
            >
              Přejít do košíku k odeslání →
            </button>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-3.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-[#2D2723] text-xs font-semibold rounded-full border border-[#E3DACF] transition cursor-pointer"
            >
              Vytvořit další poptávku
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8DFC8] shadow-sm space-y-8">

          {/* Step 1: Typ dekorace */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355]">
              1. Typ požadované dekorace:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {decorTypes.map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`p-3.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                    type === t
                      ? 'bg-[#2D2723] text-white border-[#2D2723] shadow-sm'
                      : 'bg-[#FAF8F5] text-[#4A3F36] hover:bg-[#F2ECE4] border-[#E3DACF]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Barevná paleta */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              2. Preferovaná barevná paleta a styl:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {colorPalettes.map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPalette(p)}
                  className={`p-3.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                    palette === p
                      ? 'bg-[#8C7355] text-white border-[#8C7355] shadow-sm'
                      : 'bg-[#FAF8F5] text-[#4A3F36] hover:bg-[#F2ECE4] border-[#E3DACF]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Velikost & Požadovaný termín */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355]">
                3. Přibližný rozměr:
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full p-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs font-semibold text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
              >
                <option value="Menší (cca 30–35 cm)">Menší (cca 30–35 cm)</option>
                <option value="Střední (cca 40–45 cm)">Střední (cca 40–45 cm - doporučeno)</option>
                <option value="Velký reprezentativní (50–60 cm)">Velký reprezentativní (50–60 cm)</option>
                <option value="Individuální rozměr / prostory">Individuální rozměr / prostory</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                4. Požadovaný termín dodání / datum akce:
              </label>
              <input
                type="text"
                value={dateNeeded}
                onChange={(e) => setDateNeeded(e.target.value)}
                placeholder="Např. do konce měsíce / 15. července 2026..."
                className="w-full p-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
              />
            </div>
          </div>

          {/* Step 3.5: Customer price estimate (Od / Do) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355]">
              5. Váš orientační odhad ceny (Kč) – volitelné:
            </label>
            <p className="text-[11px] text-[#7B6E63]">
              Uveďte přibližný rozpočet, který máte v úmyslu investovat. Konečná cena zakázky se domlouvá individuálně dle náročnosti.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-400">Od</span>
                <input
                  type="number"
                  min={0}
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                  placeholder="např. 800"
                  className="w-full pl-10 pr-3 py-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-400">Do</span>
                <input
                  type="number"
                  min={0}
                  value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)}
                  placeholder="např. 2 500"
                  className="w-full pl-10 pr-3 py-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Kontaktní údaje */}
          <div className="space-y-4 pt-6 border-t border-[#F0EAE1]">
            <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">
              Vaše kontaktní údaje pro kalkulaci
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#5C5046] mb-1 font-semibold">Jméno a příjmení *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Jana Nováková"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
              </div>

              <div>
                <label className="block text-xs text-[#5C5046] mb-1 font-semibold">E-mail pro odpověď *</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="jana.novakova@email.cz"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
              </div>

              <div>
                <label className="block text-xs text-[#5C5046] mb-1 font-semibold">Telefonní číslo *</label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+420 777 000 111"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#5C5046] mb-1 font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#8C7355]" />
                Podrobný popis vašeho přání & požadavků:
              </label>
              <textarea
                rows={3}
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                placeholder="Popište nám svůj styl, barvy vstupních dveří či interiéru, speciální květiny, které máte rádi..."
                className="w-full p-3 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#7B6E63]">
              <HeartHandshake className="w-4 h-4 text-[#8C7355]" />
              <span>Nezávazná kalkulace do 24 hodin zdarma</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-4 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Zpracovávám...' : 'Připravit poptávku do košíku'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
