import React from 'react';
import { ShieldCheck, Clock3, HeartHandshake, AlertTriangle, Gem } from 'lucide-react';

export const ConsultationTermsSection: React.FC = () => (
  <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
      <div className="bg-[#2D2723] text-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[#C5A880] text-xs font-bold uppercase tracking-[0.18em]"><HeartHandshake className="w-4 h-4" /> Konzultace a svatební zakázky</div>
        <h2 className="font-editorial text-2xl sm:text-3xl font-bold mt-2">Ceník a podmínky konzultací</h2>
        <p className="text-sm text-[#D8CEC3] mt-2">Konzultace, návštěvy ateliéru a svatební zakázky najdete společně v podstránce Zakázková tvorba.</p>
      </div>
      <div className="p-6 sm:p-8 space-y-8 text-sm leading-7 text-[#5C5046]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4"><b>Online 30 minut</b><br />400 Kč</div>
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4"><b>Online 60 minut</b><br />700 Kč</div>
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4"><b>Osobně 90 minut</b><br />1 000 Kč</div>
          <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4"><b>Svatební konzultace + návrh dekorace</b><br />od 1 000 Kč</div>
        </div>
        <div><h3 className="font-editorial text-xl font-bold text-[#2D2723] mb-2 flex items-center gap-2"><Clock3 className="w-5 h-5 text-[#8C7355]" /> Průběh a rezervace</h3><p>Termín konzultace se sjednává předem. Cena se hradí podle pokynů Luvia Decor. U svatebních a individuálních návrhů může být konečná cena vyšší podle rozsahu práce a náročnosti návrhu; konkrétní cena bude zákazníkovi sdělena před potvrzením objednávky.</p></div>
        <div><h3 className="font-editorial text-xl font-bold text-[#2D2723] mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#8C7355]" /> Pravidla návštěvy ateliéru</h3><p>Zákazník je povinen respektovat pokyny personálu, bezpečnostní pravidla a soukromí provozovatele. Bez výslovného souhlasu nesmí otevírat skříně, zásuvky ani jiné úložné prostory, manipulovat s dokumenty nebo vstupovat do neveřejných či diskrétních zón. Nesmí bez svolení manipulovat s elektrickými zařízeními, vzduchotechnikou, pračkou, sprchou, vodovodními prvky ani elektrickými topnými žebříky a jinými technickými zařízeními. Nesmí provádět žádné zásahy do vybavení budovy ani do majetku provozovatele.</p></div>
        <div><h3 className="font-editorial text-xl font-bold text-[#2D2723] mb-2 flex items-center gap-2"><Clock3 className="w-5 h-5 text-[#8C7355]" /> Ukončení konzultace a opuštění prostor</h3><p>Po řádném ukončení konzultace je zákazník povinen bez zbytečného odkladu opustit prostory určené pro konzultace a další obchodní prostory Luvia Decor, pokud nebyl s provozovatelem předem dohodnut jiný důvod nebo termín návštěvy. Zákazník nemá po skončení konzultace právo zůstávat v budově bez souhlasu provozovatele ani se pohybovat v neveřejných částech objektu.</p><p className="mt-3">Pokud zákazník i přes výzvu personálu odmítne prostory opustit nebo se v nich neoprávněně zdržuje, může provozovatel přiměřeně požadovat okamžité ukončení jeho přítomnosti. Pokud zákazník výzvu opakovaně nerespektuje, může být k řešení situace přivolána Policie ČR.</p></div>
        <div><h3 className="font-editorial text-xl font-bold text-[#2D2723] mb-2 flex items-center gap-2"><Gem className="w-5 h-5 text-[#8C7355]" /> Svatební zakázky</h3><p>U svatební zakázky nad 15 000 Kč může Luvia Decor předem požadovat zálohu na dekorace, květiny, materiál a rezervaci kapacit. Zbývající doplatek je splatný nejpozději do 14 pracovních dnů po uskutečnění akce, není-li v individuální smlouvě sjednáno jinak. Při prodlení může být pohledávka vymáhána zákonnými prostředky včetně nákladů spojených s vymáháním, pokud na ně vznikne nárok.</p><p className="mt-3">Po instalaci a předání dekorací Luvia Decor neodpovídá za poškození nebo zničení dekorací, květin a materiálů způsobené hosty, dalšími dodavateli, obsluhou prostoru nebo jinými třetími osobami. Pokud dojde k újmě v důsledku vady či nesprávné instalace způsobené Luvia Decor, bude situace řešena podle právních předpisů a konkrétní smlouvy.</p></div>
        <div><h3 className="font-editorial text-xl font-bold text-[#2D2723] mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[#8C7355]" /> Porušení pravidel a bezpečnost</h3><p>Pokud zákazník přes upozornění personálu v jednání pokračuje, může být návštěva ukončena a zákazník může být vyzván k okamžitému opuštění obchodních prostor. Při napadení, vyhrožování, úmyslném ničení majetku, krádeži, přepadení nebo jiném závažném incidentu může provozovatel bezodkladně přivolat Policii ČR a podniknout další právní kroky. Tím nejsou dotčena práva provozovatele na náhradu skutečně vzniklé škody.</p></div>
      </div>
    </div>
  </section>
);
