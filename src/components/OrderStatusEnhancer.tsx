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
    if (!Array.from(select.options).some(option => option.value === value)) select.add(new Option(label, value));
  });
}

function isOrderStatusSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map(option => option.value);
  return !values.includes('all') && values.includes('nova') && (values.includes('dokonceno') || values.includes('zruseno'));
}

function ensureStatusOptions() {
  document.querySelectorAll<HTMLSelectElement>('#admin-dashboard-view select').forEach(select => {
    const values = Array.from(select.options).map(option => option.value);
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
  let current: HTMLElement | null = select.parentElement;
  while (current && current !== document.body) {
    const text = current.textContent || '';
    if (/LUV-\d{4}-\d+/i.test(text) && current.querySelector('select')) return current;
    current = current.parentElement;
  }
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
  const orderNumberMatch = cardText.match(/LUV-\d{4}-\d+/i);
  const orderNumber = orderNumberMatch?.[0] || '';
  const orders = await loadOrders();
  const order = orders.find((item: any) => {
    const number = String(item?.orderNumber || '').trim();
    const id = String(item?.id || '').trim();
    return (orderNumber && number.toLowerCase() === orderNumber.toLowerCase()) || (number && cardText.toLowerCase().includes(number.toLowerCase())) || (id && cardText.includes(id));
  });
  if (!order?.id) throw new Error('Objednávku se nepodařilo jednoznačně najít. Obnovte stránku a zkuste to znovu.');

  const payload = JSON.stringify({ status });
  let response = await fetch(`/api/orders/${encodeURIComponent(String(order.id))}/status`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: payload
  });

  if (!response.ok) {
    response = await fetch('/api/order-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ orderId: order.id, status })
    });
  }

  const data = await response.json().catch(() => null);
  const successful = response.ok && (data?.success === true || data?.status === status || data?.order?.status === status);
  if (!successful) throw new Error(data?.error || `Aktualizace selhala (${response.status}).`);
  return { order, data };
}

function updateVisibleStatus(card: HTMLElement | null, nextStatus: string) {
  if (!card) return;
  const nextLabel = STATUS_OPTIONS.find(([value]) => value === nextStatus)?.[1] || nextStatus;
  const selectors = ['[data-order-status]', '[data-status]', '.order-status', '.status-badge', '.status'];
  Array.from(card.querySelectorAll<HTMLElement>(selectors.join(','))).forEach(element => {
    if (element instanceof HTMLSelectElement) return;
    element.textContent = nextLabel;
    element.dataset.orderStatus = nextStatus;
  });
  card.querySelectorAll<HTMLElement>('*').forEach(element => {
    if (element instanceof HTMLSelectElement || element.children.length > 0) return;
    if (element.textContent?.trim() && STATUS_OPTIONS.some(([, label]) => label === element.textContent?.trim())) element.textContent = nextLabel;
  });
  card.dataset.orderStatus = nextStatus;
}

function handleStatusChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !isOrderStatusSelect(target)) return;
  event.stopImmediatePropagation();
  const nextStatus = target.value;
  const previousStatus = target.dataset.previousStatus || nextStatus;
  if (nextStatus === previousStatus) return;
  const card = getOrderCard(target);
  target.disabled = true;
  void saveOrderStatus(target, nextStatus)
    .then(({ order }) => {
      target.dataset.previousStatus = nextStatus;
      updateVisibleStatus(card, nextStatus);
      window.dispatchEvent(new CustomEvent('luvia-order-status-updated', { detail: { orderId: order.id, status: nextStatus } }));
    })
    .catch(error => {
      target.value = previousStatus;
      target.dataset.previousStatus = previousStatus;
      window.alert(error instanceof Error ? error.message : 'Aktualizace stavu selhala.');
    })
    .finally(() => { target.disabled = false; });
}

export function OrderStatusEnhancer() {
  useEffect(() => {
    ensureStatusOptions();
    document.addEventListener('change', handleStatusChange, true);
    const observer = new MutationObserver(ensureStatusOptions);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { document.removeEventListener('change', handleStatusChange, true); observer.disconnect(); };
  }, []);
  return null;
}
