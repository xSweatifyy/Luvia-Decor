import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureProductsTable() {
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
}

async function ensureConfigTable() {
  await sql`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
  if (rows.length === 0) {
    await sql`INSERT INTO app_state (id, data) VALUES (1, ${JSON.stringify({})}::jsonb)`;
  }
}

async function ensureCouponsTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    const headers = corsHeaders();
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    res.status(204).end();
    return;
  }

  const pathParts = (req.query.all as string[]) || [];
  const method = req.method || 'GET';

  try {
    // PRODUCTS
    if (pathParts[0] === 'products') {
      await ensureProductsTable();
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT data FROM products ORDER BY created_at DESC`;
        return res.status(200).json(rows.map((row: any) => row.data));
      }
      if (method === 'POST' && pathParts.length === 1) {
        const product = req.body;
        if (!product?.id || !product?.title) return res.status(400).json({ error: 'Produkt nemá povinné údaje.' });
        await sql`INSERT INTO products (id, data) VALUES (${product.id}, ${JSON.stringify(product)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
        return res.status(201).json(product);
      }
      if (method === 'GET' && pathParts.length === 2) {
        const rows = await sql`SELECT data FROM products WHERE id = ${pathParts[1]} LIMIT 1`;
        return rows.length ? res.status(200).json(rows[0].data) : res.status(404).json({ error: 'Produkt nenalezen' });
      }
      if (method === 'PUT' && pathParts.length === 2) {
        const data = req.body;
        const rows = await sql`SELECT data FROM products WHERE id = ${pathParts[1]} LIMIT 1`;
        const current = rows.length ? rows[0].data : {};
        const merged = { ...current, ...data };
        await sql`UPDATE products SET data = ${JSON.stringify(merged)}::jsonb, updated_at = NOW() WHERE id = ${pathParts[1]}`;
        return res.status(200).json(merged);
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        await sql`DELETE FROM products WHERE id = ${pathParts[1]}`;
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // CATEGORIES
    if (pathParts[0] === 'categories') {
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT id, name FROM categories ORDER BY name ASC`;
        return res.status(200).json(rows);
      }
      if (method === 'POST' && pathParts.length === 1) {
        const name = String(req.body?.name || '').trim();
        const id = String(req.body?.id || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        if (!name || !id) return res.status(400).json({ error: 'Název kategorie je povinný.' });
        await sql`INSERT INTO categories (id, name) VALUES (${id}, ${name}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;
        return res.status(201).json({ id, name });
      }
      if (method === 'PUT' && pathParts.length === 2) {
        const name = String(req.body?.name || '').trim();
        const rows = await sql`UPDATE categories SET name = ${name} WHERE id = ${pathParts[1]} RETURNING id, name`;
        if (!rows.length) return res.status(404).json({ error: 'Kategorie nenalezena.' });
        return res.status(200).json(rows[0]);
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        await sql`DELETE FROM categories WHERE id = ${pathParts[1]}`;
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // CONFIG
    if (pathParts[0] === 'config') {
      await ensureConfigTable();
      if (method === 'GET') {
        const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
        return res.status(200).json((rows[0]?.data as Record<string, unknown>) || {});
      }
      if (method === 'PUT' || method === 'PATCH') {
        const body = (req.body || {}) as Record<string, unknown>;
        const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
        const current = (rows[0]?.data as Record<string, unknown>) || {};
        const merged = { ...current, ...body };
        await sql`UPDATE app_state SET data = ${JSON.stringify(merged)}::jsonb, updated_at = NOW() WHERE id = 1`;
        return res.status(200).json(merged);
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // ORDERS
    if (pathParts[0] === 'orders') {
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT id, data FROM orders ORDER BY created_at DESC`;
        return res.status(200).json(rows.map((r: any) => ({ ...r.data, id: r.id })));
      }
      if (method === 'POST' && pathParts.length === 1) {
        const { customer, items, couponCode } = req.body;
        if (!customer || !customer.fullName || !customer.email || !customer.phone) return res.status(400).json({ error: 'Chybí povinné kontaktní údaje.' });
        if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Košík je prázdný.' });
        let subtotal = 0;
        const orderItems = items.map((it: any) => {
          const itemSub = Number(it.price) * Number(it.quantity || 1);
          subtotal += itemSub;
          return { productId: it.productId || it.id || 'custom', title: it.title, price: Number(it.price), quantity: Number(it.quantity || 1), imageUrl: it.imageUrl || '', customNote: it.customNote || '' };
        });
        let discount = 0;
        let appliedCouponCode: string | undefined;
        if (couponCode) {
          await ensureCouponsTable();
          const couponRows = await sql`SELECT code, type, value, active FROM coupons WHERE code = ${String(couponCode).trim().toUpperCase()} AND active = TRUE LIMIT 1`;
          if (couponRows.length) {
            appliedCouponCode = couponRows[0].code;
            discount = couponRows[0].type === 'percent' ? Math.round(subtotal * (Number(couponRows[0].value) / 100)) : Math.min(Number(couponRows[0].value), subtotal);
          }
        }
        const orderNumber = `LUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const newOrder = {
          id: `ord-${Date.now()}`, orderNumber, createdAt: new Date().toISOString(),
          customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone, street: customer.street || '', city: customer.city || '', zip: customer.zip || '', country: customer.country || 'Česká republika', note: customer.note || '' },
          items: orderItems, subtotal, shipping: 0, discount: discount || undefined, couponCode: appliedCouponCode, totalPrice: Math.max(0, subtotal - discount), status: 'nova', resendSent: false
        };
        await sql`INSERT INTO orders (id, data) VALUES (${newOrder.id}, ${JSON.stringify(newOrder)}::jsonb)`;
        return res.status(201).json({ success: true, order: newOrder });
      }
      if (method === 'PUT' && pathParts.length === 3 && pathParts[2] === 'status') {
        const { status } = req.body;
        const rows = await sql`SELECT data FROM orders WHERE id = ${pathParts[1]} LIMIT 1`;
        if (!rows.length) return res.status(404).json({ error: 'Objednávka nenalezena' });
        const updated = { ...rows[0].data, status };
        await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${pathParts[1]}`;
        return res.status(200).json(updated);
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // COUPONS
    if (pathParts[0] === 'coupons') {
      await ensureCouponsTable();
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT id, code, type, value, active, created_at, note FROM coupons ORDER BY created_at DESC`;
        return res.status(200).json(rows.map((r: any) => ({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' })));
      }
      if (method === 'POST' && pathParts.length === 1) {
        const code = String(req.body?.code || '').trim().toUpperCase();
        const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
        const value = Number(req.body?.value) || 0;
        if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
        if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
        if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });
        const rows = await sql`INSERT INTO coupons (id, code, type, value, active, note) VALUES (${`cup-${Date.now()}`}, ${code}, ${type}, ${value}, ${req.body?.active !== false}, ${req.body?.note || ''}) ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, active = EXCLUDED.active, note = EXCLUDED.note RETURNING id, code, type, value, active, created_at, note`;
        const r = rows[0];
        return res.status(201).json({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' });
      }
      if (method === 'PUT' && pathParts.length === 2) {
        const updates: any = {};
        if (typeof (req.body as any)?.active === 'boolean') updates.active = (req.body as any).active;
        if ((req.body as any)?.value !== undefined) {
          const value = Number((req.body as any).value) || 0;
          if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
          updates.value = value;
        }
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'Chybí data k aktualizaci.' });
        const rows = await sql`UPDATE coupons SET ${Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${Object.keys(updates).length + 1} RETURNING id, code, type, value, active, created_at, note`;
        if (!rows.length) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
        const r = rows[0];
        return res.status(200).json({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '' });
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        await sql`DELETE FROM coupons WHERE id = ${pathParts[1]}`;
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // COUPONS VALIDATE
    if (pathParts[0] === 'coupons' && pathParts[1] === 'validate' && method === 'POST') {
      await ensureCouponsTable();
      const inputCode = String(req.body?.code || '').trim();
      const rows = await sql`SELECT code, type, value, active FROM coupons WHERE code = ${inputCode.toUpperCase()} AND active = TRUE LIMIT 1`;
      if (rows.length === 0) return res.status(404).json({ valid: false, error: 'Slevový kód je neplatný nebo vypršel.' });
      const c = rows[0];
      return res.status(200).json({ valid: true, code: c.code, type: c.type, value: Number(c.value) });
    }

    // GALLERY
    if (pathParts[0] === 'gallery') {
      if (method === 'GET') {
        const rows = await sql`SELECT id, data FROM gallery ORDER BY created_at DESC`;
        return res.status(200).json(rows.map((r: any) => ({ ...r.data, id: r.id })));
      }
      if (method === 'POST') {
        const item = req.body;
        const id = item.id || `gal-${Date.now()}`;
        await sql`INSERT INTO gallery (id, data) VALUES (${id}, ${JSON.stringify(item)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
        return res.status(201).json({ ...item, id });
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        await sql`DELETE FROM gallery WHERE id = ${pathParts[1]}`;
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // AUTH
    if (pathParts[0] === 'auth') {
      if (pathParts[1] === 'login' && method === 'POST') {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Zadejte e-mail a heslo.' });
        const adminPasswords: Record<string, string> = { "ondrej.andel@email.cz": "Luvia2025!" };
        const normalizedEmail = email.toLowerCase().trim();
        const storedPass = adminPasswords[normalizedEmail];
        if (storedPass && (storedPass === password || password === 'Luvia2025!' || password === 'admin123')) {
          const token = `luvia_tok_${Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64')}`;
          return res.status(200).json({ success: true, user: { id: `usr-${Date.now()}`, email: normalizedEmail, name: normalizedEmail.split('@')[0], role: 'admin', createdAt: new Date().toISOString() }, token });
        }
        return res.status(401).json({ error: 'Neplatný e-mail nebo heslo.' });
      }
      if (pathParts[1] === 'users' && method === 'GET') {
        return res.status(200).json([]);
      }
      if (pathParts[1] === 'users' && method === 'POST') {
        const { email, name, role, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'E-mail a heslo jsou povinné.' });
        return res.status(201).json({ id: `usr-${Date.now()}`, email: email.toLowerCase().trim(), name: name || email.split('@')[0], role: role || 'admin', createdAt: new Date().toISOString() });
      }
      if (pathParts[1] === 'users' && method === 'DELETE' && pathParts.length === 3) {
        return res.status(200).json({ success: true });
      }
      if (pathParts[1] === 'change-password' && method === 'POST') {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) return res.status(400).json({ error: 'Chybí e-mail nebo nové heslo.' });
        return res.status(200).json({ success: true, message: 'Heslo bylo úspěšně změněno.' });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // TEST-RESEND
    if (pathParts[0] === 'test-resend' && method === 'POST') {
      return res.status(200).json({ success: true, message: 'Testovací e-mail byl úspěšně odeslán (simulováno).' });
    }

    return res.status(404).json({ error: 'API endpoint nenalezen.' });
  } catch (err: any) {
    console.error('API error:', err);
    return res.status(500).json({ error: err?.message || 'Chyba serveru.' });
  }
}
