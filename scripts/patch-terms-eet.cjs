const fs = require('fs');
const path = require('path');

const termsFile = path.join(process.cwd(), 'src', 'pages', 'TermsPage.tsx');
if (fs.existsSync(termsFile)) {
  let source = fs.readFileSync(termsFile, 'utf8');
  if (!source.includes('14.6. Odesláním objednávky kupující potvrzuje')) {
    const consent = "\\n\\n14.6. Odesláním objednávky kupující potvrzuje, že se seznámil s těmito obchodními podmínkami a souhlasí s nimi. Zároveň potvrzuje, že se seznámil s informacemi o zpracování osobních údajů uvedenými v dokumentu Ochrana osobních údajů (GDPR). Potvrzení se provádí zaškrtnutím příslušných polí před odesláním objednávky. Zpracování osobních údajů nezbytné pro uzavření a plnění smlouvy se opírá o příslušný právní titul podle platných právních předpisů.";
    const re = /(\\['14\\.[^']*', `)([\\s\\S]*?)(`\\],\\n\\['15\\.)/;
    if (re.test(source)) {
      source = source.replace(re, (m, start, body, end) => `${start}${body}${consent}${end}`);
      fs.writeFileSync(termsFile, source, 'utf8');
      console.log('[patch-terms-eet] checkout confirmation added to section 14');
    }
  }
}

const footerFile = path.join(process.cwd(), 'src', 'components', 'Footer.tsx');
if (fs.existsSync(footerFile)) {
  let footer = fs.readFileSync(footerFile, 'utf8');
  if (!footer.includes("handleNav('complaint')")) {
    const needle = "<li><button onClick={() => handleNav('terms')}";
    if (footer.includes(needle)) {
      footer = footer.replace(needle, "<li><button onClick={() => handleNav('complaint')} className=\"hover:text-[#FAF6F0] hover:translate-x-1 transition duration-150 cursor-pointer\">Reklamační protokol</button></li>" + needle);
      fs.writeFileSync(footerFile, footer, 'utf8');
      console.log('[patch-terms-eet] complaint link added to footer');
    }
  }
}

const legacyMarker = "['EVIDENCE TRŽEB', `";
if (fs.existsSync(termsFile)) {
  let source = fs.readFileSync(termsFile, 'utf8');
  if (!source.includes(legacyMarker)) {
    const section = "['EVIDENCE TRŽEB', `Povinnost elektronické evidence tržeb (EET) byla v České republice zrušena s účinností od 1. ledna 2023. Prodávající proto v současné době neeviduje tržby prostřednictvím systému EET.\\n\\nTím nejsou dotčeny povinnosti prodávajícího vyplývající z daňových a účetních předpisů ani povinnost vystavit zákazníkovi účetní nebo daňový doklad, pokud ji stanoví platné právní předpisy.\\n\\nPokud se právní úprava evidence tržeb v budoucnu změní, bude prodávající své povinnosti plnit v rozsahu stanoveném aktuálně účinnými právními předpisy.`],\\n";
    const needle = 'const sections = [\\n';
    if (source.includes(needle)) { source = source.replace(needle, needle + section); fs.writeFileSync(termsFile, source, 'utf8'); console.log('[patch-terms-eet] EET section added'); }
  }
}
