import React, { useState } from 'react';
import { ExternalLink, MapPin, CheckCircle2 } from 'lucide-react';

export type PenguinBoxPoint = { name: string; address?: string; id?: string };

type Props = { onSelect: (point: PenguinBoxPoint) => void };
const PENGUIN_MAP_URL = 'https://www.penguinbox.cz/';

export const PenguinBoxPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSelect({ name: trimmed, address: address.trim() || undefined });
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5DCD2] bg-white shadow-sm">
      <div className="p-4 border-b border-[#E5DCD2] bg-[#FCFAF7]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-[#302923]">Vyberte Penguin Box</p>
            <p className="text-xs text-[#7B7067] mt-1">Otevře se oficiální mapa Penguin Boxů. Po výběru boxu doplňte jeho název níže.</p>
          </div>
          <a href={PENGUIN_MAP_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#302923] px-3 py-2 text-xs font-semibold text-white">
            Otevřít mapu <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
      <iframe title="Oficiální mapa Penguin Box" src={PENGUIN_MAP_URL} className="w-full h-[420px] border-0 bg-[#f5f2ee]" loading="lazy" />
      <div className="p-4 border-t border-[#E5DCD2] space-y-3">
        <label className="block text-xs font-semibold text-[#302923]">Vybraný Penguin Box *</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7B58]" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Např. Penguin Box Kroměříž..." className="w-full rounded-xl border border-[#E5DCD2] bg-[#FCFAF7] pl-9 pr-3 py-3 text-sm outline-none focus:border-[#9A7B58]" />
          </div>
          <button type="button" onClick={confirm} disabled={!name.trim()} className="rounded-xl bg-[#806746] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Potvrdit
          </button>
        </div>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Adresa boxu (nepovinné)" className="w-full rounded-xl border border-[#E5DCD2] bg-white px-3 py-3 text-sm outline-none focus:border-[#9A7B58]" />
        <p className="text-[11px] leading-5 text-[#81766D]">Penguin Box uvádí, že pro e-shopy nabízí integraci přes API; bez přístupových údajů k jejich API zde používáme jejich oficiální mapu a ukládáme vybraný box přímo k objednávce.</p>
      </div>
    </div>
  );
};
