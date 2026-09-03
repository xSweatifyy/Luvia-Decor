import React, { useEffect, useRef, useState } from 'react';

export type PacketaPoint = {
  id?: string | number;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
  nameStreet?: string;
  carrierId?: string;
  carrierPickupPointId?: string;
};

type Props = { onSelect: (point: PacketaPoint) => void };

const PACKETA_API_KEY = '3a3de6256b8299aa';
const SCRIPT_SRC = 'https://widget.packeta.com/v6/www/js/library.js';

function loadPacketaWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    const getWidget = () => (window as any).Packeta?.Widget?.pick;
    if (getWidget()) return resolve();

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      const started = Date.now();
      const poll = () => {
        if (getWidget()) return resolve();
        if (Date.now() - started > 10000) return reject(new Error('Packeta Widget API se nenačetlo.'));
        window.setTimeout(poll, 100);
      };
      poll();
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const started = Date.now();
      const poll = () => {
        if (getWidget()) return resolve();
        if (Date.now() - started > 10000) return reject(new Error('Packeta Widget API se nenačetlo.'));
        window.setTimeout(poll, 100);
      };
      poll();
    };
    script.onerror = () => reject(new Error('Packeta Widget se nepodařilo načíst.'));
    document.head.appendChild(script);
  });
}

function removeOldManualPickupUi() {
  const input = Array.from(document.querySelectorAll('input')).find((el) =>
    (el as HTMLInputElement).placeholder?.startsWith('Např. DPD Pickup Kroměříž')
  ) as HTMLInputElement | undefined;

  if (!input) return;

  const container = input.closest('div.rounded-2xl');
  if (container) container.remove();
}

export const PacketaPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [error, setError] = useState('');
  const openedRef = useRef(false);

  const openPicker = async () => {
    try {
      await loadPacketaWidget();
      const widget = (window as any).Packeta?.Widget;
      if (!widget?.pick) throw new Error('Packeta Widget API není dostupné.');

      widget.pick(
        PACKETA_API_KEY,
        (point: PacketaPoint | null) => {
          if (point) onSelect(point);
        },
        {
          language: 'cs',
          vendors: [{ country: 'cz' }],
          webUrl: window.location.origin,
          appIdentity: 'luvia-decor'
        }
      );
    } catch (err) {
      console.error('Unable to open Packeta map:', err);
      setError('Mapu Zásilkovny se nepodařilo otevřít. Zkontrolujte prosím API klíč Packety.');
    }
  };

  useEffect(() => {
    removeOldManualPickupUi();

    if (openedRef.current) return;
    openedRef.current = true;
    void openPicker();

    const observer = new MutationObserver(() => removeOldManualPickupUi());
    observer.observe(document.body, { childList: true, subtree: true });
    const cleanupTimer = window.setTimeout(() => observer.disconnect(), 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(cleanupTimer);
    };
  }, []);

  return error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null;
};
