import { useEffect } from 'react';

const STATUS_OPTIONS = [
  ['nova', 'Nová'],
  ['zpracovava_se', 'Zpracovává se'],
  ['zaplaceno', 'Zaplaceno'],
  ['u_prepravce', 'U přepravce'],
  ['odeslano', 'Odesláno'],
  ['dokonceno', 'Dokončeno'],
  ['zruseno', 'Zrušit'],
] as const;

const STATUS_VALUES = new Set(STATUS_OPTIONS.map(([value]) => value));

function isOrderStatusSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map((option) => option.value);
  return !values.includes('all') && values.includes('nova') && values.includes('dokonceno');
}

function ensureStatusOptions() {
  document.querySelectorAll<HTMLSelectElement>('#admin-dashboard-view select').forEach((select) => {
    if (!isOrderStatusSelect(select)) return;
    STATUS_OPTIONS.forEach(([value, label]) => {
      if (!Array.from(select.options).some((option) => option.value === value)) {
        select.add(new Option(label, value));
      }
    });

    // Status editing now lives exclusively in the dedicated "Stavy objednávek" category.
    // Keep the legacy order filter visible, but hide per-order status selectors.
    const card = select.closest('div.border');
    if (card?.textContent?.match(/LUV-\d{4}-\d+/i)) {
      select.style.display = 'none';
    }
  });
}

export function OrderStatusEnhancer() {
  useEffect(() => {
    ensureStatusOptions();

    const observer = new MutationObserver(ensureStatusOptions);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
