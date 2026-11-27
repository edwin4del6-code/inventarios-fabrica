import type { VercelRequest, VercelResponse } from '@vercel/node'
import pg from 'pg'
import { DomainError, generateSku, normalizeAction, shipmentCode, saleCode } from '../shared/domain.js'
import { buildSeed } from '../shared/seed.js'
import type { Action, HistoryType, InventoryState, Settings, Stage } from '../shared/types.js'

const { Pool } = pg

// Las columnas BIGINT/NUMERIC se devuelven como número.
pg.types.setTypeParser(20, (v) => parseInt(v, 10))

let pool: pg.Pool | null = null
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('Falta la variable de entorno DATABASE_URL.')
  if (!pool) {
    pool = new Pool({
      // El SSL se configura abajo; se quita sslmode de la URL para evitar avisos de pg.
      connectionString: process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, ''),
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return pool
}

type Client = pg.PoolClient

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  cost INTEGER NOT NULL CHECK (cost >= 0),
  price INTEGER NOT NULL CHECK (price > 0),
  factory INTEGER NOT NULL DEFAULT 0 CHECK (factory >= 0),
  transit INTEGER NOT NULL DEFAULT 0 CHECK (transit >= 0),
  store INTEGER NOT NULL DEFAULT 0 CHECK (store >= 0),
  sold INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
  prev_week INTEGER NOT NULL DEFAULT 0 CHECK (prev_week >= 0),
  week_production INTEGER NOT NULL DEFAULT 0 CHECK (week_production >= 0),
  image TEXT,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('in_transit', 'received')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS shipment_items (
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (shipment_id, product_id)
);
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  type TEXT NOT NULL,
  detail TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('factory', 'transit', 'store', 'sold')),
  qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS history_product_idx ON history(product_id, created_at DESC);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

async function seed(c: Client) {
  const s = buildSeed()
  for (const p of s.products) {
    await c.query(
      `INSERT INTO products (id, name, sku, unit, cost, price, factory, transit, store, sold, prev_week, week_production, image, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [p.id, p.name, p.sku, p.unit, p.cost, p.price, p.factory, p.transit, p.store, p.sold, p.prevWeek, p.weekProduction, p.image, p.position],
    )
  }
  for (const sh of s.shipments) {
    await c.query('INSERT INTO shipments (id, status, created_at, received_at) VALUES ($1,$2,$3,$4)', [sh.id, sh.status, sh.createdAt, sh.receivedAt])
    for (const it of sh.items) await c.query('INSERT INTO shipment_items (shipment_id, product_id, qty) VALUES ($1,$2,$3)', [sh.id, it.productId, it.qty])
  }
  for (const sa of s.sales) {
    await c.query('INSERT INTO sales (id, product_id, qty, unit_price, created_at) VALUES ($1,$2,$3,$4,$5)', [sa.id, sa.productId, sa.qty, sa.unitPrice, sa.createdAt])
  }
  for (const h of s.history) {
    await c.query('INSERT INTO history (id, product_id, type, detail, tone, qty, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [h.id, h.productId, h.type, h.detail, h.tone, h.qty, h.createdAt])
  }
  for (const [k, v] of Object.entries({ companyName: s.settings.companyName, lowStockThreshold: String(s.settings.lowStockThreshold), currency: s.settings.currency })) {
    await c.query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, v])
  }
  // Las secuencias continúan después de los datos iniciales (ENV-005, V-1043…).
  for (const t of ['products', 'shipments', 'sales', 'history']) {
    await c.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${t}))`)
  }
}

async function tx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await getPool().connect()
  try {
    await c.query('BEGIN')
    const out = await fn(c)
    await c.query('COMMIT')
    return out
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

let ready: Promise<void> | null = null
function ensureReady() {
  if (!ready) {
    ready = tx(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(424242)')
      await c.query(SCHEMA)
      const { rows } = await c.query('SELECT COUNT(*)::int AS n FROM products')
      if (rows[0].n === 0) await seed(c)
    }).catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

async function loadState(c: Client | pg.Pool): Promise<InventoryState> {
  // Consultas en secuencia: un mismo cliente no admite consultas en paralelo.
  const products = await c.query('SELECT * FROM products ORDER BY position, id')
  const shipments = await c.query('SELECT * FROM shipments ORDER BY id DESC')
  const items = await c.query('SELECT * FROM shipment_items')
  const sales = await c.query('SELECT * FROM sales ORDER BY id DESC LIMIT 200')
  const history = await c.query('SELECT * FROM history ORDER BY created_at DESC, id DESC LIMIT 600')
  const settings = await c.query('SELECT key, value FROM settings')
  const kv = Object.fromEntries(settings.rows.map((r) => [r.key, r.value])) as Record<string, string>
  let demandPlan: Settings['demandPlan'] = null
  try {
    demandPlan = kv.demandPlan ? JSON.parse(kv.demandPlan) : null
  } catch {
    demandPlan = null
  }
  const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null)
  return {
    products: products.rows.map((r) => ({
      id: r.id, name: r.name, sku: r.sku, unit: r.unit, cost: r.cost, price: r.price,
      factory: r.factory, transit: r.transit, store: r.store, sold: r.sold,
      prevWeek: r.prev_week, weekProduction: r.week_production, image: r.image, position: r.position,
    })),
    shipments: shipments.rows.map((r) => ({
      id: r.id, status: r.status, createdAt: iso(r.created_at)!, receivedAt: iso(r.received_at),
      items: items.rows.filter((i) => i.shipment_id === r.id).map((i) => ({ productId: i.product_id, qty: i.qty })),
    })),
    sales: sales.rows.map((r) => ({ id: r.id, productId: r.product_id, qty: r.qty, unitPrice: r.unit_price, createdAt: iso(r.created_at)! })),
    history: history.rows.map((r) => ({ id: r.id, productId: r.product_id, type: r.type, detail: r.detail, tone: r.tone, qty: r.qty, createdAt: iso(r.created_at)! })),
    settings: {
      companyName: kv.companyName ?? 'Andina Foods',
      lowStockThreshold: Number.isFinite(Number(kv.lowStockThreshold)) ? Number(kv.lowStockThreshold) : 10,
      currency: kv.currency === 'USD' ? 'USD' : 'COP',
      demandPlan,
    },
  }
}

const fail = (msg: string): never => {
  throw new DomainError(msg)
}

async function log(c: Client, productId: number, type: HistoryType, tone: Stage, qty: number, detail: string) {
  await c.query('INSERT INTO history (product_id, type, detail, tone, qty) VALUES ($1,$2,$3,$4,$5)', [productId, type, detail, tone, qty])
}

async function lockProduct(c: Client, id: number) {
  const { rows } = await c.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id])
  if (!rows[0]) fail('El producto no existe.')
  return rows[0] as { id: number; name: string; factory: number; transit: number; store: number; week_production: number }
}

async function execute(c: Client, a: Action) {
  switch (a.action) {
    case 'produce': {
      const p = await lockProduct(c, a.productId)
      await c.query('UPDATE products SET factory = factory + $1 WHERE id = $2', [a.qty, p.id])
      await log(c, p.id, 'Producción', 'factory', a.qty, `+${a.qty} unidades producidas en fábrica`)
      return
    }
    case 'saveWeekProduction': {
      for (const it of [...a.items].sort((x, y) => x.productId - y.productId)) {
        const p = await lockProduct(c, it.productId)
        const diff = it.qty - p.week_production
        if (diff === 0) continue
        if (p.factory + diff < 0) fail(`No se puede reducir la producción de ${p.name}: la fábrica quedaría con stock negativo.`)
        await c.query('UPDATE products SET factory = factory + $1, week_production = $2 WHERE id = $3', [diff, it.qty, p.id])
        await log(c, p.id, 'Producción', 'factory', diff,
          diff > 0 ? `+${diff} unidades · carga semanal (${it.qty} en total)` : `${diff} unidades · ajuste de carga semanal (${it.qty} en total)`)
      }
      return
    }
    case 'createShipment': {
      const { rows } = await c.query("INSERT INTO shipments (status) VALUES ('in_transit') RETURNING id")
      const id = rows[0].id as number
      const code = shipmentCode(id)
      for (const it of [...a.items].sort((x, y) => x.productId - y.productId)) {
        const p = await lockProduct(c, it.productId)
        if (it.qty > p.factory) fail(`No hay suficiente ${p.name} en fábrica (disponible: ${p.factory}).`)
        await c.query('UPDATE products SET factory = factory - $1, transit = transit + $1 WHERE id = $2', [it.qty, p.id])
        await c.query('INSERT INTO shipment_items (shipment_id, product_id, qty) VALUES ($1,$2,$3)', [id, p.id, it.qty])
        await log(c, p.id, 'Transferencia', 'factory', it.qty, `−${it.qty} unidades salen de fábrica · ${code}`)
        await log(c, p.id, 'En tránsito', 'transit', it.qty, `${it.qty} unidades en camino a la tienda · ${code}`)
      }
      return
    }
    case 'receiveShipment': {
      const { rows } = await c.query('SELECT * FROM shipments WHERE id = $1 FOR UPDATE', [a.shipmentId])
      if (!rows[0]) fail('El envío no existe.')
      if (rows[0].status === 'received') fail(`El envío ${shipmentCode(a.shipmentId)} ya fue recibido.`)
      const items = await c.query('SELECT product_id, qty FROM shipment_items WHERE shipment_id = $1 ORDER BY product_id', [a.shipmentId])
      for (const it of items.rows) {
        const p = await lockProduct(c, it.product_id)
        if (it.qty > p.transit) fail(`Las unidades en tránsito de ${p.name} no alcanzan para recibir este envío.`)
        await c.query('UPDATE products SET transit = transit - $1, store = store + $1 WHERE id = $2', [it.qty, p.id])
        await log(c, p.id, 'Recepción', 'store', it.qty, `+${it.qty} unidades recibidas en tienda · ${shipmentCode(a.shipmentId)}`)
      }
      await c.query("UPDATE shipments SET status = 'received', received_at = now() WHERE id = $1", [a.shipmentId])
      return
    }
    case 'sale': {
      const p = await lockProduct(c, a.productId)
      if (a.qty > p.store) fail(`Solo hay ${p.store} unidades de ${p.name} en tienda.`)
      await c.query('UPDATE products SET store = store - $1, sold = sold + $1 WHERE id = $2', [a.qty, p.id])
      const { rows } = await c.query('INSERT INTO sales (product_id, qty, unit_price) VALUES ($1,$2,$3) RETURNING id', [p.id, a.qty, a.unitPrice])
      await log(c, p.id, 'Venta', 'sold', a.qty, `${a.qty} unidades vendidas · ${saleCode(rows[0].id)}`)
      return
    }
    case 'createProduct': {
      const { rows: skus } = await c.query('SELECT sku FROM products')
      const sku = a.product.sku || generateSku(a.product.name, skus.map((r) => r.sku))
      if (skus.some((r) => String(r.sku).toUpperCase() === sku)) fail(`Ya existe un producto con el SKU ${sku}.`)
      await c.query(
        `INSERT INTO products (name, sku, unit, cost, price, position)
         VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(position),0)+1 FROM products))`,
        [a.product.name, sku, a.product.unit, a.product.cost, a.product.price],
      )
      return
    }
    case 'updateProduct': {
      const p = await lockProduct(c, a.id)
      const { rows } = await c.query('SELECT sku FROM products WHERE id = $1', [p.id])
      const sku = a.product.sku || rows[0].sku
      const dup = await c.query('SELECT 1 FROM products WHERE UPPER(sku) = $1 AND id <> $2', [sku, p.id])
      if (dup.rowCount) fail(`Ya existe un producto con el SKU ${sku}.`)
      await c.query('UPDATE products SET name = $1, sku = $2, unit = $3, cost = $4, price = $5 WHERE id = $6',
        [a.product.name, sku, a.product.unit, a.product.cost, a.product.price, p.id])
      return
    }
    case 'saveSettings': {
      for (const [k, v] of Object.entries(a.settings)) {
        await c.query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, String(v)])
      }
      return
    }
    case 'savePlan': {
      await c.query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['demandPlan', JSON.stringify(a.plan)])
      return
    }
    case 'reset': {
      await c.query('SELECT pg_advisory_xact_lock(424242)')
      await c.query('TRUNCATE history, sales, shipment_items, shipments, products, settings RESTART IDENTITY CASCADE')
      await seed(c)
      return
    }
  }
}

function pgMessage(e: unknown): string | null {
  const err = e as { code?: string; constraint?: string }
  if (err?.code === '23514') return 'La operación dejaría un stock negativo. No se guardó ningún cambio.'
  if (err?.code === '23505') return 'Ya existe un registro con ese valor (por ejemplo, un SKU repetido).'
  if (err?.code === '23503') return 'El producto o envío indicado no existe.'
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    await ensureReady()
    if (req.method === 'GET') {
      return res.status(200).json(await loadState(getPool()))
    }
    if (req.method === 'POST') {
      let body: unknown = req.body
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch {
          return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' })
        }
      }
      const action = normalizeAction(body)
      if (action.action === 'reset') {
        const token = req.headers['x-reset-token']
        if (!process.env.RESET_TOKEN || token !== process.env.RESET_TOKEN) {
          return res.status(401).json({ error: 'Token de reinicio inválido.' })
        }
      }
      const state = await tx(async (c) => {
        await execute(c, action)
        return loadState(c)
      })
      return res.status(200).json(state)
    }
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  } catch (e) {
    if (e instanceof DomainError) return res.status(400).json({ error: e.message })
    const msg = pgMessage(e)
    if (msg) return res.status(409).json({ error: msg })
    console.error(e)
    return res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo.' })
  }
}
