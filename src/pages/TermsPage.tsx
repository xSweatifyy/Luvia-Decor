import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

const sections = [
['1. PRODÁVAJÍCÍ', `Prodávající: Ladislav Pekárek / Luvia Decor
IČO: 29905061
Sídlo: U Rejdiště 3732/15, 767 01 Kroměříž, Česká republika
E-mail: podpora@luvia-decor.cz
Telefon: +420 702 345 999
Web: www.luvia-decor.cz

Prodávající není plátcem DPH, není-li u konkrétního dokladu nebo údaje uvedeno jinak.`],
['2. ÚVODNÍ USTANOVENÍ', `2.1. Tyto obchodní podmínky upravují prodej zboží, dárkových karet, vybraných služeb, konzultací a zakázkové tvorby Luvia Decor.

2.2. Práva spotřebitele vyplývající z kogentních ustanovení právních předpisů nejsou těmito podmínkami omezena.

2.3. Individuální písemné ujednání mezi prodávajícím a zákazníkem má přednost před těmito podmínkami v rozsahu, v jakém se od nich odchyluje.`],
['3. OBJEDNÁVKA A UZAVŘENÍ SMLOUVY', `3.1. Odesláním objednávky zákazník potvrzuje správnost uvedených údajů a činí návrh na uzavření smlouvy.

3.2. Smlouva je uzavřena potvrzením objednávky prodávajícím, není-li u konkrétní služby nebo nabídky uvedeno jinak.

3.3. Prodávající může objednávku odmítnout zejména při vyprodání, nemožnosti dodání, zjevné technické chybě, zjevně nesprávné ceně nebo jiném objektivním důvodu. Je-li již objednávka uhrazena a prodávající ji nemůže přijmout, vrátí přijaté peněžní prostředky bez zbytečného odkladu.`],
['4. CENA A PLATBA', `4.1. Cena je uvedena u konkrétní nabídky a před odesláním objednávky je zákazník seznámen s celkovou cenou včetně dostupné dopravy.

4.2. Neuhrazenou objednávku může prodávající po předchozí výzvě zrušit v souladu s právními předpisy.

4.3. U služeb, svatebních zakázek a individuálních návrhů může být cena stanovena individuální nabídkou.`],
['5. DODÁNÍ A ODPOVĚDNOST ZA PŘEPRAVU', `5.1. Prodávající předává zásilku zvolenému dopravci. Po dobu fyzické přepravy zásilku zpracovává dopravce a prodávající nemůže ovlivnit jeho interní manipulaci.

5.2. Toto ustanovení však neomezuje zákonnou odpovědnost prodávajícího vůči spotřebiteli. Pokud je podle zákona za poškození nebo vadu odpovědný prodávající, zákazník může svá práva uplatnit u prodávajícího.

5.3. Při poškození obalu se doporučuje stav zdokumentovat a oznámit dopravci i prodávajícímu. Nepřevzetí zásilky samo o sobě není odstoupením od smlouvy.`],
['6. ODSTÁVKA, INVENTURA A DOČASNÁ NEDOSTUPNOST E-SHOPU', `6.1. Luvia Decor může z provozních důvodů dočasně omezit nebo přerušit provoz e-shopu, například z důvodu inventury, údržby, technické poruchy nebo jiné odstávky.

6.2. Odstávka nekrátí ani neruší zákonná práva zákazníka. Zejména se tím automaticky neposouvá ani nezkracuje zákonná lhůta pro odstoupení od smlouvy.

6.3. U spotřebitelské kupní smlouvy uzavřené na dálku činí zákonná lhůta pro odstoupení obecně 14 dnů od převzetí zboží, nikoliv 5 nebo 6 dnů od objednávky. Odstoupení lze za zákonných podmínek učinit i před převzetím zboží.

6.4. Pokud prodávající v důsledku vlastní odstávky nebo jiné překážky nedodrží sjednanou povinnost, vyřeší situaci se zákazníkem podle právních předpisů a konkrétní smlouvy. Prodávající nebude tvrdit, že odstávkou automaticky zanikají práva zákazníka.`],
['7. ODSTOUPENÍ OD SMLOUVY', `7.1. Spotřebitel má u smluv uzavřených prostřednictvím internetu právo odstoupit ve lhůtě stanovené zákonem, obecně 14 dnů u zboží od převzetí zboží. U služeb a některých digitálních produktů se počátek lhůty řídí zákonnými pravidly.

7.2. Spotřebitel může odstoupit i před převzetím zboží. Odstoupení nesmí být spojeno se sankcí.

7.3. Zákonné výjimky z práva na odstoupení se uplatní zejména u zboží upraveného podle přání zákazníka, zboží přizpůsobeného jeho osobě nebo zboží podléhajícího rychlé zkáze, pokud jsou splněny zákonné podmínky.`],
['8. REKLAMACE A REKLAMAČNÍ KOMISE', `8.1. Reklamaci lze uplatnit na podpora@luvia-decor.cz, telefonicky na +420 702 345 999 nebo na adrese prodávajícího.

8.2. Prodávající reklamaci přijme, zaeviduje a zákazníkovi vydá potvrzení o jejím uplatnění.

8.3. Prodávající může pro posouzení reklamace využít interní reklamační komisi nebo jiného odborného pracovníka. Interní reklamační komise posoudí předložené podklady, případně stav zboží, a navrhne či určí výsledek reklamace.

8.4. Reklamace může být schválena v plném rozsahu, částečně nebo zamítnuta, pokud se prokáže, že nejsou splněny zákonné podmínky pro požadovaný nárok.

8.5. Interní reklamační komise nemůže odejmout spotřebiteli práva, která mu poskytuje zákon. Reklamace včetně odstranění vady bude vyřízena v zákonné lhůtě; u spotřebitelských reklamací obecně nejpozději do 30 dnů, pokud se strany nedohodnou na delší lhůtě.`],
['9. SLEVOVÉ KÓDY', `9.1. Slevový kód lze použít pouze za podmínek uvedených při jeho vydání.

9.2. Pokud systém kód odmítne, zákazník může ověřit jeho platnost, minimální hodnotu objednávky, dobu platnosti a případná omezení a kontaktovat podporu.

9.3. Pokud zákazník splňuje podmínky platného kódu a technická chyba na straně e-shopu zabrání jeho použití, prodávající situaci individuálně ověří a v odůvodněném případě poskytne odpovídající nápravu.

9.4. Neplatný, prošlý, již použitý, padělaný nebo zjevně zneužitý kód nemusí být akceptován.`],
['10. DÁRKOVÉ KARTY – VZNIK A POUŽITÍ', `10.1. Dárková karta představuje poukaz na čerpání hodnoty za podmínek uvedených při jejím vydání.

10.2. Karta obsahuje identifikační údaje, případně bezpečnostní kód, a její platnost je ověřována systémem prodávajícího.

10.3. Kartu lze uplatnit pouze způsobem uvedeným u konkrétní nabídky. Pokud není výslovně uvedeno jinak, nelze její hodnotu směnit za hotovost.

10.4. Hodnota použitá na nákup se odečítá z dostupného zůstatku. Pokud cena objednávky převyšuje zůstatek karty, zákazník doplatí rozdíl. Pokud je cena nižší, zůstatek se řídí pravidly konkrétní karty.

10.5. Zákazník je povinen chránit kód karty před zneužitím. Prodávající nemusí nahradit hodnotu karty, pokud zákazník umožnil neoprávněné osobě získat platný kód, ledaže odpovědnost vznikla na straně prodávajícího.`],
['11. DÁRKOVÁ KARTA NEJDE UPLATNIT', `11.1. Pokud systém kartu odmítne, zákazník nemá zadávat kód opakovaně ve velkém počtu pokusů. Doporučuje se kontaktovat podporu a uvést číslo objednávky nebo identifikaci karty, případně přiložit screenshot chyby.

11.2. Prodávající ověří platnost, zůstatek, stav karty a případné technické důvody odmítnutí.

11.3. Pokud je karta platná a problém vznikl technickou chybou na straně prodávajícího, prodávající zajistí opravu, náhradní způsob uplatnění nebo jinou přiměřenou nápravu.

11.4. Pokud je karta neplatná, zrušená, prošlá, již vyčerpaná nebo zneužitá, může být její uplatnění odmítnuto v rozsahu odpovídajícím podmínkám karty a zákonu.`],
['12. STORNO A VRÁCENÍ DÁRKOVÉ KARTY', `12.1. Storno nebo vrácení dárkové karty se posuzuje podle charakteru konkrétní smlouvy, stavu karty a práv spotřebitele.

12.2. U nepoužité karty zakoupené spotřebitelem na dálku prodávající posoudí právo na odstoupení podle příslušných zákonných pravidel. U digitálního obsahu nebo služby mohou platit zvláštní pravidla, zejména pokud zákazník výslovně požádal o zahájení plnění před uplynutím lhůty a byl poučen o důsledcích.

12.3. Jakmile byla karta v rozsahu odpovídajícím zákonu využita, nelze požadovat vrácení již řádně čerpané hodnoty.

12.4. Při podezření na podvodné získání nebo použití karty může být karta dočasně zablokována do doby ověření. Prodávající následně zákazníka informuje o výsledku.`],
['13. NEVYZVEDNUTÉ OBJEDNÁVKY A OPAKOVANÉ ZNEUŽÍVÁNÍ SYSTÉMU', `13.1. Zákazník je povinen objednávat s vážným úmyslem objednávku převzít a uhradit.

13.2. Opakované objednávky, které zákazník bez důvodu nepřebírá, mohou být vyhodnoceny jako zneužívání objednávkového systému.

13.3. Prodávající může po předchozím upozornění u takového zákazníka omezit některé platební nebo dodací možnosti, vyžadovat platbu předem nebo další přiměřené ověření. Není tím dotčeno právo spotřebitele na zákonné odstoupení.

13.4. Pokud zákazník způsobí prodávajícímu skutečnou škodu nebo náklady, může prodávající požadovat jejich náhradu v rozsahu dovoleném právními předpisy. Nelze účtovat libovolnou paušální pokutu jen za uplatnění zákonného práva.`],
['14. ZNEUŽITÍ WEBU, E-SHOPU, E-MAILU A TELEFONNÍHO ČÍSLA – STUPNĚ', `14.1. Nízký stupeň: opakované bezúčelné testovací objednávky, opakované zadávání nepravdivých údajů, spamování formulářů, opakované nevyzvednutí objednávky nebo jiné jednání, které způsobuje přiměřenou provozní zátěž. Prodávající může upozornit zákazníka, omezit funkce účtu, vyžadovat platbu předem a požadovat náhradu prokazatelných nákladů.

14.2. Střední stupeň: úmyslné obcházení slevových pravidel, vytváření více účtů za účelem neoprávněných výhod, opakované automatizované požadavky, úmyslné zahlcování e-mailu či telefonu, pokusy manipulovat objednávkami nebo systémy. Prodávající může účet či objednávky zablokovat, zrušit další zneužívající požadavky a uplatnit náhradu skutečné škody.

14.3. Vysoký stupeň: útoky na web nebo infrastrukturu, neoprávněné získávání přístupů, malware, úmyslné poškození dat, krádeže, výhrůžky, fyzické či psychické napadání personálu, úmyslné ničení majetku nebo závažné podvodné jednání. Prodávající může věc předat Policii ČR, požadovat náhradu škody a využít další právní prostředky.

14.4. Částky 1 000 až 45 000 Kč mohou být v odůvodněných případech relevantní jako náhrada skutečně vzniklé škody, nákladů nebo jako smluvní sankce pouze tehdy, pokud její uplatnění konkrétně připouští zákon a platné smluvní ujednání. Tato tabulka sama o sobě nezakládá automatickou pokutu 1 000–45 000 Kč za běžné jednání zákazníka.`],
['15. KONTROLA OBJEDNÁVKY A VEŘEJNÉ REGISTRY', `15.1. Prodávající může v zákonném rozsahu prověřit objednávku a dostupné veřejné informace, pokud je to nezbytné pro prevenci podvodu, ochranu právních nároků nebo bezpečné uzavření smlouvy.

15.2. Samotná existence dluhu nebo exekuce automaticky neznamená, že zákazník nesmí nakoupit. Prodávající nesmí svévolně zrušit již uzavřenou a zaplacenou spotřebitelskou smlouvu pouze na základě existence dluhu, pokud k tomu nemá objektivní a právně přípustný důvod.

15.3. Pokud právně přípustné ověření odhalí konkrétní důvod, pro který není možné nebo rozumné objednávku splnit, může prodávající objednávku odmítnout nebo zrušit v souladu se zákonem a případné uhrazené peníze vrátit.

15.4. Zpracování osobních údajů při těchto kontrolách se řídí samostatnými Zásadami ochrany osobních údajů.`],
['16. KONZULTACE – CENÍK', `16.1. Online konzultace 30 minut: 400 Kč.

16.2. Online konzultace 60 minut: 700 Kč.

16.3. Osobní konzultace 90 minut: 1 000 Kč.

16.4. Svatební konzultace a návrh dekorace na míru: od 1 000 Kč podle rozsahu.

16.5. Termín se rezervuje předem. U individuálních návrhů je konečná cena potvrzena před zahájením placené práce.`],
['17. KONZULTACE – PRAVIDLA NÁVŠTĚVY', `17.1. Zákazník musí dodržovat pokyny personálu a bezpečnostní pravidla.

17.2. Bez svolení nesmí otevírat skříně, zásuvky, úložné prostory ani prostory obsahující dokumenty nebo jiné neveřejné materiály prodávajícího.

17.3. Bez svolení nesmí zapínat ani vypínat elektrická zařízení, vzduchotechniku, elektrické topné žebříky, pračku ani jiné technické vybavení. Nesmí manipulovat s vodou ve sprchovém koutě, koupelně nebo jiných prostorách, pokud to nesouvisí s poskytnutou službou.

17.4. Zákazník nesmí zasahovat do vybavení budovy, elektroinstalace, technických zařízení, dekorací, dokumentů ani majetku prodávajícího.

17.5. Při opakovaném neuposlechnutí může personál konzultaci ukončit a zákazníka vyzvat k opuštění budovy. Při napadení personálu, výhrůžkách, krádeži, úmyslném ničení majetku nebo jiném závažném incidentu může být přivolána Policie ČR.`],
['18. SVATEBNÍ ZAKÁZKY A ZÁLOHA', `18.1. U svatební zakázky s celkovou cenou nad 15 000 Kč může prodávající požadovat zálohu. Výše a splatnost zálohy budou uvedeny v individuální nabídce nebo smlouvě.

18.2. Záloha slouží zejména k pokrytí nákladů na rezervaci termínu, dekorace, květiny, materiál, výrobu a přípravu zakázky.

18.3. Zbytek ceny je zákazník povinen uhradit nejpozději do 14 pracovních dnů po uskutečnění svatební akce, pokud individuální smlouva nestanoví jinak.

18.4. Pokud zákazník nezaplatí splatný zbytek ceny ani po výzvě, může prodávající uplatnit zákonné prostředky k vymáhání pohledávky, včetně předání věci externímu vymáhání nebo právnímu zástupci.`],
['19. SVATEBNÍ INSTALACE, MAJETEK A ODPOVĚDNOST', `19.1. Po dokončení instalace dekorací nebo materiálů na místě konání přebírá zákazník nebo pověřená osoba odpovědnost za běžnou ochranu dekorací proti zásahům hostů a třetích osob, pokud individuální smlouva nestanoví jinak.

19.2. Prodávající neodpovídá za poškození nebo zničení dekorací způsobené hosty, personálem místa konání, jinou třetí osobou, nevhodnou manipulací nebo událostí mimo jeho kontrolu. Toto ustanovení se nevztahuje na odpovědnost, které se prodávající nemůže podle zákona zprostit.

19.3. Pokud by v souvislosti s firemním materiálem došlo ke zranění, prodávající situaci neprodleně prověří, zajistí potřebnou součinnost a přijme další právní či bezpečnostní kroky podle okolností.`],
['20. OCHRANA PERSONÁLU A MAJETKU', `20.1. Luvia Decor netoleruje slovní, fyzické ani psychické napadání personálu, výhrůžky, přepadení, krádeže, úmyslné ničení zboží nebo majetku a jiné protiprávní jednání.

20.2. V závažných případech může být okamžitě přivolána Policie ČR a mohou být uplatněny nároky na náhradu škody nebo další právní prostředky.

20.3. Personál je oprávněn při bezprostředním ohrožení bezpečnosti ukončit jednání se zákazníkem a požadovat opuštění prostor, aniž by tím byla dotčena zákonná práva zákazníka.`],
['21. PODEZŘELÉ NEBO PADĚLANÉ BANKOVKY', `21.1. Pokud existuje důvodné podezření, že předložená bankovka nebo mince je padělaná nebo pozměněná, prodávající ji nepoužije k dalšímu placení a bude postupovat podle právních předpisů.

21.2. U právnické osoby nebo jiné osoby, která má zákonnou povinnost podezřelé platidlo zadržet, může být platidlo zadrženo bez náhrady a předáno k odbornému posouzení; událost může být oznámena Policii ČR.

21.3. Toto pravidlo platí bez ohledu na nominální hodnotu. Nejde pouze o bankovky nad 500 Kč. Pokud zákazník předloží podezřelou bankovku, bude postupováno podle zákona a pokynů ČNB.`],
['22. OCHRANA OSOBNÍCH ÚDAJŮ', `22.1. Osobní údaje jsou zpracovávány v souladu s platnými právními předpisy a GDPR.

22.2. Údaje mohou být použity zejména pro vyřízení objednávky, komunikaci, doručení, účetnictví, reklamace, ochranu právních nároků a další zákonné účely.

22.3. Podrobnosti jsou uvedeny v samostatných Zásadách ochrany osobních údajů.`],
['23. MIMOSOUDNÍ ŘEŠENÍ SPORŮ', `23.1. Spotřebitel může při nevyřešeném sporu využít mimosoudní řešení spotřebitelského sporu (ADR) u České obchodní inspekce, jsou-li splněny zákonné podmínky.

23.2. Tím není dotčeno právo zákazníka obrátit se na soud nebo jiný příslušný orgán.`],
['24. ZÁVĚREČNÁ USTANOVENÍ', `24.1. Tyto podmínky se řídí právním řádem České republiky.

24.2. Pokud je některé ustanovení neplatné nebo neúčinné, nemá to vliv na ostatní ustanovení.

24.3. Pro konkrétní objednávku je rozhodující znění podmínek účinné v době uzavření smlouvy.

24.4. Tyto obchodní podmínky jsou účinné od 11. 9. 2026.`]
] as const;

export const TermsPage: React.FC = () => {
  const { setPage } = useApp();
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
    <button onClick={() => setPage('cart')} className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C7355] hover:underline mb-6"><ArrowLeft className="w-4 h-4" />Zpět do košíku</button>
    <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-sm overflow-hidden">
      <header className="bg-[#2D2723] text-white p-7 sm:p-10"><div className="flex items-center gap-3 text-[#C5A880] text-xs font-bold uppercase tracking-[0.2em]"><FileText className="w-5 h-5" />Právní dokument</div><h1 className="font-editorial text-3xl sm:text-5xl font-bold mt-3">Obchodní podmínky</h1><p className="text-[#D8CEC3] text-sm mt-3">Luvia-Decor · Platné a účinné od: 11. 9. 2026</p></header>
      <article className="p-6 sm:p-10 space-y-9">{sections.map(([title, text]) => <section key={title}><h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D2723] mb-3">{title}</h2><div className="text-sm leading-7 text-[#5C5046] whitespace-pre-line">{text}</div></section>)}
        <section className="pt-4 border-t border-[#E8DFC8]"><h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D2723] mb-4">VZOROVÝ FORMULÁŘ PRO ODSTOUPENÍ OD KUPNÍ SMLOUVY</h2><div className="bg-[#FAF8F5] rounded-2xl border border-[#E8DFC8] p-5 sm:p-7 text-sm leading-7 text-[#5C5046] whitespace-pre-line">{`Adresát:
Ladislav Pekárek / Luvia Decor
U Rejdiště 3732/15
767 01 Kroměříž
Česká republika
E-mail: podpora@luvia-decor.cz

OZNÁMENÍ O ODSTOUPENÍ OD SMLOUVY

Tímto oznamuji, že odstupuji od smlouvy uzavřené prostřednictvím internetového obchodu Luvia-Decor.

Číslo objednávky: ....................................................
Datum objednání: ....................................................
Datum převzetí: ....................................................
Jméno a příjmení: ....................................................
Adresa: ....................................................
E-mail: ....................................................
Telefon: ....................................................
Zboží/služba: ....................................................
Číslo účtu pro vrácení peněz: ....................................................
Datum: ....................................................
Podpis: ....................................................`}</div></section>
        <section className="pt-4 border-t border-[#E8DFC8]"><h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D2723] mb-3">KONTAKT</h2><div className="text-sm leading-7 text-[#5C5046] whitespace-pre-line">{`Ladislav Pekárek / Luvia Decor
IČO: 29905061
U Rejdiště 3732/15
767 01 Kroměříž
E-mail: podpora@luvia-decor.cz
Telefon: +420 702 345 999
Web: www.luvia-decor.cz`}</div></section>
      </article>
    </div>
  </div>;
};
