import React, { useEffect, useState } from 'react';
import { Gift, Plus, Trash2, Power, RefreshCw, Mail, WalletCards, Check, Clock, X, Shuffle, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';

type Topup = { id: string; code: string; amount: number; email: string; status: string; created_at: string; confirmed_at?: string };
const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const makeCode = () => `LUVIA-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const GiftVoucherManager: React.FC = () => {
  const { adminUser, addToast, config } = useApp();
  const [vouchers, setVouchers] = useState<Coupon[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const load = async () => {
    if (adminUser?.role !== 'admin') return;
    setLoading(true);
    try {
      const [r, t] = await Promise.all([
        fetch('/api/coupons', { cache: 'no-store' }),
        fetch('/api/coupons?action=topup-requests', { cache: 'no-store' })
      ]);
      if (!r.ok) throw new Error('Dárkové karty se nepodařilo načíst.');
      const d = await r.json();
      setVouchers(Array.isArray(d) ? d.filter((x: Coupon) => x.note === 'gift-voucher') : []);
      if (t.ok) {
        const td = await t.json();
        setTopups(Array.isArray(td) ? td : []);
      }
    } catch (e: any) {
      addToast('error', 'Dárkové karty', e?.message || 'Chyba načítání.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [adminUser]);

  const createPdf = async (cardCode: string, amount: number, security?: string) => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
    pdf.setFillColor(33, 28, 24);
    pdf.rect(0, 0, 210, 148, 'F');
    pdf.setDrawColor(197, 168, 128);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(7, 7, 196, 134, 5, 5, 'S');
    const logo = config.logoText || config.siteName || 'LUVIA DECOR';
    const motto = config.slogan || 'Ručně tvořené dekorace a květinový ateliér Kroměříž';
    pdf.setTextColor(250, 246, 240);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text(String(logo).toUpperCase(), 18, 25);
    pdf.setFontSize(8);
    pdf.setTextColor(217, 196, 168);
    pdf.text('KVĚTINOVÝ ATELIÉR & DEKORACE', 18, 32);
    pdf.setTextColor(250, 246, 240);
    pdf.setFontSize(24);
    pdf.text('DÁRKOVÁ KARTA', 105, 65, { align: 'center' });
    pdf.setFontSize(31);
    pdf.text(`${money(amount)} Kč`, 105, 88, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setTextColor(225, 216, 205);
    pdf.text(motto, 105, 101, { align: 'center', maxWidth: 170 });
    pdf.setFontSize(9);
    pdf.setTextColor(250, 246, 240);
    pdf.text(`Kód: ${cardCode}`, 105, 116, { align: 'center' });
    if (security) {
      pdf.setTextColor(217, 196, 168);
      pdf.text(`Bezpečnostní kód: ${security}`, 105, 125, { align: 'center' });
    }
    pdf.setFontSize(7);
    pdf.setTextColor(190, 180, 170);
    pdf.text('Uplatnění v e-shopu Luvia Decor · doručení dárkové karty e-mailem', 105, 136, { align: 'center' });
    pdf.save(`Luvia-Decor-Darkova-karta-${cardCode}.pdf`);
  };

  const create = async () => {
    const c = code.trim().toUpperCase();
    const a = Number(value);
    if (!paid) return addToast('error', 'Nejdříve potvrďte platbu', 'Kartu vytvářejte až po zaplacení objednávky.');
    if (!c || !Number.isFinite(a) || a < 200) return addToast('error', 'Chybí údaje', 'Kód a částka od 200 Kč jsou povinné.');
    setBusy('create');
    try {
      const r = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c, type: 'fixed', value: a, active: true, note: 'gift-voucher', categoryIds: [] }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'Dárkovou kartu se nepodařilo vytvořit.');
      await createPdf(d.code || c, a, d.securityCode);
      setCode(''); setValue(''); setPaid(false); await load();
      addToast('success', 'Karta vytvořena a PDF připraveno', `${c} · ${money(a)} Kč`);
    } catch (e: any) { addToast('error', 'Dárková karta', e?.message || 'Chyba.'); }
    finally { setBusy(null); }
  };

  const downloadExistingPdf = async (v: Coupon) => { await createPdf(v.code, Number(v.remainingValue ?? v.value)); addToast('success', 'PDF dárkové karty vytvořeno', v.code); };
  const toggle = async (v: Coupon) => { setBusy(v.id); try { const r = await fetch(`/api/coupons?id=${encodeURIComponent(v.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !v.active }) }); if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'Stav se nepodařilo změnit.'); await load(); addToast('info', v.active ? 'Karta deaktivována' : 'Karta aktivována', v.code); } catch (e: any) { addToast('error', 'Dárková karta', e?.message || 'Chyba.'); } finally { setBusy(null); } };
  const recharge = async (v: Coupon) => { const raw = window.prompt(`Kolik Kč chcete ručně připsat na ${v.code}? Minimum je 200 Kč.`); if (raw === null) return; const a = Number(raw); if (!Number.isFinite(a) || a < 200) return addToast('error', 'Neplatná částka', 'Dobití musí být alespoň 200 Kč.'); setBusy(v.id); try { const r = await fetch(`/api/coupons?id=${encodeURIComponent(v.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remainingValue: Number(v.remainingValue || v.value) + a, active: true }) }); if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'Dobití se nepodařilo.'); await load(); addToast('success', 'Karta ručně dobita', `${v.code} + ${money(a)} Kč`); } catch (e: any) { addToast('error', 'Dobití karty', e?.message || 'Chyba.'); } finally { setBusy(null); } };
  const remove = async (v: Coupon) => { if (!confirm(`Opravdu smazat kartu ${v.code}?`)) return; setBusy(v.id); try { const r = await fetch(`/api/coupons?id=${encodeURIComponent(v.id)}`, { method: 'DELETE' }); if (!r.ok) throw new Error('Kartu se nepodařilo smazat.'); setVouchers(p => p.filter(x => x.id !== v.id)); addToast('info', 'Dárková karta smazána', v.code); } catch (e: any) { addToast('error', 'Dárková karta', e?.message || 'Chyba.'); } finally { setBusy(null); } };
  const confirmTopup = async (t: Topup) => { setBusy(t.id); try { const r = await fetch('/api/coupons?action=confirm-topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id }) }); const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || 'Dobití se nepodařilo potvrdit.'); await load(); addToast('success', 'Dobití potvrzeno a připsáno', `${t.code} + ${money(t.amount)} Kč`); } catch (e: any) { addToast('error', 'Dobití', e?.message || 'Chyba.'); } finally { setBusy(null); } };
  const cancelTopup = async (t: Topup) => { setBusy(t.id); try { const r = await fetch('/api/coupons?action=cancel-topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id }) }); if (!r.ok) throw new Error('Žádost se nepodařilo zrušit.'); await load(); } catch (e: any) { addToast('error', 'Dobití', e?.message || 'Chyba.'); } finally { setBusy(null); } };

  if (adminUser?.role !== 'admin') return null;
  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"><div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FAF3E8] flex items-center justify-center text-[#8C7355]"><Gift className="w-5 h-5" /></div><div><h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Dárkové karty</h2><p className="text-xs text-[#7B6E63]">Po ověření platby vytvoříte kartu a stáhnete její PDF. Kartu zákazníkovi odešlete e-mailem.</p></div></div><button type="button" onClick={load} className="self-start px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Obnovit</button></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-5 rounded-2xl bg-[#FAF6F0] border border-[#E3DACF]"><div><label className="block text-[11px] font-semibold mb-1">Kód karty *</label><div className="flex gap-2"><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="LUVIA-AB12-CD34" className="min-w-0 flex-1 px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs font-bold" /><button type="button" title="Vygenerovat kód" onClick={() => setCode(makeCode())} className="px-3 rounded-xl border bg-white"><Shuffle className="w-4 h-4" /></button></div></div><div><label className="block text-[11px] font-semibold mb-1">Částka *</label><input type="number" min="200" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="500" className="w-full px-3 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-xs" /></div><label className="flex items-center gap-2 text-[11px] font-semibold self-end pb-2"><input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="w-4 h-4" />Objednávka je zaplacená</label><button type="button" disabled={busy === 'create' || !paid} onClick={create} className="self-end px-4 py-2.5 rounded-xl bg-[#2D2723] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"><Plus className="w-4 h-4" />Vytvořit kartu + PDF</button></div>
    {vouchers.length > 0 && <div className="space-y-3">{vouchers.map(v => <div key={v.id} className="p-4 rounded-2xl border border-[#E8DFC8] bg-[#FAFAF8]"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm tracking-wide">{v.code}</b><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${v.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{v.active ? 'Aktivní' : 'Neaktivní'}</span></div><p className="text-[11px] text-stone-500 mt-1">Původně {money(Number(v.originalValue ?? v.value))} Kč · <strong className="text-[#8C7355]">Zůstatek {money(Number(v.remainingValue ?? v.value))} Kč</strong></p></div><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy === v.id} onClick={() => downloadExistingPdf(v)} className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" />PDF</button><button type="button" disabled={busy === v.id} onClick={() => recharge(v)} className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1"><WalletCards className="w-3.5 h-3.5" />Ručně dobít</button><button type="button" disabled={busy === v.id} onClick={() => toggle(v)} className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1"><Power className="w-3.5 h-3.5" />{v.active ? 'Deaktivovat' : 'Aktivovat'}</button><button type="button" disabled={busy === v.id} onClick={() => remove(v)} className="p-2 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div></div>)}</div>}
    <div className="border-t border-[#E8DFC8] pt-6"><div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-[#8C7355]" /><h3 className="font-bold text-sm">Čekající žádosti o dobití</h3></div>{topups.filter(t => t.status === 'pending').length === 0 ? <p className="text-xs text-stone-400 py-3">Žádné čekající žádosti.</p> : <div className="space-y-2">{topups.filter(t => t.status === 'pending').map(t => <div key={t.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 rounded-2xl bg-[#FAF6F0] border border-[#E3DACF]"><div className="text-xs"><b>{t.code}</b><div className="text-stone-500">{money(t.amount)} Kč · {t.email}</div><div className="text-[10px] text-stone-400">{new Date(t.created_at).toLocaleString('cs-CZ')} · {t.id}</div></div><div className="flex gap-2"><button type="button" disabled={busy === t.id} onClick={() => confirmTopup(t)} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" />Platba přijata – připsat</button><button type="button" disabled={busy === t.id} onClick={() => cancelTopup(t)} className="px-3 py-2 rounded-xl border text-[11px] font-bold"><X className="w-3.5 h-3.5 inline mr-1" />Zrušit</button></div></div>)}</div>}</div>
    <div className="rounded-2xl bg-[#F7F2EA] p-4 text-[11px] text-[#75685d] flex gap-3"><Mail className="w-4 h-4 shrink-0 mt-0.5" /><p><strong>Proces:</strong> po ověření platby kartu vytvoříte nebo dobijete, stáhnete PDF a kartu zákazníkovi odešlete e-mailem.</p></div>
  </div></section>;
};
