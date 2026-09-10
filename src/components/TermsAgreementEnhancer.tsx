import React, { useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FileText, ShieldCheck } from 'lucide-react';

const Agreement = ({ onOpenTerms, onOpenPrivacy }: { onOpenTerms: () => void; onOpenPrivacy: () => void }) => {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const checked = terms && privacy;
  return <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4 sm:p-5 shadow-sm space-y-3">
    <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8C7355] shrink-0"/><span className="text-xs leading-5 text-[#5C5046]">Souhlasím s <button type="button" onClick={e => { e.preventDefault(); onOpenTerms(); }} className="font-bold text-[#8C7355] underline underline-offset-2">Obchodními podmínkami</button> Luvia Decor.</span></label>
    <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8C7355] shrink-0"/><span className="text-xs leading-5 text-[#5C5046]">Seznámil/a jsem se s <button type="button" onClick={e => { e.preventDefault(); onOpenPrivacy(); }} className="font-bold text-[#8C7355] underline underline-offset-2">Ochranou osobních údajů (GDPR)</button> a beru ji na vědomí.</span></label>
    <div className="flex items-center gap-2 text-[10px] text-[#8A7B6E]"><FileText className="w-3.5 h-3.5 text-[#8C7355]"/><ShieldCheck className="w-3.5 h-3.5 text-[#8C7355]"/>Před odesláním objednávky je nutné potvrdit oba body.</div>
    <input aria-hidden="true" tabIndex={-1} required={!checked} value={checked ? 'yes' : ''} onChange={() => {}} className="absolute opacity-0 pointer-events-none w-0 h-0" />
  </div>;
};

export const TermsAgreementEnhancer: React.FC = () => {
  useEffect(() => {
    let root: Root | null = null; let mount: HTMLDivElement | null = null; let cleanupForm: (() => void) | null = null;
    const attach = () => { const form = document.querySelector<HTMLFormElement>('#cart-page form'); if (!form || form.querySelector('[data-terms-agreement]')) return; const submit = form.querySelector('button[type="submit"]'); if (!submit || !submit.parentElement) return; mount = document.createElement('div'); mount.setAttribute('data-terms-agreement','true'); mount.className='mb-1'; submit.parentElement.parentElement?.insertBefore(mount,submit.parentElement); root=createRoot(mount); root.render(<Agreement onOpenTerms={()=>window.dispatchEvent(new Event('open-terms'))} onOpenPrivacy={()=>window.dispatchEvent(new Event('open-privacy'))}/>); const guard=(event:Event)=>{const boxes=mount?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');if(!boxes||boxes.length<2||!boxes[0].checked||!boxes[1].checked){event.preventDefault();event.stopPropagation();window.alert('Pro odeslání objednávky musíte souhlasit s Obchodními podmínkami a seznámit se s Ochranou osobních údajů (GDPR).')}}; form.addEventListener('submit',guard,true); cleanupForm=()=>form.removeEventListener('submit',guard,true); };
    attach(); const observer=new MutationObserver(attach); observer.observe(document.body,{childList:true,subtree:true}); return()=>{observer.disconnect();cleanupForm?.();root?.unmount();mount?.remove()};
  },[]); return null;
};
