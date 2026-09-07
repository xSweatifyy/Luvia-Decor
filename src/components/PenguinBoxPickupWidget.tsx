import React, { useState } from 'react';
import { ExternalLink, MapPin, CheckCircle2 } from 'lucide-react';

export type PenguinBoxPoint = { name: string; address?: string; id?: string };

type Props = { onSelect: (point: PenguinBoxPoint) => void };

// Temporary picker until PenguinBox provides the official e-shop API/widget.
// Google Maps is filtered to the Penguin Box search so other POIs are not intentionally requested.
const GOOGLE_MAPS_SEARCH_URL =
  'https://www.google.com/maps/search/?api=1&query=Penguin+Box+Czech+Republic';
const GOOGLE_MAPS_EMBED_URL =
  'https://www.google.com/maps?q=Penguin%20Box%20Czech%20Republic&output=embed';

export const PenguinBoxPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const confirm = () => {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName && !trimmedAddress) return;
    onSelect({
      name: trimmedName || trimmedAddress,
      address: trimmedAddress || undefined,
    });
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5DCD2] bg-white shadow-sm">
      <div className="p-4 border-b border-[#E5DCD2] bg-[#FCFAF7]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#302923]">Vyberte Penguin Box</p>
            <p className="text-xs text-[#7B7067] mt-1">
              Mapa je vyhledaná pouze pro Penguin Boxy. Klikněte na vybraný Penguin Box a opište jeho název a adresu do polí níže.
            </p>
          </div>
          <a
            href={GOOGLE_MAPS_SEARCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#302923] px-3 py-2 text-xs font-semibold text-white"
          >
            Otevřít větší mapu <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="relative bg-[#f5f2ee]">
        <iframe
          title="Google Maps – Penguin Boxy"
          src={GOOGLE_MAPS_EMBED_URL}
          className="w-full h-[560px] border-0 bg-[#f5f2ee]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      <div className="p-4 border-t border-[#E5DCD2] space-y-3">
        <div className="rounded-xl bg-[#FBF6EF] border border-[#E7DACA] px-3 py-2.5 text-xs text-[#6F6258]">
          <b>PenguinBox – doručení pouze do Boxu · 59 Kč</b><br />
          Mapa výše používá vyhledávání „Penguin Box“ v Google Maps. Prozatím vybírejte pouze místo označené jako Penguin Box.
        </div>

        <label className="block text-xs font-semibold text-[#302923]">Vybraný Penguin Box *</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7B58]" />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Název Penguin Boxu z mapy"
            className="w-full rounded-xl border border-[#E5DCD2] bg-[#FCFAF7] pl-9 pr-3 py-3 text-sm outline-none focus:border-[#9A7B58]"
          />
        </div>

        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Adresa vybraného Penguin Boxu z mapy"
          className="w-full rounded-xl border border-[#E5DCD2] bg-white px-3 py-3 text-sm outline-none focus:border-[#9A7B58]"
        />

        <button
          type="button"
          onClick={confirm}
          disabled={!name.trim() && !address.trim()}
          className="w-full rounded-xl bg-[#806746] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" /> Potvrdit Penguin Box
        </button>

        <p className="text-[11px] leading-5 text-[#81766D]">
          Toto je dočasné řešení. Penguin Box oficiálně uvádí, že pro e-shopy nabízí přímou API integraci; jakmile bude k dispozici API/widget, lze výběr napojit bez ručního přepisování názvu a adresy.
        </p>
      </div>
    </div>
  );
};
