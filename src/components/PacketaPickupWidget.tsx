import React, { useEffect, useState } from 'react';

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

export const PacketaPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPacketaWidget().catch((err) => console.error('Packeta preload:', err));
  }, []);

  const openPicker = async () => {
    setLoading(true);
    setError('');

    try {
      await loadPacketaWidget();
      const widget = (window as any).Packeta?.Widget;
      if (!widget?.pick) throw new Error('Packeta Widget API není dostupné.');

      // IMPORTANT: do not provide an inElement here. Packeta then opens its
      // official full-screen/modal pickup-point map, exactly as intended for
      // checkout integrations.
      widget.pick(
        PACKETA_API_KEY,
        (point: PacketaPoint | null) => {
          if (point) onSelect(point);
          setLoading(false);
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
      setError('Mapu Zásilkovny se nepodařilo otevřít. Zkuste to prosím znovu.');
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={openPicker}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCCDB8] bg-[#FAF5EE] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#2D2723] transition hover:bg-[#F2ECE4] disabled:opacity-60 disabled:cursor-wait"
      >
        {loading ? 'Otevírám mapu výdejních míst…' : 'Vybrat výdejní místo na mapě'}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
};
