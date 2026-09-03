import React, { useEffect, useRef } from 'react';

export type DpdPoint = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  zip?: string;
  [key: string]: unknown;
};

type Props = { onSelect: (point: DpdPoint) => void };

const DPD_WIDGET_URL = 'https://api.dpd.cz/widget/latest/index.html?countries=CZ&hideCloseButton=true';

export const DpdPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const handledRef = useRef(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data?.dpdWidget;
      if (!data || handledRef.current) return;
      if (event.origin !== 'https://api.dpd.cz') return;

      const result = data.pickupPointResult;
      if (!result) return;

      handledRef.current = true;
      let point: DpdPoint = {};
      if (typeof result === 'string') {
        try { point = JSON.parse(result); } catch { point = { id: result }; }
      } else if (typeof result === 'object') {
        point = result as DpdPoint;
      }
      onSelect(point);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect]);

  return (
    <div className="fixed inset-0 z-[200] bg-white">
      <iframe
        title="DPD výdejní místa"
        src={DPD_WIDGET_URL}
        className="w-full h-full border-0"
        allow="geolocation"
      />
    </div>
  );
};
