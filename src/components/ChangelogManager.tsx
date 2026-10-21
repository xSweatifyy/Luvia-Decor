import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, History, Loader2 } from 'lucide-react';
import { AdminUser } from '../types';
import { ChangelogEntry, deleteChangelogEntry, saveChangelogEntry, subscribeChangelog } from '../services/firestoreService';

type Props = { adminUser: AdminUser };
const emptyForm = { title: '', category: 'Funkce', description: '' };

export const ChangelogManager: React.FC<Props> = ({ adminUser }) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => subscribeChangelog(setEntries), []);

  if (adminUser.role !== 'admin') return null;

  const reset = () => { setForm(emptyForm); setEditingId(null); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) { setError('Vyplň název i popis změny.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const existing = entries.find(item => item.id === editingId);
      await saveChangelogEntry({
        id: editingId || '',
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        authorName: existing?.authorName || adminUser.name || adminUser.email,
        authorEmail: existing?.authorEmail || adminUser.email,
      });
      reset(); setNotice('Změna byla uložena a je viditelná ostatním administrátorům.');
    } catch (e: any) { setError(e?.message || 'Změnu se nepodařilo uložit.'); }
    finally { setSaving(false); }
  };
  const edit = (entry: ChangelogEntry) => {
    setEditingId(entry.id); setForm({ title: entry.title, category: entry.category || 'Funkce', description: entry.description }); setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = async (entry: ChangelogEntry) => {
    if (!window.confirm(`Opravdu smazat záznam „${entry.title}“?`)) return;
    try { await deleteChangelogEntry(entry.id); setNotice('Záznam byl smazán.'); }
    catch (e: any) { setError(e?.message || 'Záznam se nepodařilo smazat.'); }
  };

  return <section className="space-y-6">
    <header className="rounded-2xl bg-[#2D2723] text-white p-6 sm:p-8">
      <div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center"><History className="w-5 h-5 text-[#ead8bf]" /></div><div><p className="text-[10px] uppercase tracking-[.22em] text-[#d9c4a8] font-bold">Interní nástěnka</p><h2 className="font-editorial text-2xl font-bold">Changelog</h2></div></div>
      <p className="mt-3 text-sm text-white/70">Interní přehled změn e-shopu. Obsah vidí pouze přihlášení administrátoři v administraci.</p>
    </header>
    <form onSubmit={save} className="rounded-2xl border border-[#e6ddd2] bg-white p-5 sm:p-6 space-y-4">
      <h3 className="font-bold text-lg">{editingId ? 'Upravit záznam' : 'Přidat změnu'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Název změny<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} maxLength={140} required placeholder="Např. Úprava košíku" className="mt-1.5 w-full rounded-xl border border-[#ddd2c5] px-3 py-2.5 font-normal outline-none focus:border-[#8C7355]" /></label>
        <label className="block text-sm font-semibold">Kategorie<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#ddd2c5] px-3 py-2.5 font-normal"><option>Funkce</option><option>Oprava</option><option>Design</option><option>Obsah</option><option>Administrace</option><option>Ostatní</option></select></label>
      </div>
      <label className="block text-sm font-semibold">Popis změny<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={10000} rows={5} required placeholder="Co se změnilo, proč a případně na co si dát pozor…" className="mt-1.5 w-full rounded-xl border border-[#ddd2c5] px-3 py-2.5 font-normal outline-none focus:border-[#8C7355]" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
      <div className="flex flex-wrap gap-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2D2723] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Ukládám…' : editingId ? 'Uložit změny' : 'Přidat do changelogu'}</button>{editingId && <button type="button" onClick={reset} className="rounded-xl border border-[#ddd2c5] px-4 py-2.5 text-sm font-semibold">Zrušit úpravy</button>}</div>
    </form>
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Historie změn</h3><span className="rounded-full bg-[#eee5da] px-3 py-1 text-xs font-bold">{entries.length} záznamů</span></div>
      {entries.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d8c9b8] bg-white p-8 text-center text-sm text-[#897a6e]">Zatím tu nejsou žádné změny. Přidej první záznam výše.</div> : entries.map(entry => <article key={entry.id} className="rounded-2xl border border-[#e6ddd2] bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f2e9de] px-2.5 py-1 text-[11px] font-bold text-[#725b43]">{entry.category || 'Ostatní'}</span><time className="text-xs text-[#897a6e]">{new Date(entry.createdAt).toLocaleString('cs-CZ')}</time></div><h4 className="mt-2 text-base font-bold">{entry.title}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#66594f]">{entry.description}</p><p className="mt-3 text-xs text-[#897a6e]">Přidal/a: {entry.authorName || entry.authorEmail}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={()=>edit(entry)} className="rounded-lg border border-[#ddd2c5] px-3 py-2 text-xs font-bold">Upravit</button><button type="button" onClick={()=>void remove(entry)} aria-label={`Smazat ${entry.title}`} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div></article>)}
    </div>
  </section>;
};
