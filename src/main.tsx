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
  });
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

fixCarrierLogoPaths();
new MutationObserver(fixCarrierLogoPaths).observe(root, { childList: true, subtree: true });
