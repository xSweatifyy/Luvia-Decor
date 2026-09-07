import React, { useState } from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';

export type PenguinBoxPoint = { name: string; address?: string; id?: string };

type Props = { onSelect: (point: PenguinBoxPoint) => void };

export const PenguinBoxPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [address, setAddress] = useState('');

  const confirm = () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    onSelect({ name: trimmed, address: trimmed });
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5DCD2] bg-white shadow-sm">
      <div className="p-4 border-b border-[#E5DCD2] bg-[#FCFAF7]">
        <p className="font-semibold text-[#302923]">Adresa Penguin Boxu</p>
        <p className="text-xs text-[#7B7067] mt-1">
          Zadejte adresu Penguin Boxu, kam chcete objednávku doručit.
        </p>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-xl bg-[#FBF6EF] border border-[#E7DACA] px-3 py-2.5 text-xs text-[#6F6258]">
          <b>PenguinBox – doručení pouze do Boxu · 59 Kč</b><br />
          Zadejte prosím přesnou adresu vybraného Penguin Boxu.
        </div>

        <label className="block text-xs font-semibold text-[#302923]">
          Adresa Penguin Boxu *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7B58]" />
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirm();
            }}
            placeholder="Např. Ulice 123, Kroměříž"
            className="w-full rounded-xl border border-[#E5DCD2] bg-[#FCFAF7] pl-9 pr-3 py-3 text-sm outline-none focus:border-[#9A7B58]"
          />
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={!address.trim()}
          className="w-full rounded-xl bg-[#806746] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" /> Potvrdit adresu Penguin Boxu
        </button>
      </div>
    </div>
  );
};
