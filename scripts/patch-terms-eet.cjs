const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'pages', 'TermsPage.tsx');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
const marker = "['EVIDENCE TRŽEB', `";
if (source.includes(marker)) process.exit(0);

const section = "['EVIDENCE TRŽEB', `Povinnost elektronické evidence tržeb (EET) byla v České republice zrušena s účinností od 1. ledna 2023. Prodávající proto v současné době neeviduje tržby prostřednictvím systému EET.\n\nTím nejsou dotčeny povinnosti prodávajícího vyplývající z daňových a účetních předpisů ani povinnost vystavit zákazníkovi účetní nebo daňový doklad, pokud ji stanoví platné právní předpisy.\n\nPokud se právní úprava evidence tržeb v budoucnu změní, bude prodávající své povinnosti plnit v rozsahu stanoveném aktuálně účinnými právními předpisy.`],\n";

const needle = 'const sections = [\n';
if (!source.includes(needle)) process.exit(0);
source = source.replace(needle, needle + section);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-terms-eet] EET section added');
