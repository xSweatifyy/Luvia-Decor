import { useEffect } from 'react';

const STATUS_OPTIONS = [
  ['nova', 'Nová'],
  ['zpracovava_se', 'Zpracovává se'],
  ['zaplaceno', 'Zaplaceno'],
  ['u_prepravce', 'U přepravce'],
  ['odeslano', 'Odesláno'],
  ['dokonceno', 'Dokončeno'],
  ['zruseno', 'Zrušeno']
] as const;

function isOrderStatusSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map(option => option.value);
  return !values.includes('all') && values.includes('nova') && (values.includes('dokonceno') || values.includes('zruseno'));
}

function ensureStatusOptions() {
  document.querySelectorAll<HTMLSelectElement>('#admin-dashboard-view select').forEach(select => {
    if (!isOrderStatusSelect(select)) return;
    STATUS_OPTIONS.forEach(([value, label]) => {
      if (!Array.from(select.options).some(option => option.value === value)) {
        select.add(new Option(label, value));
      }
    });
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
