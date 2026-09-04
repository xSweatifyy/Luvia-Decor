import React, { useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FileText } from 'lucide-react';

const Agreement = ({ onOpen }: { onOpen: () => void }) => {
  const [checked, setChecked] = useState(false);
  return <div className="rounded-2xl border border-[#E8DFC8] bg-[#FAF8F5] p-4 sm:p-5 shadow-sm">
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8C7355] shrink-0" />
      <span className="text-xs leading-5 text-[#5C5046]">Souhlasím s <button type="button" onClick={e => { e.preventDefault(); onOpen(); }} className="font-bold text-[#8C7355] underline underline-offset-2">Obchodními podmínkami</button> Luvia Decor.</span>
    </label>
    <div className="mt-3 flex items-center gap-2 text-[10px] text-[#8A7B6E]"><FileText className="w-3.5 h-3.5 text-[#8C7355]" />Před odesláním objednávky je nutné potvrdit souhlas s obchodními podmínkami.</div>
    <input aria-hidden="true" tabIndex={-1} required={!checked} value={checked ? 'yes' : ''} onChange={() => {}} className="absolute opacity-0 pointer-events-none w-0 h-0" />
  </div>;
};

export const TermsAgreementEnhancer: React.FC = () => {
  useEffect(() => {
    let root: Root | null = null;
    let mount: HTMLDivElement | null = null;
    let cleanupForm: (() => void) | null = null;

    const attach = () => {
      const form = document.querySelector<HTMLFormElement>('#cart-page form');
      if (!form || form.querySelector('[data-terms-agreement]')) return;
      const submit = form.querySelector('button[type="submit"]');
      if (!submit || !submit.parentElement) return;
      mount = document.createElement('div');
      mount.setAttribute('data-terms-agreement', 'true');
      mount.className = 'mb-1';
      submit.parentElement.parentElement?.insertBefore(mount, submit.parentElement);
      root = createRoot(mount);
      root.render(<Agreement onOpen={() => window.dispatchEvent(new Event('open-terms'))} />);
      const guard = (event: Event) => {
        const checkbox = mount?.querySelector<HTMLInputElement>('input[type="checkbox"]');
        if (!checkbox?.checked) {
          event.preventDefault();
          event.stopPropagation();
          window.alert('Pro odeslání objednávky musíte souhlasit s Obchodními podmínkami.');
        }
      };
      form.addEventListener('submit', guard, true);
      cleanupForm = () => form.removeEventListener('submit', guard, true);
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); cleanupForm?.(); root?.unmount(); mount?.remove(); };
  }, []);
  return null;
};
