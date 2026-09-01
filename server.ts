import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/storage';
import { sendOrderEmails, sendTestEmail } from './server/resendService';
import { Order } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares for JSON body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Config endpoints
  app.get('/api/config', (req, res) => {
    try {
      const config = db.getConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba načtení konfigurace' });
    }
  });

  app.put('/api/config', (req, res) => {
    try {
      const updated = db.updateConfig(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba uložení konfigurace' });
    }
  });

  // Products endpoints
  app.get('/api/products', (req, res) => {
    try {
      const products = db.getProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba načtení produktů' });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const data = req.body;
      const product = db.addProduct({
        ...data,
        price: Number(data.price) || 0,
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
        inStock: data.inStock !== false,
        featured: Boolean(data.featured),
        isPriceFrom: Boolean(data.isPriceFrom),
        pricePrefix: data.isPriceFrom ? (data.pricePrefix || 'Od') : undefined
      });
      res.status(201).json(product);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba vytvoření produktu' });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const data = req.body;
      const updated = db.updateProduct(req.params.id, {
        ...data,
        ...(Object.prototype.hasOwnProperty.call(data, 'badge') ? { badge: data.badge || undefined } : {}),
        price: data.price !== undefined ? Number(data.price) || 0 : undefined,
        compareAtPrice: data.compareAtPrice !== undefined ? (data.compareAtPrice ? Number(data.compareAtPrice) : undefined) : undefined,
        inStock: data.inStock !== undefined ? Boolean(data.inStock) : undefined,
        featured: data.featured !== undefined ? Boolean(data.featured) : undefined,
        isPriceFrom: data.isPriceFrom !== undefined ? Boolean(data.isPriceFrom) : undefined,
        pricePrefix: data.pricePrefix !== undefined ? data.pricePrefix : (data.isPriceFrom ? 'Od' : undefined)
      });
      if (!updated) {
        return res.status(404).json({ error: 'Produkt nenalezen' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba úpravy produktu' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const deleted = db.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Produkt byl úspěšně smazán' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba smazání produktu' });
    }
  });

  // Product category endpoints
  app.get('/api/categories', (_req, res) => {
    res.json(db.getCategories());
  });

  app.post('/api/categories', (req, res) => {
    const name = String(req.body?.name || '').trim();
    const id = String(req.body?.id || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    if (!name || !id) return res.status(400).json({ error: 'Název kategorie je povinný.' });
    res.status(201).json(db.addCategory({ id, name }));
  });

  app.put('/api/categories/:id', (req, res) => {
    const updated = db.updateCategory(req.params.id, String(req.body?.name || '').trim());
    if (!updated) return res.status(404).json({ error: 'Kategorie nenalezena.' });
    res.json(updated);
  });

  app.delete('/api/categories/:id', (req, res) => {
    if (!db.deleteCategory(req.params.id)) return res.status(409).json({ error: 'Nejdříve přesuňte produkty z této kategorie.' });
    res.json({ success: true });
  });

  // Orders endpoints
  app.get('/api/orders', (req, res) => {
    try {
      const orders = db.getOrders();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba načtení objednávek' });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const { customer, items, customNote, couponCode } = req.body;

      if (!customer || !customer.fullName || !customer.email || !customer.phone) {
        return res.status(400).json({ error: 'Chybí povinné kontaktní údaje (jméno, email, telefon).' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Košík je prázdný.' });
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = items.map((it: any) => {
        const itemSub = Number(it.price) * Number(it.quantity || 1);
        subtotal += itemSub;
        return {
          productId: it.productId || it.id || 'custom',
          title: it.title,
          price: Number(it.price),
          quantity: Number(it.quantity || 1),
          imageUrl: it.imageUrl || '',
          customNote: it.customNote || ''
        };
      });

      // Apply coupon discount server-side (source of truth)
      let discount = 0;
      let appliedCouponCode: string | undefined;
      if (couponCode) {
        const coupon = db.validateCoupon(String(couponCode));
        if (coupon) {
          appliedCouponCode = coupon.code;
          discount = coupon.type === 'percent'
            ? Math.round(subtotal * (coupon.value / 100))
            : Math.min(coupon.value, subtotal);
        }
      }

      const orderNumber = `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber,
        createdAt: new Date().toISOString(),
        customer: {
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          street: customer.street || '',
          city: customer.city || '',
          zip: customer.zip || '',
          country: customer.country || 'Česká republika',
          note: customer.note || customNote || ''
        },
        items: orderItems,
        subtotal,
        shipping: 0,
        discount: discount || undefined,
        couponCode: appliedCouponCode,
        totalPrice: Math.max(0, subtotal - discount),
        status: 'nova',
        resendSent: false
      };

      const siteConfig = db.getConfig();

      // Dispatch email via Resend
      const emailResult = await sendOrderEmails(newOrder, siteConfig);
      newOrder.resendSent = emailResult.success;
      if (!emailResult.success) {
        newOrder.resendError = emailResult.error;
      }

      // Save to database
      db.addOrder(newOrder);

      // Return exact requested confirmation message
      return res.status(201).json({
        success: true,
        order: newOrder,
        message: "Objednávka byla úspěšně přijata. Již brzy Vás budeme kontaktovat.",
        emailStatus: emailResult.success ? "Odesláno na e-mail" : `E-mail: ${emailResult.error}`
      });
    } catch (err: any) {
      console.error("[Orders] Create order error:", err);
      return res.status(500).json({
        error: err?.message || 'Nastala chyba při zpracování objednávky.'
      });
    }
  });

  app.put('/api/orders/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      const updated = db.updateOrderStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Objednávka nenalezena' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba aktualizace stavu' });
    }
  });

  // Coupons (slevové kódy) — spravují správci (role admin / editor)
  const requireAdminRole = (req: any, res: any): boolean => {
    let user = req.body?.adminUser || req.query?.adminUser;
    if (typeof user === 'string') {
      try { user = JSON.parse(user); } catch {}
    }
    if (!user) {
      // Allow local admin operations
      return true;
    }
    if (user.role !== 'admin' && user.role !== 'editor') {
      res.status(403).json({ error: 'Slevové kódy může spravovat pouze správce.' });
      return false;
    }
    return true;
  };

  app.get('/api/coupons', (req, res) => {
    try {
      res.json(db.getCoupons());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba načtení slevových kódů' });
    }
  });

  app.post('/api/coupons', (req, res) => {
    try {
      if (!requireAdminRole(req, res)) return;
      const code = String(req.body?.code || '').trim().toUpperCase();
      const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(req.body?.value) || 0;
      if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
      if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
      if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });
      const coupon = db.addCoupon({
        id: `cup-${Date.now()}`,
        code,
        type,
        value,
        active: req.body?.active !== false,
        createdAt: new Date().toISOString(),
        note: req.body?.note || ''
      });
      res.status(201).json(coupon);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba vytvoření slevového kódu' });
    }
  });

  app.put('/api/coupons/:id', (req, res) => {
    try {
      if (!requireAdminRole(req, res)) return;
      const updates: any = {};
      if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
      if (req.body?.value !== undefined) {
        const value = Number(req.body.value) || 0;
        if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
        updates.value = value;
      }
      if (req.body?.note !== undefined) updates.note = req.body.note;
      const updated = db.updateCoupon(req.params.id, updates);
      if (!updated) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba aktualizace slevového kódu' });
    }
  });

  app.delete('/api/coupons/:id', (req, res) => {
    try {
      if (!requireAdminRole(req, res)) return;
      const deleted = db.deleteCoupon(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba mazání slevového kódu' });
    }
  });

  // Ověření slevového kódu zákazníkem v košíku (veřejné)
  app.post('/api/coupons/validate', (req, res) => {
    try {
      const inputCode = String(req.body?.code || '').trim();
      const coupon = db.validateCoupon(inputCode);
      if (!coupon) {
        return res.status(404).json({ valid: false, error: 'Slevový kód je neplatný nebo vypršel.' });
      }
      res.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba ověření slevového kódu' });
    }
  });

  // Gallery
  app.get('/api/gallery', (req, res) => {
    try {
      res.json(db.getGallery());
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/gallery', (req, res) => {
    try {
      const item = db.addGalleryItem(req.body);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/gallery/:id', (req, res) => {
    try {
      const deleted = db.deleteGalleryItem(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // Auth & Admin Users
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Zadejte e-mail a heslo.' });
      }

      const user = db.verifyAdmin(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Neplatný e-mail nebo heslo.' });
      }

      // Generate lightweight session token
      const token = `luvia_tok_${Buffer.from(`${user.email}:${Date.now()}`).toString('base64')}`;

      res.json({
        success: true,
        user,
        token
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Chyba přihlášení' });
    }
  });

  app.get('/api/auth/users', (req, res) => {
    try {
      res.json(db.getAdminUsers());
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/users', (req, res) => {
    try {
      const { email, name, role, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail a heslo jsou povinné.' });
      }
      const newUser = db.createAdminUser({
        email,
        name: name || email.split('@')[0],
        role: role || 'admin',
        password
      });
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/auth/users/:id', (req, res) => {
    try {
      const success = db.deleteAdminUser(req.params.id);
      if (!success) {
        return res.status(400).json({ error: 'Uživatele nelze smazat nebo nebyl nalezen.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/change-password', (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: 'Chybí e-mail nebo nové heslo.' });
      }
      db.updatePassword(email, newPassword);
      res.json({ success: true, message: 'Heslo bylo úspěšně změněno.' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // Test Resend API configuration
  app.post('/api/test-resend', async (req, res) => {
    try {
      const { apiKey, targetEmail, fromEmail } = req.body;
      const keyToUse = apiKey || db.getConfig().resend?.apiKey;
      const target = targetEmail || db.getConfig().ordersEmail || 'ondrej.andel@email.cz';

      const result = await sendTestEmail(keyToUse, target, fromEmail);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Chyba testu Resend' });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 Luvia Decor server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
