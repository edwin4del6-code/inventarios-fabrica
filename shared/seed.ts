import type { HistoryEntry, InventoryState, Product, Sale, Shipment } from './types.js'

type Row = [string, string, string, number, number, number, number, number, number, number, number, string]

// nombre · SKU · unidad · costo · precio · fábrica · tránsito · tienda · vendido · sem. anterior · sem. actual · foto
const rows: Row[] = [
  ['Huevos', 'HUE-001', 'Cubeta x30', 8000, 12000, 80, 30, 42, 28, 70, 80, 'huevos'],
  ['Yogur', 'YOG-001', 'Vaso 1 L', 4500, 7200, 50, 20, 35, 31, 45, 50, 'yogur'],
  ['Arándanos', 'ARA-001', 'Caja 125 g', 6000, 9800, 35, 15, 8, 22, 40, 35, 'arandanos'],
  ['Arepas', 'ARE-001', 'Paquete x5', 2800, 4500, 70, 25, 50, 38, 65, 70, 'arepas'],
  ['Leche', 'LEC-001', 'Bolsa 1 L', 3200, 4800, 60, 0, 0, 45, 60, 60, 'leche'],
  ['Queso', 'QUE-001', 'Bloque 500 g', 11000, 16500, 40, 10, 18, 12, 35, 40, 'queso'],
  ['Granola', 'GRA-001', 'Bolsa 500 g', 7500, 12900, 30, 10, 6, 14, 30, 30, 'granola'],
  ['Pan', 'PAN-001', 'Pan tajado', 3500, 5900, 45, 15, 30, 26, 50, 45, 'pan'],
  ['Mantequilla', 'MAN-001', 'Barra 250 g', 5200, 8500, 25, 5, 22, 9, 25, 25, 'mantequilla'],
  ['Jugo', 'JUG-001', 'Botella 1 L', 4200, 6900, 15, 10, 20, 15, 20, 15, 'jugo'],
]

/** Ventas de las últimas 4 semanas (de la más antigua a la más reciente), por SKU. */
export const SALES_HISTORY: Record<string, number[]> = {
  'HUE-001': [58, 62, 66, 71],
  'YOG-001': [48, 47, 46, 44],
  'ARA-001': [30, 34, 37, 41],
  'ARE-001': [60, 63, 64, 65],
  'LEC-001': [62, 61, 59, 58],
  'QUE-001': [36, 34, 35, 36],
  'GRA-001': [26, 29, 31, 29],
  'PAN-001': [55, 53, 52, 49],
  'MAN-001': [22, 23, 24, 25],
  'JUG-001': [28, 25, 23, 20],
}

const d = (s: string) => new Date(s).toISOString()

export function buildSeed(): InventoryState {
  const products: Product[] = rows.map((r, i) => ({
    id: i + 1,
    name: r[0],
    sku: r[1],
    unit: r[2],
    cost: r[3],
    price: r[4],
    factory: r[5],
    transit: r[6],
    store: r[7],
    sold: r[8],
    prevWeek: r[9],
    weekProduction: r[10],
    image: `/products/${r[11]}.jpg`,
    position: i + 1,
  }))
  const id = (name: string) => products.find((p) => p.name === name)!.id
  const items = (list: [string, number][]) => list.map(([n, qty]) => ({ productId: id(n), qty }))

  const shipments: Shipment[] = [
    { id: 4, status: 'in_transit', createdAt: d('2026-09-28T09:00:00-05:00'), receivedAt: null,
      items: items([['Huevos', 30], ['Yogur', 20], ['Arándanos', 15], ['Arepas', 15], ['Queso', 10]]) },
    { id: 3, status: 'in_transit', createdAt: d('2026-09-27T10:30:00-05:00'), receivedAt: null,
      items: items([['Arepas', 10], ['Granola', 10], ['Pan', 15], ['Mantequilla', 5], ['Jugo', 10]]) },
    { id: 2, status: 'received', createdAt: d('2026-09-25T08:00:00-05:00'), receivedAt: d('2026-09-25T15:00:00-05:00'),
      items: items([['Huevos', 25], ['Yogur', 20], ['Arepas', 30], ['Leche', 25], ['Pan', 20], ['Jugo', 15]]) },
    { id: 1, status: 'received', createdAt: d('2026-09-22T08:00:00-05:00'), receivedAt: d('2026-09-22T16:00:00-05:00'),
      items: items([['Arándanos', 20], ['Leche', 20], ['Queso', 18], ['Granola', 12], ['Mantequilla', 15]]) },
  ]

  const saleRows: [number, string, number, string][] = [
    [1042, 'Leche', 6, '2026-09-28T17:40:00-05:00'],
    [1041, 'Huevos', 4, '2026-09-28T12:15:00-05:00'],
    [1040, 'Arepas', 8, '2026-09-28T09:30:00-05:00'],
    [1039, 'Yogur', 5, '2026-09-27T18:10:00-05:00'],
    [1038, 'Arándanos', 3, '2026-09-27T13:45:00-05:00'],
    [1037, 'Pan', 7, '2026-09-27T10:20:00-05:00'],
    [1036, 'Queso', 2, '2026-09-26T16:30:00-05:00'],
    [1035, 'Jugo', 4, '2026-09-26T11:05:00-05:00'],
  ]
  const sales: Sale[] = saleRows.map(([sid, n, qty, at]) => ({
    id: sid, productId: id(n), qty, unitPrice: products.find((p) => p.id === id(n))!.price, createdAt: d(at),
  }))

  const history: HistoryEntry[] = []
  let hid = 1
  for (const p of products) {
    const moved = Math.max(5, Math.round(p.weekProduction * 0.35))
    const sold = Math.max(2, Math.round(moved * 0.3))
    history.push(
      { id: hid++, productId: p.id, type: 'Producción', tone: 'factory', qty: p.weekProduction,
        detail: `+${p.weekProduction} unidades producidas en fábrica`, createdAt: d('2026-09-23T09:00:00-05:00') },
      { id: hid++, productId: p.id, type: 'Transferencia', tone: 'factory', qty: moved,
        detail: `−${moved} unidades salen de fábrica`, createdAt: d('2026-09-24T08:30:00-05:00') },
      { id: hid++, productId: p.id, type: 'En tránsito', tone: 'transit', qty: moved,
        detail: `${moved} unidades en camino a la tienda`, createdAt: d('2026-09-24T08:35:00-05:00') },
      { id: hid++, productId: p.id, type: 'Recepción', tone: 'store', qty: moved,
        detail: `+${moved} unidades recibidas en tienda`, createdAt: d('2026-09-25T15:00:00-05:00') },
      { id: hid++, productId: p.id, type: 'Venta', tone: 'sold', qty: sold,
        detail: `${sold} unidades vendidas`, createdAt: d('2026-09-26T16:00:00-05:00') },
    )
  }

  return {
    products,
    shipments,
    sales,
    history,
    settings: { companyName: 'Andina Foods', lowStockThreshold: 10, currency: 'COP', demandPlan: null },
  }
}
