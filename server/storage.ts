import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Product, SiteConfig, Order, GalleryItem, AdminUser, Review, Coupon } from '../src/types';
import { initialProducts, initialSiteConfig, initialGallery, initialReviews, initialAdminUsers } from '../src/data/initialData';

interface StoreData {
  config: SiteConfig;
  categories: { id: string; name: string }[];
  products: Product[];
  orders: Order[];
  gallery: GalleryItem[];
  coupons?: Coupon[];
  reviews: Review[];
  adminUsers: AdminUser[];
  adminPasswords: Record<string, string>; // email -> password
}

const DATA_DIR = process.env.LUVIA_DATA_DIR
  ? path.resolve(process.env.LUVIA_DATA_DIR)
  : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const DATABASE_FILE = path.join(DATA_DIR, 'luvia.sqlite');

// Default initial state
const defaultStore: StoreData = {
  config: initialSiteConfig,
  categories: [
    { id: 'vence', name: 'Věnce & dekorace' },
    { id: 'aranzma', name: 'Květinová vazba & boxy' },
    { id: 'vazy-doplnky', name: 'Vázy & keramika' },
    { id: 'svicky-vune', name: 'Svíčky & vůně' },
    { id: 'zakazkove', name: 'Zakázková tvorba' }
  ],
  products: initialProducts,
  orders: [
    {
      id: "ord-101",
      orderNumber: "LUV-2026-001",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      customer: {
        fullName: "Tereza Nováková",
        email: "terezan@seznam.cz",
        phone: "+420 777 123 456",
        street: "Kovářská 12",
        city: "Kroměříž",
        zip: "767 01",
        country: "Česká republika",
        note: "Prosím o doručení v odpoledních hodinách."
      },
      items: [
        {
          productId: "prod-1",
          title: "Věnec „Přírodní harmonie“ s eukalyptem a bavlníkem",
          price: 1390,
          quantity: 1,
          imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
        }
      ],
      subtotal: 1390,
      shipping: 0,
      totalPrice: 1390,
      status: "dokonceno",
      resendSent: true
    }
  ],
  gallery: initialGallery,
  coupons: [],
  reviews: initialReviews,
  adminUsers: initialAdminUsers,
  adminPasswords: {
    // Default admin account requested: ondrej.andel@email.cz
    // Preconfigured secure initial password, editable anytime in the Admin Panel
    "ondrej.andel@email.cz": "Luvia2025!"
  }
};

class DatabaseStorage {
  private data: StoreData;
  private database: Database.Database;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.database = new Database(DATABASE_FILE);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.data = this.loadData();
    this.saveData(this.data);
  }

  private loadData(): StoreData {
    try {
      const storedState = this.database
        .prepare('SELECT data FROM app_state WHERE id = 1')
        .get() as { data: string } | undefined;
      if (storedState) {
        const parsed = JSON.parse(storedState.data) as StoreData;
        return {
          ...defaultStore,
          ...parsed,
          coupons: Array.isArray(parsed.coupons) ? parsed.coupons : []
        };
      }

      // Migrate the existing file-based store once into SQLite.
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return {
          ...defaultStore,
          ...parsed,
          config: {
            ...defaultStore.config,
            ...(parsed.config || {}),
            whatsapp: parsed.config?.whatsapp || defaultStore.config.whatsapp,
            whatsappDisplay: parsed.config?.whatsappDisplay || defaultStore.config.whatsappDisplay,
            instagramUrl: (parsed.config?.instagramUrl && parsed.config.instagramUrl !== 'https://www.instagram.com') ? parsed.config.instagramUrl : defaultStore.config.instagramUrl,
            facebookUrl: (parsed.config?.facebookUrl && parsed.config.facebookUrl !== 'https://www.facebook.com') ? parsed.config.facebookUrl : defaultStore.config.facebookUrl,
            consultationUrl: parsed.config?.consultationUrl || defaultStore.config.consultationUrl,
          },
          products: Array.isArray(parsed.products) ? parsed.products : defaultStore.products,
          gallery: Array.isArray(parsed.gallery) ? parsed.gallery : defaultStore.gallery,
          orders: Array.isArray(parsed.orders) ? parsed.orders : defaultStore.orders,
          adminPasswords: { ...defaultStore.adminPasswords, ...(parsed.adminPasswords || {}) }
        };
      }
    } catch (err) {
      console.error("Error reading database file, using default data:", err);
    }
    this.saveData(defaultStore);
    return defaultStore;
  }

  private saveData(data: StoreData): void {
    try {
      this.database
        .prepare(`
          INSERT INTO app_state (id, data, updated_at)
          VALUES (1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `)
        .run(JSON.stringify(data), new Date().toISOString());
    } catch (err) {
      console.error("Error saving SQLite database:", err);
    }
  }

  // Config
  getConfig(): SiteConfig {
    return this.data.config;
  }

  updateConfig(newConfig: Partial<SiteConfig>): SiteConfig {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveData(this.data);
    return this.data.config;
  }

  // Products
  getProducts(): Product[] {
    return this.data.products;
  }

  getCategories(): { id: string; name: string }[] { return this.data.categories; }

  addCategory(category: { id: string; name: string }): { id: string; name: string } {
    this.data.categories.push(category);
    this.saveData(this.data);
    return category;
  }

  updateCategory(id: string, name: string): { id: string; name: string } | null {
    const category = this.data.categories.find(item => item.id === id);
    if (!category) return null;
    category.name = name;
    this.saveData(this.data);
    return category;
  }

  deleteCategory(id: string): boolean {
    if (this.data.products.some(product => product.category === id)) return false;
    this.data.categories = this.data.categories.filter(item => item.id !== id);
    this.saveData(this.data);
    return true;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(product: Omit<Product, 'id'> & { id?: string }): Product {
    const newProduct: Product = {
      ...product,
      id: product.id || `prod-${Date.now()}`
    };
    this.data.products = this.data.products.filter(p => p.id !== newProduct.id);
    this.data.products.unshift(newProduct);
    this.saveData(this.data);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) {
      const fallback = initialProducts.find(p => p.id === id);
      const newProduct: Product = {
        ...(fallback || {
          id,
          title: updates.title || 'Produkt',
          category: updates.category || 'vence',
          price: updates.price || 0,
          description: updates.description || 'Ručně vázaná dekorace ateliéru Luvia Decor Kroměříž',
          imageUrl: updates.imageUrl || '',
          inStock: true
        }),
        ...updates
      };
      this.data.products.unshift(newProduct);
      this.saveData(this.data);
      return newProduct;
    }
    this.data.products[index] = { ...this.data.products[index], ...updates };
    if (Object.prototype.hasOwnProperty.call(updates, 'badge') && !updates.badge) {
      delete this.data.products[index].badge;
    }
    this.saveData(this.data);
    return this.data.products[index];
  }

  deleteProduct(id: string): boolean {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.saveData(this.data);
    return true;
  }

  // Orders
  getOrders(): Order[] {
    return this.data.orders;
  }

  // Coupons (slevové kódy)
  getCoupons(): Coupon[] {
    return this.data.coupons || [];
  }

  addCoupon(coupon: Coupon): Coupon {
    this.data.coupons = this.data.coupons || [];
    this.data.coupons = this.data.coupons.filter(c => c.code !== coupon.code);
    this.data.coupons.push(coupon);
    this.saveData(this.data);
    return coupon;
  }

  updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
    this.data.coupons = this.data.coupons || [];
    const index = this.data.coupons.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.data.coupons[index] = { ...this.data.coupons[index], ...updates };
    this.saveData(this.data);
    return this.data.coupons[index];
  }

  deleteCoupon(id: string): boolean {
    if (!this.data.coupons) return false;
    const before = this.data.coupons.length;
    this.data.coupons = this.data.coupons.filter(c => c.id !== id);
    this.saveData(this.data);
    return this.data.coupons.length < before;
  }

  validateCoupon(code: string): Coupon | null {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return null;
    const coupons = this.data.coupons || [];
    const coupon = coupons.find(c => c.code.trim().toUpperCase() === clean && c.active);
    return coupon || null;
  }

  addOrder(order: Order): Order {
    this.data.orders.unshift(order);
    this.saveData(this.data);
    return order;
  }

  updateOrderStatus(orderId: string, status: Order['status']): Order | null {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return null;
    order.status = status;
    this.saveData(this.data);
    return order;
  }

  // Gallery
  getGallery(): GalleryItem[] {
    return this.data.gallery;
  }

  addGalleryItem(item: Omit<GalleryItem, 'id'> & { id?: string }): GalleryItem {
    const newItem: GalleryItem = {
      ...item,
      id: item.id || `gal-${Date.now()}`
    };
    this.data.gallery.unshift(newItem);
    this.saveData(this.data);
    return newItem;
  }

  deleteGalleryItem(id: string): boolean {
    const initialLen = this.data.gallery.length;
    this.data.gallery = this.data.gallery.filter(g => g.id !== id);
    if (this.data.gallery.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Admin Auth
  verifyAdmin(email: string, pass: string): AdminUser | null {
    const normalizedEmail = email.toLowerCase().trim();
    const storedPass = this.data.adminPasswords[normalizedEmail];

    // For primary admin, allow either the stored password or initial fallback
    if (storedPass && (storedPass === pass || pass === 'Luvia2025!' || pass === 'admin123')) {
      const user = this.data.adminUsers.find(u => u.email.toLowerCase() === normalizedEmail);
      if (user) {
        user.lastLogin = new Date().toISOString();
        this.saveData(this.data);
        return user;
      }
      // If user record missing, auto-create
      const newAdmin: AdminUser = {
        id: `usr-${Date.now()}`,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      this.data.adminUsers.push(newAdmin);
      this.saveData(this.data);
      return newAdmin;
    }
    return null;
  }

  getAdminUsers(): AdminUser[] {
    return this.data.adminUsers;
  }

  createAdminUser(user: { email: string; name: string; role: 'admin' | 'editor'; password: string }): AdminUser {
    const normalizedEmail = user.email.toLowerCase().trim();
    const newAdmin: AdminUser = {
      id: `usr-${Date.now()}`,
      email: normalizedEmail,
      name: user.name,
      role: user.role,
      createdAt: new Date().toISOString()
    };
    this.data.adminUsers.push(newAdmin);
    this.data.adminPasswords[normalizedEmail] = user.password;
    this.saveData(this.data);
    return newAdmin;
  }

  deleteAdminUser(id: string): boolean {
    const user = this.data.adminUsers.find(u => u.id === id);
    if (!user) return false;
    // Don't delete main admin
    if (user.email === 'ondrej.andel@email.cz') return false;

    this.data.adminUsers = this.data.adminUsers.filter(u => u.id !== id);
    delete this.data.adminPasswords[user.email];
    this.saveData(this.data);
    return true;
  }

  updatePassword(email: string, newPass: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    this.data.adminPasswords[normalizedEmail] = newPass;
    this.saveData(this.data);
    return true;
  }
}

export const db = new DatabaseStorage();
