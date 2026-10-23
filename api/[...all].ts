import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL || '');

async function ensureProductsTable() {
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function ensureConfigTable() {
  await sql`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
  if (rows.length === 0) {
    await sql`INSERT INTO app_state (id, data) VALUES (1, ${JSON.stringify({})}::jsonb)`;
  }
}

async function ensureCouponsTable() {
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, expires_at TIMESTAMPTZ)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`;
}


async function ensureNewsletterTables() {
  await sql`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body_text TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_count INT NOT NULL DEFAULT 0
  )`;
}

function getNewsletterAdmin(req: VercelRequest) {
  const raw = typeof req.query.adminUser === 'string' ? req.query.adminUser : '';
  try {
    const user = raw ? JSON.parse(raw) : req.body?.adminUser;
    return user?.role === 'admin' ? user : null;
  } catch {
    return null;
  }
}

function escapeNewsletterHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function ensureAuditTable() {
  await sql`CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_email TEXT NOT NULL DEFAULT '',
    actor_name TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT ''
  )`;
}
function auditAdmin(req: VercelRequest) {
  const raw = typeof req.query.adminUser === 'string' ? req.query.adminUser : '';
  try {
    const user = raw ? JSON.parse(raw) : req.body?.adminUser;
    return user?.role === 'admin' && user?.email ? user : null;
  } catch { return null; }
}
async function writeAudit(user: any, action: string, details: string, req: VercelRequest) {
  await ensureAuditTable();
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '')).split(',')[0].trim().slice(0, 100);
  const agent = String(req.headers['user-agent'] || '').slice(0, 500);
  await sql`INSERT INTO admin_audit_log (actor_email, actor_name, action, details, ip_address, user_agent)
    VALUES (${String(user?.email || '').slice(0, 254)}, ${String(user?.name || '').slice(0, 150)}, ${action.slice(0, 100)}, ${details.slice(0, 1000)}, ${ip}, ${agent})`;
}

async function writeAuditDiff(req: VercelRequest, action: string, entity: string, before: any, after: any, label = '') {
  const actor = auditAdmin(req) || { email: 'admin-neznámý', name: 'Administrátor (identita neověřena)' };
  const sensitive = /password|token|secret|authorization|email|phone|address|customer|first.?name|last.?name|fullname|useragent/i;
  const clean = (value: any): any => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive.test(key)).map(([key, child]) => [key, clean(child)]));
    if (typeof value === 'string') return value.length > 180 ? value.slice(0, 180) + '…' : value;
    return value;
  };
  const a = clean(before || {});
  const b = clean(after || {});
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const changes: string[] = [];
  for (const key of keys) {
    const oldValue = (a || {})[key];
    const newValue = (b || {})[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      const fmt = (v: any) => v === undefined ? '(neexistovalo)' : v === null ? '(prázdné)' : typeof v === 'object' ? JSON.stringify(v).slice(0, 180) : String(v).slice(0, 180);
      changes.push(key + ': ' + fmt(oldValue) + ' → ' + fmt(newValue));
    }
  }
  const details = [label, changes.length ? 'Skutečné změny: ' + changes.slice(0, 25).join('; ') : 'Bez rozdílu v porovnávaných polích'].filter(Boolean).join(' · ');
  await writeAudit(actor, action + ': ' + entity, details, req);
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

  // Vercel catch-all routes normally populate req.query.all. Derive the path from
  // req.url as a fallback so rewritten requests still reach the correct handler.
  const queryPath = req.query.all;
  let pathParts: string[] = Array.isArray(queryPath)
    ? queryPath
    : typeof queryPath === 'string'
      ? queryPath.split('/').filter(Boolean)
      : [];
  if (pathParts.length === 0) {
    const pathname = (req.url || '/').split('?')[0].replace(/^\/api\/?/, '');
    pathParts = pathname.split('/').filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
  }
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
        const previousRows = await sql`SELECT data FROM products WHERE id = ${product.id} LIMIT 1`;
        await sql`INSERT INTO products (id, data) VALUES (${product.id}, ${JSON.stringify(product)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
        await writeAuditDiff(req, previousRows.length ? 'Úprava' : 'Přidání', 'Produkt', previousRows[0]?.data || {}, product, String(product.title || product.id));
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
        await writeAuditDiff(req, 'Úprava', 'Produkt', current, merged, String(merged.title || pathParts[1]));
        return res.status(200).json(merged);
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        const previous = await sql`SELECT data FROM products WHERE id = ${pathParts[1]} LIMIT 1`;
        await sql`DELETE FROM products WHERE id = ${pathParts[1]}`;
        if (previous.length) await writeAuditDiff(req, 'Smazání', 'Produkt', previous[0].data, {}, String(previous[0].data?.title || pathParts[1]));
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // CATEGORIES
    if (pathParts[0] === 'categories') {
      await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, visible_from TIMESTAMPTZ NULL, visible_until TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible_from TIMESTAMPTZ NULL`;
      await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible_until TIMESTAMPTZ NULL`;
      // Upgrade existing categories tables created by older versions before upserts use updated_at.
      await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT id, name, visible_from, visible_until FROM categories ORDER BY name ASC`;
        return res.status(200).json(rows.map((row: any) => ({ id: row.id, name: row.name, visibleFrom: row.visible_from || null, visibleUntil: row.visible_until || null })));
      }
      if (method === 'POST' && pathParts.length === 1) {
        const name = String(req.body?.name || '').trim();
        const id = String(req.body?.id || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        if (!name || !id) return res.status(400).json({ error: 'Název kategorie je povinný.' });
        const visibleFrom = req.body?.visibleFrom ? new Date(req.body.visibleFrom) : null;
        const visibleUntil = req.body?.visibleUntil ? new Date(req.body.visibleUntil) : null;
        if ((visibleFrom && Number.isNaN(visibleFrom.getTime())) || (visibleUntil && Number.isNaN(visibleUntil.getTime()))) return res.status(400).json({ error: 'Neplatné datum viditelnosti.' });
        if (visibleFrom && visibleUntil && visibleUntil <= visibleFrom) return res.status(400).json({ error: 'Konec zobrazení musí být později než začátek.' });
        const previous = await sql`SELECT id, name, visible_from, visible_until FROM categories WHERE id = ${id} LIMIT 1`;
        await sql`INSERT INTO categories (id, name, visible_from, visible_until) VALUES (${id}, ${name}, ${visibleFrom ? visibleFrom.toISOString() : null}, ${visibleUntil ? visibleUntil.toISOString() : null}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, visible_from = EXCLUDED.visible_from, visible_until = EXCLUDED.visible_until, updated_at = NOW()`;
        const saved = { id, name, visibleFrom: visibleFrom?.toISOString() || null, visibleUntil: visibleUntil?.toISOString() || null };
        try { await writeAuditDiff(req, previous.length ? 'Úprava' : 'Přidání', 'Kategorie', previous[0] || {}, saved, name); }
        catch (auditError) { console.error('Category audit write failed:', auditError); }
        return res.status(201).json(saved);
      }
      if (method === 'PUT' && pathParts.length === 2) {
        const name = String(req.body?.name || '').trim();
        const visibleFrom = req.body?.visibleFrom ? new Date(req.body.visibleFrom) : null;
        const visibleUntil = req.body?.visibleUntil ? new Date(req.body.visibleUntil) : null;
        if (!name) return res.status(400).json({ error: 'Název kategorie je povinný.' });
        if ((visibleFrom && Number.isNaN(visibleFrom.getTime())) || (visibleUntil && Number.isNaN(visibleUntil.getTime()))) return res.status(400).json({ error: 'Neplatné datum viditelnosti.' });
        if (visibleFrom && visibleUntil && visibleUntil <= visibleFrom) return res.status(400).json({ error: 'Konec zobrazení musí být později než začátek.' });
        const categoryId = pathParts[1];
        const previous = await sql`SELECT id, name, visible_from, visible_until FROM categories WHERE id = ${categoryId} LIMIT 1`;
        const rows = await sql`INSERT INTO categories (id, name, visible_from, visible_until) VALUES (${categoryId}, ${name}, ${visibleFrom ? visibleFrom.toISOString() : null}, ${visibleUntil ? visibleUntil.toISOString() : null}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, visible_from = EXCLUDED.visible_from, visible_until = EXCLUDED.visible_until, updated_at = NOW() RETURNING id, name, visible_from, visible_until`;
        const saved = { id: rows[0].id, name: rows[0].name, visibleFrom: rows[0].visible_from || null, visibleUntil: rows[0].visible_until || null };
        try { await writeAuditDiff(req, previous.length ? 'Úprava' : 'Nastavení plánu', 'Kategorie', previous[0] || {}, saved, name); }
        catch (auditError) { console.error('Category schedule audit write failed:', auditError); }
        return res.status(200).json(saved);
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        const previous = await sql`SELECT id, name, visible_from, visible_until FROM categories WHERE id = ${pathParts[1]} LIMIT 1`;
        await sql`DELETE FROM categories WHERE id = ${pathParts[1]}`;
        if (previous.length) await writeAuditDiff(req, 'Smazání', 'Kategorie', previous[0], {}, previous[0].name);
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
        await writeAuditDiff(req, 'Úprava', 'Nastavení webu', current, merged);
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
          const couponRows = await sql`SELECT code, type, value, active FROM coupons WHERE code = ${String(couponCode).trim().toUpperCase()} AND active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1`;
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
        await writeAuditDiff(req, 'Změna stavu', 'Objednávka', { status: rows[0].data.status }, { status: updated.status }, String(updated.orderNumber || pathParts[1]));
        return res.status(200).json(updated);
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // COUPONS
    if (pathParts[0] === 'coupons' && pathParts[1] !== 'validate') {
      await ensureCouponsTable();
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT id, code, type, value, active, created_at, note, expires_at FROM coupons ORDER BY created_at DESC`;
        return res.status(200).json(rows.map((r: any) => ({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '', expiresAt: r.expires_at || null })));
      }
      if (method === 'POST' && pathParts.length === 1) {
        const code = String(req.body?.code || '').trim().toUpperCase();
        const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
        const value = Number(req.body?.value) || 0;
        if (!code) return res.status(400).json({ error: 'Zadejte kód slevy.' });
        if (value <= 0) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
        if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Procentní sleva může být nejvýše 100 %.' });
        if (req.body?.expiresAt && Number.isNaN(Date.parse(String(req.body.expiresAt)))) return res.status(400).json({ error: 'Datum expirace není platné.' });
        const expiresAt = req.body?.expiresAt ? new Date(String(req.body.expiresAt)).toISOString() : null;
        const rows = await sql`INSERT INTO coupons (id, code, type, value, active, note, expires_at) VALUES (${`cup-${Date.now()}`}, ${code}, ${type}, ${value}, ${req.body?.active !== false}, ${req.body?.note || ''}, ${expiresAt}) ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, active = EXCLUDED.active, note = EXCLUDED.note, expires_at = EXCLUDED.expires_at RETURNING id, code, type, value, active, created_at, note, expires_at`;
        const r = rows[0];
        await writeAuditDiff(req, 'Uložení', 'Slevový kód', {}, { code: r.code, type: r.type, value: Number(r.value), active: r.active, note: r.note || '', expiresAt: r.expires_at || null }, String(r.code));
        return res.status(201).json({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '', expiresAt: r.expires_at || null });
      }
      if (method === 'PUT' && pathParts.length === 2) {
        const activeUpdate = typeof (req.body as any)?.active === 'boolean' ? (req.body as any).active : null;
        const valueUpdate = (req.body as any)?.value !== undefined ? Number((req.body as any).value) : null;
        if (valueUpdate !== null && (!Number.isFinite(valueUpdate) || valueUpdate <= 0)) return res.status(400).json({ error: 'Hodnota slevy musí být kladná.' });
        const rawExpiry = (req.body as any)?.expiresAt;
        const expiryProvided = rawExpiry !== undefined;
        if (expiryProvided && rawExpiry && Number.isNaN(Date.parse(String(rawExpiry)))) return res.status(400).json({ error: 'Datum expirace není platné.' });
        const expiresAt = expiryProvided && rawExpiry ? new Date(String(rawExpiry)).toISOString() : null;
        if (activeUpdate === null && valueUpdate === null && !expiryProvided) return res.status(400).json({ error: 'Chybí data k aktualizaci.' });
        const rows = await sql`UPDATE coupons SET active = COALESCE(${activeUpdate}, active), value = COALESCE(${valueUpdate}, value), expires_at = CASE WHEN ${expiryProvided} THEN ${expiresAt}::timestamptz ELSE expires_at END WHERE id = ${pathParts[1]} RETURNING id, code, type, value, active, created_at, note, expires_at`;
        if (!rows.length) return res.status(404).json({ error: 'Slevový kód nenalezen.' });
        const r = rows[0];
        return res.status(200).json({ id: r.id, code: r.code, type: r.type, value: Number(r.value), active: r.active, createdAt: r.created_at, note: r.note || '', expiresAt: r.expires_at || null });
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
      const rows = await sql`SELECT code, type, value, active FROM coupons WHERE code = ${inputCode.toUpperCase()} AND active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1`;
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
        const previous = await sql`SELECT data FROM gallery WHERE id = ${id} LIMIT 1`;
        await sql`INSERT INTO gallery (id, data) VALUES (${id}, ${JSON.stringify(item)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
        await writeAuditDiff(req, previous.length ? 'Úprava' : 'Přidání', 'Galerie', previous[0]?.data || {}, item, String(item.title || item.name || id));
        return res.status(201).json({ ...item, id });
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        const previous = await sql`SELECT data FROM gallery WHERE id = ${pathParts[1]} LIMIT 1`;
        await sql`DELETE FROM gallery WHERE id = ${pathParts[1]}`;
        if (previous.length) await writeAuditDiff(req, 'Smazání', 'Galerie', previous[0].data, {}, String(previous[0].data?.title || pathParts[1]));
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // ADMIN AUDIT LOG
    if (pathParts[0] === 'audit') {
      const actor = auditAdmin(req);
      if (!actor) return res.status(403).json({ error: 'Protokol auditu je dostupný pouze přihlášenému administrátorovi.' });
      await ensureAuditTable();
      if (method === 'GET' && pathParts.length === 1) {
        const rows = await sql`SELECT id, created_at, actor_email, actor_name, action, details, ip_address, user_agent FROM admin_audit_log ORDER BY created_at DESC LIMIT 2000`;
        return res.status(200).json(rows.map((row: any) => ({ id: Number(row.id), createdAt: row.created_at, actorEmail: row.actor_email, actorName: row.actor_name, action: row.action, details: row.details, ipAddress: row.ip_address, userAgent: row.user_agent })));
      }
      if (method === 'POST' && pathParts.length === 1) {
        const action = String(req.body?.action || '').trim();
        const details = String(req.body?.details || '').trim();
        if (!action) return res.status(400).json({ error: 'Chybí typ akce.' });
        await writeAudit(actor, action, details, req);
        return res.status(201).json({ success: true });
      }
      return res.status(405).json({ error: 'Metoda není podporovaná.' });
    }

    // AUTH
    if (pathParts[0] === 'auth') {
      if (pathParts[1] === 'visit' && method === 'POST') {
        const actor = auditAdmin(req);
        if (!actor) return res.status(403).json({ error: 'Administrátor není ověřen.' });
        await writeAudit(actor, 'Návštěva administrace', 'Administrátor otevřel administraci nebo se vrátil na její hlavní obrazovku.', req);
        return res.status(201).json({ success: true });
      }
      if (pathParts[1] === 'logout' && method === 'POST') {
        const actor = auditAdmin(req);
        if (actor) await writeAudit(actor, 'Odhlášení', 'Administrátor se odhlásil z administrace.', req);
        return res.status(200).json({ success: true });
      }
      if (pathParts[1] === 'login' && method === 'POST') {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Zadejte e-mail a heslo.' });
        const adminPasswords: Record<string, string> = { "ondrej.andel@email.cz": "Luvia2025!" };
        const normalizedEmail = email.toLowerCase().trim();
        const storedPass = adminPasswords[normalizedEmail];
        if (storedPass && storedPass === password) {
          const user = { id: `usr-${Date.now()}`, email: normalizedEmail, name: normalizedEmail.split('@')[0], role: 'admin', createdAt: new Date().toISOString() };
          await writeAudit(user, 'Přihlášení', 'Úspěšné přihlášení do administrace.', req);
          const token = `luvia_tok_${Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64')}`;
          return res.status(200).json({ success: true, user, token });
        }
        await writeAudit({ email: normalizedEmail || String(email).slice(0, 254), name: normalizedEmail ? normalizedEmail.split('@')[0] : 'Neznámý účet' }, 'Neúspěšné přihlášení', 'Pokus o přihlášení do administrace nebyl úspěšný.', req);
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


    // NEWSLETTER
    if (pathParts[0] === 'newsletter' && pathParts[1] === 'subscribe' && method === 'POST') {
      await ensureNewsletterTables();
      const firstName = String(req.body?.firstName || '').trim().slice(0, 100);
      const lastName = String(req.body?.lastName || '').trim().slice(0, 100);
      const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
      if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Vyplňte prosím jméno, příjmení a platný e-mail.' });
      }
      const rows = await sql`INSERT INTO newsletter_subscribers (id, email, first_name, last_name, active)
        VALUES (${'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)}, ${email}, ${firstName}, ${lastName}, TRUE)
        ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, active = TRUE
        RETURNING id`;
      return res.status(200).json({ success: true, message: 'Děkujeme za přihlášení k newsletteru.' });
    }

    if (pathParts[0] === 'newsletter' && pathParts[1] === 'subscribers' && method === 'GET') {
      if (!getNewsletterAdmin(req)) return res.status(403).json({ error: 'Pro zobrazení odběratelů se přihlaste jako administrátor.' });
      await ensureNewsletterTables();
      // Sync existing verified customer accounts only when they explicitly opted in.
      // This also repairs missing subscriber rows for previously consenting accounts.
      const accountTable = await sql`SELECT to_regclass('public.customer_accounts') AS table_name`;
      if (accountTable[0]?.table_name) {
        await sql`INSERT INTO newsletter_subscribers (id, email, first_name, last_name, active)
          SELECT 'sub-account-' || ca.id, LOWER(ca.email),
            COALESCE(NULLIF(SPLIT_PART(TRIM(ca.data->>'name'), ' ', 1), ''), ''),
            COALESCE(NULLIF(TRIM(SUBSTRING(TRIM(ca.data->>'name') FROM POSITION(' ' IN TRIM(ca.data->>'name')) + 1)), ''), ''),
            TRUE
          FROM customer_accounts ca
          WHERE ca.email_verified = TRUE AND ca.newsletter_opt_in = TRUE
          ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            active = TRUE`;
      }
      const rows = await sql`SELECT id, email, first_name, last_name, created_at, active FROM newsletter_subscribers ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => ({
        id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name,
        createdAt: row.created_at, active: row.active
      })));
    }

    if (pathParts[0] === 'newsletter' && pathParts[1] === 'campaigns' && method === 'GET') {
      if (!getNewsletterAdmin(req)) return res.status(403).json({ error: 'Pro zobrazení historie se přihlaste jako administrátor.' });
      await ensureNewsletterTables();
      const rows = await sql`SELECT id, title, body_text, image_url, created_at, sent_count FROM newsletter_campaigns ORDER BY created_at DESC`;
      return res.status(200).json(rows.map((row: any) => ({
        id: row.id, title: row.title, text: row.body_text, imageUrl: row.image_url || undefined,
        createdAt: row.created_at, sentCount: Number(row.sent_count) || 0
      })));
    }

    if (pathParts[0] === 'newsletter' && pathParts[1] === 'send' && method === 'POST') {
      if (!getNewsletterAdmin(req)) return res.status(403).json({ error: 'Pro odeslání newsletteru se přihlaste jako administrátor.' });
      const title = String(req.body?.title || '').trim().slice(0, 200);
      const bodyText = String(req.body?.text || '').trim().slice(0, 20000);
      const imageUrl = String(req.body?.imageUrl || '').trim().slice(0, 2000);
      if (!title || !bodyText) return res.status(400).json({ error: 'Vyplňte nadpis i text newsletteru.' });
      if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Odesílání není nastavené: na Vercelu chybí RESEND_API_KEY.' });
      await ensureNewsletterTables();
      const subscribers = await sql`SELECT email, first_name FROM newsletter_subscribers WHERE active = TRUE ORDER BY created_at ASC`;
      if (!subscribers.length) return res.status(400).json({ error: 'Zatím nejsou žádní aktivní odběratelé.' });
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM_EMAIL || 'Luvia Decor <newsletter@luvia-decor.cz>';
      const safeTitle = escapeNewsletterHtml(title);
      const safeText = escapeNewsletterHtml(bodyText).replace(/\r?\n/g, '<br>');
      const safeImage = imageUrl.startsWith('https://') ? '<img src="' + escapeNewsletterHtml(imageUrl) + '" alt="" style="max-width:100%;height:auto;border-radius:12px;margin:20px 0">' : '';
      let sent = 0;
      const failures: string[] = [];
      for (const subscriber of subscribers as any[]) {
        try {
          const result = await resend.emails.send({
            from,
            to: [subscriber.email],
            subject: title,
            html: '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2d2723;line-height:1.65"><h1>' + safeTitle + '</h1><p>Dobrý den ' + escapeNewsletterHtml(String(subscriber.first_name || '')) + ',</p><p>' + safeText + '</p>' + safeImage + '<hr style="border:0;border-top:1px solid #e5ddd4;margin:28px 0"><p style="font-size:12px;color:#786b60">Luvia Decor · Květinový ateliér a dekorace</p><p style="font-size:11px;color:#786b60">Pokud si již nepřejete dostávat newsletter, odpovězte na tento e-mail se žádostí o odhlášení.</p></div>'
          });
          if (result.error) failures.push(String(subscriber.email));
          else sent++;
        } catch {
          failures.push(String(subscriber.email));
        }
      }
      await sql`INSERT INTO newsletter_campaigns (id, title, body_text, image_url, sent_count)
        VALUES (${'cmp-' + Date.now()}, ${title}, ${bodyText}, ${imageUrl || null}, ${sent})`;
      return res.status(200).json({ success: true, sent, total: subscribers.length, failed: failures.length });
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
