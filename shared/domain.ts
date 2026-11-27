import type {
  Action, HistoryEntry, HistoryType, InventoryState, Product, ProductInput, Scenario, Settings, Stage,
} from './types.js'

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

const fail = (msg: string): never => {
  throw new DomainError(msg)
}

export const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0
export const isNonNegInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

export function positiveInt(n: unknown, label = 'La cantidad'): number {
  if (!isPositiveInt(n)) fail(`${label} debe ser un número entero mayor a 0.`)
  return n as number
}

function nonNegInt(n: unknown, label: string): number {
  if (!isNonNegInt(n)) fail(`${label} debe ser un número entero igual o mayor a 0.`)
  return n as number
}

export const pad3 = (n: number) => String(n).padStart(3, '0')
export const shipmentCode = (id: number) => `ENV-${pad3(id)}`
export const saleCode = (id: number) => `V-${id}`

export type StockStatus = 'out' | 'low' | 'ok'
export function stockStatus(store: number, threshold: number): StockStatus {
  if (store <= 0) return 'out'
  if (store <= threshold) return 'low'
  return 'ok'
}
export const STATUS_LABEL: Record<StockStatus, string> = { out: 'Agotado', low: 'Stock bajo', ok: 'Normal' }

export const margin = (price: number, cost: number) => (price > 0 ? (price - cost) / price : 0)

export const STAGE_LABEL: Record<Stage, string> = {
  factory: 'Fábrica', transit: 'En tránsito', store: 'Tienda', sold: 'Vendido',
}

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Genera un SKU con las 3 primeras letras del nombre: Kumis → KUM-001. */
export function generateSku(name: string, existing: string[]): string {
  const letters = stripAccents(name).toUpperCase().replace(/[^A-Z]/g, '')
  const prefix = (letters + 'XXX').slice(0, 3)
  const taken = new Set(existing.map((s) => s.toUpperCase()))
  let n = 1
  while (taken.has(`${prefix}-${pad3(n)}`)) n++
  return `${prefix}-${pad3(n)}`
}

function cleanProduct(p: unknown): ProductInput {
  const o = (p ?? {}) as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const unit = typeof o.unit === 'string' ? o.unit.trim() : ''
  const sku = typeof o.sku === 'string' ? o.sku.trim().toUpperCase() : ''
  if (!name) fail('El nombre del producto es obligatorio.')
  if (name.length > 60) fail('El nombre del producto es demasiado largo.')
  if (!unit) fail('La unidad del producto es obligatoria.')
  if (sku.length > 20) fail('El SKU es demasiado largo.')
  const cost = nonNegInt(o.cost, 'El costo')
  const price = positiveInt(o.price, 'El precio')
  return { name, unit, sku, cost, price }
}

function cleanItems(items: unknown, allowZero = false): { productId: number; qty: number }[] {
  if (!Array.isArray(items) || items.length === 0) fail('Agrega al menos un producto.')
  const seen = new Set<number>()
  return (items as unknown[]).map((it) => {
    const o = (it ?? {}) as Record<string, unknown>
    const productId = positiveInt(o.productId, 'El producto')
    if (seen.has(productId)) fail('Hay productos repetidos en la lista.')
    seen.add(productId)
    const qty = allowZero ? nonNegInt(o.qty, 'La cantidad') : positiveInt(o.qty, 'La cantidad')
    return { productId, qty }
  })
}

/** Valida y normaliza una acción recibida (en el cliente o en la API). */
export function normalizeAction(raw: unknown): Action {
  const o = (raw ?? {}) as Record<string, unknown>
  switch (o.action) {
    case 'produce':
      return { action: 'produce', productId: positiveInt(o.productId, 'El producto'), qty: positiveInt(o.qty) }
    case 'saveWeekProduction':
      return { action: 'saveWeekProduction', items: cleanItems(o.items, true) }
    case 'createShipment':
      return { action: 'createShipment', items: cleanItems(o.items) }
    case 'receiveShipment':
      return { action: 'receiveShipment', shipmentId: positiveInt(o.shipmentId, 'El envío') }
    case 'sale':
      return {
        action: 'sale',
        productId: positiveInt(o.productId, 'El producto'),
        qty: positiveInt(o.qty, 'La cantidad vendida'),
        unitPrice: positiveInt(o.unitPrice, 'El precio unitario'),
      }
    case 'createProduct':
      return { action: 'createProduct', product: cleanProduct(o.product) }
    case 'updateProduct':
      return { action: 'updateProduct', id: positiveInt(o.id, 'El producto'), product: cleanProduct(o.product) }
    case 'saveSettings': {
      const s = (o.settings ?? {}) as Record<string, unknown>
      const out: Partial<Omit<Settings, 'demandPlan'>> = {}
      if (s.companyName !== undefined) {
        const name = typeof s.companyName === 'string' ? s.companyName.trim() : ''
        if (!name) fail('El nombre de la empresa es obligatorio.')
        out.companyName = name.slice(0, 60)
      }
      if (s.lowStockThreshold !== undefined) out.lowStockThreshold = nonNegInt(s.lowStockThreshold, 'El umbral de stock bajo')
      if (s.currency !== undefined) {
        if (s.currency !== 'COP' && s.currency !== 'USD') fail('Moneda no válida.')
        out.currency = s.currency as 'COP' | 'USD'
      }
      return { action: 'saveSettings', settings: out }
    }
    case 'savePlan': {
      const p = (o.plan ?? {}) as Record<string, unknown>
      const scenario = (['normal', 'up', 'down'].includes(p.scenario as string) ? p.scenario : 'normal') as Scenario
      if (!Array.isArray(p.rows)) fail('El plan no es válido.')
      const rows = (p.rows as unknown[]).map((r) => {
        const x = (r ?? {}) as Record<string, unknown>
        return {
          productId: positiveInt(x.productId, 'El producto'),
          plan: nonNegInt(x.plan, 'El plan'),
          price: positiveInt(x.price, 'El precio'),
        }
      })
      return { action: 'savePlan', plan: { scenario, rows, savedAt: new Date().toISOString() } }
    }
    case 'reset':
      return { action: 'reset' }
    default:
      return fail('Acción no reconocida.')
  }
}

// ───────────────────────── Aplicación en memoria ─────────────────────────

function findProduct(state: InventoryState, id: number): Product {
  const p = state.products.find((x) => x.id === id)
  if (!p) fail('El producto no existe.')
  return p as Product
}

/**
 * Aplica una acción a una copia del estado. Se usa para la actualización
 * optimista y para el "Modo local". Lanza DomainError si viola una regla.
 */
export function applyAction(prev: InventoryState, action: Action, now = new Date().toISOString(), seed?: () => InventoryState): InventoryState {
  const s: InventoryState = structuredClone(prev)
  let hid = s.history.reduce((m, h) => Math.max(m, h.id), 0)
  const log = (productId: number, type: HistoryType, tone: Stage, qty: number, detail: string) => {
    s.history.unshift({ id: ++hid, productId, type, tone, qty, detail, createdAt: now } satisfies HistoryEntry)
  }

  switch (action.action) {
    case 'produce': {
      const p = findProduct(s, action.productId)
      p.factory += action.qty
      log(p.id, 'Producción', 'factory', action.qty, `+${action.qty} unidades producidas en fábrica`)
      break
    }
    case 'saveWeekProduction': {
      for (const it of action.items) {
        const p = findProduct(s, it.productId)
        const diff = it.qty - p.weekProduction
        if (diff === 0) continue
        if (p.factory + diff < 0) fail(`No se puede reducir la producción de ${p.name}: la fábrica quedaría con stock negativo.`)
        p.factory += diff
        p.weekProduction = it.qty
        log(p.id, 'Producción', 'factory', diff,
          diff > 0 ? `+${diff} unidades · carga semanal (${it.qty} en total)` : `${diff} unidades · ajuste de carga semanal (${it.qty} en total)`)
      }
      break
    }
    case 'createShipment': {
      const id = s.shipments.reduce((m, x) => Math.max(m, x.id), 0) + 1
      const code = shipmentCode(id)
      for (const it of action.items) {
        const p = findProduct(s, it.productId)
        if (it.qty > p.factory) fail(`No hay suficiente ${p.name} en fábrica (disponible: ${p.factory}).`)
        p.factory -= it.qty
        p.transit += it.qty
        log(p.id, 'Transferencia', 'factory', it.qty, `−${it.qty} unidades salen de fábrica · ${code}`)
        log(p.id, 'En tránsito', 'transit', it.qty, `${it.qty} unidades en camino a la tienda · ${code}`)
      }
      s.shipments.unshift({ id, status: 'in_transit', createdAt: now, receivedAt: null, items: action.items })
      break
    }
    case 'receiveShipment': {
      const sh = s.shipments.find((x) => x.id === action.shipmentId)
      if (!sh) fail('El envío no existe.')
      if (sh!.status === 'received') fail(`El envío ${shipmentCode(sh!.id)} ya fue recibido.`)
      for (const it of sh!.items) {
        const p = findProduct(s, it.productId)
        if (it.qty > p.transit) fail(`Las unidades en tránsito de ${p.name} no alcanzan para recibir este envío.`)
        p.transit -= it.qty
        p.store += it.qty
        log(p.id, 'Recepción', 'store', it.qty, `+${it.qty} unidades recibidas en tienda · ${shipmentCode(sh!.id)}`)
      }
      sh!.status = 'received'
      sh!.receivedAt = now
      break
    }
    case 'sale': {
      const p = findProduct(s, action.productId)
      if (action.qty > p.store) fail(`Solo hay ${p.store} unidades de ${p.name} en tienda.`)
      const id = s.sales.reduce((m, x) => Math.max(m, x.id), 1042) + 1
      p.store -= action.qty
      p.sold += action.qty
      s.sales.unshift({ id, productId: p.id, qty: action.qty, unitPrice: action.unitPrice, createdAt: now })
      log(p.id, 'Venta', 'sold', action.qty, `${action.qty} unidades vendidas · ${saleCode(id)}`)
      break
    }
    case 'createProduct': {
      const sku = action.product.sku || generateSku(action.product.name, s.products.map((p) => p.sku))
      if (s.products.some((p) => p.sku.toUpperCase() === sku)) fail(`Ya existe un producto con el SKU ${sku}.`)
      const id = s.products.reduce((m, p) => Math.max(m, p.id), 0) + 1
      s.products.push({
        id, name: action.product.name, sku, unit: action.product.unit, cost: action.product.cost, price: action.product.price,
        factory: 0, transit: 0, store: 0, sold: 0, prevWeek: 0, weekProduction: 0, image: null,
        position: s.products.reduce((m, p) => Math.max(m, p.position), 0) + 1,
      })
      break
    }
    case 'updateProduct': {
      const p = findProduct(s, action.id)
      const sku = action.product.sku || p.sku
      if (s.products.some((x) => x.id !== p.id && x.sku.toUpperCase() === sku)) fail(`Ya existe un producto con el SKU ${sku}.`)
      Object.assign(p, { name: action.product.name, unit: action.product.unit, cost: action.product.cost, price: action.product.price, sku })
      break
    }
    case 'saveSettings':
      Object.assign(s.settings, action.settings)
      break
    case 'savePlan':
      s.settings.demandPlan = action.plan
      break
    case 'reset':
      if (!seed) fail('No se puede reiniciar sin datos iniciales.')
      return seed!()
  }
  return s
}

// ───────────────────────── Planeación de demanda ─────────────────────────

export const SCENARIO_FACTOR: Record<Scenario, number> = { normal: 1, up: 1.1, down: 0.9 }
export const SCENARIO_LABEL: Record<Scenario, string> = {
  normal: 'Forecast normal', up: 'Proyección +10%', down: 'Proyección −10%',
}

export interface Forecast {
  lastWeek: number
  avg4: number
  trend: number
  weighted: number
  demand: number
}

/** Promedio ponderado (1,2,3,4) × ajuste por tendencia (±5% si la última semana cambió más de 2%). */
export function forecast(history: number[], scenario: Scenario = 'normal'): Forecast {
  const h = history.length ? history : [0]
  const weights = h.map((_, i) => i + 1)
  const wsum = weights.reduce((a, b) => a + b, 0)
  const weighted = h.reduce((acc, v, i) => acc + v * weights[i], 0) / wsum
  const last = h[h.length - 1]
  const prev = h.length > 1 ? h[h.length - 2] : last
  const trend = prev > 0 ? (last - prev) / prev : 0
  const adj = trend > 0.02 ? 1.05 : trend < -0.02 ? 0.95 : 1
  const demand = Math.max(0, Math.round(weighted * adj * SCENARIO_FACTOR[scenario]))
  return { lastWeek: last, avg4: h.reduce((a, b) => a + b, 0) / h.length, trend, weighted, demand }
}
