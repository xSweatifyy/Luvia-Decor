import React from 'react';
import { FileText, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ComplaintPrintManager: React.FC = () => {
  const { adminUser } = useApp();
  if (adminUser?.role !== 'admin') return null;

  const print = () => {
    const popup = window.open('', '_blank', 'width=900,height=900');
    if (!popup) return;
    popup.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Reklamační protokol · Luvia Decor</title><style>body{font-family:Arial,sans-serif;color:#302923;margin:0;padding:35px}h1{margin:0 0 8px;font-size:26px}.muted{color:#756b63;font-size:12px}.box{border:1px solid #d8cec3;border-radius:12px;padding:18px;margin-top:18px}.row{display:grid;grid-template-columns:1fr 1fr;gap:18px}.line{border-bottom:1px solid #999;min-height:32px;margin-top:8px}.large{height:120px}.footer{margin-top:28px;font-size:11px;color:#756b63;line-height:1.7}@media print{body{padding:18mm}}</style></head><body><h1>LUVIA DECOR · Reklamační protokol</h1><div class="muted">Formulář pro uplatnění práv z vadného plnění.</div><div class="box"><div class="row"><div><b>Jméno a příjmení</b><div class="line"></div></div><div><b>E-mail</b><div class="line"></div></div></div><div class="row" style="margin-top:22px"><div><b>Číslo objednávky</b><div class="line"></div></div><div><b>Datum převzetí</b><div class="line"></div></div></div><div style="margin-top:22px"><b>Reklamované zboží</b><div class="line"></div></div><div style="margin-top:22px"><b>Popis vady</b><div class="line large"></div></div><div style="margin-top:22px"><b>Požadovaný způsob vyřízení</b><div class="line"></div></div><div class="row" style="margin-top:35px"><div><b>Datum uplatnění</b><div class="line"></div></div><div><b>Podpis zákazníka</b><div class="line"></div></div></div></div><div class="footer"><b>Luvia Decor</b><br>Odpovědná osoba: Ladislav Pekárek · U Rejdiště 3732/15, 767 01 Kroměříž · IČO 29905061<br>Reklamační protokol slouží jako podklad pro uplatnění reklamace. Zákonná práva spotřebitele tímto formulářem nejsou omezena.</div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"><div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FAF3E8] flex items-center justify-center text-[#8C7355]"><FileText className="w-5 h-5"/></div><div><h2 className="font-editorial text-2xl font-bold">Reklamační protokol</h2><p className="text-xs text-[#7B6E63] mt-1">Tisk nebo uložení prázdného reklamačního protokolu do PDF je dostupné pouze zde v administraci.</p></div></div><button type="button" onClick={print} className="shrink-0 rounded-xl bg-[#2D2723] text-white px-5 py-3 text-xs font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4"/>Vytisknout / uložit PDF</button></div></section>;
};
