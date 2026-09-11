import React from 'react';
import { AlertTriangle, Ban, Scale, ShieldAlert } from 'lucide-react';

export const TermsSanctionsSection: React.FC = () => (
  <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
    <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
      <div className="bg-[#2D2723] text-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[#C5A880] text-xs font-bold uppercase tracking-[0.18em]"><Scale className="w-4 h-4" /> Porušení obchodních podmínek</div>
        <h2 className="font-editorial text-2xl sm:text-3xl font-bold mt-2">Následky a sankce</h2>
        <p className="text-sm text-[#D8CEC3] mt-2">Luvia Decor postupuje přiměřeně podle závažnosti konkrétního jednání.</p>
      </div>
      <div className="p-6 sm:p-8 space-y-6 text-sm leading-7 text-[#5C5046]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-5"><div className="flex items-center gap-2 font-bold text-[#2D2723]"><AlertTriangle className="w-4 h-4 text-[#8C7355]" /> 1. Nízká závažnost</div><p className="mt-2">Např. opakované porušení návštěvních pravidel, nevhodná komunikace nebo opakované vytváření neúplných objednávek bez dokončení.</p><p className="mt-2 font-semibold">Možné opatření: upozornění, omezení některých funkcí, požadavek na platbu předem nebo náhrada prokazatelných nákladů.</p></div>
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-5"><div className="flex items-center gap-2 font-bold text-[#2D2723]"><ShieldAlert className="w-4 h-4 text-[#8C7355]" /> 2. Střední závažnost</div><p className="mt-2">Např. vědomé opakované zneužívání objednávkového systému, falešné údaje, úmyslné maření rezervací nebo pokusy o neoprávněné získání slev či poukazů.</p><p className="mt-2 font-semibold">Možné opatření: dočasné omezení účtu či objednávek, platba předem, zrušení neoprávněné výhody a požadavek na náhradu skutečné škody a nákladů.</p></div>
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-5"><div className="flex items-center gap-2 font-bold text-[#2D2723]"><Ban className="w-4 h-4 text-[#8C7355]" /> 3. Vysoká závažnost</div><p className="mt-2">Např. podvodné jednání, krádež, vyhrožování, napadení, úmyslné poškození majetku, manipulace s platebními údaji nebo pokus o prolomení zabezpečení e-shopu.</p><p className="mt-2 font-semibold">Možné opatření: okamžité ukončení návštěvy či omezení služeb, zajištění důkazů, požadavek na náhradu škody a oznámení Policii ČR nebo jinému příslušnému orgánu.</p></div>
        </div>
        <div className="rounded-2xl border border-[#E3DACF] bg-[#F7F3EE] p-5"><h3 className="font-editorial text-xl font-bold text-[#2D2723] mb-2">Smluvní pokuta a peněžité částky</h3><p>Obchodní podmínky samy o sobě nezakládají automatickou pokutu za každé porušení. Pokud má být v konkrétní smlouvě sjednána smluvní pokuta, musí být sjednána určitě a způsobem dovoleným právními předpisy. Luvia Decor může požadovat zejména náhradu skutečně vzniklé škody a účelně vynaložených nákladů, pokud na ně podle zákona nebo smlouvy vznikne nárok.</p><p className="mt-3">Výše případné smluvní pokuty nebo náhrady se vždy posuzuje podle konkrétního jednání a nesmí sloužit k omezení zákonných práv spotřebitele, například práva na odstoupení od smlouvy.</p></div>
        <p className="text-xs text-[#7B6E63]">Tento systém slouží jako interní pravidla pro přiměřenou reakci na porušení podmínek. Neomezuje zákonná práva zákazníků ani pravomoci příslušných orgánů.</p>
      </div>
    </div>
  </section>
);
