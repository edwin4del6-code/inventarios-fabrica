export type Stage = 'factory' | 'transit' | 'store' | 'sold'

export interface Product {
  id: number
  name: string
  sku: string
  unit: string
  cost: number
  price: number
  factory: number
  transit: number
  store: number
  sold: number
  prevWeek: number
  weekProduction: number
  image: string | null
  position: number
}

export interface ShipmentItem {
  productId: number
  qty: number
}

export interface Shipment {
  id: number
  status: 'in_transit' | 'received'
  createdAt: string
  receivedAt: string | null
  items: ShipmentItem[]
}

export interface Sale {
  id: number
  productId: number
  qty: number
  unitPrice: number
  createdAt: string
}

export type HistoryType = 'Producción' | 'Transferencia' | 'En tránsito' | 'Recepción' | 'Venta'

export interface HistoryEntry {
  id: number
  productId: number
  type: HistoryType
  detail: string
  tone: Stage
  qty: number
  createdAt: string
}

export type Scenario = 'normal' | 'up' | 'down'

export interface PlanRow {
  productId: number
  plan: number
  price: number
}

export interface DemandPlan {
  scenario: Scenario
  rows: PlanRow[]
  savedAt: string
}

export type Currency = 'COP' | 'USD'

export interface Settings {
  companyName: string
  lowStockThreshold: number
  currency: Currency
  demandPlan: DemandPlan | null
}

export interface InventoryState {
  products: Product[]
  shipments: Shipment[]
  sales: Sale[]
  history: HistoryEntry[]
  settings: Settings
}

export interface ProductInput {
  name: string
  sku?: string
  unit: string
  cost: number
  price: number
}

export type Action =
  | { action: 'produce'; productId: number; qty: number }
  | { action: 'saveWeekProduction'; items: { productId: number; qty: number }[] }
  | { action: 'createShipment'; items: ShipmentItem[] }
  | { action: 'receiveShipment'; shipmentId: number }
  | { action: 'sale'; productId: number; qty: number; unitPrice: number }
  | { action: 'createProduct'; product: ProductInput }
  | { action: 'updateProduct'; id: number; product: ProductInput }
  | { action: 'saveSettings'; settings: Partial<Omit<Settings, 'demandPlan'>> }
  | { action: 'savePlan'; plan: DemandPlan }
  | { action: 'reset' }
