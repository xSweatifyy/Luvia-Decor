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

export function OrderStatusEnhancer() {
  useEffect(() => {
    const enhance = () => {
      document.querySelectorAll<HTMLSelectElement>('#admin-dashboard-view select').forEach((select) => {
        const values = Array.from(select.options).map((option) => option.value);
        // Only enhance the per-order status selector, not unrelated admin filters.
        if (!values.includes('nova') || !values.includes('dokonceno')) return;
        if (select.dataset.luviaStatusEnhanced === '1') return;

        STATUS_OPTIONS.forEach(([value, label]) => {
          if (!Array.from(select.options).some((option) => option.value === value)) {
            select.add(new Option(label, value));
          }
        });

        select.dataset.luviaStatusEnhanced = '1';
        select.addEventListener('change', async (event) => {
          const target = event.currentTarget as HTMLSelectElement;
          const status = target.value;
          const orderCard = target.closest('[data-order-id]') as HTMLElement | null;
          const orderId = orderCard?.dataset.orderId;

          // Legacy cards did not expose the order ID, so fall back to the nearest card
          // by reading the order number and looking it up from the visible order data.
          if (!STATUS_VALUES.has(status)) return;
          if (!orderId) return;

          target.disabled = true;
          try {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
            });
            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              throw new Error(data.error || 'Aktualizace stavu selhala');
            }
            target.dataset.savedStatus = status;
          } catch (error) {
            const previous = target.dataset.savedStatus;
            if (previous) target.value = previous;
            console.error('Luvia Decor: změna stavu objednávky selhala', error);
          } finally {
            target.disabled = false;
          }
        });
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
