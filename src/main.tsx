import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root')!;

// Carrier logos are served from Vite's public directory so production URLs resolve correctly.
function fixCarrierLogoPaths() {
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.src.includes('/loga-dopravci/zasilkovna.png') || img.getAttribute('src') === '/loga-dopravci/zasilkovna.png') {
      img.src = '/zasilkovna-logo.png';
    }
    if (img.src.includes('/loga-dopravci/dpd.png') || img.getAttribute('src') === '/loga-dopravci/dpd.png') {
      img.src = '/dpd-logo.png';
    }
    if (img.src.includes('cdn.brandfetch.io/idQnnZVeYO') || img.alt === 'PPL') {
      img.src = '/ppl-logo.jpg';
    }
  });

  // Add the four newly uploaded carrier logos to the existing footer carrier row.
  const carrierLabel = Array.from(document.querySelectorAll<HTMLElement>('span')).find(
    (el) => el.textContent?.trim() === 'Přepravci'
  );
  const carrierRow = carrierLabel?.parentElement;
  if (!carrierRow || carrierRow.dataset.carrierFooterEnhanced === 'true') return;

  const logos = [
    { src: '/Logo - balíkovna na adresu.png', alt: 'Balíkovna na adresu' },
    { src: '/Logo - balíkovna.png', alt: 'Balíkovna' },
    { src: '/Logo- GLS.png', alt: 'GLS' },
    { src: '/One.webp', alt: 'One' },
  ];

  logos.forEach(({ src, alt }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'h-14 w-40 flex items-center justify-center rounded-xl bg-transparent';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.className = 'max-h-10 max-w-full object-contain bg-transparent';
    wrapper.appendChild(img);
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
