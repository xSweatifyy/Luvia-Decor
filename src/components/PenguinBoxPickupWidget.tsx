import React, { useEffect, useState } from 'react';
import { ExternalLink, MapPin, CheckCircle2, RefreshCw } from 'lucide-react';

export type PenguinBoxPoint = { name: string; address?: string; id?: string };

type Props = { onSelect: (point: PenguinBoxPoint) => void };

// Penguin Box's public customer flow contains the live box map and destination selector.
// The official site also documents that e-shops can integrate their system via API.
const PENGUIN_MAP_URL = 'https://www.penguinbox.cz/poslat-balik';

export const PenguinBoxPickupWidget: React.FC<Props> = ({ onSelect }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, []);

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSelect({ name: trimmed, address: address.trim() || undefined });
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5DCD2] bg-white shadow-sm">
      <div className="p-4 border-b border-[#E5DCD2] bg-[#FCFAF7]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#302923]">Vyberte Penguin Box</p>
            <p className="text-xs text-[#7B7067] mt-1">
              Po zvolení přepravce se mapa otevře přímo v košíku. Na mapě vyberte cílový Penguin Box a jeho název potvrďte dole.
            </p>
          </div>
          <a
            href={PENGUIN_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#302923] px-3 py-2 text-xs font-semibold text-white"
          >
            Otevřít mapu <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="relative bg-[#f5f2ee]">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FCFAF7]/90 pointer-events-none">
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-[#6F6258] shadow-sm border border-[#E5DCD2]">
              <RefreshCw className="w-4 h-4 animate-spin" /> Načítám mapu Penguin Box…
            </div>
          </div>
        )}
        <iframe
          title="Oficiální mapa Penguin Box"
          src={PENGUIN_MAP_URL}
          onLoad={() => setLoaded(true)}
          className="w-full h-[650px] border-0 bg-[#f5f2ee]"
          loading="eager"
          allow="geolocation"
        />
      </div>

      <div className="p-4 border-t border-[#E5DCD2] space-y-3">
        <div className="rounded-xl bg-[#FBF6EF] border border-[#E7DACA] px-3 py-2.5 text-xs text-[#6F6258]">
          <b>PenguinBox – doručení pouze do Boxu · 59 Kč</b><br />
          Vyberte cílový box na oficiální mapě Penguin Box výše.
        </div>

        <label className="block text-xs font-semibold text-[#302923]">Vybraný Penguin Box *</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7B58]" />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Název vybraného Penguin Boxu"
              className="w-full rounded-xl border border-[#E5DCD2] bg-[#FCFAF7] pl-9 pr-3 py-3 text-sm outline-none focus:border-[#9A7B58]"
            />
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={!name.trim()}
            className="rounded-xl bg-[#806746] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Potvrdit box
          </button>
        </div>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Adresa boxu (nepovinné)"
          className="w-full rounded-xl border border-[#E5DCD2] bg-white px-3 py-3 text-sm outline-none focus:border-[#9A7B58]"
        />
        <p className="text-[11px] leading-5 text-[#81766D]">
          Penguin Box na svém webu uvádí živou mapu boxů a možnost integrace pro e-shopy přes API. Tato verze používá jejich oficiální mapu přímo v košíku; vybraný box se uloží k objednávce.
        </p>
      </div>
    </div>
  );
};
