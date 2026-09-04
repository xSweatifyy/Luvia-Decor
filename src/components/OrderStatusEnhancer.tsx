import { useEffect } from 'react';

const STATUS_OPTIONS = [
  ['nova', 'Nová'],
  ['zpracovava_se', 'Zpracovává se'],
  ['zaplaceno', 'Zaplaceno'],
  ['u_prepravce', 'U přepravce'],
  ['odeslano', 'Odesláno'],
  ['dokonceno', 'Dokončeno'],
  ['zruseno', 'Zrušeno'],
] as const;

function addMissingStatusOptions(select: HTMLSelectElement) {
  STATUS_OPTIONS.forEach(([value, label]) => {
    if (!Array.from(select.options).some((option) => option.value === value)) {
      select.add(new Option(label, value));
    }
  });
}

function isOrderStatusSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map((option) => option.value);
  return !values.includes('all') && values.includes('nova') && values.includes('dokonceno');
}

function ensureStatusOptions() {
  document.querySelectorAll<HTMLSelectElement>('#admin-dashboard-view select').forEach((select) => {
    const values = Array.from(select.options).map((option) => option.value);
    if (values.includes('all') && values.includes('nova')) {
      addMissingStatusOptions(select);
      return;
    }
    if (!isOrderStatusSelect(select)) return;
    addMissingStatusOptions(select);
    if (!select.dataset.previousStatus) select.dataset.previousStatus = select.value;
  });
}

function getOrderCard(select: HTMLSelectElement): HTMLElement | null {
  return select.closest<HTMLElement>('div.border');
}

async function loadOrders() {
  const response = await fetch('/api/orders', { cache: 'no-store' });
  if (!response.ok) throw new Error('Nepodařilo se načíst objednávky.');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Server vrátil neplatná data objednávek.');
  return data;
}

async function saveOrderStatus(select: HTMLSelectElement, status: string) {
  const card = getOrderCard(select);
  const cardText = card?.textContent?.trim() || '';
  if (!cardText) throw new Error('Nepodařilo se najít objednávku.');

  const orders = await loadOrders();

  // Do not rely only on a hard-coded LUV-YYYY-#### format. This also works
  // for older orders that may use a different order-number format.
  const order = orders.find((item: any) => {
    const number = String(item?.orderNumber || '').trim();
    return number && cardText.toLowerCase().includes(number.toLowerCase());
  });

  if (!order?.id) throw new Error('Objednávku se nepodařilo jednoznačně najít. Obnovte stránku a zkuste to znovu.');

  const payload = JSON.stringify({ status });
  let primaryError = '';

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(String(order.id))}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: payload,
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data && data.status === status) return data;
    primaryError = data?.error || `Server vrátil chybu ${response.status}.`;
  } catch (error) {
    primaryError = error instanceof Error ? error.message : 'Primární aktualizace selhala.';
  }

  // Compatibility fallback for both legacy and newly created orders.
  try {
    const fallback = await fetch('/api/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ orderId: String(order.id), status }),
    });
    const data = await fallback.json().catch(() => null);
    if (fallback.ok && data?.success) return data.order;
    throw new Error(data?.error || `Aktualizace selhala (${fallback.status}).`);
  } catch (fallbackError) {
    throw new Error(fallbackError instanceof Error ? fallbackError.message : primaryError || 'Aktualizace stavu selhala.');
  }
}

function handleStatusChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !isOrderStatusSelect(target)) return;

  event.stopImmediatePropagation();

  const nextStatus = target.value;
  const previousStatus = target.dataset.previousStatus || nextStatus;
  if (nextStatus === previousStatus) return;

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
