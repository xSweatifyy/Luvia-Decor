import React from 'react';
import { MessageSquareText } from 'lucide-react';

export const CartPromoCode: React.FC = () => {
  const [note, setNote] = React.useState(() => localStorage.getItem('luvia_delivery_note') || '');

  React.useEffect(() => {
    const saveNote = () => localStorage.setItem('luvia_delivery_note', note);
    saveNote();
    window.dispatchEvent(new Event('luvia-delivery-note-changed'));
  }, [note]);

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    <div className="rounded-[1.75rem] border border-[#E6DDD3] bg-white shadow-sm p-5 sm:p-7">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#FAF3E8] text-[#8C7355] flex items-center justify-center"><MessageSquareText className="w-5 h-5"/></div>
        <div><h2 className="font-editorial text-xl font-bold">Poznámka k doručení</h2><p className="text-xs text-[#7B7067]">Napište nám případnou poznámku nebo požadavek k doručení.</p></div>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="NAPŘ. PROSÍM DORUČIT V ODPOLEDNÍCH HODINÁCH…"
        rows={4}
        maxLength={500}
        className="w-full rounded-2xl border border-[#E5DCD2] bg-[#FCFAF7] px-4 py-3.5 text-sm outline-none resize-y focus:border-[#9A7B58]"
      />
      <div className="mt-2 text-right text-xs text-[#9A9188]">{note.length}/500</div>
    </div>
  </div>;
};
