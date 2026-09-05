import React, { useEffect } from 'react';

const readPromo = () => {
  try {
    const raw = localStorage.getItem('luvia_cart_promo_data');
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value?.code) return null;
    return { code: String(value.code), type: String(value.type || 'fixed'), value: Number(value.value) || 0 };
  } catch { return null; }
};

export const CartDiscountSync: React.FC = () => {
  useEffect(() => {
    const apply = () => {
      const promo = readPromo();
      const totalRows = Array.from(document.querySelectorAll('span')).filter(el => el.textContent?.trim() === 'Celkem');

      totalRows.forEach(label => {
        const row = label.parentElement;
        const totalBold = row?.querySelector('b');
        if (!row || !totalBold) return;
        const summary = row.parentElement;
        if (!summary) return;

        const subtotalText = Array.from(summary.querySelectorAll('div'))
          .find(el => el.textContent?.trim().startsWith('Zboží'))
          ?.querySelector('b')?.textContent || '';
        const subtotal = Number(subtotalText.replace(/[^0-9,-]/g, '').replace(/\s/g, '').replace(',', '.')) || 0;

        const shippingText = Array.from(summary.querySelectorAll('div'))
          .find(el => el.textContent?.trim().startsWith('Doprava'))
          ?.querySelector('b')?.textContent || '';
        const shipping = Number(shippingText.replace(/[^0-9,-]/g, '').replace(/\s/g, '').replace(',', '.')) || 0;

        const discount = promo && promo.value > 0
          ? promo.type === 'percent'
            ? Math.round(subtotal * promo.value / 100)
            : Math.min(subtotal, promo.value)
          : 0;
        const expectedTotal = Math.max(0, subtotal - discount) + shipping;
        const expectedTotalText = `${expectedTotal.toLocaleString('cs-CZ')} Kč`;

        // Important: this component observes the document body. Only mutate DOM
        // when the value actually changed, otherwise our own mutations would
        // trigger the observer indefinitely and freeze the whole page after
        // opening the cart.
        if (totalBold.textContent !== expectedTotalText) {
          totalBold.textContent = expectedTotalText;
        }

        let discountRow = summary.querySelector('[data-luvia-discount-row]') as HTMLElement | null;
        if (!discount) {
          if (discountRow) discountRow.remove();
          return;
        }

        if (!discountRow) {
          discountRow = document.createElement('div');
          discountRow.dataset.luviaDiscountRow = 'true';
          discountRow.className = 'flex justify-between text-sm text-emerald-700';
          row.parentElement?.insertBefore(discountRow, row);
        }

        const discountLabel = `Sleva (${promo?.code || 'kód'})`;
        const discountValue = `−${discount.toLocaleString('cs-CZ')} Kč`;
        const existingLabel = discountRow.querySelector('span')?.textContent || '';
        const existingValue = discountRow.querySelector('b')?.textContent || '';
        if (existingLabel !== discountLabel || existingValue !== discountValue) {
          discountRow.innerHTML = `<span>${discountLabel}</span><b>${discountValue}</b>`;
        }
      });
    };

    apply();
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const onPromo = () => window.setTimeout(apply, 0);
    window.addEventListener('luvia-promo-changed', onPromo);
    return () => {
      observer.disconnect();
      window.removeEventListener('luvia-promo-changed', onPromo);
    };
  }, []);

  return null;
};
