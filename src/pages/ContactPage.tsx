import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Send,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  Instagram,
  Facebook,
  CalendarCheck,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { MapEmbed } from '../components/MapEmbed';

export const ContactPage: React.FC = () => {
  const { config, addToast } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Dotaz na produkt / dostupnost');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      addToast('error', 'Vyplňte povinná pole', 'Prosím zadejte jméno, e-mail a Vaši zprávu.');
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      addToast('success', 'Zpráva odeslána', 'Děkujeme za Váš dotaz. Brzy se Vám ozveme zpět.');
    }, 600);
  };

  return (
    <div id="contact-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8C7355]">
          Spojte se s námi
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#2D2723]">
          Kontakt & Ateliér Kroměříž
        </h1>
        <p className="text-sm text-[#7B6E63] leading-relaxed">
          Máte dotaz k dostupnosti věnců, plánujete osobní odběr, nebo si přejete konzultovat svatební výzdobu? Jsme tu pro vás online, po telefonu i v ateliéru.
        </p>
      </div>

      {/* Main Contacts and Contact Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Contact Cards & Legal info */}
        <div className="lg:col-span-5 space-y-6">

          {/* Main Contacts */}
          <div className="bg-white rounded-3xl p-8 border border-[#E8DFC8] shadow-sm space-y-6">
            <h3 className="font-editorial text-2xl font-bold text-[#2D2723] border-b border-[#F2ECE4] pb-4">
              Kontaktní údaje
            </h3>

            <div className="space-y-4 text-xs">

              {/* Objednávky */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center shrink-0 border border-[#E8DFC8]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8C7355]">Objednávky & poptávky</span>
                  <a href={`mailto:${config.ordersEmail}`} className="text-sm font-bold text-[#2D2723] hover:text-[#8C7355] transition">
                    {config.ordersEmail}
                  </a>
                  <p className="text-[11px] text-[#7B6E63] mt-0.5">Pro nové objednávky a kalkulace</p>
                </div>
              </div>

              {/* Podpora */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center shrink-0 border border-[#E8DFC8]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8C7355]">Zákaznická podpora</span>
                  <a href={`mailto:${config.supportEmail}`} className="text-sm font-bold text-[#2D2723] hover:text-[#8C7355] transition">
                    {config.supportEmail}
                  </a>
                  <p className="text-[11px] text-[#7B6E63] mt-0.5">Dotazy k existujícím nákupům</p>
                </div>
              </div>

              {/* Telefon 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center shrink-0 border border-[#E8DFC8]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8C7355]">Telefonní kontakt</span>
                  <a href={`tel:${config.phone || '+420702345999'}`} className="text-sm font-bold text-[#2D2723] hover:text-[#8C7355] transition">
                    {config.phoneDisplay || '+420 702 345 999'}
                  </a>
                </div>
              </div>

              {/* Telefon 2 */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center shrink-0 border border-[#E8DFC8]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8C7355]">Druhý telefonní kontakt</span>
                  <a href={`tel:${config.phone2 || '+420734214299'}`} className="text-sm font-bold text-[#2D2723] hover:text-[#8C7355] transition">
                    {config.phone2Display || '+420 734 214 299'}
                  </a>
                </div>
              </div>

              {/* Otevírací doba - umístitelná pod obě telefonní čísla */}
              <div className="flex items-start gap-3.5 pt-2 border-t border-[#F2ECE4]">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center shrink-0 border border-[#E8DFC8]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8C7355]">Otevírací doba ateliéru</span>
                  <p className="text-sm font-bold text-[#2D2723] mt-0.5">PO–SO 9:00 – 18:00</p>
                  <p className="text-[11px] text-[#7B6E63] mt-0.5">Neděle & svátky: dle předchozí domluvy</p>
                </div>
              </div>

            </div>

          </div>

          {/* Legal Card */}
          <div className="bg-[#FAF6F0] rounded-3xl p-6 border border-[#E3DACF] space-y-3 text-xs">
            <h4 className="font-bold text-[#2D2723] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8C7355]" />
              Fakturační a úřední údaje
            </h4>
            <div className="space-y-1.5 text-[#5C5046] text-xs">
              <p><strong className="text-[#2D2723]">Odpovědná osoba:</strong> {config.responsiblePerson}</p>
              <p><strong className="text-[#2D2723]">Sídlo ateliéru:</strong> {config.registeredOffice}</p>
              <p><strong className="text-[#2D2723]">IČO:</strong> {config.ico}</p>
              <p className="text-[11px] text-[#8C7355] pt-1">Fyzická osoba zapsaná v živnostenském rejstříku MěÚ Kroměříž.</p>
            </div>
          </div>

        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-[#E8DFC8] shadow-sm">
          <h3 className="font-editorial text-2xl font-bold text-[#2D2723] mb-2">
            Napište nám zprávu
          </h3>
          <p className="text-xs text-[#7B6E63] mb-6">
            Odpovídáme zpravidla do několika hodin v pracovní dny.
          </p>

          {sent ? (
            <div className="p-8 bg-[#F4F9F4] border border-[#D3E8D6] rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-900 text-base">Zpráva byla úspěšně odeslána!</h4>
              <p className="text-xs text-emerald-800">Děkujeme za kontaktování ateliéru Luvia Decor. Brzy se Vám ozveme.</p>
              <button
                onClick={() => setSent(false)}
                className="mt-3 px-5 py-2 bg-emerald-700 text-white rounded-full text-xs font-semibold cursor-pointer"
              >
                Napsat další zprávu
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5046] mb-1">Vaše jméno *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jana Nováková"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5046] mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jana@email.cz"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5046] mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+420 777 000 111"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5046] mb-1">Předmět zprávy</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs font-semibold text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                  >
                    <option value="Dotaz na produkt / dostupnost">Dotaz na produkt / dostupnost</option>
                    <option value="Zakázková výroba věnce">Zakázková výroba věnce</option>
                    <option value="Svatební výzdoba">Svatební výzdoba</option>
                    <option value="Osobní odběr Kroměříž">Osobní odběr Kroměříž</option>
                    <option value="Jiné">Jiné</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5046] mb-1">Vaše zpráva *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Napište nám, o co máte zájem..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Odesílám...' : 'Odeslat zprávu'}</span>
              </button>
            </form>
          )}

        </div>

      </div>

      {/* 4 Social & Consultation Quick Cards - Placed at the bottom above the map */}
      <div className="space-y-4 pt-4 border-t border-[#EDE4D8]">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C7355]">
            Sociální sítě & konzultace
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] mt-1">
            Spojte se s námi online
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">

          {/* WhatsApp Card */}
          <a
            href={`https://wa.me/${config.whatsapp ? config.whatsapp.replace(/[^0-9]/g, '') : '420702345999'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border border-[#E8DFC8] hover:border-[#25D366] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8EE] text-[#25D366] flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#E8F8EE] text-[#25D366]">
                Rychlý chat
              </span>
            </div>
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#2D2723]">WhatsApp</h3>
              <p className="text-xs font-bold text-[#8C7355] mt-0.5">{config.whatsappDisplay || "+420 702 345 999"}</p>
              <p className="text-xs text-[#7B6E63] mt-1">Pošlete nám fotku interiéru nebo dotaz k objednávce.</p>
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
            className="group bg-white p-6 rounded-3xl border border-[#E8DFC8] hover:border-[#E1306C] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#FDEEF4] text-[#E1306C] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Instagram className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#FDEEF4] text-[#E1306C]">
                Inspirace
              </span>
            </div>
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#2D2723]">Instagram</h3>
              <p className="text-xs font-bold text-[#8C7355] mt-0.5">@luvia_decor_</p>
              <p className="text-xs text-[#7B6E63] mt-1">Sledujte stories z tvorby a nové kolekce věnců.</p>
            </div>
            <div className="flex items-center text-xs font-bold text-[#E1306C] gap-1 pt-2 border-t border-[#F2ECE4]">
              <span>Sledovat na Instagramu</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Facebook Card */}
          <a
            href={config.facebookUrl || "https://www.facebook.com/profile.php?id=61571617343463"}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border border-[#E8DFC8] hover:border-[#1877F2] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF4FD] text-[#1877F2] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Facebook className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#EEF4FD] text-[#1877F2]">
                Stránka
              </span>
            </div>
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#2D2723]">Facebook</h3>
              <p className="text-xs font-bold text-[#8C7355] mt-0.5">Luvia Decor</p>
              <p className="text-xs text-[#7B6E63] mt-1">Novinky z dílny a aktuality o sezónních vazbách.</p>
            </div>
            <div className="flex items-center text-xs font-bold text-[#1877F2] gap-1 pt-2 border-t border-[#F2ECE4]">
              <span>Otevřít Facebook</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Google Calendar Consultation Card */}
          <a
            href={config.consultationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#241E1A] text-white p-6 rounded-3xl border border-[#3D332C] hover:border-[#C5A880] shadow-md hover:shadow-xl transition duration-200 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#C5A880]/20 text-[#C5A880] flex items-center justify-center group-hover:scale-105 transition-transform border border-[#C5A880]/30">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/30">
                Online Kalendář
              </span>
            </div>
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#FAF6F0]">Konzultace</h3>
              <p className="text-xs font-bold text-[#C5A880] mt-0.5">Rezervace termínu</p>
              <p className="text-xs text-[#C5B9AC] mt-1">Vyberte si volný čas pro konzultaci svatby či tvorby na míru.</p>
            </div>
            <div className="flex items-center text-xs font-bold text-[#C5A880] group-hover:text-[#FAF6F0] gap-1 pt-2 border-t border-[#3D332C] transition">
              <span>Zarezervovat čas v kalendáři</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>

        </div>
      </div>

      {/* Google Map Section with Pin on Kroměříž address */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-editorial text-2xl font-bold text-[#2D2723]">
              Poloha ateliéru na mapě
            </h3>
            <p className="text-xs text-[#7B6E63]">{config.registeredOffice}</p>
          </div>
        </div>
        <MapEmbed height="h-96" />
      </div>

    </div>
  );
};
