const fs = require('fs');
const path = require('path');
const file = path.resolve('src/components/InvoiceManager.tsx');
let source = fs.readFileSync(file, 'utf8');

source = source.replace("type InvoiceItem = { name: string; qty: number; price: number; vat: number };", "type InvoiceItem = { productId?: string; name: string; qty: number; price: number; vat: number };\ntype ShopProduct = { id: string | number; title?: string; name?: string; price?: number };");
source = source.replace("const blankItem = (): InvoiceItem => ({ name: '', qty: 1, price: 0, vat: 21 });", "const blankItem = (): InvoiceItem => ({ productId: '', name: '', qty: 1, price: 0, vat: 21 });");
source = source.replace("sellerName: 'Luvia Decor', sellerAddress: '', sellerIco: '', sellerDic: '', sellerWeb: 'www.luvia-decor.cz', sellerEmail: 'info@luvia-decor.cz', sellerPhone: '',", "sellerName: 'Luvia Decor', sellerAddress: 'U Rejdiště 3732/15, 767 01, Kroměříž', sellerIco: '29905061', sellerDic: '', sellerWeb: 'www.luvia-decor.cz', sellerEmail: 'objednavky@luvia-decor.cz', sellerPhone: '+420 702 345 999',");
source = source.replace("  const [form, setForm] = useState<Invoice>(initialInvoice);", "  const [form, setForm] = useState<Invoice>(initialInvoice);\n  const [products, setProducts] = useState<ShopProduct[]>([]);\n  const [loadingProducts, setLoadingProducts] = useState(true);\n  useEffect(() => { let active = true; fetch('/api/products').then(r => r.ok ? r.json() : []).then(data => { if (active) setProducts(Array.isArray(data) ? data : []); }).catch(() => {}).finally(() => { if (active) setLoadingProducts(false); }); return () => { active = false; }; }, []);");

const itemStart = source.indexOf("        <div><div className=\"flex items-center justify-between mb-2\"><h3 className=\"font-black\">Položky</h3>");
const itemEnd = source.indexOf("        <div className=\"grid md:grid-cols-3 gap-3\">", itemStart);
if (itemStart !== -1 && itemEnd !== -1) {
  const itemBlock = `        <div><div className="flex items-center justify-between mb-2"><h3 className="font-black">Položky</h3><button onClick={()=>setForm(f=>({...f,items:[...f.items,blankItem()]}))} className="text-xs font-bold rounded-lg border px-3 py-2">+ Přidat položku</button></div><div className="space-y-2">{form.items.map((it,i)=><div key={i} className="grid grid-cols-[minmax(0,1fr)_80px_120px_42px] gap-2 items-center"><select value={it.productId || ''} onChange={e=>{const p=products.find(x=>String(x.id)===e.target.value);setForm(f=>({...f,items:f.items.map((row,j)=>j===i?{...row,productId:p?String(p.id):'',name:p?String(p.title||p.name||''):'',price:p?Number(p.price||0):0}:row)}))}} className="rounded-lg border p-2.5 text-sm bg-white"><option value="">{loadingProducts ? 'Načítám produkty…' : 'Vyberte produkt z e-shopu'}</option>{products.map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.title||p.name||'Produkt')} — {money(Number(p.price||0))}</option>)}</select><input aria-label="Množství" type="number" min="1" value={it.qty} onChange={e=>setItem(i,'qty',Number(e.target.value))} className="rounded-lg border p-2.5 text-sm"/><div aria-label="Cena produktu" className="rounded-lg border p-2.5 text-sm bg-[#faf8f5] text-right">{money(Number(it.price||0))}</div><button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,x)=>x!==i)}))} className="rounded-lg border text-red-600 h-10">×</button></div>)}</div></div>\n`;
  source = source.slice(0,itemStart)+itemBlock+source.slice(itemEnd);
}
fs.writeFileSync(file, source);
console.log('Invoice product selector patched.');
