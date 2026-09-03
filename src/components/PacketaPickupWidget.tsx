import React, { useEffect, useState } from 'react';

type PacketaPoint = {
  id?: string | number;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
  formatedValue?: string;
  carrierId?: string;
  carrierPickupPointId?: string;
};

type Props = {
  onSelect: (point: PacketaPoint) => void;
};

// Packeta Widget v6 API key. This key is intentionally used by the browser widget.
const PACKETA_API_KEY = '3a3de6256b8299aa';
const SCRIPT_SRC = 'https://widget.packeta.com/v6/www/js/library.js';

const loadPacketaWidget = (): Promise<void> => {
  if (typeof window !== 'undefined' && (window as any).Packeta?.Widget?.pick) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;

    if (existing) {
      if ((window as any).Packeta?.Widget?.pick) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Packeta Widget se nepodařilo načíst.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Packeta Widget se nepodařilo načíst.'));
    document.head.appendChild(script);
  });
};

export const PacketaPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    loadPacketaWidget()
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((error) => {
        console.error('Packeta Widget error:', error);
        if (mounted) setReady(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const openPicker = async () => {
    try {
      setLoading(true);
      await loadPacketaWidget();

      const Packeta = (window as any).Packeta;
      if (!Packeta?.Widget?.pick) {
        throw new Error('Packeta Widget API není dostupné.');
      }

      const packetaOptions = {
        language: 'cs',
        view: 'modal',
        country: 'cz',
        vendors: [
          { country: 'cz' },
          { country: 'cz', group: 'zbox' },
        ],
        valueFormat: '"Packeta",id,carrierId,carrierPickupPointId,name,city,street',
      };

      // Packeta v6 opens its own responsive modal. Do not create an extra
      // React modal or pass an inElement here; this is the supported v6 flow.
      Packeta.Widget.pick(PACKETA_API_KEY, (point: PacketaPoint | null) => {
        if (point) {
          onSelect(point);
        }
      }, packetaOptions);
    } catch (error) {
      console.error('Unable to open Packeta Widget:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={openPicker}
      disabled={!ready || loading}
      className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCCDB8] bg-[#FAF5EE] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#2D2723] transition hover:bg-[#F2ECE4] disabled:opacity-60 disabled:cursor-wait"
    >
      <span>{loading ? 'Načítám mapu…' : 'Vybrat výdejní místo na mapě'}</span>
    </button>
  );
};
