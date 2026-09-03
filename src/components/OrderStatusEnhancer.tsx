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

export function OrderStatusEnhancer() {
  useEffect(() => {
    const enhance = () => {
      document.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
        const values = Array.from(select.options).map((option) => option.value);
        if (!values.includes('nova') || !values.includes('dokonceno')) return;
        const current = select.value;
        STATUS_OPTIONS.forEach(([value, label]) => {
          if (!Array.from(select.options).some((option) => option.value === value)) {
            select.add(new Option(label, value));
          }
        });
        if (current) select.value = current;
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
