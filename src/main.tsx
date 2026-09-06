import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root')!;

// Carrier logos live in the repository root. Bundle them through Vite so production
// does not depend on root files being copied to /public.
const carrierLogoUrls = {
  zasilkovna: new URL('../zasilkovna-logo.png', import.meta.url).href,
  dpd: new URL('../dpd-logo.png', import.meta.url).href,
  ppl: new URL('../ppl-logo.jpg', import.meta.url).href,
  balikovnaAdresa: new URL('../Logo - balíkovna na adresu.png', import.meta.url).href,
  balikovna: new URL('../Logo - balíkovna.png', import.meta.url).href,
  gls: new URL('../Logo- GLS.png', import.meta.url).href,
  one: new URL('../One.webp', import.meta.url).href,
};

function fixCarrierLogoPaths() {
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.includes('/loga-dopravci/zasilkovna.png') || src === '/zasilkovna-logo.png') {
      img.src = carrierLogoUrls.zasilkovna;
    }
    if (src.includes('/loga-dopravci/dpd.png') || src === '/dpd-logo.png') {
      img.src = carrierLogoUrls.dpd;
    }
    if (src.includes('cdn.brandfetch.io/idQnnZVeYO') || img.alt === 'PPL') {
      img.src = carrierLogoUrls.ppl;
    }
  });

  // Add the four carrier logos already stored in GitHub to the existing footer row.
  const carrierLabel = Array.from(document.querySelectorAll<HTMLElement>('span')).find(
    (el) => el.textContent?.trim() === 'Přepravci'
  );
  const carrierRow = carrierLabel?.parentElement;
  if (!carrierRow || carrierRow.dataset.carrierFooterEnhanced === 'true') return;

  const logos = [
    { src: carrierLogoUrls.balikovnaAdresa, alt: 'Balíkovna na adresu' },
    { src: carrierLogoUrls.balikovna, alt: 'Balíkovna' },
    { src: carrierLogoUrls.gls, alt: 'GLS' },
    { src: carrierLogoUrls.one, alt: 'One' },
  ];

  logos.forEach(({ src, alt }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'h-14 w-40 flex items-center justify-center rounded-xl bg-transparent';
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;
    image.loading = 'lazy';
    image.className = 'max-h-10 max-w-full object-contain bg-transparent';
    wrapper.appendChild(image);
    carrierRow.appendChild(wrapper);
  });

  carrierRow.dataset.carrierFooterEnhanced = 'true';
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

fixCarrierLogoPaths();
new MutationObserver(fixCarrierLogoPaths).observe(root, { childList: true, subtree: true });
