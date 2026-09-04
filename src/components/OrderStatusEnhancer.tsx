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
  });
}

async function changeOrderStatus(select: HTMLSelectElement, status: string) {
  if (!STATUS_VALUES.has(status)) return;

  const card = select.closest('div.border') || select.parentElement?.parentElement?.parentElement;
  const text = card?.textContent || '';
  const orderNumber = text.match(/LUV-\d{4}-\d+/i)?.[0]?.trim();
  if (!orderNumber) {
    window.alert('Nepodařilo se určit číslo objednávky. Obnovte administraci a zkuste to znovu.');
    return;
  }

  const previous = select.dataset.savedStatus || select.defaultValue || 'nova';
  select.dataset.savedStatus = previous;
  select.disabled = true;

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

    select.dataset.savedStatus = status;
    select.value = status;
    window.location.reload();
  } catch (error) {
    select.value = previous;
    console.error('Luvia Decor: změna stavu objednávky selhala', error);
    window.alert(error instanceof Error ? error.message : 'Stav objednávky se nepodařilo změnit.');
  } finally {
    select.disabled = false;
  }
}

export function OrderStatusEnhancer() {
  useEffect(() => {
    ensureStatusOptions();

    // Use one delegated capture listener. React can replace the <select> node
    // during re-renders, so listeners attached directly to the old node are
    // unreliable. Capture also prevents the legacy handler from overwriting
    // the selected value before our server update completes.
    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.closest('#admin-dashboard-view')) return;
      if (!isOrderStatusSelect(target)) return;

      const status = target.value;
      if (!STATUS_VALUES.has(status)) return;
      event.stopImmediatePropagation();
      void changeOrderStatus(target, status);
    };

    document.addEventListener('change', onChange, true);
    const observer = new MutationObserver(ensureStatusOptions);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('change', onChange, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
