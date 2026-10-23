import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { AdminUser } from '../types';

type AuditEvent = { id: number; createdAt: string; actorEmail: string; actorName: string; action: string; details: string; ipAddress: string; userAgent: string };

export const AuditLogManager: React.FC<{ adminUser: AdminUser }> = ({ adminUser }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/audit?adminUser=' + encodeURIComponent(JSON.stringify(adminUser)), { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Protokol se nepodařilo načíst.');
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e?.message || 'Chyba při načítání protokolu.'); }
    finally { setLoading(false); }
  }, [adminUser]);

  useEffect(() => { void load(); }, [load]);

  const filtered = events.filter(e => [e.actorEmail, e.actorName, e.action, e.details, e.ipAddress].join(' ').toLowerCase().includes(query.toLowerCase()));
  const exportCsv = () => {
    const quote = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = [['Datum','Účet','Jméno','Akce','Podrobnosti','IP adresa','Prohlížeč'], ...filtered.map(e => [new Date(e.createdAt).toLocaleString('cs-CZ'),e.actorEmail,e.actorName,e.action,e.details,e.ipAddress,e.userAgent])].map(row => row.map(quote).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'luvia-audit-protokol.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return <section className="space-y-5">
    <div className="rounded-2xl bg-[#2D2723] text-white p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-white/10 p-3"><ShieldCheck className="w-6 h-6 text-[#ead8bf]" /></div><div><h2 className="text-xl font-bold">Protokol auditu</h2><p className="text-sm text-white/65 mt-1">Historie přihlášení a zaznamenaných změn v administraci.</p></div></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="rounded-xl px-4 py-2.5 bg-white/10 hover:bg-white/15 text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4" />Obnovit</button><button onClick={exportCsv} disabled={!filtered.length} className="rounded-xl px-4 py-2.5 bg-[#d8c0a0] text-[#2D2723] disabled:opacity-40 text-sm font-semibold">Export CSV</button></div>
    </div>
    <div className="bg-white rounded-2xl border border-[#e6ddd2] p-4 space-y-4">
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c7d70]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Hledat účet, akci, podrobnosti nebo IP…" className="w-full rounded-xl border border-[#e6ddd2] pl-10 pr-4 py-3 text-sm outline-none focus:border-[#9b7d5c]" /></div>
      {error && <p className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</p>}
      {loading ? <p className="py-10 text-center text-sm text-[#827467]">Načítání protokolu…</p> : filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] table-auto text-sm"><colgroup><col style={{width:"170px"}}/><col style={{width:"210px"}}/><col style={{width:"190px"}}/><col/><col style={{width:"140px"}}/></colgroup><thead><tr className="text-left text-[#827467] border-b border-[#eee5dc]"><th className="p-3">Datum a čas</th><th className="p-3">Účet</th><th className="p-3">Akce</th><th className="p-3">Podrobnosti</th><th className="p-3">IP adresa</th></tr></thead><tbody>{filtered.map(e => <tr key={e.id} className="border-b border-[#f1ebe4] align-top"><td className="p-3 whitespace-nowrap">{new Date(e.createdAt).toLocaleString('cs-CZ')}</td><td className="p-3"><div className="font-semibold">{e.actorName || '—'}</div><div className="text-xs text-[#827467]">{e.actorEmail || 'Neznámý účet'}</div></td><td className="p-3 align-top"><span className="inline-flex w-max max-w-none whitespace-nowrap rounded-full bg-[#f5efe8] px-2.5 py-1 text-xs font-semibold leading-5">{e.action}</span></td><td className="p-3 min-w-[300px] max-w-[560px] whitespace-normal break-words">{e.details || '—'}<div className="text-xs text-[#a09488] mt-1 max-w-[320px] break-words">{e.userAgent}</div></td><td className="p-3 whitespace-nowrap">{e.ipAddress || 'Nedostupná'}</td></tr>)}</tbody></table></div> : <div className="py-12 text-center"><Activity className="w-8 h-8 mx-auto text-[#c5b7a8] mb-2" /><p className="font-semibold">Zatím žádné záznamy</p><p className="text-sm text-[#827467] mt-1">Přihlášení a podporované změny se zobrazí zde.</p></div>}
    </div>
  </section>;
};
