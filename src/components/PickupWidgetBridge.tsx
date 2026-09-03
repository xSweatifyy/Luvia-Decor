import { useEffect, useRef } from 'react';

const PACKETA_API_KEY = '3a3de6256b8299aa';
const DPD_ORIGIN = 'https://api.dpd.cz';

declare global {
  interface Window {
    Packeta?: {
      Widget?: {
        pick: (apiKey: string, callback: (point: any | null) => void, options?: any, inElement?: HTMLElement) => void;
        close?: () => void;
      };
    };
  }
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function findInput(labelText: string) {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find((item) => item.textContent?.toLowerCase().includes(labelText.toLowerCase()));
  return label?.parentElement?.querySelector('input') as HTMLInputElement | null;
}

function findPickupInput() {
  return Array.from(document.querySelectorAll('input')).find((input) => {
    const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
    return placeholder.includes('výdejní místo');
  }) as HTMLInputElement | null;
}

function applyPickupPoint(point: any, fallbackText = '') {
  if (!point && !fallbackText) return;

  const address = point?.address || {};
  const street = point?.street || address.street || '';
  const city = point?.city || address.city || '';
  const zip = point?.zip || address.zip || address.postcode || '';
  const name = point?.name || point?.place || point?.company || '';
  const id = point?.id || point?.branchCode || point?.externalId || point?.carrierPickupPointId || '';
  const fullAddress = [street, zip, city].filter(Boolean).join(', ');
  const display = fallbackText || [name, fullAddress].filter(Boolean).join(', ') || point?.formattedAddress || '';

  const streetInput = findInput('Ulice a číslo popisné');
  const cityInput = findInput('Město');
  const zipInput = findInput('PSČ');
  const pickupInput = findPickupInput();

  if (streetInput && street) setReactInputValue(streetInput, street);
  if (cityInput && city) setReactInputValue(cityInput, city);
  if (zipInput && zip) setReactInputValue(zipInput, zip);
  if (pickupInput && display) setReactInputValue(pickupInput, display);

  const event = new CustomEvent('luvia-pickup-selected', {
    detail: { id, name, street, city, zip, display, point }
  });
  window.dispatchEvent(event);
}

function getCarrierFromButton(button: HTMLElement) {
  const container = button.closest('div.rounded-2xl') || button.parentElement?.parentElement?.parentElement;
  const text = container?.textContent || button.textContent || '';
  if (text.includes('Zásilkovna')) return 'Zásilkovna';
  if (text.includes('DPD')) return 'DPD';
  if (text.includes('PPL')) return 'PPL';
  return null;
}

export default function PickupWidgetBridge() {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let packetaPromise: Promise<void> | null = null;

    const loadPacketa = () => {
      if (window.Packeta?.Widget?.pick) return Promise.resolve();
      if (packetaPromise) return packetaPromise;
      packetaPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-packeta-widget]') as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('Packeta widget se nepodařilo načíst.')), { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://widget.packeta.com/v6/www/js/library.js';
        script.async = true;
        script.dataset.packetaWidget = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Packeta widget se nepodařilo načíst.'));
        document.head.appendChild(script);
      });
      return packetaPromise;
    };

    const openDpd = () => {
      if (overlayRef.current) overlayRef.current.remove();

      const overlay = document.createElement('div');
      overlayRef.current = overlay;
      overlay.className = 'fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5';
      overlay.innerHTML = `
        <div style="width:min(1100px,100%);height:min(88vh,820px);background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.3);display:flex;flex-direction:column">
          <div style="height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #eee5da;flex:none">
            <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:#8C7355;font-weight:700">Výdejní místo</div><div style="font-size:20px;font-weight:700;color:#2D2723;margin-top:3px">Vyberte DPD výdejní místo</div></div>
            <button type="button" data-pickup-close style="border:0;background:#faf5ee;border-radius:999px;width:38px;height:38px;font-size:22px;color:#5c5046;cursor:pointer">×</button>
          </div>
          <iframe title="DPD výdejní místa" src="https://api.dpd.cz/widget/latest/index.html?enabledCountries=CZ&lang=cs" style="border:0;width:100%;height:calc(100% - 64px);flex:1" allow="geolocation"></iframe>
        </div>`;
      document.body.appendChild(overlay);

      const close = () => {
        overlay.remove();
        if (overlayRef.current === overlay) overlayRef.current = null;
      };
      overlay.querySelector('[data-pickup-close]')?.addEventListener('click', close);
      overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) close(); });

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== DPD_ORIGIN) return;
        const data = event.data?.dpdWidget;
        if (!data) return;
        if (data.message === 'widgetClose') { close(); return; }
        const result = data.pickupPointResult;
        if (!result) return;
        const point = data.pickupPoint || data.pickupPointData || data.point || {};
        let display = '';
        if (typeof result === 'string') display = result;
        else if (result) display = [result.id || result.parcelshop_id, result.name || result.parcelshop_name, result.address || result.parcelshop_address].filter(Boolean).join(', ');
        const normalized = {
          ...point,
          id: point.id || data.parcelshop_id || result?.id || result?.parcelshop_id,
          name: point.name || data.parcelshop_name || result?.name || result?.parcelshop_name,
          street: point.street || point.address?.street,
          city: point.city || point.address?.city,
          zip: point.zip || point.address?.zip || point.address?.postcode
        };
        applyPickupPoint(normalized, display || data.pickupPointResult);
        close();
        window.removeEventListener('message', onMessage);
      };
      window.addEventListener('message', onMessage);
    };

    const openPacketa = async () => {
      try {
        await loadPacketa();
        if (!window.Packeta?.Widget?.pick) throw new Error('Packeta widget není dostupný.');
        window.Packeta.Widget.pick(
          PACKETA_API_KEY,
          (point) => {
            if (point) applyPickupPoint(point);
          },
          { country: 'cz', language: 'cs' }
        );
      } catch (error) {
        console.error(error);
        window.dispatchEvent(new CustomEvent('luvia-pickup-error', { detail: String(error) }));
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button') as HTMLElement | null;
      if (!button) return;
      const text = button.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (!text.startsWith('Vybrat výdejní místo')) return;

      const carrier = getCarrierFromButton(button);
      if (carrier === 'DPD') {
        event.preventDefault();
        event.stopPropagation();
        openDpd();
      } else if (carrier === 'Zásilkovna') {
        event.preventDefault();
        event.stopPropagation();
        void openPacketa();
      }
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      overlayRef.current?.remove();
    };
  }, []);

  return null;
}
