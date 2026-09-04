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

        // The order-status select contains these values but the order filter also
        // contains "all". Never enhance the filter select.
        if (values.includes('all') || !values.includes('nova') || !values.includes('dokonceno')) return;

        STATUS_OPTIONS.forEach(([value, label]) => {
          if (!Array.from(select.options).some((option) => option.value === value)) {
            select.add(new Option(label, value));
          }
        });

        if (select.dataset.luviaStatusEnhanced === '1') return;
        select.dataset.luviaStatusEnhanced = '1';
        select.dataset.savedStatus = select.value;

        select.addEventListener('change', async (event) => {
          const target = event.currentTarget as HTMLSelectElement;
          const status = target.value;
          if (!STATUS_VALUES.has(status)) return;

          // Find the order card from the status selector instead of relying on a
          // fragile Tailwind class selector.
          const card = target.closest('div.border') || target.parentElement?.parentElement?.parentElement;
          const text = card?.textContent || '';
          const orderNumberMatch = text.match(/LUV-\d{4}-\d+/i);
          const orderNumber = orderNumberMatch?.[0]?.trim();
          if (!orderNumber) return;

          target.disabled = true;
          try {
            const ordersResponse = await fetch('/api/orders', { cache: 'no-store' });
            if (!ordersResponse.ok) throw new Error('Objednávky se nepodařilo načíst.');
            const orders = await ordersResponse.json();
            const order = Array.isArray(orders)
              ? orders.find((item: any) => String(item.orderNumber) === orderNumber || String(item.id) === orderNumber)
              : null;
            if (!order?.id) throw new Error(`Objednávka ${orderNumber} nebyla nalezena.`);

            const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Aktualizace stavu selhala.');

            target.dataset.savedStatus = status;
            target.value = status;
            window.setTimeout(() => window.location.reload(), 150);
          } catch (error) {
            target.value = target.dataset.savedStatus || 'nova';
            console.error('Luvia Decor: změna stavu objednávky selhala', error);
            window.alert(error instanceof Error ? error.message : 'Stav objednávky se nepodařilo změnit.');
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
