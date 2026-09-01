import React, { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';

const CONSENT_KEY = 'luvia_cookie_consent';
type ConsentChoice = 'all' | 'necessary';

export const getCookieConsent = (): ConsentChoice | null => {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'all' || value === 'necessary' ? value : null;
  } catch {
    return null;
  }
};

interface CookieConsentProps {
  onConsent: (choice: ConsentChoice) => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onConsent }) => {
  const [choice, setChoice] = useState<ConsentChoice | null>(getCookieConsent);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const openPolicy = () => setShowPolicy(true);
    window.addEventListener('open-cookie-policy', openPolicy);
    return () => window.removeEventListener('open-cookie-policy', openPolicy);
  }, []);

  useEffect(() => {
    if (choice) {
      try {
        localStorage.setItem(CONSENT_KEY, choice);
      } catch {
        // Consent remains active for this session if storage is unavailable.
      }
      onConsent(choice);
    }
  }, [choice, onConsent]);

  return (
    <>
      {!choice && (
      <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-3xl rounded-2xl border border-[#D8C9B7] bg-[#FFFDF9] p-5 shadow-2xl sm:inset-x-6 sm:p-6">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[#8C7355]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[#2D2723]">Vaše soukromí na prvním místě</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5C5046]">
              Pro správné fungování webu používáme nezbytné technické úložiště. Analytické měření návštěvnosti spustíme jen s vaším souhlasem.
            </p>
            <button
              type="button"
              onClick={() => setShowPolicy(true)}
              className="mt-2 text-xs font-semibold text-[#8C7355] underline underline-offset-2"
            >
              Jak nakládáme s cookies a údaji
            </button>
          </div>
          <button type="button" onClick={() => setChoice('necessary')} className="p-1 text-[#7B6E63]" aria-label="Zavřít">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setChoice('necessary')} className="rounded-xl border border-[#D8C9B7] px-4 py-2 text-xs font-semibold text-[#5C5046] hover:bg-[#F5EFE7]">
            Jen nezbytné
          </button>
          <button type="button" onClick={() => setChoice('all')} className="rounded-xl bg-[#2D2723] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8C7355]">
            Povolit analytiku
          </button>
        </div>
      </div>
      )}

      {showPolicy && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cookie-policy-title">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#FFFDF9] p-6 text-sm text-[#5C5046] shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 id="cookie-policy-title" className="font-editorial text-2xl font-bold text-[#2D2723]">Cookies a ochrana soukromí</h2>
              <button type="button" onClick={() => setShowPolicy(false)} className="rounded-full p-2 text-[#7B6E63] hover:bg-[#F5EFE7]" aria-label="Zavřít zásady cookies">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4 leading-relaxed">
              <p><strong>Nezbytné úložiště:</strong> v prohlížeči uchováváme obsah nákupního košíku a technické údaje potřebné pro fungování administrace. Tyto údaje nejsou marketingové cookies a bez jejich použití nemusí web fungovat správně.</p>
              <p><strong>Analytika:</strong> Analytics používáme ke zjištění, jak návštěvníci web používají a které stránky navštěvují. Aktivuje se až po kliknutí na „Povolit analytiku“. Pokud zvolíte „Jen nezbytné“, analytické měření se nespustí.</p>
              <p><strong>Vaše volba:</strong> souhlas ukládáme v tomto prohlížeči, aby se vás banner znovu neptal při každé návštěvě. Volbu můžete kdykoli změnit přes odkaz „Cookies“ v patičce webu.</p>
              <p><strong>Správce údajů:</strong> Luvia Decor, U Rejdiště 3732/15, 767 01 Kroměříž. Kontakt: podpora@luvia-decor.cz.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
