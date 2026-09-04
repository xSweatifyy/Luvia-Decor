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

function findOrderId(select: HTMLSelectElement): string | null {
  const card = select.closest('div.border');
  const text = card?.textContent || '';
  const orderNumber = text.match(/LUV-\d{4}-\d+/i)?.[0];
  return orderNumber || null;
}

async function saveOrderStatus(select: HTMLSelectElement, status: string) {
  const orderNumber = findOrderId(select);
  if (!orderNumber) throw new Error('Nepodařilo se najít číslo objednávky.');

  const ordersResponse = await fetch('/api/orders', { cache: 'no-store' });
  if (!ordersResponse.ok) throw new Error('Nepodařilo se načíst objednávky.');

  const orders = await ordersResponse.json();
  const order = Array.isArray(orders)
    ? orders.find((item: any) => String(item.orderNumber).toLowerCase() === orderNumber.toLowerCase())
    : null;

  if (!order?.id) throw new Error(`Objednávka ${orderNumber} nebyla nalezena.`);

  const primary = await fetch(`/api/orders/${encodeURIComponent(order.id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (primary.ok) return;

  const primaryData = await primary.json().catch(() => null);

  const fallback = await fetch('/api/order-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id, status }),
  });

  if (!fallback.ok) {
    const fallbackData = await fallback.json().catch(() => null);
    throw new Error(
      fallbackData?.error || primaryData?.error || 'Aktualizace stavu selhala.'
    );
  }
}

function handleStatusChange(event: Event) {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement) || !isOrderStatusSelect(select)) return;

  const status = select.value;
  const previousStatus = select.dataset.previousStatus || status;
  select.dataset.previousStatus = status;

  void saveOrderStatus(select, status).then(() => {
    window.dispatchEvent(new CustomEvent('luvia-order-status-updated', { detail: { status } }));
  }).catch((error) => {
    select.value = previousStatus;
    select.dataset.previousStatus = previousStatus;
    window.alert(error instanceof Error ? error.message : 'Aktualizace stavu selhala.');
  });
}

export function OrderStatusEnhancer() {
  useEffect(() => {
    ensureStatusOptions();

    document.addEventListener('change', handleStatusChange, true);

    const observer = new MutationObserver(ensureStatusOptions);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('change', handleStatusChange, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
