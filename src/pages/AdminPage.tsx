import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Order, AdminUser, SiteConfig, GalleryItem } from '../types';
import { SafeImage } from '../components/SafeImage';
import { ImageUploader } from '../components/ImageUploader';
import {
  subscribeAdminUsers,
  verifyAdminCredentials,
  saveAdminUserToFirestore,
  deleteAdminUserFromFirestore,
  subscribeCoupons,
  saveCouponToFirestore,
  deleteCouponFromFirestore
} from '../services/firestoreService';
import {
  Lock,
  LogOut,
  ShoppingBag,
  Package,
  FileText,
  Palette,
  Mail,
  Users,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Send,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  Tag,
  MapPin,
  Phone,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Coupon } from '../types';

export const AdminPage: React.FC = () => {
  const {
    adminUser,
    loginAdmin,
    logoutAdmin,
    config,
    updateConfigState,
    products,
    categories,
    gallery,
    refreshData,
    addProductItem,
    updateProductItem,
    deleteProductItem,
    addCategory,
    updateCategory,
    deleteCategory,
    addGalleryItem,
    deleteGalleryItem,
    addToast,
    setPage
  } = useApp();

  // Login form state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'gallery' | 'content' | 'branding' | 'emails' | 'users' | 'coupons'>('products');

  // Coupons (slevové kódy) state — pouze pro hlavní správce
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percent' | 'fixed'>('percent');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [couponsLoading, setCouponsLoading] = useState(false);

  // Orders list state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Product Filters & Search State
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productStockFilter, setProductStockFilter] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Product Editing modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Gallery Editing state
  const [newGalleryItem, setNewGalleryItem] = useState<Partial<GalleryItem>>({
    title: '',
    category: 'Věnce a dekorace',
    imageUrl: '',
    description: ''
  });
  const [isAddingGallery, setIsAddingGallery] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);

  // Users management state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'editor'>('admin');

  // Password change state
  const [currentNewPassword, setCurrentNewPassword] = useState('');

  // Test Email State
  const [testEmailTarget, setTestEmailTarget] = useState('ondrej.andel@email.cz');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  // Local config form state for editing
  const [localConfig, setLocalConfig] = useState<SiteConfig>(config);
  const [savingConfig, setSavingConfig] = useState(false);

  // Custom In-App Delete Confirmation Modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'product' | 'gallery' | 'user' | null;
    id: string;
    title: string;
  }>({
    open: false,
    type: null,
    id: '',
    title: ''
  });

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Load orders & users when logged in with real-time subscription
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          updateConfigState(await res.json());
        }
      }
    } catch (err) {
      console.warn('Config reload failed:', err);
    }
  };

  useEffect(() => {
    if (!adminUser) return;
    setOrdersLoading(true);
    const unsubUsers = subscribeAdminUsers((liveUsers) => {
      if (liveUsers && liveUsers.length > 0) {
        setAdminUsers(liveUsers);
      }
    });

    loadOrders();
    loadUsers();
    loadConfig();

    // Auto-refresh orders/users/config every 3 seconds
    const poll = setInterval(() => {
      loadOrders();
      loadUsers();
      loadConfig();
    }, 3000);

    return () => {
      unsubUsers();
      clearInterval(poll);
    };
  }, [adminUser]);

  // --- Coupons (slevové kódy) ---
  const loadCoupons = async () => {
    if (!adminUser) return;
    setCouponsLoading(true);
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCoupons(data);
      }
    } catch (err) {
      console.warn('Coupons load failed:', err);
    } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      loadCoupons();
      const unsub = subscribeCoupons((liveCoupons) => {
        if (Array.isArray(liveCoupons) && liveCoupons.length > 0) {
          setCoupons(liveCoupons);
        }
      });
      return () => unsub();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  const handleAddCoupon = async () => {
    const code = newCouponCode.trim().toUpperCase();
    const value = Number(newCouponValue);
    if (!code || !value || value <= 0) {
      addToast('error', 'Chybí údaje', 'Zadejte kód a kladnou hodnotu slevy.');
      return;
    }
    if (newCouponType === 'percent' && value > 100) {
      addToast('error', 'Neplatná hodnota', 'Procentní sleva může být nejvýše 100 %.');
      return;
    }
    try {
      const createdCoupon: Coupon = {
        id: `cup-${Date.now()}`,
        code,
        type: newCouponType,
        value,
        active: true,
        createdAt: new Date().toISOString()
      };
      
      await saveCouponToFirestore(createdCoupon);

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type: newCouponType, value, active: true, adminUser })
      });
      
      setCoupons(prev => [createdCoupon, ...prev.filter(c => c.code !== code)]);
      addToast('success', 'Slevový kód vytvořen', `${code} — ${newCouponType === 'percent' ? `${value} %` : `${value.toLocaleString('cs-CZ')} Kč`}`);
      setNewCouponCode('');
      setNewCouponValue('');
      loadCoupons();
    } catch (err: any) {
      addToast('error', 'Kód se nepodařilo vytvořit', err.message);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const updated = { ...coupon, active: !coupon.active };
      await saveCouponToFirestore(updated);

      await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active, adminUser })
      });

      setCoupons(prev => prev.map(c => c.id === coupon.id ? updated : c));
      addToast('info', coupon.active ? 'Kód deaktivován' : 'Kód aktivován', coupon.code);
    } catch (err: any) {
      addToast('error', 'Změna se nepodařila', err.message);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    try {
      await deleteCouponFromFirestore(coupon.id);

      await fetch(`/api/coupons/${coupon.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUser })
      });

      setCoupons(prev => prev.filter(c => c.id !== coupon.id));
      addToast('info', 'Slevový kód smazán', coupon.code);
    } catch (err: any) {
      addToast('error', 'Kód se nepodařilo smazat', err.message);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) setOrders(data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch API orders fallback", e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAdminUsers(data);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load admin users from API", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const cleanEmail = emailInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanEmail || !cleanPass) {
      setLoginError('Zadejte prosím e-mail a heslo.');
      setLoginLoading(false);
      return;
    }

    try {
      let loggedUser: AdminUser | null = null;
      let token = `luvia_tok_${Date.now()}`;

      // 1. Try server API login safely without crashing on non-JSON
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data.user) {
            loggedUser = data.user;
            token = data.token || token;
          } else if (!res.ok && data.error && !cleanEmail.toLowerCase().includes('ondrej.andel')) {
            // Only throw error if not the primary admin
            throw new Error(data.error);
          }
        }
      } catch (apiErr: any) {
        console.warn("API login attempt note:", apiErr?.message);
      }

      // 2. If API didn't authenticate (or returned HTML / proxy 404), authenticate via Firestore / admin fallback
      if (!loggedUser) {
        loggedUser = await verifyAdminCredentials(cleanEmail, cleanPass);
      }

      if (!loggedUser) {
        throw new Error('Neplatné přihlašovací údaje.');
      }

      loginAdmin(loggedUser, token);
      addToast('success', 'Přihlášení úspěšné', `Vítejte v administraci, ${loggedUser.name}!`);
    } catch (err: any) {
      setLoginError(err.message || 'Přihlášení selhalo.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig)
      });

      if (!res.ok) throw new Error('Uložení nastavení selhalo');
      const updated = await res.json();
      updateConfigState(updated);
      addToast('success', 'Nastavení uloženo', 'Změny byly úspěšně aplikovány.');
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // --- PRODUCT MANAGEMENT ---
  const handleOpenNewProduct = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      title: '',
      category: 'vence',
      price: 1290,
      compareAtPrice: undefined,
      isPriceFrom: false,
      pricePrefix: undefined,
      description: '',
      shortDescription: '',
      imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
      inStock: true,
      featured: false,
      badge: 'Novinka',
      dimensions: 'Průměr 45 cm',
      materials: 'Přírodní eukalyptus, bavlník, sušina'
    });
    setIsNewProduct(true);
  };

  const handleDuplicateProduct = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct({
      ...product,
      id: `prod-${Date.now()}`,
      title: `${product.title} (Kopie)`
    });
    setIsNewProduct(true);
    addToast('info', 'Kopie připravena', 'Můžete upravit detaily a uložit jako nový produkt.');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.title.trim()) {
      addToast('error', 'Chyba formuláře', 'Vyplňte prosím název produktu.');
      return;
    }

    setSavingProduct(true);
    try {
      if (isNewProduct) {
        await addProductItem(editingProduct);
        addToast('success', 'Produkt přidán', `"${editingProduct.title}" byl úspěšně zařazen do nabídky.`);
      } else {
        await updateProductItem(editingProduct.id, editingProduct);
        addToast('success', 'Produkt upraven', `Změny u "${editingProduct.title}" byly uloženy.`);
      }
      setEditingProduct(null);
    } catch (err: any) {
      addToast('error', 'Chyba při ukládání', err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName('');
      addToast('success', 'Kategorie přidána');
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    }
  };

  const handleRenameCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      await updateCategory(id, editingCategoryName.trim());
      setEditingCategoryId(null);
      addToast('success', 'Kategorie přejmenována');
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      if (productCategoryFilter === id) setProductCategoryFilter('all');
      addToast('info', 'Kategorie smazána');
    } catch (err: any) {
      addToast('error', 'Kategorie nelze smazat', err.message);
    }
  };

  const handleToggleStock = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedStock = !product.inStock;
      await updateProductItem(product.id, { inStock: updatedStock });
          addToast('info', 'Dostupnost změněna', `${product.title}: ${updatedStock ? 'Skladem' : 'Není skladem'}`);
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    }
  };

  // Trigger Custom In-App Modal for Product Deletion
  const triggerDeleteProduct = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      open: true,
      type: 'product',
      id,
      title
    });
  };

  // Perform confirmed deletion
  const handleExecuteDelete = async () => {
    if (!deleteConfirm.type || !deleteConfirm.id) return;

    try {
      if (deleteConfirm.type === 'product') {
        await deleteProductItem(deleteConfirm.id);
        addToast('info', 'Produkt smazán', `Položka "${deleteConfirm.title}" byla odstraněna.`);
      } else if (deleteConfirm.type === 'gallery') {
        await deleteGalleryItem(deleteConfirm.id);
        addToast('info', 'Fotografie smazána', 'Položka byla odebrána z galerie.');
      } else if (deleteConfirm.type === 'user') {
        try {
          await deleteAdminUserFromFirestore(deleteConfirm.id);
        } catch (fsErr) {
          console.warn("Firestore user delete notice:", fsErr);
        }
        try {
          await fetch(`/api/auth/users/${deleteConfirm.id}`, { method: 'DELETE' });
        } catch (apiErr) {
          console.warn("API user delete notice:", apiErr);
        }
        await loadUsers();
        addToast('info', 'Uživatel smazán', `Přístup pro ${deleteConfirm.title} byl odebrán.`);
      }
    } catch (err: any) {
      addToast('error', 'Chyba při mazání', err.message);
    } finally {
      setDeleteConfirm({ open: false, type: null, id: '', title: '' });
    }
  };

  // --- GALLERY MANAGEMENT ---
  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryItem.title || !newGalleryItem.imageUrl) {
      addToast('error', 'Vyplňte název a URL obrázku');
      return;
    }

    setSavingGallery(true);
    try {
      await addGalleryItem({
        title: newGalleryItem.title,
        category: newGalleryItem.category || 'Dekorace',
        imageUrl: newGalleryItem.imageUrl,
        description: newGalleryItem.description || ''
      });
      setNewGalleryItem({ title: '', category: 'Věnce a dekorace', imageUrl: '', description: '' });
      setIsAddingGallery(false);
      addToast('success', 'Foto přidáno do galerie');
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    } finally {
      setSavingGallery(false);
    }
  };

  // --- ORDER STATUS UPDATE ---
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error('Aktualizace stavu selhala');
      const updatedOrder = await res.json();
      setOrders(prev => prev.map(order => order.id === orderId ? updatedOrder : order));
      addToast('success', 'Stav objednávky aktualizován');
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    }
  };

  // --- RESEND EMAIL TEST ---
  const handleTestResendEmail = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/test-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: localConfig.resend?.apiKey,
          targetEmail: testEmailTarget,
          fromEmail: localConfig.resend?.senderEmail
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestEmailResult(`✅ ${data.message}`);
        addToast('success', 'Testovací e-mail odeslán!', data.message);
      } else {
        setTestEmailResult(`❌ ${data.message}`);
        addToast('error', 'Chyba Resend API', data.message);
      }
    } catch (err: any) {
      setTestEmailResult(`❌ ${err.message}`);
      addToast('error', 'Chyba', err.message);
    } finally {
      setTestingEmail(false);
    }
  };

  // --- USERS MANAGEMENT ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) {
      addToast('error', 'Vyplňte e-mail a heslo');
      return;
    }

    try {
      const newUser: AdminUser = {
        id: `usr-${Date.now()}`,
        email: newAdminEmail.toLowerCase().trim(),
        name: newAdminName.trim() || newAdminEmail.split('@')[0],
        role: newAdminRole,
        createdAt: new Date().toISOString()
      };

      try {
        await saveAdminUserToFirestore({
          ...newUser,
          password: newAdminPassword
        });
      } catch (fsErr) {
        console.warn("Firestore save user notice:", fsErr);
      }

      try {
        await fetch('/api/auth/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newAdminEmail,
            name: newAdminName,
            password: newAdminPassword,
            role: newAdminRole
          })
        });
      } catch (apiErr) {
        console.warn("API save user notice:", apiErr);
      }

      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPassword('');
      addToast('success', 'Uživatel vytvořen', 'Nový administrátorský účet byl přidán.');
      loadUsers();
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNewPassword) return;

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminUser?.email,
          newPassword: currentNewPassword
        })
      });

      if (!res.ok) throw new Error('Změna hesla selhala');
      setCurrentNewPassword('');
      addToast('success', 'Heslo změněno', 'Vaše heslo bylo úspěšně aktualizováno.');
    } catch (err: any) {
      addToast('error', 'Chyba', err.message);
    }
  };

  // Filtered Products Memo
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = productSearch === '' ||
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase());

      const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;

      const matchesStock = productStockFilter === 'all' ||
        (productStockFilter === 'in_stock' && p.inStock) ||
        (productStockFilter === 'out_of_stock' && !p.inStock);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, productSearch, productCategoryFilter, productStockFilter]);

  // Filtered Orders Memo
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter(o => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  // Sample Images Quick Presets for Products Form
  const sampleImages = [
    { label: 'Přírodní věnec', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80' },
    { label: 'Eukalyptus & bavlna', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80' },
    { label: 'Svatební kytice', url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80' },
    { label: 'Aranžmá v keramice', url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80' },
    { label: 'Sojová svíčka', url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80' },
    { label: 'Minimalistická váza', url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80' },
  ];

  // --- LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!adminUser) {
    return (
      <div id="admin-login-view" className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8DFC8] shadow-xl space-y-6">

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#2D2723] text-[#EBDCC8] flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="font-editorial text-3xl font-bold text-[#2D2723]">
              Administrace Luvia Decor
            </h1>
            <p className="text-xs text-[#7B6E63]">
              Správa produktů, skladu, objednávek a nastavení ateliéru.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C5046] mb-1">
                E-mail administrátora
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="vase.jmeno@domena.cz"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C5046] mb-1">
                Zabezpečené heslo
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>{loginLoading ? 'Ověřuji...' : 'Přihlásit se'}</span>
            </button>
          </form>

          <div className="pt-1 text-center">
            <button
              onClick={() => setPage('home')}
              className="text-xs text-[#8C7355] hover:underline"
            >
              ← Zpět na web Luvia Decor
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- LOGGED IN ADMIN DASHBOARD ---
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'zruseno' ? o.totalPrice : 0), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'nova').length;
  const inStockCount = products.filter(p => p.inStock).length;

  return (
    <div id="admin-dashboard-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* 1. TOP HEADER BAR */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C7355]">
              Administrační centrum
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
              Přihlášen
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D2723] mt-1">
            Správa ateliéru Luvia Decor
          </h1>
          <p className="text-xs text-[#7B6E63] mt-0.5">
            Účet: <strong>{adminUser.email}</strong> ({adminUser.name || 'Správce'})
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setPage('home')}
            className="px-4 py-2 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-[#2D2723] text-xs font-semibold rounded-xl border border-[#E3DACF] transition cursor-pointer flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Zobrazit e-shop
          </button>
          <button
            onClick={logoutAdmin}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Odhlásit
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION TABS WITH BADGES */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8DFC8]">
        {[
          { id: 'products', label: `Produkty & Sklad (${products.length})`, icon: Package },
          { id: 'orders', label: `Objednávky (${orders.length})`, icon: ShoppingBag, badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} nových` : undefined },
          { id: 'gallery', label: `Fotogalerie (${gallery.length})`, icon: ImageIcon },
          { id: 'overview', label: 'Přehled & Tržby', icon: Shield },
          { id: 'content', label: 'Texty & Bannery', icon: FileText },
          { id: 'branding', label: 'Branding & Sídlo', icon: Palette },
          { id: 'emails', label: 'Resend E-maily', icon: Mail },
          ...(adminUser?.role === 'admin' ? [{ id: 'coupons', label: 'Slevové kódy', icon: Tag }] : []),
          { id: 'users', label: 'Správa účtů', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#2D2723] text-white shadow-sm'
                  : 'bg-white text-[#5C4F44] hover:bg-[#FAF6F0] border border-[#E8DFC8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCTS & INVENTORY (PRIORITY REQ) */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-editorial text-lg font-bold text-[#2D2723]">Kategorie produktů</h3>
              <span className="text-[11px] text-[#7B6E63]">Sdílené pro celý e-shop</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map(category => (
                <div key={category.id} className="flex items-center gap-1 rounded-lg border border-[#E3DACF] bg-[#FAF8F5] px-2 py-1">
                  {editingCategoryId === category.id ? (
                    <input autoFocus value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(category.id); }} className="w-36 bg-white px-1.5 py-1 text-xs border border-[#D8C9B7] rounded" />
                  ) : <span className="text-xs text-[#5C5046]">{category.name}</span>}
                  {editingCategoryId === category.id ? (
                    <button type="button" onClick={() => handleRenameCategory(category.id)} className="p-1 text-emerald-700" title="Uložit název"><Check className="w-3.5 h-3.5" /></button>
                  ) : (
                    <button type="button" onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }} className="p-1 text-[#8C7355]" title="Přejmenovat"><Edit2 className="w-3.5 h-3.5" /></button>
                  )}
                  <button type="button" onClick={() => handleDeleteCategory(category.id)} className="p-1 text-rose-600" title="Smazat kategorii"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }} placeholder="Nová kategorie" className="flex-1 px-3 py-2 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs" />
              <button type="button" onClick={handleAddCategory} className="px-3 py-2 bg-[#2D2723] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Přidat</button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Hledat produkt podle názvu, kategorie..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] focus:outline-none focus:ring-2 focus:ring-[#8C7355]/30"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] font-medium cursor-pointer"
              >
                <option value="all">Všechny kategorie</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>

              {/* Stock Filter */}
              <select
                value={productStockFilter}
                onChange={(e) => setProductStockFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723] font-medium cursor-pointer"
              >
                <option value="all">Všechna skladovost</option>
                <option value="in_stock">Pouze skladem ({inStockCount})</option>
                <option value="out_of_stock">Není skladem ({products.length - inStockCount})</option>
              </select>
            </div>

            {/* Add Product Button */}
            <button
              onClick={handleOpenNewProduct}
              className="px-4 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat produkt</span>
            </button>
          </div>

          {/* Product Count Summary */}
          <div className="flex items-center justify-between text-xs text-[#7B6E63] px-1">
            <span>
              Zobrazeno <strong>{filteredProducts.length}</strong> z celkem <strong>{products.length}</strong> položek
            </span>
            <span>
              Skladem: <strong className="text-emerald-700">{inStockCount}</strong> | Není skladem: <strong className="text-rose-700">{products.length - inStockCount}</strong>
            </span>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E8DFC8] text-center space-y-3">
              <Package className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-editorial text-xl font-bold text-[#2D2723]">Žádné produkty neodpovídají filtru</h3>
              <p className="text-xs text-stone-500">Zkuste upravit hledaný výraz nebo vyresetovat filtry.</p>
              <button
                onClick={() => { setProductSearch(''); setProductCategoryFilter('all'); setProductStockFilter('all'); }}
                className="px-4 py-2 bg-[#FAF5EE] text-xs font-bold rounded-xl border border-[#E3DACF] hover:bg-[#F2ECE4] cursor-pointer"
              >
                Zrušit filtry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl p-4 border border-[#E8DFC8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex gap-3.5 items-start">
                     {/* Thumbnail */}
                     <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#FAF8F5] border border-[#EDE5DA] shrink-0">
                       <SafeImage
                         src={prod.imageUrl}
                         alt={prod.title}
                         className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                         loading="lazy"
                       />
                      {prod.badge && (
                        <span className="absolute top-1 left-1 bg-[#2D2723]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {prod.badge}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7355] bg-[#FAF5EE] px-2 py-0.5 rounded-md border border-[#EFE5D8]">
                          {prod.category}
                        </span>
                        {prod.featured && (
                          <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            ★ Top
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-[#2D2723] mt-1 line-clamp-1" title={prod.title}>
                        {prod.title}
                      </h4>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xs font-bold text-[#8C7355]">
                          {prod.isPriceFrom ? `${prod.pricePrefix || 'Od'} ` : ''}
                          {prod.price.toLocaleString('cs-CZ')} Kč
                        </span>
                        {prod.compareAtPrice && (
                          <span className="text-[10px] text-stone-400 line-through">
                            {prod.compareAtPrice.toLocaleString('cs-CZ')} Kč
                          </span>
                        )}
                      </div>

                      {/* Stock Toggle Button */}
                      <button
                        onClick={(e) => handleToggleStock(prod, e)}
                        className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                          prod.inStock
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Kliknutím přepnete skladovost"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${prod.inStock ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                        <span>{prod.inStock ? 'Skladem' : 'Není skladem'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-[#F2ECE4] flex items-center justify-between gap-2">
                    <span className="text-[10px] text-stone-400 truncate max-w-[100px]">
                      {prod.dimensions || 'ID: ' + prod.id.slice(-6)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDuplicateProduct(prod, e)}
                        className="px-2 py-1 bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[#5C4F44] border border-[#E3DACF] rounded-lg text-xs font-medium transition cursor-pointer"
                        title="Duplikovat jako nový produkt"
                      >
                        Kopie
                      </button>
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setIsNewProduct(false);
                        }}
                        className="px-2.5 py-1 bg-[#FAF5EE] hover:bg-[#EFE7DC] text-[#2D2723] border border-[#DECDBB] rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Upravit produkt"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#8C7355]" />
                        <span>Upravit</span>
                      </button>
                      <button
                        onClick={(e) => triggerDeleteProduct(prod.id, prod.title, e)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition cursor-pointer"
                        title="Smazat produkt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRODUCT EDIT / CREATE MODAL */}
          {/* ========================================================================= */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-[#E8DFC8] shadow-2xl space-y-6 animate-fade-in">

                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C7355]">
                      {isNewProduct ? 'Nový produkt' : 'Úprava položky'}
                    </span>
                    <h3 className="font-editorial text-2xl font-bold text-[#2D2723]">
                      {isNewProduct ? 'Zařadit nový produkt' : editingProduct.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="p-2 rounded-xl bg-[#FAF5EE] hover:bg-[#EFE7DC] text-[#2D2723] transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">

                  {/* Title */}
                  <div>
                    <label className="block font-semibold text-[#5C5046] mb-1">Název produktu *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.title}
                      onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                      placeholder="Např. Podzimní věnec s bavlníkem a eukalyptem"
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723] focus:ring-2 focus:ring-[#8C7355]/30 focus:outline-none"
                    />
                  </div>

                  {/* Category & Badge */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#5C5046] mb-1">Kategorie *</label>
                      <select
                        value={editingProduct.category}
                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723] font-medium"
                      >
                        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#5C5046] mb-1">Štítek / Odznak</label>
                      <select
                        value={editingProduct.badge || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, badge: (e.target.value || undefined) as any })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723]"
                      >
                        <option value="">Bez štítku</option>
                        <option value="Bestseller">Bestseller</option>
                        <option value="Novinka">Novinka</option>
                        <option value="Oblíbené">Oblíbené</option>
                        <option value="Limitovaná edice">Limitovaná edice</option>
                        <option value="Na zakázku">Na zakázku</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EDE5DA] space-y-3">
                    <span className="font-bold text-[#2D2723] uppercase text-[11px] block">
                      Cenové nastavení
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-[#5C5046] mb-1">Základní cena (Kč) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723] font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#5C5046] mb-1">Původní cena (přeškrtnutá, volitelné)</label>
                        <input
                          type="number"
                          min={0}
                          value={editingProduct.compareAtPrice || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, compareAtPrice: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="Např. 1590"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                        />
                      </div>
                    </div>

                    {/* 'Od' Price Prefix Setting */}
                    <div className="pt-2 border-t border-[#E8DFC8]/60 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#2D2723]">
                        <input
                          type="checkbox"
                          checked={editingProduct.isPriceFrom || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditingProduct({
                              ...editingProduct,
                              isPriceFrom: checked,
                              pricePrefix: checked ? (editingProduct.pricePrefix || 'Od') : undefined
                            });
                          }}
                          className="w-4 h-4 rounded text-[#8C7355] accent-[#8C7355]"
                        />
                        <span>Cena je začínající / orientační (např. 'Od 1 290 Kč')</span>
                      </label>

                      {editingProduct.isPriceFrom && (
                        <div className="pl-6 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">
                              Text prefixu před cenou
                            </label>
                            <input
                              type="text"
                              value={editingProduct.pricePrefix || 'Od'}
                              onChange={(e) => setEditingProduct({ ...editingProduct, pricePrefix: e.target.value })}
                              placeholder="Např. Od, Cena od, Již od"
                              className="w-full px-3 py-1.5 bg-white border border-[#E3DACF] rounded-lg text-[#2D2723] text-xs"
                            />
                          </div>
                          <div className="text-[11px] text-[#7B6E63] bg-white p-2 rounded-lg border border-[#E3DACF]">
                            <span>Náhled zobrazení: </span>
                            <strong className="text-[#8C7355] font-bold text-xs">
                              {editingProduct.pricePrefix ? `${editingProduct.pricePrefix} ` : 'Od '}
                              {editingProduct.price.toLocaleString('cs-CZ')} Kč
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                   {/* Image URL & Live Preview */}
                   <div className="space-y-2">
                     <label className="block font-semibold text-[#5C5046]">URL Hlavního obrázku *</label>
                     <div className="flex gap-3 items-center">
                       <input
                         type="url"
                         required
                         value={editingProduct.imageUrl}
                         onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                         placeholder="https://images.unsplash.com/..."
                         className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723]"
                       />
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-[#EDE5DA] shrink-0">
                          <SafeImage
                            src={editingProduct.imageUrl}
                            alt="Náhled"
                            className="w-full h-full"
                            loading="lazy"
                          />
                        </div>
                     </div>

                     {/* File Upload */}
                     <div className="pt-2">
                       <span className="text-[10px] text-stone-500 font-semibold block mb-1">
                         Nebo nahrajte soubor z počítače (Firebase Storage):
                       </span>
                       <ImageUploader
                         folder="products"
                         currentImageUrl={editingProduct.imageUrl}
                         onUploadComplete={(url) => setEditingProduct({ ...editingProduct, imageUrl: url })}
                         buttonText="Nahrát do Firebase"
                       />
                     </div>

                     {/* Image Preset Quick Pickers */}
                     <div className="pt-1">
                       <span className="text-[10px] text-stone-500 font-semibold block mb-1">
                         Nebo zvolte z ukázkových fotografií ateliéru:
                       </span>
                       <div className="flex flex-wrap gap-1.5">
                         {sampleImages.map((preset, idx) => (
                           <button
                             type="button"
                             key={idx}
                             onClick={() => setEditingProduct({ ...editingProduct, imageUrl: preset.url })}
                             className="px-2.5 py-1 bg-[#FAF5EE] hover:bg-[#EFE7DC] text-[10px] font-semibold text-[#5C5046] rounded-md border border-[#E3DACF] transition cursor-pointer"
                           >
                             {preset.label}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>

                  {/* Description */}
                  <div>
                    <label className="block font-semibold text-[#5C5046] mb-1">Popis produktu</label>
                    <textarea
                      rows={3}
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      placeholder="Detailní popis použitých květin, stylu a atmosféry..."
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723]"
                    />
                  </div>

                  {/* Dimensions & Materials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#5C5046] mb-1">Rozměry</label>
                      <input
                        type="text"
                        value={editingProduct.dimensions || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                        placeholder="Např. Průměr 45 cm, hloubka 12 cm"
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5C5046] mb-1">Použité materiály</label>
                      <input
                        type="text"
                        value={editingProduct.materials || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, materials: e.target.value })}
                        placeholder="Např. Eukalyptus, bavlník, stuha..."
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-[#2D2723]"
                      />
                    </div>
                  </div>

                  {/* Stock and Featured Toggles */}
                  <div className="flex flex-wrap items-center gap-6 pt-2 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE5DA]">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={editingProduct.inStock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                        className="w-4 h-4 rounded text-[#8C7355]"
                      />
                      <span>Skladem k okamžitému doručení (jinak Není skladem)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={editingProduct.featured || false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                        className="w-4 h-4 rounded text-[#8C7355]"
                      />
                      <span>Zobrazit mezi doporučenými na homepage</span>
                    </label>
                  </div>

                  {/* Submit & Cancel */}
                  <div className="pt-4 border-t border-[#F2ECE4] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-5 py-2.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] rounded-xl font-semibold text-[#2D2723] cursor-pointer"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="px-6 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingProduct ? 'Ukládám...' : 'Uložit produkt'}</span>
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORDERS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2ECE4] pb-4">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Přijaté objednávky</h2>
              <p className="text-xs text-[#7B6E63]">Přehled objednávek z e-shopu odeslaných zákazníky bez nutnosti platební brány.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#FAF5EE] border border-[#E3DACF] rounded-xl text-xs font-semibold cursor-pointer"
              >
                <option value="all">Všechny stavy ({orders.length})</option>
                <option value="nova">Nové ({orders.filter(o => o.status === 'nova').length})</option>
                <option value="zpracovava_se">Zpracovává se</option>
                <option value="dokonceno">Dokončeno</option>
                <option value="zruseno">Zrušeno</option>
              </select>

              <button
                onClick={loadOrders}
                disabled={ordersLoading}
                className="px-3 py-1.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-xs font-semibold rounded-xl border border-[#E3DACF] flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                <span>Obnovit</span>
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-xs text-stone-500 py-12 text-center">Nenalezeny žádné objednávky v této kategorii.</p>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-[#FAF8F5] rounded-2xl p-5 border border-[#E8DFC8] space-y-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDE5DA] pb-3">
                    <div>
                      <span className="font-bold text-sm text-[#2D2723]">{order.orderNumber}</span>
                      <span className="text-stone-500 ml-2">({new Date(order.createdAt).toLocaleString('cs-CZ')})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                        order.status === 'nova'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'zpracovava_se'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'dokonceno'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {order.status === 'nova' && 'Nová poptávka'}
                        {order.status === 'zpracovava_se' && 'Zpracovává se'}
                        {order.status === 'dokonceno' && 'Dokončeno'}
                        {order.status === 'zruseno' && 'Zrušeno'}
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                        className="bg-white border border-[#E3DACF] rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
                      >
                        <option value="nova">Nová</option>
                        <option value="zpracovava_se">Zpracovává se</option>
                        <option value="dokonceno">Dokončeno</option>
                        <option value="zruseno">Zrušit</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer info */}
                    <div className="space-y-1 bg-white p-3.5 rounded-xl border border-[#EDE5DA]">
                      <p className="font-bold text-[#2D2723] mb-1">Údaje zákazníka:</p>
                      <p className="font-semibold text-stone-800">{order.customer.fullName}</p>
                      <p className="text-[#8C7355] font-semibold">{order.customer.email}</p>
                      <p>{order.customer.phone}</p>
                      <p className="text-stone-500">{order.customer.street}, {order.customer.zip} {order.customer.city}</p>
                      {order.customer.note && (
                        <p className="italic text-stone-600 mt-2 bg-[#FAF8F5] p-2 rounded-lg border border-[#EDE5DA]">
                          Poznámka: {order.customer.note}
                        </p>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-1 bg-white p-3.5 rounded-xl border border-[#EDE5DA]">
                      <p className="font-bold text-[#2D2723] mb-2">Položky:</p>
                      <div className="space-y-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-[#FAF5EE]">
                            <span className="font-medium">{it.quantity}× {it.title}</span>
                            <span className="font-bold text-[#8C7355]">{(it.price * it.quantity).toLocaleString('cs-CZ')} Kč</span>
                          </div>
                        ))}
                        <div className="pt-2 flex justify-between font-bold text-xs text-[#2D2723]">
                          <span>Celková cena:</span>
                          <span className="text-[#8C7355] text-sm">{order.totalPrice.toLocaleString('cs-CZ')} Kč</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-2">
                        Resend stav: {order.resendSent ? '✅ E-mail úspěšně odeslán zákazníkovi i ateliéru' : `⚠️ ${order.resendError || 'E-mail čeká na odeslání'}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GALLERY MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'gallery' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2ECE4] pb-4">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Fotogalerie & Portfolio</h2>
              <p className="text-xs text-[#7B6E63]">Správa realizovaných zakázek a autorské tvorby ateliéru.</p>
            </div>
            <button
              onClick={() => setIsAddingGallery(!isAddingGallery)}
              className="px-4 py-2 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingGallery ? 'Zavřít formulář' : 'Přidat fotografii'}</span>
            </button>
          </div>

          {/* New Gallery Item Form */}
          {isAddingGallery && (
            <form onSubmit={handleSaveGalleryItem} className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EDE5DA] space-y-4 text-xs animate-fade-in">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">Vložit novou realizaci</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Název díla *</label>
                  <input
                    type="text"
                    required
                    value={newGalleryItem.title}
                    onChange={(e) => setNewGalleryItem({ ...newGalleryItem, title: e.target.value })}
                    placeholder="Např. Svatební aranžmá zámecká zahrada"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Kategorie realizace</label>
                  <input
                    type="text"
                    value={newGalleryItem.category}
                    onChange={(e) => setNewGalleryItem({ ...newGalleryItem, category: e.target.value })}
                    placeholder="Např. Svatební floristika, Věnce..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                  />
                </div>
              </div>

               <div>
                 <label className="block font-semibold text-[#5C5046] mb-1">URL Obrázku *</label>
                 <input
                   type="url"
                   required
                   value={newGalleryItem.imageUrl}
                   onChange={(e) => setNewGalleryItem({ ...newGalleryItem, imageUrl: e.target.value })}
                   placeholder="https://images.unsplash.com/..."
                   className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                 />

                 {/* File Upload */}
                 <div className="mt-2">
                   <span className="text-[10px] text-stone-500 font-semibold block mb-1">
                     Nebo nahrajte soubor z počítače:
                   </span>
                   <ImageUploader
                     folder="gallery"
                     currentImageUrl={newGalleryItem.imageUrl}
                     onUploadComplete={(url) => setNewGalleryItem({ ...newGalleryItem, imageUrl: url })}
                     buttonText="Nahrát do Firebase"
                   />
                 </div>
               </div>

              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">Popis (volitelný)</label>
                <input
                  type="text"
                  value={newGalleryItem.description || ''}
                  onChange={(e) => setNewGalleryItem({ ...newGalleryItem, description: e.target.value })}
                  placeholder="Květinová výzdoba sálů a stolů..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingGallery(false)}
                  className="px-4 py-2 bg-white rounded-xl font-semibold border border-[#E3DACF]"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={savingGallery}
                  className="px-6 py-2 bg-[#2D2723] hover:bg-[#8C7355] text-white font-bold rounded-xl transition"
                >
                  {savingGallery ? 'Ukládám...' : 'Přidat do galerie'}
                </button>
              </div>
            </form>
          )}

           {/* Gallery Items Grid */}
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
             {gallery.map(item => (
               <div key={item.id} className="relative group bg-[#FAF8F5] rounded-2xl overflow-hidden border border-[#EDE5DA] shadow-xs">
                 <SafeImage
                   src={item.imageUrl}
                   alt={item.title}
                   className="w-full h-40 group-hover:scale-105 transition-transform duration-300"
                   loading="lazy"
                 />
                <div className="p-3">
                  <span className="text-[9px] uppercase font-bold text-[#8C7355] block">{item.category}</span>
                  <p className="font-bold text-xs text-[#2D2723] truncate">{item.title}</p>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ open: true, type: 'gallery', id: item.id, title: item.title })}
                  className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-rose-50 text-rose-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Smazat z galerie"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OVERVIEW & STATS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-white p-6 rounded-2xl border border-[#E8DFC8] shadow-sm space-y-1">
              <span className="text-xs text-[#8C7355] font-bold uppercase tracking-wider">Celkem objednávek</span>
              <p className="text-3xl font-bold font-editorial text-[#2D2723]">{orders.length}</p>
              <p className="text-[11px] text-stone-500">{pendingOrdersCount} čeká na zpracování</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8DFC8] shadow-sm space-y-1">
              <span className="text-xs text-[#8C7355] font-bold uppercase tracking-wider">Hodnota poptávek</span>
              <p className="text-3xl font-bold font-editorial text-[#8C7355]">{totalRevenue.toLocaleString('cs-CZ')} Kč</p>
              <p className="text-[11px] text-stone-500">Z dokončených i nových nákupů</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8DFC8] shadow-sm space-y-1">
              <span className="text-xs text-[#8C7355] font-bold uppercase tracking-wider">Položky v e-shopu</span>
              <p className="text-3xl font-bold font-editorial text-[#2D2723]">{products.length}</p>
              <p className="text-[11px] text-stone-500">{inStockCount} skladem k odeslání</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8DFC8] shadow-sm space-y-1">
              <span className="text-xs text-[#8C7355] font-bold uppercase tracking-wider">Resend API Stav</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">Aktivní</p>
              <p className="text-[11px] text-stone-500 truncate">{localConfig.resend?.apiKey ? 'Klíč nastaven' : 'Chybí klíč'}</p>
            </div>

          </div>

          {/* Shortcuts */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-4">
            <h3 className="font-editorial text-2xl font-bold text-[#2D2723]">Rychlé akce</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  handleOpenNewProduct();
                  setActiveTab('products');
                }}
                className="p-4 rounded-xl bg-[#FAF5EE] hover:bg-[#F2ECE4] border border-[#E3DACF] text-left space-y-1 transition cursor-pointer"
              >
                <Plus className="w-5 h-5 text-[#8C7355]" />
                <p className="font-bold text-xs text-[#2D2723]">Přidat nový produkt</p>
                <p className="text-[11px] text-[#7B6E63]">Vložit nový věnec, vázu či květinový box</p>
              </button>

              <button
                onClick={() => setActiveTab('emails')}
                className="p-4 rounded-xl bg-[#FAF5EE] hover:bg-[#F2ECE4] border border-[#E3DACF] text-left space-y-1 transition cursor-pointer"
              >
                <Mail className="w-5 h-5 text-[#8C7355]" />
                <p className="font-bold text-xs text-[#2D2723]">Odeslat testovací e-mail</p>
                <p className="text-[11px] text-[#7B6E63]">Zkontrolovat funkčnost Resend integrace</p>
              </button>

              <button
                onClick={() => setActiveTab('branding')}
                className="p-4 rounded-xl bg-[#FAF5EE] hover:bg-[#F2ECE4] border border-[#E3DACF] text-left space-y-1 transition cursor-pointer"
              >
                <Palette className="w-5 h-5 text-[#8C7355]" />
                <p className="font-bold text-xs text-[#2D2723]">Upravit sídlo a kontakty</p>
                <p className="text-[11px] text-[#7B6E63]">Změna IČO, adresy Kroměříž či odpovědné osoby</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONTENT CMS (TEXTS & BANNERS) */}
      {/* ========================================================================= */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-4">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Editace textů & sekcí</h2>
              <p className="text-xs text-[#7B6E63]">Upravujte texty, bannery a příběh ateliéru.</p>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-6 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{savingConfig ? 'Ukládám...' : 'Uložit změny'}</span>
            </button>
          </div>

          <div className="space-y-6 text-xs">

            {/* Announcement bar */}
            <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#EDE5DA] space-y-4">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">Horní informační proužek</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={localConfig.announcement?.enabled}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      announcement: { ...localConfig.announcement, enabled: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-[#8C7355]"
                  />
                  <span>Zapnout informační pruh</span>
                </label>
              </div>
              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">Text oznámení</label>
                <input
                  type="text"
                  value={localConfig.announcement?.text || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    announcement: { ...localConfig.announcement, text: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                />
              </div>
            </div>

            {/* Hero Section */}
            <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#EDE5DA] space-y-4">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">Hlavní sekce (Hero Section)</h3>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label className="block font-semibold text-[#5C5046] mb-1">Štítek / Badge text</label>
                   <input
                     type="text"
                     value={localConfig.hero.badge}
                     onChange={(e) => setLocalConfig({
                       ...localConfig,
                       hero: { ...localConfig.hero, badge: e.target.value }
                     })}
                     className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                   />
                 </div>
                 <div>
                   <label className="block font-semibold text-[#5C5046] mb-1">URL obrázku na pozadí</label>
                   <input
                     type="url"
                     value={localConfig.hero.bgImageUrl}
                     onChange={(e) => setLocalConfig({
                       ...localConfig,
                       hero: { ...localConfig.hero, bgImageUrl: e.target.value }
                     })}
                     className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                   />

                   {/* Hero Image Upload */}
                   <div className="mt-2">
                     <ImageUploader
                       folder="branding"
                       currentImageUrl={localConfig.hero.bgImageUrl}
                       onUploadComplete={(url) => setLocalConfig({
                         ...localConfig,
                         hero: { ...localConfig.hero, bgImageUrl: url }
                       })}
                       buttonText="Nahrát pozadí"
                     />
                   </div>
                 </div>
               </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Hlavní nadpis (část 1)</label>
                  <input
                    type="text"
                    value={localConfig.hero.title}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      hero: { ...localConfig.hero, title: e.target.value }
                    })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Zvýrazněný nadpis (kurzíva)</label>
                  <input
                    type="text"
                    value={localConfig.hero.titleEmphasis}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      hero: { ...localConfig.hero, titleEmphasis: e.target.value }
                    })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>
              </div>

               <div>
                 <label className="block font-semibold text-[#5C5046] mb-1">Podtitul v banneru</label>
                 <textarea
                   rows={2}
                   value={localConfig.hero.subtitle}
                   onChange={(e) => setLocalConfig({
                     ...localConfig,
                     hero: { ...localConfig.hero, subtitle: e.target.value }
                   })}
                   className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                 />
               </div>
             </div>

             {/* Custom Order Banner */}
             <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#EDE5DA] space-y-4">
               <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">Banner zakázkové tvorby</h3>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label className="block font-semibold text-[#5C5046] mb-1">Titulek banneru</label>
                   <input
                     type="text"
                     value={localConfig.customBanner?.title || ''}
                     onChange={(e) => setLocalConfig({
                       ...localConfig,
                       customBanner: { ...localConfig.customBanner, title: e.target.value }
                     })}
                     className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                   />
                 </div>
                 <div>
                   <label className="block font-semibold text-[#5C5046] mb-1">URL obrázku na pozadí</label>
                   <input
                     type="url"
                     value={localConfig.customBanner?.imageUrl || ''}
                     onChange={(e) => setLocalConfig({
                       ...localConfig,
                       customBanner: { ...localConfig.customBanner, imageUrl: e.target.value }
                     })}
                     className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                   />

                   {/* Custom Banner Image Upload */}
                   <div className="mt-2">
                     <ImageUploader
                       folder="branding"
                       currentImageUrl={localConfig.customBanner?.imageUrl || ''}
                       onUploadComplete={(url) => setLocalConfig({
                         ...localConfig,
                         customBanner: { ...localConfig.customBanner, imageUrl: url }
                       })}
                       buttonText="Nahrát pozadí banneru"
                     />
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block font-semibold text-[#5C5046] mb-1">Podtitul banneru</label>
                 <textarea
                   rows={2}
                   value={localConfig.customBanner?.subtitle || ''}
                   onChange={(e) => setLocalConfig({
                     ...localConfig,
                     customBanner: { ...localConfig.customBanner, subtitle: e.target.value }
                   })}
                   className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                 />
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label className="block font-semibold text-[#5C5046] mb-1">Text tlačítka</label>
                   <input
                     type="text"
                     value={localConfig.customBanner?.buttonText || ''}
                     onChange={(e) => setLocalConfig({
                       ...localConfig,
                       customBanner: { ...localConfig.customBanner, buttonText: e.target.value }
                     })}
                     className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                   />
                 </div>
               </div>
             </div>

           </div>
         </div>
       )}

      {/* ========================================================================= */}
      {/* TAB 6: BRANDING, LOGO & SÍDLO */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-4">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Branding, Logo & Sídlo Kroměříž</h2>
              <p className="text-xs text-[#7B6E63]">Správa vizuální identity, IČO, sídla a kontaktů.</p>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-6 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{savingConfig ? 'Ukládám...' : 'Uložit změny'}</span>
            </button>
          </div>

          <div className="space-y-6 text-xs">

            {/* Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">Název webu / brandu *</label>
                <input
                  type="text"
                  value={localConfig.siteName}
                  onChange={(e) => setLocalConfig({ ...localConfig, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">Logo text (v záhlaví)</label>
                <input
                  type="text"
                  value={localConfig.logoText}
                  onChange={(e) => setLocalConfig({ ...localConfig, logoText: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl font-bold uppercase"
                />
              </div>
               <div>
                 <label className="block font-semibold text-[#5C5046] mb-1">Favicon (URL obrázku ikony v záložce prohlížeče)</label>
                 <input
                   type="url"
                   value={localConfig.faviconUrl || ''}
                   onChange={(e) => setLocalConfig({ ...localConfig, faviconUrl: e.target.value })}
                   placeholder="https://.../favicon.png"
                   className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl"
                 />
                 <p className="text-[11px] text-stone-500 mt-1">Doporučený formát PNG/SVG, ideálně čtverec 64×64 px nebo větší. Ponechte prázdné pro výchozí ikonu.</p>

                 {/* Favicon Upload */}
                 <div className="mt-2">
                   <ImageUploader
                     folder="branding"
                     currentImageUrl={localConfig.faviconUrl || ''}
                     onUploadComplete={(url) => setLocalConfig({ ...localConfig, faviconUrl: url })}
                     buttonText="Nahrát favicon"
                   />
                 </div>

                  {localConfig.faviconUrl && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-8 h-8 rounded border border-[#E3DACF] bg-white overflow-hidden">
                        <SafeImage src={localConfig.faviconUrl} alt="Náhled faviconu" className="w-full h-full object-contain" />
                      </div>
                      <button type="button" onClick={() => setLocalConfig({ ...localConfig, faviconUrl: '' })} className="text-[11px] text-rose-600 hover:underline">Odstranit favicon</button>
                    </div>
                  )}
               </div>

               {/* Logo Image URL */}
               <div>
                 <label className="block font-semibold text-[#5C5046] mb-1">Logo obrázek (URL)</label>
                 <input
                   type="url"
                   value={localConfig.logoImageUrl || ''}
                   onChange={(e) => setLocalConfig({ ...localConfig, logoImageUrl: e.target.value })}
                   placeholder="https://.../logo.png"
                   className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl"
                 />
                 <p className="text-[11px] text-stone-500 mt-1">Pokud je nastaveno, zobrazí se místo textového loga. Doporučený poměr stran 3:1 až 4:1.</p>

                 {/* Logo Upload */}
                 <div className="mt-2">
                   <ImageUploader
                     folder="branding"
                     currentImageUrl={localConfig.logoImageUrl || ''}
                     onUploadComplete={(url) => setLocalConfig({ ...localConfig, logoImageUrl: url })}
                     buttonText="Nahrát logo"
                   />
                 </div>

                 {localConfig.logoImageUrl && (
                   <div className="flex items-center gap-2 mt-2">
                     <div className="h-10 w-auto rounded border border-[#E3DACF] bg-white overflow-hidden">
                       <SafeImage src={localConfig.logoImageUrl} alt="Náhled loga" className="h-10 w-auto object-contain" />
                     </div>
                     <button type="button" onClick={() => setLocalConfig({ ...localConfig, logoImageUrl: '' })} className="text-[11px] text-rose-600 hover:underline">Odstranit logo</button>
                   </div>
                 )}
               </div>
            </div>

            {/* Legal Information */}
            <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#E3DACF] space-y-4">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">
                Firemní & Právní údaje
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Odpovědná osoba *</label>
                  <input
                    type="text"
                    value={localConfig.responsiblePerson}
                    onChange={(e) => setLocalConfig({ ...localConfig, responsiblePerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">IČO *</label>
                  <input
                    type="text"
                    value={localConfig.ico}
                    onChange={(e) => setLocalConfig({ ...localConfig, ico: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Sídlo ateliéru *</label>
                  <input
                    type="text"
                    value={localConfig.registeredOffice}
                    onChange={(e) => setLocalConfig({ ...localConfig, registeredOffice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">Google Maps Embed URL (pro interaktivní mapu sídla)</label>
                <input
                  type="text"
                  value={localConfig.mapEmbedUrl}
                  onChange={(e) => setLocalConfig({ ...localConfig, mapEmbedUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl"
                />
              </div>
            </div>

            {/* Emails & Phones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">E-mail na objednávky *</label>
                <input
                  type="email"
                  value={localConfig.ordersEmail}
                  onChange={(e) => setLocalConfig({ ...localConfig, ordersEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">E-mail na dotazy *</label>
                <input
                  type="email"
                  value={localConfig.supportEmail}
                  onChange={(e) => setLocalConfig({ ...localConfig, supportEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">Telefon *</label>
                <input
                  type="tel"
                  value={localConfig.phoneDisplay}
                  onChange={(e) => setLocalConfig({ ...localConfig, phoneDisplay: e.target.value, phone: e.target.value.replace(/\s+/g, '') })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl"
                />
              </div>
            </div>

            {/* Social Media & Calendar Consultation Settings */}
            <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#E3DACF] space-y-4">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">
                Sociální sítě & Online konzultace
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">WhatsApp číslo *</label>
                  <input
                    type="text"
                    value={localConfig.whatsappDisplay || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      whatsappDisplay: e.target.value,
                      whatsapp: e.target.value.replace(/\s+/g, '')
                    })}
                    placeholder="+420 702 345 999"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Instagram URL *</label>
                  <input
                    type="url"
                    value={localConfig.instagramUrl || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, instagramUrl: e.target.value })}
                    placeholder="https://www.instagram.com/luvia_decor_"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Facebook URL *</label>
                  <input
                    type="url"
                    value={localConfig.facebookUrl || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, facebookUrl: e.target.value })}
                    placeholder="https://www.facebook.com/profile.php?id=61571617343463"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Konzultace (Google Calendar URL) *</label>
                  <input
                    type="url"
                    value={localConfig.consultationUrl || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, consultationUrl: e.target.value })}
                    placeholder="https://calendar.google.com/..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: RESEND API & EMAILS */}
      {/* ========================================================================= */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-4">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Resend API & E-mailové notifikace</h2>
              <p className="text-xs text-[#7B6E63]">
                Konfigurace klíče Resend v reálném čase. Všechny objednávky z košíku se automaticky odesílají zákazníkovi i ateliéru.
              </p>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-6 py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{savingConfig ? 'Ukládám...' : 'Uložit klíč'}</span>
            </button>
          </div>

          <div className="space-y-6 text-xs max-w-3xl">

            {/* Real-time Resend API key edit */}
            <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EDE5DA] space-y-4">
              <div className="flex items-center gap-2 text-[#8C7355] font-bold uppercase text-[11px]">
                <Mail className="w-4 h-4" />
                <span>Resend API Key konfigurace</span>
              </div>

              <div>
                <label className="block font-semibold text-[#5C5046] mb-1">
                  Resend API Klíč (upravitelný v reálném čase) *
                </label>
                <input
                  type="text"
                  value={localConfig.resend?.apiKey || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    resend: { ...localConfig.resend, apiKey: e.target.value }
                  })}
                  placeholder="re_..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl font-mono text-xs text-[#2D2723]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Odesílatel (From)</label>
                  <input
                    type="text"
                    value={localConfig.resend?.senderEmail || 'onboarding@resend.dev'}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      resend: { ...localConfig.resend, senderEmail: e.target.value }
                    })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                  />
                  <p className="text-[10px] text-stone-500 mt-0.5">Např. onboarding@resend.dev (pro testování bez ověřené domény)</p>
                </div>
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Cílový e-mail pro nové objednávky</label>
                  <input
                    type="email"
                    value={localConfig.resend?.notifyEmail || 'objednavky@luvia-decor.cz'}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      resend: { ...localConfig.resend, notifyEmail: e.target.value }
                    })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E3DACF] rounded-xl text-[#2D2723]"
                  />
                </div>
              </div>
            </div>

            {/* Test Email Dispatcher */}
            <div className="p-6 bg-white rounded-2xl border border-[#E8DFC8] space-y-4">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">
                Otestovat funkčnost Resend integrace
              </h3>
              <p className="text-xs text-[#7B6E63]">
                Zadejte e-mailovou adresu, na kterou se má odeslat testovací e-mail pro ověření správnosti API klíče.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  placeholder="ondrej.andel@email.cz"
                  className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs text-[#2D2723]"
                />
                <button
                  type="button"
                  onClick={handleTestResendEmail}
                  disabled={testingEmail}
                  className="px-6 py-2.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{testingEmail ? 'Odesílám...' : 'Odeslat test'}</span>
                </button>
              </div>

              {testEmailResult && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  testEmailResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  {testEmailResult}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: USERS MANAGEMENT */}
      {/* ========================================================================= */}
      {/* TAB: SLEVOVÉ KÓDY (pouze hlavní správci) */}
      {/* ========================================================================= */}
      {activeTab === 'coupons' && adminUser?.role === 'admin' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-editorial text-lg font-bold text-[#2D2723]">Slevové kódy</h3>
              <p className="text-xs text-[#7B6E63] mt-0.5">Zákazníci zadají kód v košíku a sleva se mu odečte z celkové ceny objednávky.</p>
            </div>
            <button
              onClick={loadCoupons}
              className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E3DACF] text-[#8C7355] hover:bg-[#F2ECE4] transition cursor-pointer"
              title="Obnovit seznam"
            >
              <RefreshCw className={`w-4 h-4 ${couponsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Create new coupon */}
          <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#E3DACF] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C7355]">Nový slevový kód</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Kód *</label>
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCoupon(); }}
                  placeholder="NAPŘ. JARO10"
                  className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs uppercase tracking-wide"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">Typ slevy</label>
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as 'percent' | 'fixed')}
                  className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs"
                >
                  <option value="percent">Procentní (%)</option>
                  <option value="fixed">Pevná částka (Kč)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C5046] mb-1">
                  Hodnota * {newCouponType === 'percent' ? '(%)' : '(Kč)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={newCouponType === 'percent' ? 100 : undefined}
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCoupon(); }}
                  placeholder={newCouponType === 'percent' ? '10' : '500'}
                  className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl text-xs"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddCoupon}
                  className="w-full px-3 py-2 bg-[#2D2723] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#8C7355] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />Vytvořit kód
                </button>
              </div>
            </div>
          </div>

          {/* Coupon list */}
          <div className="space-y-2">
            {coupons.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">Zatím žádné slevové kódy. Vytvořte první výše.</p>
            ) : (
              coupons.map(coupon => (
                <div key={coupon.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#E8DFC8] bg-[#FAFAF8]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#2D2723] text-sm tracking-wide">{coupon.code}</p>
                      <p className="text-[11px] text-stone-500">
                        {coupon.type === 'percent' ? `Sleva ${coupon.value} %` : `Sleva ${coupon.value.toLocaleString('cs-CZ')} Kč`}
                        {' • '}{coupon.active ? 'Aktivní' : 'Neaktivní'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleCoupon(coupon)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                        coupon.active
                          ? 'bg-white text-[#5C5046] border-[#E3DACF] hover:bg-[#F5EFE7]'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {coupon.active ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(coupon)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Smazat kód"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFC8] shadow-sm space-y-8">
          <div className="border-b border-[#F2ECE4] pb-4">
            <h2 className="font-editorial text-2xl font-bold text-[#2D2723]">Správa administrátorských účtů</h2>
            <p className="text-xs text-[#7B6E63]">
              Veřejná registrace je vypnuta. Nové účty mohou vytvářet pouze stávající administrátoři zde.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-xs">

            {/* List of admins */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-bold text-[#2D2723] uppercase tracking-wider">Aktivní administrátoři</h3>
              <div className="space-y-3">
                {adminUsers.map(usr => (
                  <div
                    key={usr.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8DFC8] flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold text-[#2D2723]">{usr.email}</p>
                      <p className="text-stone-500 text-[11px]">{usr.name} • {usr.role === 'admin' ? 'Hlavní správce' : 'Editor obsahu'}</p>
                      {usr.lastLogin && <p className="text-[10px] text-stone-400">Poslední přihlášení: {new Date(usr.lastLogin).toLocaleDateString('cs-CZ')}</p>}
                    </div>

                    {usr.email !== 'ondrej.andel@email.cz' && (
                      <button
                        onClick={() => setDeleteConfirm({ open: true, type: 'user', id: usr.id, title: usr.email })}
                        className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg cursor-pointer transition"
                        title="Odebrat účet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Change own password */}
              <div className="pt-6 border-t border-[#F0EAE1] space-y-3">
                <h4 className="font-bold text-[#2D2723] uppercase tracking-wider">Změna hesla přihlášeného účtu</h4>
                <form onSubmit={handleChangePassword} className="flex gap-2">
                  <input
                    type="password"
                    required
                    value={currentNewPassword}
                    onChange={(e) => setCurrentNewPassword(e.target.value)}
                    placeholder="Zadejte nové heslo..."
                    className="flex-1 px-3.5 py-2 bg-[#FAF8F5] border border-[#E3DACF] rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2D2723] hover:bg-[#8C7355] text-white font-bold rounded-xl cursor-pointer"
                  >
                    Změnit heslo
                  </button>
                </form>
              </div>
            </div>

            {/* Create new account form */}
            <div className="lg:col-span-5 bg-[#FAF8F5] p-6 rounded-2xl border border-[#EDE5DA] space-y-4">
              <h3 className="font-bold text-sm text-[#2D2723] uppercase tracking-wider">Vytvořit nový účet</h3>
              <p className="text-[11px] text-[#7B6E63]">Přidejte dalšího kolegu pro správu objednávek nebo obsahu.</p>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">E-mail nového správce *</label>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="kolega@luvia-decor.cz"
                    className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Jméno a příjmení</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Ladislav Pekárek"
                    className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Heslo *</label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Silné heslo"
                    className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#5C5046] mb-1">Oprávnění</label>
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#E3DACF] rounded-xl"
                  >
                    <option value="admin">Plný administrátor</option>
                    <option value="editor">Editor obsahu a objednávek</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#2D2723] hover:bg-[#8C7355] text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Vytvořit administrátora
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. CUSTOM IN-APP DELETE CONFIRMATION MODAL (NEVER BLOCKED BY SANDBOX) */}
      {/* ========================================================================= */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-rose-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-editorial text-2xl font-bold text-[#2D2723]">
                Potvrdit smazání
              </h3>
              <p className="text-xs text-[#7B6E63]">
                Opravdu si přejete trvale odstranit{' '}
                <strong className="text-rose-700 font-bold">"{deleteConfirm.title}"</strong>?
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                Tuto akci nelze vrátit zpět.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, type: null, id: '', title: '' })}
                className="px-5 py-2.5 bg-[#FAF5EE] hover:bg-[#F2ECE4] text-[#2D2723] text-xs font-semibold rounded-xl transition cursor-pointer border border-[#E3DACF]"
              >
                Zrušit
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
              >
                Ano, smazat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
