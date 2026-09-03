import React, { useEffect, useState } from 'react';

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
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data?.dpdWidget;
      if (!data || event.origin !== 'https://api.dpd.cz') return;

      const raw = data.pickupPointResult;
      const source = data.pickupPoint || data.parcelShop || raw;
      if (!source) return;

      let point: DpdPoint = {};
      if (typeof source === 'string') {
        try { point = JSON.parse(source); } catch { point = { id: source }; }
      } else if (typeof source === 'object') {
        point = source as DpdPoint;
      }

      setOpen(false);
      onSelect(point);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect]);

  if (!open) return null;

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
