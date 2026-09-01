import { Product, SiteConfig, GalleryItem, Review, AdminUser } from '../types';

export const initialSiteConfig: SiteConfig = {
  siteName: "Luvia Decor",
  slogan: "Ručně tvořené dekorace a květinový ateliér Kroměříž",
  logoText: "LUVIA DECOR",
  logoImageUrl: "",
  faviconUrl: "/Luvia-Decor.jpeg",

  // Explicitly requested legal information
  responsiblePerson: "Ladislav Pekárek",
  registeredOffice: "U Rejdiště 3732/15, 767 01, Kroměříž",
  ico: "29905061",

  // Explicitly requested emails, socials and contacts
  supportEmail: "podpora@luvia-decor.cz",
  ordersEmail: "objednavky@luvia-decor.cz",
  phone: "+420702345999",
  phoneDisplay: "+420 702 345 999",
  phone2: "+420734214299",
  phone2Display: "+420 734 214 299",
  whatsapp: "+420702345999",
  whatsappDisplay: "+420 702 345 999",
  instagramUrl: "https://www.instagram.com/luvia_decor_",
  facebookUrl: "https://www.facebook.com/profile.php?id=61571617343463",
  consultationUrl: "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2IkTewmpeZLhV2LfHxt3RvAO5cHmPL431JsV6-tXwCkiXYF5jPpNZU37Go1piQjLQwkUWrIU2a",

  mapAddress: "U Rejdiště 3732/15, 767 01 Kroměříž, Česká republika",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2605.877800727937!2d17.388832076891415!3d49.29743997139474!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471307b22a00c6d7%3A0xb35515234907ec9c!2sU%20Rejdi%C5%A1t%C4%9B%203732%2F15%2C%20767%2001%20Krom%C4%9B%C5%99%C3%AD%C5%BE!5e0!3m2!1scs!2scz!4v1709298400000!5m2!1scs!2scz",

  announcement: {
    enabled: true,
    text: "🌿 Autorské věnce a aranžmá skladem – doručení Kroměříž a okolí & osobní odběr",
    linkText: "Prohlédnout novinky",
    linkPage: "catalog"
  },

  hero: {
    badge: "Ateliér ruční tvorby & aranžmá Kroměříž",
    title: "Vdechněte svému domovu",
    titleEmphasis: "neopakovatelné kouzlo a útulno",
    subtitle: "Vytváříme originální ručně vázané věnce, živá i věčná květinová aranžmá a luxusní interiérové doplňky. Každý kus je s láskou tvořený originál z našeho ateliéru v Kroměříži.",
    primaryCtaText: "Prozkoumat kolekci",
    secondaryCtaText: "Zakázková tvorba na míru",
    bgImageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=2000&q=85"
  },

  about: {
    subtitle: "Příběh ateliéru Luvia Decor",
    title: "Poctivé řemeslo, cit pro detail a láska k přírodním materiálům",
    quote: "„Věřím, že domov není jen místo, kde žijeme, ale prostor, kde načerpáváme energii. Každá dekorace má mít svou duši a vyprávět příběh.“",
    p1: "V ateliéru Luvia Decor v Kroměříži se věnujeme ruční výrobě dekorací, které promění každý interiér v harmonické útočiště. Spojujeme přírodní materiály, sušené i živé květiny, prémiové textilie a moderní estetické trendy.",
    p2: "Naše věnce na dveře, stolní aranžmá i zakázkové instalace vznikají pod pečlivým dohledem a s důrazem na dlouhou trvanlivost. Dbáme na to, aby každý detail ladil s charakterem vašeho domova.",
    p3: "Rádi pro vás vytvoříme i kompletní výzdobu pro svatby, rodinné oslavy či firemní prostory s osobním přístupem a možností konzultace přímo u nás.",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    ownerName: "Ladislav Pekárek",
    ownerRole: "Zakladatel & hlavní florista Luvia Decor",
    stat1Number: "100%",
    stat1Label: "Ruční tvorba s láskou",
    stat2Number: "850+",
    stat2Label: "Spokojených domovů",
    stat3Number: "Kroměříž",
    stat3Label: "Lokální český ateliér"
  },

  customBanner: {
    title: "Hledáte dekoraci na míru vašeho interiéru?",
    subtitle: "Máte specifickou představu o barvě, rozměru nebo stylu věnce či svatební výzdoby? Napište nám a my vám rádi vytvoříme originál přesně podle vašeho přání.",
    buttonText: "Nezávazně poptat zakázku",
    imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1200&q=85"
  },

  resend: {
    apiKey: "re_X13QXNiA_7sMjc7Gb2Vs8MpJ5ejAmKb6F",
    senderEmail: "onboarding@resend.dev",
    notifyEmail: "objednavky@luvia-decor.cz"
  }
};

export const initialProducts: Product[] = [
  {
    id: "prod-1",
    title: "Věnec „Přírodní harmonie“ s eukalyptem a bavlníkem",
    category: "vence",
    price: 1390,
    compareAtPrice: 1590,
    description: "Ručně vázaný celoroční věnec na dveře nebo do interiéru. Základem je přírodní proutí obohacené o stabilizovaný eukalyptus, tobolky bavlníku, lagurus a jemné sušené květy v zemitých tónech. Věnec si zachovává svůj svěží vzhled po mnoho let.",
    shortDescription: "Elegantní celoroční věnec ze stabilizovaného eukalyptu a bavlníku na přírodním korpusu.",
    details: [
      "Průměr věnce: cca 42 cm",
      "Materiál: stabilizovaný eukalyptus, bavlna, sušené trávy, proutí",
      "Vhodné na vstupní dveře (pod stříšku) i do interiéru",
      "Dodáváno s jutovou stuhou k zavěšení"
    ],
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80"
    ],
    badge: "Bestseller",
    inStock: true,
    featured: true,
    dimensions: "Průměr 42 cm",
    materials: "Přírodní proutí, stabilizovaný eukalyptus, lagurus, bavlník",
    estimatedDelivery: "2–3 pracovní dny"
  },
  {
    id: "prod-2",
    title: "Věnec „Pampas & Ivory Velvet“",
    category: "vence",
    price: 1490,
    description: "Něžný a nadčasový věnec kombinující nadýchanou pampovou trávu, krémové lněné tobolky, stabilizovaný ruscus a hedvábnou sametovou mašli v odstínu champagne. Dokonalý doplněk moderního skandinávského i boho interiéru.",
    shortDescription: "Boho věnec s pampovou trávou a sametovou mašlí v jemných krémových odstínech.",
    details: [
      "Průměr věnce: cca 45 cm",
      "Extra bohaté aranžmá sušených květin",
      "Sametová stuha z prémiového textilu",
      "Dlouhotrvající dekorace bez nutnosti péče"
    ],
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
    ],
    badge: "Oblíbené",
    inStock: true,
    featured: true,
    dimensions: "Průměr 45 cm",
    materials: "Pampová tráva, ruscus, sušené luční květy, samet",
    estimatedDelivery: "2–4 pracovní dny"
  },
  {
    id: "prod-3",
    title: "Květinové aranžmá v kameninové váze „Toskánský západ“",
    category: "aranzma",
    price: 1850,
    compareAtPrice: 2100,
    description: "Exkluzivní aranžmá ze sušených a stabilizovaných květin v teplých terakotových, meruňkových a zlatavých tónech. Usazeno v ručně točené keramické váze s jemnou texturou.",
    shortDescription: "Bohémská kompozice sušených květin v ručně vyrobené keramické váze.",
    details: [
      "Celková výška: 55 cm",
      "Váza je součástí aranžmá",
      "Obsahuje sušené hortenzie, palmové listy a slaměnky",
      "Vydrží několik let v perfektním stavu"
    ],
    imageUrl: "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80"
    ],
    badge: "Bestseller",
    inStock: true,
    featured: true,
    dimensions: "Výška 55 cm, šířka 35 cm",
    materials: "Kamenina, sušené květy, stabilizované listy",
    estimatedDelivery: "2–3 pracovní dny"
  },
  {
    id: "prod-4",
    title: "Stolní květinový box „Rosa Romantica“",
    category: "aranzma",
    price: 1290,
    description: "Kompaktní luxusní aranžmá s věčnými růžemi, gypsophilou a voňavým eukalyptem v matném dárkovém boxu se zlatou ražbou Luvia Decor. Krásný dárek i ozdoba slavnostního stolu.",
    shortDescription: "Romantický květinový box s věčnými růžemi a eukalyptem.",
    details: [
      "Průměr boxu: 20 cm, výška 22 cm",
      "Stabilizované růže neztrácejí barvu ani tvar",
      "Dárkové balení v ceně"
    ],
    imageUrl: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=800&q=80",
    badge: "Novinka",
    inStock: true,
    featured: false,
    dimensions: "20 × 22 cm",
    materials: "Stabilizované růže, eukalyptus, luxusní karton",
    estimatedDelivery: "Ihneď k odeslání"
  },
  {
    id: "prod-5",
    title: "Ručně točená keramická váza „Kroměříž Clay“",
    category: "vazy-doplnky",
    price: 990,
    description: "Autorská keramická váza s organickým matným povrchem a jemnými zrníčky křemičitého písku. Skvěle vynikne jak samostatně jako sochařský prvek, tak osazená sušenými travinami.",
    shortDescription: "Minimalistická váza z české keramické hlíny s organickou texturou.",
    details: [
      "Výška: 28 cm, průměr hrdla: 6 cm",
      "Vodotěsná vnitřní glazura",
      "100% ruční práce z lokální hlíny"
    ],
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
    badge: "Limitovaná edice",
    inStock: true,
    featured: true,
    dimensions: "Výška 28 cm",
    materials: "Keramická hlína, matná glazura",
    estimatedDelivery: "2–3 pracovní dny"
  },
  {
    id: "prod-6",
    title: "Sójová svíčka „Tiché ráno v ateliéru“ (Santal & Fík)",
    category: "svicky-vune",
    price: 490,
    description: "Ručně odlévaná svíčka ze 100% přírodního sójového vosku s bavlněným knotem. Vonná kompozice santalového dřeva, čerstvých fíků, cedru a bílého čaje navodí v interiéru klidnou a hřejivou atmosféru. Doba hoření cca 45 hodin.",
    shortDescription: "Přírodní sójová svíčka s vůní santalového dřeva a sladkých fíků.",
    details: [
      "Objem: 220 ml, doba hoření 45+ hod.",
      "100% sójový vosk bez parafínu a ftalátů",
      "Skleněná dóza s víčkem"
    ],
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80",
    badge: "Oblíbené",
    inStock: true,
    featured: false,
    dimensions: "220 ml",
    materials: "Sójový vosk, prémiové vonné esence, sklo",
    estimatedDelivery: "Ihneď k odeslání"
  },
  {
    id: "prod-7",
    title: "Věnec na stůl s držáky na 4 svíce „Winter Calm“",
    category: "vence",
    price: 1690,
    compareAtPrice: 1890,
    description: "Univerzální aranžovaný věnec s kovovými bodci na svíčky. Vhodný jako adventní věnec i jako elegantní zimní a jarní střed stolu. Bohatě zdoben mechem, šiškami, lnem a skořicí.",
    shortDescription: "Stolní věnec s držáky na 4 svíčky pro útulné večery.",
    details: [
      "Průměr: 38 cm",
      "Kovové bodce na svíčky o průměru do 7 cm",
      "Stabilní a bezpečné usazení"
    ],
    imageUrl: "https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=800&q=80",
    badge: "Oblíbené",
    inStock: true,
    featured: false,
    dimensions: "Průměr 38 cm",
    materials: "Proutí, stabilizovaný mech, dřevěné doplňky, kov",
    estimatedDelivery: "2–4 pracovní dny"
  },
  {
    id: "prod-8",
    title: "Svatební & slavnostní set dekorací na míru",
    category: "zakazkove",
    price: 4900,
    isPriceFrom: true,
    pricePrefix: "Od",
    description: "Kompletní návrh a realizace květinové výzdoby na zakázku. Zahrnuje uvítací věnec, aranžmá na stoly, kytici pro nevěstu či korsáže pro ženicha. Barevnost i styl přizpůsobíme vašemu přání po osobní konzultaci.",
    shortDescription: "Zakázková tvorba pro svatby, rodinné oslavy i reprezentativní prostory.",
    details: [
      "Osobní konzultace v Kroměříži nebo online",
      "Ukázka vzorků materiálů předem",
      "Možnost dovozu a instalace na místě"
    ],
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    badge: "Na zakázku",
    inStock: true,
    featured: true,
    dimensions: "Individuální rozměry",
    materials: "Živé, sušené i stabilizované květiny",
    estimatedDelivery: "Dle domluvy (obvykle 1–3 týdny)"
  }
];

export const initialGallery: GalleryItem[] = [
  {
    id: "gal-1",
    title: "Podzimní věnec na masivní dubové dveře",
    category: "Věnce",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85",
    description: "Ruční vazba na zakázku s eukalyptem a lagurusem pro rodinný dům v Kroměříži."
  },
  {
    id: "gal-2",
    title: "Květinová instalace pro svatební hostinu",
    category: "Svatby",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    description: "Přírodní bohémský styl s běhouny ze sušených travin a jemných růží."
  },
  {
    id: "gal-3",
    title: "Stolní aranžmá v keramice",
    category: "Interiér",
    imageUrl: "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=1200&q=85",
    description: "Zemitá terakotová paleta ladící s moderním dřevěným nábytkem."
  },
  {
    id: "gal-4",
    title: "Věnec v tónech ivory a pampové trávy",
    category: "Věnce",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    description: "Minimalistický design se sametovou stuhou v odstínu champagne."
  },
  {
    id: "gal-5",
    title: "Svíčky a vonné doplňky z ateliéru",
    category: "Doplňky",
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=85",
    description: "Ručně lité sójové svíčky se zemitými esencemi santalu a fíků."
  },
  {
    id: "gal-6",
    title: "Jemné aranžmá z věčných růží",
    category: "Květiny",
    imageUrl: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=1200&q=85",
    description: "Dárkový box vytvořený na přání pro oslavu výročí."
  }
];

export const initialReviews: Review[] = [
  {
    id: "rev-1",
    author: "Veronika K.",
    city: "Kroměříž",
    rating: 5,
    text: "Věnec od Luvia Decor zdobí naše dveře už několik měsíců a pořád vypadá jako v den, kdy jsme ho vyzvedli. Nádherné precizní zpracování a skvělá domluva s panem Pekárkem!",
    date: "Před 2 týdny",
    occasion: "Věnec na vchodové dveře"
  },
  {
    id: "rev-2",
    author: "Martina & David B.",
    city: "Zlín",
    rating: 5,
    text: "Pan Pekárek nám vytvořil kompletní květinovou výzdobu pro naši svatbu. Všichni hosté byli nadšení a my jsme měli přesně to, o čem jsme snili. Děkujeme z celého srdce.",
    date: "Před měsícem",
    occasion: "Svatební výzdoba"
  },
  {
    id: "rev-3",
    author: "Ing. Tomáš M.",
    city: "Olomouc",
    rating: 5,
    text: "Objednával jsem aranžmá do naší firemní recepce. Výsledek předčil očekávání, prostor získal reprezentativní a přitom příjemně vřelou atmosféru.",
    date: "Před 3 týdny",
    occasion: "Firemní interiér"
  }
];

export const initialAdminUsers: AdminUser[] = [
  {
    id: "usr-admin-1",
    email: "ondrej.andel@email.cz",
    name: "Ondřej Anděl",
    role: "admin",
    createdAt: new Date().toISOString()
  }
];
