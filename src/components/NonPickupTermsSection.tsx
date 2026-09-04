import React from 'react';

const text = `1. Povinnost převzít objednané zboží
Zákazník je povinen převzít řádně objednané zboží způsobem a na místě, které zvolil při uzavření kupní smlouvy, pokud se s prodávajícím nedohodne jinak nebo pokud řádně nevyužije svého zákonného práva na odstoupení od kupní smlouvy.

2. Nepřevzetí zásilky není automaticky odstoupením od smlouvy
Samotné odmítnutí nebo nepřevzetí zásilky se nepovažuje za řádné odstoupení od kupní smlouvy. Pokud chce zákazník od smlouvy odstoupit, musí prodávajícímu své odstoupení jednoznačně oznámit způsobem umožňujícím jeho prokázání.

3. Oznámení před odesláním zásilky
Pokud zákazník zjistí, že již objednané zboží nechce nebo nemůže převzít, je povinen tuto skutečnost bez zbytečného odkladu oznámit prodávajícímu. Pokud je zásilka již odeslána, měl by zákazník prodávajícího informovat co nejdříve, aby bylo možné zabránit zbytečnému vzniku dalších nákladů.

4. Bezdůvodné nepřevzetí zásilky
Pokud zákazník bez předchozího oznámení a bez oprávněného důvodu nepřevezme řádně odeslanou zásilku a současně neoznámí prodávajícímu, že od kupní smlouvy odstupuje, může prodávajícímu vzniknout škoda a náklady spojené s odesláním a vrácením zásilky.

5. Náklady na dopravu a vrácení zásilky
V případě bezdůvodného nepřevzetí zásilky je prodávající oprávněn požadovat po zákazníkovi náhradu skutečně vzniklých, prokazatelných a účelně vynaložených nákladů, které vznikly v přímé souvislosti s nepřevzetím zásilky.

Jedná se zejména o:
- náklady na dopravu zásilky k zákazníkovi,
- náklady dopravce na vrácení zásilky zpět prodávajícímu,
- případné poplatky účtované dopravcem v souvislosti s nevyzvednutím nebo vrácením zásilky,
- případné další účelně vynaložené náklady, které prodávajícímu v přímé souvislosti s nepřevzetím zásilky prokazatelně vznikly.

6. Cena zboží
Samotná kupní cena zboží nebude zákazníkovi automaticky účtována jako sankce pouze z důvodu, že zásilku nepřevzal.

Pokud je zboží po vrácení prodávajícímu nepoškozené, kompletní a lze jej bez dalšího znovu nabídnout a prodat, nevzniká prodávajícímu pouze z důvodu nepřevzetí nárok na úhradu celé kupní ceny tohoto zboží.

7. Poškození nebo znehodnocení zboží
Pokud v důsledku nepřevzetí zásilky nebo jednání zákazníka vznikne na zboží prokazatelná škoda, například jeho poškození, znehodnocení, ztráta části hodnoty nebo jiná skutečnost, v jejímž důsledku již není možné zboží dále prodat za běžných podmínek, může prodávající požadovat náhradu skutečně vzniklé škody v rozsahu stanoveném právními předpisy.

Výše požadované náhrady musí odpovídat skutečně vzniklé škodě a prodávající je povinen být schopen její vznik a výši odůvodnit.

8. Zboží vyrobené nebo upravené na zakázku
U zboží vyrobeného, upraveného nebo opatřeného podle konkrétních požadavků zákazníka může být situace odlišná, zejména pokud takové zboží není možné běžně nabídnout jinému zákazníkovi.

V případě bezdůvodného nepřevzetí takového zboží může prodávajícímu za podmínek stanovených právními předpisy vzniknout nárok na náhradu skutečně vzniklé škody a účelně vynaložených nákladů.

9. Opakované nepřevzetí zásilek
Pokud zákazník opakovaně objednává zboží a bez vážného důvodu opakovaně nepřebírá řádně odeslané zásilky, může prodávající při dalších objednávkách přijmout přiměřená opatření k omezení vzniku dalších nákladů a škod, zejména požadovat úhradu předem nebo se zákazníkem individuálně dohodnout na způsobu úhrady a doručení.

10. Zákonné odstoupení spotřebitele
Toto ustanovení se nevztahuje na případy, kdy zákazník řádně využije své zákonné právo na odstoupení od kupní smlouvy.

Spotřebitel může od kupní smlouvy za podmínek stanovených právními předpisy odstoupit i před převzetím zboží. Výkon tohoto zákonného práva nesmí být sankcionován.

11. Odmítnutí převzetí zásilky po odstoupení
Pokud zákazník prodávajícímu řádně oznámí odstoupení od kupní smlouvy ještě před doručením zásilky, nebude nepřevzetí takové zásilky považováno za porušení povinnosti převzít zboží.

V takovém případě se postupuje podle pravidel pro odstoupení od kupní smlouvy a vrácení zboží.

12. Kontaktování zákazníka
V případě, že se zásilka vrátí prodávajícímu z důvodu jejího nepřevzetí, může prodávající zákazníka kontaktovat a vyzvat jej k vysvětlení situace nebo k úhradě prokazatelně vzniklých nákladů či škody.

13. Žádná paušální pokuta
Náklady a případná náhrada škody podle tohoto článku nepředstavují automatickou smluvní pokutu ani paušální sankci za nepřevzetí zásilky.

Prodávající nebude požadovat částku, která by převyšovala skutečně vzniklé a účelně vynaložené náklady nebo skutečně vzniklou škodu, pokud právní předpisy nestanoví jinak.

14. Povinnost minimalizovat vznik nákladů
Prodávající se zavazuje při vzniku situace související s nepřevzetím zásilky postupovat přiměřeně a usilovat o minimalizaci případné škody a dalších nákladů.

15. Případná úhrada nákladů
Pokud prodávajícímu v důsledku bezdůvodného nepřevzetí zásilky vzniknou náklady nebo škoda, bude zákazník o jejich výši a důvodu vzniku informován. Případná požadovaná částka musí být přiměřená a odpovídat skutečně vzniklým nákladům nebo škodě.`;

export const NonPickupTermsSection: React.FC = () => {
  return <section className="pt-4 border-t border-[#E8DFC8]"><h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D2723] mb-4">NEPŘEVZETÍ ZÁSILKY</h2><div className="bg-[#FAF8F5] rounded-2xl border border-[#E8DFC8] p-5 sm:p-7 text-sm leading-7 text-[#5C5046] whitespace-pre-line">{text}</div></section>;
};
