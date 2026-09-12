import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root')!;

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
    if (src.includes('/loga-dopravci/zasilkovna.png') || src === '/zasilkovna-logo.png') img.src = carrierLogoUrls.zasilkovna;
    if (src.includes('/loga-dopravci/dpd.png') || src === '/dpd-logo.png') img.src = carrierLogoUrls.dpd;
    if (src.includes('cdn.brandfetch.io/idQnnZVeYO') || img.alt === 'PPL') img.src = carrierLogoUrls.ppl;
  });

  const carrierLabel = Array.from(document.querySelectorAll<HTMLElement>('span')).find((el) => el.textContent?.trim() === 'Přepravci');
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
    image.src = src; image.alt = alt; image.loading = 'lazy'; image.className = 'max-h-10 max-w-full object-contain bg-transparent';
    wrapper.appendChild(image); carrierRow.appendChild(wrapper);
  });
  carrierRow.dataset.carrierFooterEnhanced = 'true';
}

let pointsRefreshTimer: number | undefined;
async function enhanceLuviaPoints() {
  const token = localStorage.getItem('luvia_customer_token');
  if (!token) return;
  const title = Array.from(document.querySelectorAll<HTMLElement>('p')).find((el) => el.textContent?.trim() === 'Vaše úroveň');
  if (!title) return;
  const card = title.closest('section') as HTMLElement | null;
  if (!card) return;
  try {
    const r = await fetch('/api/customer/me', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    const points = Number(d.availablePoints || 0);
    const level = points >= 300 ? 'Luvia VIP' : points >= 150 ? 'Luvia Lover' : points >= 50 ? 'Luvia Fan' : 'Začínáme';
    const next = points < 50 ? 50 : points < 150 ? 150 : points < 300 ? 300 : 300;
    const progress = points >= 300 ? 100 : Math.min(100, Math.round((points / next) * 100));
    const h2 = card.querySelector('h2'); if (h2) h2.textContent = level;
    const pointText = Array.from(card.querySelectorAll('p')).find((el) => /Luvia Points/.test(el.textContent || ''));
    if (pointText) pointText.textContent = `${points} Luvia Points`;
    const bar = card.querySelector<HTMLElement>('.h-2.bg-\\[\\#8C7355\\]'); if (bar) bar.style.width = `${progress}%`;
    const oldInfo = Array.from(card.querySelectorAll('p')).find((el) => (el.textContent || '').includes('1 bod = 50 Kč'));
    if (oldInfo) oldInfo.textContent = '1 bod = 50 Kč hodnoty uskutečněných objednávek. Každých 50 bodů lze směnit za poukázku na 40% slevu.';
    let panel = card.querySelector<HTMLElement>('[data-luvia-points-reward]');
    if (!panel) {
      panel = document.createElement('div');
      panel.dataset.luviaPointsReward = 'true';
      panel.className = 'mt-4 rounded-2xl border border-[#E4D9CD] bg-[#FAF6F0] p-4';
      card.appendChild(panel);
    }
    panel.innerHTML = '';
    const desc = document.createElement('p'); desc.className = 'text-sm font-bold text-[#2D2723]'; desc.textContent = '🎟️ 40% poukázka za Luvia Points'; panel.appendChild(desc);
    const info = document.createElement('p'); info.className = 'text-xs text-[#897A6E] mt-1'; info.textContent = 'Za každých 50 bodů získáte jednu poukázku na 40% slevu z celkové hodnoty nákupu. Po vygenerování se 50 bodů odečte.'; panel.appendChild(info);
    const btn = document.createElement('button'); btn.className = 'mt-3 w-full rounded-xl bg-[#241E1A] text-white py-3 text-sm font-bold disabled:opacity-50'; btn.disabled = points < 50; btn.textContent = points >= 50 ? 'Vyměnit 50 bodů za 40% poukázku' : `Chybí ${50 - points} bodů`;
    btn.onclick = async () => { btn.disabled = true; btn.textContent = 'Generuji poukázku…'; try { const rr = await fetch('/api/customer/redeem-points', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); const dd = await rr.json(); if (!rr.ok) throw new Error(dd.error || 'Poukázku se nepodařilo vytvořit.'); btn.textContent = `Vytvořeno: ${dd.voucher?.code || '40% poukázka'}`; setTimeout(() => enhanceLuviaPoints(), 700); } catch (e:any) { btn.disabled = false; btn.textContent = e?.message || 'Zkusit znovu'; } };
    panel.appendChild(btn);
    if (Array.isArray(d.pointVouchers) && d.pointVouchers.length) {
      const listTitle = document.createElement('p'); listTitle.className = 'text-xs font-bold text-[#8C7355] mt-4'; listTitle.textContent = 'Vaše 40% poukázky'; panel.appendChild(listTitle);
      d.pointVouchers.forEach((v:any) => { const row = document.createElement('div'); row.className = 'mt-2 rounded-xl bg-white border border-[#E4D9CD] px-3 py-2 flex items-center justify-between gap-3'; const code = document.createElement('b'); code.className = 'font-mono text-xs'; code.textContent = v.code; const val = document.createElement('span'); val.className = 'text-xs font-bold text-[#8C7355]'; val.textContent = '40 %'; row.appendChild(code); row.appendChild(val); panel.appendChild(row); });
    }
  } catch { /* keep the account UI usable if the rewards API is temporarily unavailable */ }
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

fixCarrierLogoPaths();
new MutationObserver(() => { fixCarrierLogoPaths(); if (pointsRefreshTimer) window.clearTimeout(pointsRefreshTimer); pointsRefreshTimer = window.setTimeout(() => { void enhanceLuviaPoints(); }, 150); }).observe(root, { childList: true, subtree: true });
window.setTimeout(() => { void enhanceLuviaPoints(); }, 500);
