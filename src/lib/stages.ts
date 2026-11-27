import { Factory, Receipt, Store, Truck, type LucideIcon } from 'lucide-react'
import type { Stage } from '@shared/types'

export const STAGES: Stage[] = ['factory', 'transit', 'store', 'sold']

export const STAGE_META: Record<Stage, { label: string; icon: LucideIcon; text: string; bg: string; bar: string; hex: string; description: string }> = {
  factory: { label: 'Fábrica', icon: Factory, text: 'text-primary', bg: 'bg-primary-soft', bar: 'bg-primary', hex: 'hsl(134 54% 40%)', description: 'Producido y listo para despacho' },
  transit: { label: 'En tránsito', icon: Truck, text: 'text-transit', bg: 'bg-transit-soft', bar: 'bg-transit', hex: 'hsl(217 80% 55%)', description: 'En camino hacia la tienda' },
  store: { label: 'Tienda', icon: Store, text: 'text-store', bg: 'bg-store-soft', bar: 'bg-store', hex: 'hsl(262 60% 58%)', description: 'Disponible para la venta' },
  sold: { label: 'Vendido', icon: Receipt, text: 'text-sold', bg: 'bg-sold-soft', bar: 'bg-sold', hex: 'hsl(190 70% 40%)', description: 'Vendido a clientes esta semana' },
}
