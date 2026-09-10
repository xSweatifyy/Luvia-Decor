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

// The shop already has the authoritative product list in AppContext. Use it first so the
// invoice editor shows the same products, images, stock and prices as the storefront.
s = s.replace(
  "import { Download, FilePlus2, Palette, Printer, ReceiptText, Save, Trash2, Search, X } from 'lucide-react';",
  "import { Download, FilePlus2, Palette, Printer, ReceiptText, Save, Trash2, Search, X } from 'lucide-react';\nimport { useApp } from '../context/AppContext';"
);
s = s.replace(
  "export const InvoiceManager: React.FC = () => {\n  const [invoices, setInvoices]",
  "export const InvoiceManager: React.FC = () => {\n  const { products: shopProducts } = useApp();\n  const [invoices, setInvoices]"
);

// Prefer AppContext products; only fall back to the API when the context has not loaded yet.
s = s.replace(
  "  useEffect(() => {\n    let active = true;\n    setLoadingProducts(true);\n    fetch('/api/products', { cache: 'no-store' })\n      .then(r => r.ok ? r.json() : [])\n      .then(data => { if (active) setProducts(Array.isArray(data) ? data : []); })\n      .catch(() => { if (active) setProducts([]); })\n      .finally(() => { if (active) setLoadingProducts(false); });\n    return () => { active = false; };\n  }, []);",
  "  useEffect(() => {\n    if (Array.isArray(shopProducts) && shopProducts.length) {\n      setProducts(shopProducts as ShopProduct[]);\n      setLoadingProducts(false);\n      return;\n    }\n    let active = true;\n    setLoadingProducts(true);\n    fetch('/api/products', { cache: 'no-store' })\n      .then(r => r.ok ? r.json() : [])\n      .then(data => { if (active) setProducts(Array.isArray(data) ? data : []); })\n      .catch(() => { if (active) setProducts([]); })\n      .finally(() => { if (active) setLoadingProducts(false); });\n    return () => { active = false; };\n  }, [shopProducts]);"
);

// Make product photos real touch/click targets on phones as well as desktop.
s = s.replace(
  "{productImage(p)?<img src={productImage(p)} alt=\"\" className=\"w-12 h-12 rounded-lg object-cover border shrink-0\" onError={e=>{e.currentTarget.style.display='none';}}/>:<div className=\"w-12 h-12 rounded-lg border bg-[#f1ece6] shrink-0\"/>}",
  "{productImage(p)?<button type=\"button\" aria-label={`Vybrat ${productTitle(p)}`} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseProduct(i,p)} className=\"w-12 h-12 rounded-lg overflow-hidden border shrink-0 bg-white touch-manipulation\"><img src={productImage(p)} alt={productTitle(p)} className=\"w-full h-full object-cover\" onError={e=>{e.currentTarget.style.display='none';}}/></button>:<button type=\"button\" aria-label={`Vybrat ${productTitle(p)}`} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseProduct(i,p)} className=\"w-12 h-12 rounded-lg border bg-[#f1ece6] shrink-0\"/>}"
);

// Also make the already selected product image clickable to reopen the picker.
s = s.replace(
  "{it.imageUrl ? <img src={it.imageUrl} alt=\"\" className=\"w-10 h-10 rounded-md object-cover border shrink-0\" onError={e=>{e.currentTarget.style.display='none';}}/> : <div className=\"w-10 h-10 rounded-md border bg-[#f1ece6] shrink-0\"/>}",
  "{it.imageUrl ? <button type=\"button\" aria-label=\"Změnit produkt\" onClick={()=>setOpenProductPicker(i)} className=\"w-10 h-10 rounded-md overflow-hidden border shrink-0 bg-white touch-manipulation\"><img src={it.imageUrl} alt=\"\" className=\"w-full h-full object-cover\" onError={e=>{e.currentTarget.style.display='none';}}/></button> : <button type=\"button\" aria-label=\"Vybrat produkt\" onClick={()=>setOpenProductPicker(i)} className=\"w-10 h-10 rounded-md border bg-[#f1ece6] shrink-0\"/>}"
);

// Keep the product picker usable on narrow phone screens.
s = s.replace(
  "className=\"absolute z-50 left-0 right-0 mt-1 rounded-xl border bg-white shadow-2xl overflow-hidden\"",
  "className=\"absolute z-50 left-0 right-0 mt-1 rounded-xl border bg-white shadow-2xl overflow-hidden max-w-[calc(100vw-2rem)] sm:max-w-none\""
);

fs.writeFileSync(file, s, 'utf8');
