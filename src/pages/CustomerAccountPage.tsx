import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Heart, LogOut, MapPin, Package, Plus, RefreshCw, Settings, ShieldCheck, Sparkles, Star, Ticket, Trash2, User, WalletCards } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CustomerAccount, CustomerAddress, CustomerCollection, Order, Product } from '../types';

type Tab = 'overview' | 'orders' | 'favorites' | 'collections' | 'addresses' | 'benefits' | 'profile' | 'settings';
const styles = ['Elegantní', 'Přírodní', 'Moderní', 'Minimalistický', 'Romantický', 'Rustikální'];
const colors = ['Bílá', 'Béžová', 'Zlatá', 'Černá', 'Zelená', 'Růžová'];
const statusLabels: Record<string, string> = { nova: 'Objednávka přijata', zpracovava_se: 'Zpracováváme', zaplaceno: 'Zaplaceno', u_prepravce: 'U dopravce', odeslano: 'Odesláno', dokonceno: 'Dokončeno', zruseno: 'Zrušeno' };
const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';

export const CustomerAccountPage: React.FC = () => {
  const { products, setPage, addToCart, addToast } = useApp();
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationNotice, setVerificationNotice] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', currentPassword: '', newPassword: '' });
  const [preferences, setPreferences] = useState({ styles: [] as string[], colors: [] as string[] });
  const [address, setAddress] = useState<Partial<CustomerAddress>>({ label: 'Domů', fullName: '', phone: '', street: '', city: '', zip: '', country: 'Česká republika' });
  const [collectionName, setCollectionName] = useState('');
  const [showAddress, setShowAddress] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [saving, setSaving] = useState(false);

  const persist = (user: CustomerAccount) => { setAccount(user); localStorage.setItem('luvia_customer', JSON.stringify(user)); };

  const load = async (t: string) => {
    if (!t) return;
    try {
      const r = await fetch('/api/customer/me', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' });
      if (!r.ok) throw new Error('Účet se nepodařilo načíst.');
      const d = await r.json();
      if (!d.user) throw new Error('Účet se nepodařilo načíst.');
      persist(d.user); setPreferences(d.user.preferences || { styles: [], colors: [] }); setOrders(d.orders || []); setVouchers(d.vouchers || []); setCoupons(d.coupons || []);
    } catch {
      localStorage.removeItem('luvia_customer'); localStorage.removeItem('luvia_customer_token'); setAccount(null); setToken('');
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('luvia_customer_token') || '';
    const storedUser = localStorage.getItem('luvia_customer');
    setToken(storedToken);
    if (storedUser) { try { setAccount(JSON.parse(storedUser)); } catch { localStorage.removeItem('luvia_customer'); } }
    if (storedToken) load(storedToken);
  }, []);

  const resendVerification = async () => {
    if (!verificationEmail) return;
    setLoading(true); setMessage('');
    try {
      const r = await fetch('/api/customer/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: verificationEmail }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ověřovací e-mail se nepodařilo odeslat.');
      setMessage(d.message || 'Nový ověřovací e-mail byl odeslán.');
    } catch (e: any) { setMessage(e.message || 'Ověřovací e-mail se nepodařilo odeslat.'); }
    finally { setLoading(false); }
  };

  const auth = async () => {
    setLoading(true); setMessage('');
    try {
      const endpoint = authMode === 'login' ? '/api/customer/login' : '/api/customer/register';
      const body = authMode === 'login' ? { email: form.email, password: form.password } : { email: form.email, password: form.password, name: form.name, phone: form.phone };
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Operace se nepodařila.');

      if (authMode === 'register' && d.verificationRequired) {
        setVerificationEmail(d.email || form.email);
        setVerificationNotice(true);
        setMessage(d.message || 'Registrace proběhla. Zkontrolujte svůj e-mail a potvrďte adresu.');
        setForm(prev => ({ ...prev, password: '' }));
        return;
      }

      if (!d.user || !d.token) throw new Error('Server vrátil neplatnou odpověď.');
      localStorage.setItem('luvia_customer_token', d.token); setToken(d.token); persist(d.user); setPreferences(d.user.preferences || { styles: [], colors: [] }); await load(d.token);
    } catch (e: any) { setMessage(e.message || 'Operace se nepodařila.'); }
    finally { setLoading(false); }
  };

  const save = async (updates: any) => {
    if (!token) return;
    setSaving(true);
    try {
      const r = await fetch('/api/customer/me', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Uložení se nepodařilo.');
      persist(d.user); setPreferences(d.user.preferences || preferences); addToast('success', 'Uloženo', 'Změny byly uloženy.');
    } catch (e: any) { addToast('error', 'Chyba', e.message); }
    finally { setSaving(false); }
  };

  const logout = async () => {
    await fetch('/api/customer/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    localStorage.removeItem('luvia_customer'); localStorage.removeItem('luvia_customer_token'); setAccount(null); setToken(''); setOrders([]); setVouchers([]); setCoupons([]);
  };

  const favoriteProducts = useMemo(() => products.filter(p => account?.favorites?.includes(p.id)), [products, account]);
  const points = useMemo(() => Math.floor(orders.filter(o => o.status !== 'zruseno').reduce((sum, o) => sum + Number(o.subtotal || 0), 0) / 50), [orders]);
  const level = points >= 1000 ? 'Luvia VIP' : points >= 500 ? 'Luvia Lover' : points >= 200 ? 'Luvia Fan' : 'Začínáme';
  const next = points < 200 ? 200 : points < 500 ? 500 : 1000;
  const progress = points >= 1000 ? 100 : Math.min(100, Math.round((points / next) * 100));

  const repeat = (order: Order) => {
    let count = 0;
    order.items.forEach(item => { const product = products.find(p => p.id === item.productId); if (product && product.inStock !== false) { addToCart(product, item.quantity, item.customNote); count += item.quantity; } });
    if (count) { addToast('success', 'Objednávka připravena', 'Dostupné položky byly vloženy do košíku.'); setPage('cart'); }
    else addToast('error', 'Nic není skladem', 'Produkty z objednávky již nejsou dostupné.');
  };

  const addAddress = async () => {
    if (!address.street || !address.city || !address.zip) { addToast('error', 'Doplňte adresu', 'Ulice, město a PSČ jsou povinné.'); return; }
    const item = { ...address, id: `addr-${Date.now()}` } as CustomerAddress;
    await save({ addresses: [...(account?.addresses || []), item] }); setShowAddress(false);
  };

  const createCollection = async () => {
    if (!collectionName.trim()) return;
    const now = new Date().toISOString();
    const item: CustomerCollection = { id: `col-${Date.now()}`, name: collectionName.trim(), productIds: [], createdAt: now, updatedAt: now };
    await save({ collections: [...(account?.collections || []), item] }); setCollectionName(''); setShowCollection(false);
  };

  const toggleCollection = async (collection: CustomerCollection, productId: string) => {
    const productIds = collection.productIds.includes(productId) ? collection.productIds.filter(id => id !== productId) : [...collection.productIds, productId];
    const collections = (account?.collections || []).map(c => c.id === collection.id ? { ...c, productIds, updatedAt: new Date().toISOString() } : c);
    await save({ collections });
  };

  const togglePreference = (kind: 'styles' | 'colors', value: string) => {
    const nextValue = preferences[kind].includes(value) ? preferences[kind].filter(v => v !== value) : [...preferences[kind], value];
    setPreferences(prev => ({ ...prev, [kind]: nextValue }));
  };

  if (!account) return <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#FBF8F4]"><div className="w-full max-w-md bg-white rounded-3xl border border-[#E6DDD3] p-6 sm:p-8 shadow-sm"><div className="text-center mb-7"><div className="mx-auto w-14 h-14 rounded-2xl bg-[#F2ECE4] flex items-center justify-center"><User className="w-7 h-7 text-[#8C7355]" /></div><h1 className="font-editorial text-3xl font-bold mt-4">Můj Luvia</h1><p className="text-sm text-[#7D6F64] mt-1">Váš osobní prostor u Luvia Decor</p></div>{verificationNotice ? <div className="rounded-2xl border border-[#E6DDD3] bg-[#FBF8F4] p-5 text-center"><div className="mx-auto w-12 h-12 rounded-full bg-white flex items-center justify-center"><Check className="w-6 h-6 text-[#8C7355]" /></div><h2 className="font-bold text-lg mt-3">Potvrďte svůj e-mail</h2><p className="text-sm text-[#6F6258] mt-2">Na adresu <b>{verificationEmail}</b> jsme poslali potvrzovací odkaz. Klikněte na něj a potom se můžete přihlásit.</p>{message && <p className="text-sm text-[#6F6258] mt-3">{message}</p>}<button disabled={loading} onClick={resendVerification} className="w-full mt-4 rounded-xl bg-[#241E1A] text-white py-3 font-bold disabled:opacity-50">{loading ? 'Odesílám…' : 'Poslat potvrzení znovu'}</button><button onClick={() => { setVerificationNotice(false); setMessage(''); setAuthMode('login'); }} className="w-full mt-3 py-2 text-sm font-semibold text-[#8C7355]">Zpět na přihlášení</button></div> : <>{authMode === 'register' && <input className="w-full mb-3 rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" placeholder="Jméno a příjmení" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />}{authMode === 'register' && <input className="w-full mb-3 rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />}{authMode === 'register' && <div className="text-xs text-[#897A6E] mb-2">E-mail</div>}<input className="w-full mb-3 rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" type="email" placeholder="vas@email.cz" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><input className="w-full rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" type="password" placeholder="Heslo (min. 8 znaků)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') auth(); }} />{message && <p className="text-sm text-red-600 mt-3">{message}</p>}<button disabled={loading} onClick={auth} className="w-full mt-5 rounded-xl bg-[#241E1A] text-white py-3 font-bold disabled:opacity-50">{loading ? 'Pracuji…' : authMode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}</button><button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setMessage(''); }} className="w-full mt-3 py-2 text-sm font-semibold text-[#8C7355]">{authMode === 'login' ? 'Ještě nemám účet – registrovat' : 'Už mám účet – přihlásit'}</button></>}</div></div>;

  const tabs: Array<[Tab, string, React.ElementType]> = [['overview', 'Přehled', Sparkles], ['orders', 'Objednávky', Package], ['favorites', 'Oblíbené', Heart], ['collections', 'Moje kolekce', Star], ['addresses', 'Adresy', MapPin], ['benefits', 'Výhody', Ticket], ['profile', 'Profil', User], ['settings', 'Nastavení', Settings]];

  const renderOverview = () => <div className="space-y-5"><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3"><Stat title="Objednávky" value={orders.length} icon={Package} /><Stat title="Oblíbené" value={account.favorites.length} icon={Heart} /><Stat title="Luvia Points" value={points} icon={WalletCards} /><Stat title="Výhody" value={coupons.length} icon={Ticket} /></div><Card title="Poslední objednávka">{orders.length ? <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><b>{orders[0].orderNumber}</b><p className="text-xs text-[#897A6E] mt-1">{new Date(orders[0].createdAt).toLocaleDateString('cs-CZ')} · {statusLabels[orders[0].status] || orders[0].status}</p><p className="font-bold mt-2">{money(orders[0].totalPrice)}</p></div><button onClick={() => setTab('orders')} className="inline-flex items-center gap-2 text-sm font-bold text-[#8C7355]">Detail <ArrowRight className="w-4 h-4" /></button></div> : <Empty icon={Package} text="Zatím nemáte žádné objednávky." />}</Card><Card title="Vybráno pro vás"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{products.filter(p => p.inStock !== false).slice(0, 4).map(p => <MiniProduct key={p.id} product={p} onClick={() => { addToCart(p); setPage('cart'); }} />)}</div></Card></div>;

  const renderOrders = () => <div className="space-y-3">{orders.length ? orders.map(order => <Card key={order.id}><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><b>{order.orderNumber}</b><p className="text-xs text-[#897A6E] mt-1">{new Date(order.createdAt).toLocaleDateString('cs-CZ')} · {statusLabels[order.status] || order.status}</p><p className="font-bold mt-2">{money(order.totalPrice)}</p></div><button onClick={() => repeat(order)} className="inline-flex items-center gap-2 rounded-xl bg-[#241E1A] text-white px-3 py-2 text-xs font-bold"><RefreshCw className="w-3.5 h-3.5" /> Objednat znovu</button></div><div className="mt-4 pt-4 border-t border-[#EEE7DF] space-y-1">{order.items.map((item, index) => <div key={index} className="flex justify-between gap-3 text-xs"><span>{item.title} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>)}</div></Card>) : <Empty icon={Package} text="Zatím nemáte žádné objednávky." />}</div>;

  const renderFavorites = () => favoriteProducts.length ? <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{favoriteProducts.map(p => <div key={p.id} className="bg-white rounded-2xl border border-[#E4D9CD] overflow-hidden"><img src={p.imageUrl} alt="" className="w-full aspect-square object-cover" /><div className="p-3"><p className="font-bold text-sm line-clamp-2">{p.title}</p><p className="font-bold mt-2">{money(p.price)}</p><button onClick={() => { addToCart(p); setPage('cart'); }} className="w-full mt-3 rounded-xl bg-[#241E1A] text-white py-2 text-xs font-bold">Do košíku</button></div></div>)}</div> : <Empty icon={Heart} text="Zatím nemáte žádné oblíbené produkty." />;

  const renderCollections = () => <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setShowCollection(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#241E1A] text-white px-4 py-2.5 text-sm font-bold"><Plus className="w-4 h-4" /> Nová kolekce</button></div>{account.collections.length ? account.collections.map(collection => <Card key={collection.id} title={collection.name} action={<button onClick={() => save({ collections: account.collections.filter(c => c.id !== collection.id) })} className="text-red-500"><Trash2 className="w-4 h-4" /></button>}><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{products.slice(0, 8).map(product => <button key={product.id} onClick={() => toggleCollection(collection, product.id)} className={`text-left rounded-xl border overflow-hidden ${collection.productIds.includes(product.id) ? 'border-[#8C7355] ring-2 ring-[#8C7355]/20' : 'border-[#E7DDD2]'}`}><img src={product.imageUrl} alt="" className="w-full aspect-square object-cover" /><div className="p-2 text-[11px] font-semibold flex justify-between gap-1"><span className="line-clamp-1">{product.title}</span>{collection.productIds.includes(product.id) && <Check className="w-3.5 h-3.5 text-[#8C7355]" />}</div></button>)}</div>{collection.productIds.length > 0 && <button onClick={() => { collection.productIds.forEach(id => { const p = products.find(x => x.id === id); if (p && p.inStock !== false) addToCart(p); }); setPage('cart'); }} className="mt-4 rounded-xl bg-[#F2ECE4] px-4 py-2 text-xs font-bold">Přidat celou kolekci do košíku ({collection.productIds.length})</button>}</Card>) : <Empty icon={Star} text="Vytvořte si první vlastní kolekci produktů." />}{showCollection && <Modal title="Nová kolekce" onClose={() => setShowCollection(false)}><input autoFocus value={collectionName} onChange={e => setCollectionName(e.target.value)} placeholder="Např. Nový obývák" className="w-full rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" /><button onClick={createCollection} className="w-full mt-3 rounded-xl bg-[#241E1A] text-white py-3 font-bold">Vytvořit kolekci</button></Modal>}</div>;

  const renderAddresses = () => <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setShowAddress(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#241E1A] text-white px-4 py-2.5 text-sm font-bold"><Plus className="w-4 h-4" /> Přidat adresu</button></div>{account.addresses.length ? account.addresses.map(a => <Card key={a.id}><div className="flex justify-between gap-4"><div><b>{a.label}</b><p className="text-sm mt-2">{a.fullName}<br />{a.street}<br />{a.zip} {a.city}<br />{a.country}</p>{a.phone && <p className="text-xs text-[#897A6E] mt-2">{a.phone}</p>}</div><button onClick={() => save({ addresses: account.addresses.filter(x => x.id !== a.id) })} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div></Card>) : <Empty icon={MapPin} text="Nemáte uloženou žádnou adresu." />}{showAddress && <Modal title="Nová adresa" onClose={() => setShowAddress(false)}><div className="grid sm:grid-cols-2 gap-3">{(['label', 'fullName', 'phone', 'street', 'city', 'zip'] as const).map(key => <input key={key} value={(address as any)[key] || ''} onChange={e => setAddress({ ...address, [key]: e.target.value })} placeholder={key === 'label' ? 'Název' : key === 'fullName' ? 'Jméno a příjmení' : key === 'phone' ? 'Telefon' : key === 'street' ? 'Ulice a číslo' : key === 'city' ? 'Město' : 'PSČ'} className="rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" />)}</div><button onClick={addAddress} className="w-full mt-3 rounded-xl bg-[#241E1A] text-white py-3 font-bold">Uložit adresu</button></Modal>}</div>;

  const renderBenefits = () => <div className="space-y-5"><Card><p className="text-xs uppercase tracking-wider text-[#9A8878] font-bold">Vaše úroveň</p><h2 className="font-editorial text-3xl font-bold mt-1">{level}</h2><p className="text-sm text-[#76685D] mt-1">{points} Luvia Points</p><div className="h-2 bg-[#EEE7DE] rounded-full mt-5"><div className="h-2 bg-[#8C7355] rounded-full" style={{ width: `${progress}%` }} /></div><p className="text-xs text-[#897A6E] mt-2">1 bod = 50 Kč hodnoty uskutečněných objednávek.</p></Card><Card title="🎟️ Slevové kódy">{coupons.length ? coupons.map(c => <div key={c.id || c.code} className="p-3 rounded-xl bg-[#F8F3ED] mb-2 flex justify-between"><b className="font-mono">{c.code}</b><span>{c.type === 'percent' ? `${c.value} %` : money(c.value)}</span></div>) : <p className="text-sm text-[#897A6E]">Žádný aktivní slevový kód.</p>}</Card></div>;

  const renderProfile = () => <div className="space-y-5"><Card title="Osobní údaje"><div className="grid sm:grid-cols-2 gap-3"><input className="rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} placeholder="Jméno" /><input className="rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" value={account.phone} onChange={e => setAccount({ ...account, phone: e.target.value })} placeholder="Telefon" /></div><p className="text-xs text-[#897A6E] mt-3">E-mail: {account.email}</p><button onClick={() => save({ name: account.name, phone: account.phone })} disabled={saving} className="mt-4 rounded-xl bg-[#241E1A] text-white px-4 py-2.5 text-sm font-bold">Uložit změny</button></Card><Card title="Moje preference"><p className="text-sm font-bold mb-2">Oblíbený styl</p><div className="flex flex-wrap gap-2">{styles.map(style => <button key={style} onClick={() => togglePreference('styles', style)} className={`px-3 py-2 rounded-full text-xs font-semibold border ${preferences.styles.includes(style) ? 'bg-[#241E1A] text-white' : 'bg-white border-[#DED3C7]'}`}>{style}</button>)}</div><p className="text-sm font-bold mt-5 mb-2">Oblíbené barvy</p><div className="flex flex-wrap gap-2">{colors.map(color => <button key={color} onClick={() => togglePreference('colors', color)} className={`px-3 py-2 rounded-full text-xs font-semibold border ${preferences.colors.includes(color) ? 'bg-[#241E1A] text-white' : 'bg-white border-[#DED3C7]'}`}>{color}</button>)}</div><button onClick={() => save({ preferences })} disabled={saving} className="mt-4 rounded-xl bg-[#F2ECE4] px-4 py-2.5 text-sm font-bold">Uložit preference</button></Card></div>;

  const renderSettings = () => <div className="space-y-5"><Card title="Změna hesla"><div className="space-y-3 max-w-lg"><input type="password" className="w-full rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" placeholder="Současné heslo" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} /><input type="password" className="w-full rounded-xl border border-[#DED3C7] px-4 py-3 text-sm" placeholder="Nové heslo (min. 8 znaků)" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} /><button onClick={async () => { try { const r = await fetch('/api/customer/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Heslo se nepodařilo změnit.'); addToast('success', 'Heslo změněno', 'Nové heslo bylo uloženo.'); setForm({ ...form, currentPassword: '', newPassword: '' }); } catch (e: any) { addToast('error', 'Chyba', e.message); } }} className="rounded-xl bg-[#241E1A] text-white px-4 py-2.5 text-sm font-bold">Změnit heslo</button></div></Card><Card title="Bezpečnost"><div className="flex gap-3 items-start"><ShieldCheck className="w-5 h-5 text-[#8C7355] mt-0.5" /><p className="text-sm text-[#6F6258]">Nikdy nikomu nesdělujte své heslo. Z účtu se můžete kdykoliv odhlásit.</p></div></Card><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-red-200 text-red-600 px-4 py-2.5 text-sm font-bold"><LogOut className="w-4 h-4" /> Odhlásit se</button></div>;

  let content: React.ReactNode = renderOverview();
  if (tab === 'orders') content = renderOrders();
  if (tab === 'favorites') content = renderFavorites();
  if (tab === 'collections') content = renderCollections();
  if (tab === 'addresses') content = renderAddresses();
  if (tab === 'benefits') content = renderBenefits();
  if (tab === 'profile') content = renderProfile();
  if (tab === 'settings') content = renderSettings();

  return <div className="min-h-[70vh] bg-[#FBF8F4] px-3 sm:px-5 lg:px-8 py-8"><div className="max-w-7xl mx-auto"><div className="mb-6"><div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#9A8878] font-bold">Můj Luvia</p><h1 className="font-editorial text-4xl font-bold mt-1">Vítejte, {account.name}</h1><p className="text-sm text-[#7D6F64] mt-1">Spravujte objednávky, oblíbené produkty, adresy a své Luvia výhody.</p></div><button onClick={() => setPage('catalog')} className="inline-flex items-center gap-2 rounded-xl bg-[#241E1A] text-white px-4 py-2.5 text-sm font-bold">Pokračovat v nákupu <ArrowRight className="w-4 h-4" /></button></div></div><div className="flex gap-2 overflow-x-auto pb-3 mb-5">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border ${tab === id ? 'bg-[#241E1A] text-white border-[#241E1A]' : 'bg-white border-[#E4D9CD] text-[#5F534B]'}`}><Icon className="w-4 h-4" />{label}</button>)}</div>{content}</div></div>;
};

const Stat: React.FC<{ title: string; value: React.ReactNode; icon: React.ElementType }> = ({ title, value, icon: Icon }) => <div className="bg-white rounded-2xl border border-[#E4D9CD] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#897A6E] font-semibold">{title}</span><Icon className="w-4 h-4 text-[#8C7355]" /></div><div className="text-2xl font-bold mt-2">{value}</div></div>;
const Card: React.FC<{ title?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => <section className="bg-white rounded-2xl border border-[#E4D9CD] p-4 sm:p-5"><div className="flex items-center justify-between gap-3">{title && <h2 className="font-bold text-lg">{title}</h2>}{action}</div><div className={title ? 'mt-4' : ''}>{children}</div></section>;
const Empty: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => <div className="rounded-2xl border border-dashed border-[#DED3C7] bg-[#FCFAF7] p-8 text-center"><Icon className="w-7 h-7 mx-auto text-[#A18F7E]" /><p className="text-sm text-[#7D6F64] mt-3">{text}</p></div>;
const MiniProduct: React.FC<{ product: Product; onClick: () => void }> = ({ product, onClick }) => <button onClick={onClick} className="text-left rounded-xl overflow-hidden border border-[#E7DDD2] bg-white"><img src={product.imageUrl} alt="" className="w-full aspect-square object-cover" /><div className="p-2"><p className="text-xs font-bold line-clamp-2">{product.title}</p><p className="text-xs font-bold mt-1">{money(product.price)}</p></div></button>;
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-xl"><div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F2ECE4]">×</button></div>{children}</div></div>;
