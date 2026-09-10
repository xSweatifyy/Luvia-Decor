import React, { useState } from 'react';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ComplaintPage: React.FC = () => {
  const { setPage } = useApp();
  const [sent, setSent] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); setSent(true); };
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
    <button type="button" onClick={() => setPage('contact')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#75685d] mb-6 hover:text-[#2D2723]"><ArrowLeft className="w-4 h-4"/>Zpět</button>
    <div className="rounded-[2rem] border border-[#E8DFD5] bg-white shadow-sm overflow-hidden">
      <div className="bg-[#2D2723] text-white p-7 sm:p-10"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><FileText className="w-7 h-7 text-[#E7D4B9]"/></div><div><p className="text-[10px] tracking-[.25em] uppercase text-[#D9C4A8] font-bold">Luvia Decor</p><h1 className="font-editorial text-3xl sm:text-4xl font-bold">Reklamační protokol</h1><p className="text-sm text-white/65 mt-2">Formulář pro uplatnění práv z vadného plnění.</p></div></div></div>
      <form onSubmit={submit} className="p-6 sm:p-10 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-semibold">Jméno a příjmení<input required name="name" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm"/></label><label className="text-xs font-semibold">E-mail<input required type="email" name="email" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm"/></label></div>
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-semibold">Číslo objednávky<input name="order" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm"/></label><label className="text-xs font-semibold">Datum převzetí<input type="date" name="received" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm"/></label></div>
        <label className="block text-xs font-semibold">Reklamované zboží<input required name="product" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm"/></label>
        <label className="block text-xs font-semibold">Popis vady<textarea required name="description" rows={5} className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm resize-y"/></label>
        <label className="block text-xs font-semibold">Požadovaný způsob vyřízení<select name="resolution" defaultValue="oprava" className="mt-1 w-full rounded-xl border border-[#E3DACF] bg-[#FCFAF7] px-3 py-3 text-sm"><option value="oprava">Oprava, je-li možná</option><option value="vymena">Výměna</option><option value="sleva">Přiměřená sleva</option><option value="odstoupeni">Odstoupení od smlouvy, jsou-li splněny zákonné podmínky</option></select></label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D2723] text-white px-5 py-3.5 text-sm font-bold"><Send className="w-4 h-4"/>Odeslat reklamační protokol</button>
        {sent && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm font-semibold">Protokol byl odeslán k dalšímu zpracování.</div>}
        <p className="text-[11px] leading-5 text-[#81766D]">Reklamační protokol slouží jako podklad pro uplatnění reklamace. Zákonná práva spotřebitele tímto formulářem nejsou omezena.</p>
      </form>
    </div>
  </div>;
};
