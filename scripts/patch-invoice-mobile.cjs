const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/components/InvoiceManager.tsx');
let s = fs.readFileSync(file, 'utf8');

// Some mobile WebViews/browsers do not expose crypto.randomUUID(). Use a safe fallback.
s = s.replace(
  "crypto.randomUUID()",
  "(globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`)"
);

// localStorage can be unavailable in private/restricted mobile WebViews. Never let it break the editor.
s = s.replace(
  "useEffect(() => { localStorage.setItem('luvia_invoices', JSON.stringify(invoices)); }, [invoices]);",
  "useEffect(() => { try { localStorage.setItem('luvia_invoices', JSON.stringify(invoices)); } catch { /* storage unavailable; keep the editor usable */ } }, [invoices]);"
);

fs.writeFileSync(file, s, 'utf8');
