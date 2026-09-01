import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, SiteConfig, PageRoute, AdminUser, GalleryItem, ToastMessage, ProductCategory } from '../types';
import { initialSiteConfig, initialProducts, initialGallery } from '../data/initialData';
import {
  subscribeSiteConfig,
  subscribeGallery,
  saveGalleryItemToFirestore,
  deleteGalleryItemFromFirestore,
  updateSiteConfigInFirestore,
  initializeFirestoreIfNeeded
} from '../services/firestoreService';

interface AppContextType {
  page: PageRoute;
  setPage: (page: PageRoute, params?: { category?: string; productId?: string }) => void;
  products: Product[];
  categories: ProductCategory[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  config: SiteConfig;
  gallery: GalleryItem[];
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, quantity?: number, note?: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  adminUser: AdminUser | null;
  adminToken: string | null;
  loginAdmin: (user: AdminUser, token: string) => void;
  logoutAdmin: () => void;
  refreshData: () => Promise<void>;
  updateConfigState: (newConfig: Partial<SiteConfig>) => Promise<void>;
  addProductItem: (product: Omit<Product, 'id'> & { id?: string }) => Promise<Product>;
  updateProductItem: (id: string, updates: Partial<Product>) => Promise<Product>;
  deleteProductItem: (id: string) => Promise<boolean>;
  addCategory: (name: string) => Promise<ProductCategory>;
  updateCategory: (id: string, name: string) => Promise<ProductCategory>;
  deleteCategory: (id: string) => Promise<boolean>;
  addGalleryItem: (item: Omit<GalleryItem, 'id'> & { id?: string }) => Promise<GalleryItem>;
  deleteGalleryItem: (id: string) => Promise<boolean>;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getPageFromHash = (): PageRoute => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validPages: PageRoute[] = ['home', 'catalog', 'custom-order', 'gallery', 'contact', 'cart', 'admin'];
    return validPages.includes(hash as PageRoute) ? (hash as PageRoute) : 'home';
  };

  const [page, setPageState] = useState<PageRoute>(getPageFromHash);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [config, setConfig] = useState<SiteConfig>(initialSiteConfig);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Cart with local storage persistence for customer convenience
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('luvia_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Admin session
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('luvia_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('luvia_admin_token');
    } catch {
      return null;
    }
  });

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('luvia_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn("Failed to persist cart:", e);
    }
  }, [cart]);

  // Real-time Firestore subscriptions for live data across all users and devices
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const syncProducts = async () => {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const serverProducts = await response.json();
        if (!cancelled && Array.isArray(serverProducts)) {
          setProducts(serverProducts);
        }
      } catch (error) {
        console.warn('Product API load notice:', error);
      }
    };

    syncProducts();
    const productsSyncInterval = window.setInterval(syncProducts, 3000);
    const syncCategories = async () => {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const serverCategories = await response.json();
        if (!cancelled && Array.isArray(serverCategories)) setCategories(serverCategories);
      } catch (error) {
        console.warn('Categories API load notice:', error);
      }
    };
    syncCategories();
    const categoriesSyncInterval = window.setInterval(syncCategories, 3000);

    const setupSubscriptions = async () => {
      // Finish the one-time seed before any live data can be changed.
      await initializeFirestoreIfNeeded();
      if (cancelled) return;

      const unsubConfig = subscribeSiteConfig((liveConfig) => {
        if (liveConfig) {
          setConfig(liveConfig);
        }
      });

      const unsubGallery = subscribeGallery((liveGallery) => {
        if (Array.isArray(liveGallery)) {
          setGallery(liveGallery);
        }
      });

      unsubscribe = () => {
        unsubConfig();
        unsubGallery();
      };
    };

    setupSubscriptions();

    return () => {
      cancelled = true;
      window.clearInterval(productsSyncInterval);
      window.clearInterval(categoriesSyncInterval);
      unsubscribe?.();
    };
  }, []);

  // Fetch data as secondary synchronization
  const refreshData = async () => {
    try {
      const [cfgRes, prodRes, galRes] = await Promise.allSettled([
        fetch('/api/config').then(r => r.ok ? r.json() : null),
        fetch('/api/products').then(r => r.ok ? r.json() : null),
        fetch('/api/gallery').then(r => r.ok ? r.json() : null)
      ]);

      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        setConfig(prev => ({ ...prev, ...cfgRes.value }));
      }
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        setProducts(prodRes.value);
      }
      if (galRes.status === 'fulfilled' && Array.isArray(galRes.value)) {
        setGallery(galRes.value);
      }
    } catch (err) {
      console.warn("Data load from server had warning:", err);
    }
  };

  // Update dynamic favicon and title if set in config
  useEffect(() => {
    if (config.faviconUrl) {
      const favLink = document.getElementById('favicon-link') as HTMLLinkElement;
      if (favLink) favLink.href = config.faviconUrl;
    }
    if (config.siteName) {
      document.title = `${config.siteName} | ${config.slogan || 'Ruční dekorace Kroměříž'}`;
    }
  }, [config]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Listen to hashchange events for browser navigation (Back / Forward buttons & direct URLs)
  useEffect(() => {
    const handleHashChange = () => {
      const currentPage = getPageFromHash();
      setPageState(currentPage);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setPage = (newPage: PageRoute, params?: { category?: string; productId?: string }) => {
    if (params?.category) {
      setSelectedCategory(params.category);
    }
    if (params?.productId) {
      const p = products.find(prod => prod.id === params.productId);
      if (p) setQuickViewProduct(p);
    }
    setPageState(newPage);
    if (window.location.hash !== `#${newPage}`) {
      window.location.hash = newPage === 'home' ? '' : newPage;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product: Product, quantity = 1, note?: string) => {
    if (!product.inStock) {
      addToast('error', 'Produkt není skladem', 'Tento produkt momentálně nelze vložit do košíku.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, customNote: note || item.customNote }
            : item
        );
      }
      return [...prev, { product, quantity, customNote: note }];
    });
    addToast('success', 'Vloženo do košíku', `${product.title} (${quantity} ks) byl přidán do košíku.`);
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(c => c.product.id === productId);
    setCart(prev => prev.filter(item => item.product.id !== productId));
    if (item) {
      addToast('info', 'Položka odebrána', `${item.product.title} byla odebrána.`);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const loginAdmin = (user: AdminUser, token: string) => {
    setAdminUser(user);
    setAdminToken(token);
    localStorage.setItem('luvia_admin_user', JSON.stringify(user));
    localStorage.setItem('luvia_admin_token', token);
    addToast('success', 'Přihlášení úspěšné', `Vítejte zpět, ${user.name || user.email}.`);
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    setAdminToken(null);
    localStorage.removeItem('luvia_admin_user');
    localStorage.removeItem('luvia_admin_token');
    addToast('info', 'Byli jste odhlášeni');
    setPage('home');
  };

  const updateConfigState = async (newConfig: Partial<SiteConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    try {
      await updateSiteConfigInFirestore(newConfig);
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch (e) {
      console.warn("Config update error:", e);
    }
  };

  // Product operations use the shared server API for all users.
  const addProductItem = async (productData: Omit<Product, 'id'> & { id?: string }): Promise<Product> => {
    const tempId = productData.id || `prod-${Date.now()}`;
    const newProd: Product = {
      ...productData,
      id: tempId,
      price: Number(productData.price) || 0,
      compareAtPrice: productData.compareAtPrice ? Number(productData.compareAtPrice) : undefined,
      inStock: productData.inStock !== false,
      featured: Boolean(productData.featured),
      isPriceFrom: Boolean(productData.isPriceFrom),
      pricePrefix: productData.isPriceFrom ? (productData.pricePrefix || 'Od') : undefined
    };

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd)
    });
    if (!response.ok) throw new Error('Produkt se nepodařilo uložit na server.');

    const savedProduct = await response.json() as Product;
    setProducts(prev => [savedProduct, ...prev.filter(product => product.id !== savedProduct.id)]);
    return savedProduct;
  };

  const updateProductItem = async (id: string, updates: Partial<Product>): Promise<Product> => {
    const current = products.find(p => p.id === id) || ({} as Product);
    const merged: Product = {
      ...current,
      ...updates,
      id,
      price: updates.price !== undefined ? Number(updates.price) || 0 : current.price || 0
    };

    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        ...(Object.prototype.hasOwnProperty.call(updates, 'badge') ? { badge: updates.badge || null } : {})
      })
    });
    if (!response.ok) throw new Error('Produkt se nepodařilo upravit na serveru.');

    const savedProduct = await response.json() as Product;
    setProducts(prev => prev.map(product => product.id === id ? savedProduct : product));
    return savedProduct;
  };

  const deleteProductItem = async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Produkt se nepodařilo smazat ze serveru.');

    setProducts(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const addCategory = async (name: string): Promise<ProductCategory> => {
    const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Kategorie se nepodařilo přidat.');
    const category = await response.json() as ProductCategory;
    setCategories(prev => [...prev, category]);
    return category;
  };

  const updateCategory = async (id: string, name: string): Promise<ProductCategory> => {
    const response = await fetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Kategorie se nepodařilo upravit.');
    const category = await response.json() as ProductCategory;
    setCategories(prev => prev.map(item => item.id === id ? category : item));
    return category;
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Kategorie se nepodařilo smazat.');
    setCategories(prev => prev.filter(item => item.id !== id));
    return true;
  };

  // Gallery Direct Operations (Firestore Cloud Database)
  const addGalleryItem = async (itemData: Omit<GalleryItem, 'id'> & { id?: string }): Promise<GalleryItem> => {
    const tempId = itemData.id || `gal-${Date.now()}`;
    const newItem: GalleryItem = { ...itemData, id: tempId };

    try {
      await saveGalleryItemToFirestore(newItem);
      await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch (err) {
      console.warn("Gallery save error:", err);
    }
    return newItem;
  };

  const deleteGalleryItem = async (id: string): Promise<boolean> => {
    setGallery(prev => prev.filter(g => g.id !== id));
    try {
      await deleteGalleryItemFromFirestore(id);
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("Gallery delete error:", err);
    }
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        products,
        categories,
        setProducts,
        config,
        gallery,
        cart,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        selectedCategory,
        setSelectedCategory,
        quickViewProduct,
        setQuickViewProduct,
        adminUser,
        adminToken,
        loginAdmin,
        logoutAdmin,
        refreshData,
        updateConfigState,
        addProductItem,
        updateProductItem,
        deleteProductItem,
        addCategory,
        updateCategory,
        deleteCategory,
        addGalleryItem,
        deleteGalleryItem,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

