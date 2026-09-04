import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, CartItem, SiteConfig, PageRoute, AdminUser, GalleryItem, ToastMessage, ProductCategory } from '../types';
import { initialSiteConfig, initialGallery } from '../data/initialData';
import { subscribeSiteConfig, subscribeGallery, subscribeProducts, saveProductToFirestore, deleteProductFromFirestore, saveGalleryItemToFirestore, deleteGalleryItemFromFirestore, updateSiteConfigInFirestore, initializeFirestoreIfNeeded } from '../services/firestoreService';

interface AppContextType {
  page: PageRoute; setPage: (page: PageRoute, params?: { category?: string; productId?: string }) => void;
  products: Product[]; categories: ProductCategory[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  config: SiteConfig; gallery: GalleryItem[]; cart: CartItem[]; cartCount: number; cartTotal: number;
  addToCart: (product: Product, quantity?: number, note?: string) => void; removeFromCart: (productId: string) => void; updateCartQuantity: (productId: string, quantity: number) => void; clearCart: () => void;
  selectedCategory: string; setSelectedCategory: (cat: string) => void; quickViewProduct: Product | null; setQuickViewProduct: (product: Product | null) => void;
  adminUser: AdminUser | null; adminToken: string | null; loginAdmin: (user: AdminUser, token: string) => void; logoutAdmin: () => void;
  refreshData: () => Promise<void>; updateConfigState: (newConfig: Partial<SiteConfig>) => Promise<void>;
  addProductItem: (product: Omit<Product, 'id'> & { id?: string }) => Promise<Product>; updateProductItem: (id: string, updates: Partial<Product>) => Promise<Product>; deleteProductItem: (id: string) => Promise<boolean>;
  addCategory: (name: string) => Promise<ProductCategory>; updateCategory: (id: string, name: string) => Promise<ProductCategory>; deleteCategory: (id: string) => Promise<boolean>;
  addGalleryItem: (item: Omit<GalleryItem, 'id'> & { id?: string }) => Promise<GalleryItem>; deleteGalleryItem: (id: string) => Promise<boolean>;
  toasts: ToastMessage[]; addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void; removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const routeFromLocation = (): PageRoute => {
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  const hashRoutes: PageRoute[] = ['home', 'catalog', 'custom-order', 'gallery', 'contact', 'cart', 'terms', 'admin'];
  if (hashRoutes.includes(hash as PageRoute)) return hash as PageRoute;

  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const pathRoutes: Record<string, PageRoute> = {
    '/': 'home',
    '/home': 'home',
    '/eshop': 'catalog',
    '/e-shop': 'catalog',
    '/catalog': 'catalog',
    '/zakazkova-tvorba': 'custom-order',
    '/custom-order': 'custom-order',
    '/galerie': 'gallery',
    '/gallery': 'gallery',
    '/kontakt': 'contact',
    '/contact': 'contact',
    '/kosik': 'cart',
    '/cart': 'cart',
    '/obchodni-podminky': 'terms',
    '/terms': 'terms',
    '/admin': 'admin'
  };
  return pathRoutes[path] || 'home';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [page, setPageState] = useState<PageRoute>(routeFromLocation);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [config, setConfig] = useState<SiteConfig>(initialSiteConfig);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('luvia_cart') || '[]'); } catch { return []; } });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => { try { return JSON.parse(localStorage.getItem('luvia_admin_user') || 'null'); } catch { return null; } });
  const [adminToken, setAdminToken] = useState<string | null>(() => { try { return localStorage.getItem('luvia_admin_token'); } catch { return null; } });

  useEffect(() => { try { localStorage.setItem('luvia_cart', JSON.stringify(cart)); } catch {} }, [cart]);

  useEffect(() => {
    let cancelled = false;
    let unProducts: (() => void) | undefined, unConfig: (() => void) | undefined, unGallery: (() => void) | undefined;
    let categoryTimer: number | undefined;
    const syncCategories = async () => {
      try {
        const r = await fetch('/api/categories', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && Array.isArray(data)) setCategories(data);
      } catch (e) { console.warn('Categories load warning:', e); }
    };
    const start = async () => {
      try {
        await initializeFirestoreIfNeeded();
        if (cancelled) return;
        unProducts = subscribeProducts(items => { if (!cancelled) setProducts(items); });
        unConfig = subscribeSiteConfig(value => { if (!cancelled && value) setConfig(value); });
        unGallery = subscribeGallery(items => { if (!cancelled) setGallery(items.length ? items : initialGallery); });
      } catch (e) { console.warn('Firestore initialization warning:', e); }
      await syncCategories();
      categoryTimer = window.setInterval(syncCategories, 5000);
    };
    start();
    return () => { cancelled = true; if (categoryTimer) window.clearInterval(categoryTimer); unProducts?.(); unConfig?.(); unGallery?.(); };
  }, []);

  useEffect(() => {
    if (config.faviconUrl) { const link = document.getElementById('favicon-link') as HTMLLinkElement | null; if (link) link.href = config.faviconUrl; }
    if (config.siteName) document.title = `${config.siteName} | ${config.slogan || 'Ruční dekorace Kroměříž'}`;
  }, [config]);

  useEffect(() => {
    const fn = () => setPageState(routeFromLocation());
    window.addEventListener('hashchange', fn);
    window.addEventListener('popstate', fn);
    return () => { window.removeEventListener('hashchange', fn); window.removeEventListener('popstate', fn); };
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => { const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; setToasts(p => [...p, { id, type, title, message }]); window.setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500); };
  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id));
  const setPage = (newPage: PageRoute, params?: { category?: string; productId?: string }) => {
    if (params?.category) setSelectedCategory(params.category);
    if (params?.productId) setQuickViewProduct(products.find(p => p.id === params.productId) || null);
    setPageState(newPage);
    const nextHash = newPage === 'home' ? '' : newPage;
    if (window.location.hash !== (nextHash ? `#${nextHash}` : '')) window.location.hash = nextHash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const addToCart = (product: Product, quantity = 1, note?: string) => { if (!product.inStock) return addToast('error','Produkt není skladem','Tento produkt momentálně nelze vložit do košíku.'); setCart(prev => { const old = prev.find(i => i.product.id === product.id); return old ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity, customNote: note || i.customNote } : i) : [...prev, { product, quantity, customNote: note }]; }); addToast('success','Vloženo do košíku',`${product.title} (${quantity} ks) byl přidán do košíku.`); };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const updateCartQuantity = (id: string, quantity: number) => quantity <= 0 ? removeFromCart(id) : setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity } : i));
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((s,i) => s+i.quantity, 0), cartTotal = cart.reduce((s,i) => s+Number(i.product.price||0)*i.quantity, 0);
  const loginAdmin = (user: AdminUser, token: string) => { setAdminUser(user); setAdminToken(token); localStorage.setItem('luvia_admin_user',JSON.stringify(user)); localStorage.setItem('luvia_admin_token',token); };
  const logoutAdmin = () => { setAdminUser(null); setAdminToken(null); localStorage.removeItem('luvia_admin_user'); localStorage.removeItem('luvia_admin_token'); setPage('home'); };

  const refreshData = async () => { try { const [c,k] = await Promise.all([fetch('/api/config',{cache:'no-store'}),fetch('/api/categories',{cache:'no-store'})]); if(c.ok){const d=await c.json();if(d&&Object.keys(d).length)setConfig(p=>({...p,...d}));} if(k.ok){const d=await k.json();if(Array.isArray(d))setCategories(d);} } catch(e){console.warn('Refresh warning:',e);} };
  const updateConfigState = async (updates: Partial<SiteConfig>) => { setConfig(p=>({...p,...updates})); await updateSiteConfigInFirestore(updates); try { await fetch('/api/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)}); } catch {} };
  const normalizeProduct = (d:any,id:string):Product => ({...d,id,price:Number(d.price)||0,compareAtPrice:d.compareAtPrice?Number(d.compareAtPrice):undefined,inStock:d.inStock!==false,featured:Boolean(d.featured),isPriceFrom:Boolean(d.isPriceFrom),pricePrefix:d.isPriceFrom?(d.pricePrefix||'Od'):undefined});
  const addProductItem = async (data: Omit<Product,'id'> & {id?:string}) => { const p=normalizeProduct(data,data.id||`prod-${Date.now()}`); const saved=await saveProductToFirestore(p); try{await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved)});}catch{} setProducts(prev=>[saved,...prev.filter(x=>x.id!==saved.id)]); return saved; };
  const updateProductItem = async (id:string,updates:Partial<Product>) => { const current=products.find(p=>p.id===id)||({id} as Product); const p=normalizeProduct({...current,...updates},id); const saved=await saveProductToFirestore(p); try{await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved)});}catch{} setProducts(prev=>prev.map(x=>x.id===id?saved:x)); return saved; };
  const deleteProductItem = async (id:string) => { await deleteProductFromFirestore(id); try{await fetch(`/api/products/${encodeURIComponent(id)}`,{method:'DELETE'});}catch{} setProducts(prev=>prev.filter(x=>x.id!==id)); return true; };
  const addCategory = async(name:string) => { const r=await fetch('/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'Kategorie se nepodařilo přidat.'); setCategories(p=>[...p.filter(x=>x.id!==d.id),d]); return d as ProductCategory; };
  const updateCategory = async(id:string,name:string) => { const r=await fetch(`/api/categories/${encodeURIComponent(id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'Kategorie se nepodařilo upravit.'); setCategories(p=>p.map(x=>x.id===id?d:x)); return d as ProductCategory; };
  const deleteCategory = async(id:string) => { const r=await fetch(`/api/categories/${encodeURIComponent(id)}`,{method:'DELETE'}); if(!r.ok)throw new Error((await r.json().catch(()=>null))?.error||'Kategorie se nepodařilo smazat.'); setCategories(p=>p.filter(x=>x.id!==id)); return true; };
  const addGalleryItem = async(data:Omit<GalleryItem,'id'> & {id?:string}) => { const item={...data,id:data.id||`gal-${Date.now()}`} as GalleryItem; const saved=await saveGalleryItemToFirestore(item); try{await fetch('/api/gallery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved)});}catch{} setGallery(p=>[saved,...p.filter(x=>x.id!==saved.id)]); return saved; };
  const deleteGalleryItem = async(id:string) => { await deleteGalleryItemFromFirestore(id); try{await fetch(`/api/gallery/${encodeURIComponent(id)}`,{method:'DELETE'});}catch{} setGallery(p=>p.filter(x=>x.id!==id)); return true; };

  return <AppContext.Provider value={{page,setPage,products,categories,setProducts,config,gallery,cart,cartCount,cartTotal,addToCart,removeFromCart,updateCartQuantity,clearCart,selectedCategory,setSelectedCategory,quickViewProduct,setQuickViewProduct,adminUser,adminToken,loginAdmin,logoutAdmin,refreshData,updateConfigState,addProductItem,updateProductItem,deleteProductItem,addCategory,updateCategory,deleteCategory,addGalleryItem,deleteGalleryItem,toasts,addToast,removeToast}}>{children}</AppContext.Provider>;
};
export const useApp = () => { const context=useContext(AppContext); if(!context) throw new Error('useApp must be used inside AppProvider'); return context; };
