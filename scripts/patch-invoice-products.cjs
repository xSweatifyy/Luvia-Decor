const fs = require('fs');
const path = require('path');
const file = path.resolve('src/components/InvoiceManager.tsx');
let source = fs.readFileSync(file, 'utf8');

source = source.replace(
  "type InvoiceItem = { name: string; qty: number; price: number; vat: number };",
  "type InvoiceItem = { productId?: string; name: string; qty: number; price: number; vat: number };\ntype ShopProduct = { id: string; title?: string; name?: string; price?: number; inStock?: boolean; category?: string };"
);
source = source.replace(
  "const blankItem = (): InvoiceItem => ({ name: '', qty: 1, price: 0, vat: 21 });",
  "const blankItem = (): InvoiceItem => ({ productId: '', name: '', qty: 1, price: 0, vat: 21 });"
);
source = source.replace(
  "sellerName: 'Luvia Decor', sellerAddress: '', sellerIco: '', sellerDic: '', sellerWeb: 'www.luvia-decor.cz', sellerEmail: 'info@luvia-decor.cz', sellerPhone: '',",
  "sellerName: 'Luvia Decor', sellerAddress: 'U Rejdiště 3732/15, 767 01, Kroměříž', sellerIco: '29905061', sellerDic: '', sellerWeb: 'www.luvia-decor.cz', sellerEmail: 'objednavky@luvia-decor.cz', sellerPhone: '+420 702 345 999',"
);
source = source.replace(
  "  const [form, setForm] = useState<Invoice>(initialInvoice);",
  "  const [form, setForm] = useState<Invoice>(initialInvoice);\n  const [products, setProducts] = useState<ShopProduct[]>([]);\n  const [loadingProducts, setLoadingProducts] = useState(true);\n  useEffect(() => {\n    let active = true;\n    fetch('/api/products').then(r => r.ok ? r.json() : []).then(data => { if (active) setProducts(Array.isArray(data) ? data : []); }).catch(() => {}).finally(() => { if (active) setLoadingProducts(false); });\n    fetch('/api/invoices').then(r => r.ok ? r.json() : []).then(data => { if (active && Array.isArray(data)) setInvoices(data); }).catch(() => {});\n    return () => { active = false; };\n  }, []);"
);
source = source.replace(
  "  useEffect(() => { localStorage.setItem('luvia_invoices', JSON.stringify(invoices)); }, [invoices]);\n",
  ""
);
source = source.replace(
  "  const setItem = (idx: number, key: keyof InvoiceItem, value: string | number) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));\n  const save = () => { const invoice = { ...form, id: form.id || crypto.randomUUID(), variableSymbol: form.variableSymbol || form.number.replace(/\\D/g, '').slice(-10) }; setInvoices(prev => [invoice, ...prev.filter(x => x.id !== invoice.id)]); setForm(invoice); setSelected(invoice); };\n  const remove = (id: string) => { setInvoices(prev => prev.filter(x => x.id !== id)); if (selected?.id === id) setSelected(null); };",
  "  const setItem = (idx: number, key: keyof InvoiceItem, value: string | number) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));\n  const chooseProduct = (idx: number, productId: string) => { const product = products.find(p => p.id === productId); if (!product) { setItem(idx, 'productId', ''); return; } setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, productId, name: String(product.title || product.name || ''), price: Number(product.price || 0) } : it) })); };\n  const save = async () => { const invoice = { ...form, id: form.id || crypto.randomUUID(), variableSymbol: form.variableSymbol || form.number.replace(/\\D/g, '').slice(-10) }; const res = await fetch('/api/invoices', { method: invoice.id && invoices.some(x => x.id === invoice.id) ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) }); if (!res.ok) { alert('Fakturu se nepodařilo uložit do databáze.'); return; } const saved = await res.json(); setInvoices(prev => [saved, ...prev.filter(x => x.id !== saved.id)]); setForm(saved); setSelected(saved); };\n  const remove = async (id: string) => { const res = await fetch(`/api/invoices?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); if (!res.ok) { alert('Fakturu se nepodařilo smazat.'); return; } setInvoices(prev => prev.filter(x => x.id !== id)); if (selected?.id === id) setSelected(null); };"
);
const itemStart = source.indexOf("        <div><div className=\"flex items-center justify-between mb-2\"><h3 className=\"font-black\">Položky</h3>");
const itemEnd = source.indexOf("        <div className=\"grid md:grid-cols-3 gap-3\">", itemStart);
if (itemStart !== -1 && itemEnd !== -1) {
  const itemBlock = `        <div><div className="flex items-center justify-between mb-2"><h3 className="font-black">Položky</h3><button onClick={()=>setForm(f=>({...f,items:[...f.items,blankItem()]}))} className="text-xs font-bold rounded-lg border px-3 py-2">+ Přidat položku</button></div><div className="space-y-2">{form.items.map((it,i)=><div key={i} className="grid grid-cols-[minmax(0,1fr)_80px_120px_42px] gap-2 items-center"><select value={it.productId || ''} onChange={e=>chooseProduct(i,e.target.value)} className="rounded-lg border p-2.5 text-sm bg-white"><option value="">{loadingProducts ? 'Načítám produkty…' : 'Vyberte produkt z e-shopu'}</option>{products.map(p=><option key={p.id} value={p.id}>{String(p.title || p.name || 'Produkt')} — {money(Number(p.price || 0))}</option>)}</select><input type="number" min="1" value={it.qty} onChange={e=>setItem(i,'qty',Number(e.target.value))} className="rounded-lg border p-2.5 text-sm"/><div className="rounded-lg border p-2.5 text-sm bg-[#faf8f5] text-right">{money(Number(it.price || 0))}</div><button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,x)=>x!==i)}))} className="rounded-lg border text-red-600 h-10">×</button></div>)}</div></div>\n`;
  source = source.slice(0, itemStart) + itemBlock + source.slice(itemEnd);
}
fs.writeFileSync(file, source);
console.log('Patched invoice product selector/database persistence.');
