import { useCallback, useMemo } from 'react'
import { stockStatus } from '@shared/domain'
import { useStore } from '@/state/store'
import { money } from './format'

export function useInventory() {
  const { state, mode, dispatch } = useStore()
  const products = useMemo(() => [...state.products].sort((a, b) => a.position - b.position), [state.products])
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const { currency, lowStockThreshold: threshold } = state.settings
  const fmt = useCallback((v: number) => money(v, currency), [currency])
  const status = useCallback((store: number) => stockStatus(store, threshold), [threshold])
  const activeShipments = useMemo(() => state.shipments.filter((s) => s.status === 'in_transit'), [state.shipments])
  return { state, mode, dispatch, products, byId, fmt, status, threshold, currency, activeShipments }
}
