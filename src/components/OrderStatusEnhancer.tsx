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
    if (!select.dataset.previousStatus) select.dataset.previousStatus = select.value;
  });
}

function findOrderNumber(select: HTMLSelectElement): string | null {
  const card = select.closest('div.border');
  return card?.textContent?.match(/LUV-\d{4}-\d+/i)?.[0] || null;
}

async function saveOrderStatus(select: HTMLSelectElement, status: string) {
  const orderNumber = findOrderNumber(select);
  if (!orderNumber) throw new Error('Nepodařilo se najít číslo objednávky.');

  const ordersResponse = await fetch('/api/orders', { cache: 'no-store' });
  if (!ordersResponse.ok) throw new Error('Nepodařilo se načíst objednávky.');
  const orders = await ordersResponse.json();
  const order = Array.isArray(orders)
    ? orders.find((item: any) => String(item.orderNumber).toLowerCase() === orderNumber.toLowerCase())
    : null;
  if (!order?.id) throw new Error(`Objednávka ${orderNumber} nebyla nalezena.`);

  const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Aktualizace stavu selhala.');
  }
}

function handleStatusChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !isOrderStatusSelect(target)) return;

  // This select is the per-order status control. Stop the legacy React handler
  // from sending a second request and potentially overwriting the new status.
  event.stopImmediatePropagation();

  const nextStatus = target.value;
  const previousStatus = target.dataset.previousStatus || nextStatus;
  target.disabled = true;

  void saveOrderStatus(target, nextStatus)
    .then(() => {
      target.dataset.previousStatus = nextStatus;
      window.dispatchEvent(new CustomEvent('luvia-order-status-updated', { detail: { status: nextStatus } }));
    })
    .catch((error) => {
      target.value = previousStatus;
      target.dataset.previousStatus = previousStatus;
      window.alert(error instanceof Error ? error.message : 'Aktualizace stavu selhala.');
    })
    .finally(() => {
      target.disabled = false;
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
