import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Stage } from '@shared/types'

export const PAGES = ['dashboard', 'fabrica', 'tienda', 'transito', 'ventas', 'planeacion', 'productos', 'reportes', 'configuracion'] as const
export type PageId = (typeof PAGES)[number]

export type Modal =
  | { type: 'production'; productId?: number }
  | { type: 'shipment'; prefill?: Record<number, number> }
  | { type: 'sale'; productId?: number }
  | { type: 'product'; productId?: number }
  | null

export type SheetState = { type: 'stage'; stage: Stage } | { type: 'product'; productId: number } | null

interface UIValue {
  page: PageId
  navigate: (p: PageId) => void
  modal: Modal
  openModal: (m: Modal) => void
  sheet: SheetState
  openSheet: (s: SheetState) => void
  /** Borrador de producción semanal enviado desde Planeación. */
  factoryDraft: Record<number, number> | null
  setFactoryDraft: (d: Record<number, number> | null) => void
}

const UICtx = createContext<UIValue | null>(null)

const readHash = (): PageId => {
  const h = window.location.hash.replace(/^#\/?/, '') as PageId
  return PAGES.includes(h) ? h : 'dashboard'
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>(readHash)
  const [modal, setModal] = useState<Modal>(null)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [factoryDraft, setFactoryDraft] = useState<Record<number, number> | null>(null)

  useEffect(() => {
    const on = () => setPage(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const navigate = useCallback((p: PageId) => {
    window.location.hash = `/${p}`
    setPage(p)
    window.scrollTo({ top: 0 })
  }, [])

  const openModal = useCallback((m: Modal) => {
    setSheet(null)
    setModal(m)
  }, [])

  const value = useMemo(
    () => ({ page, navigate, modal, openModal, sheet, openSheet: setSheet, factoryDraft, setFactoryDraft }),
    [page, navigate, modal, openModal, sheet, factoryDraft],
  )
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>
}

export function useUI() {
  const ctx = useContext(UICtx)
  if (!ctx) throw new Error('useUI debe usarse dentro de UIProvider')
  return ctx
}
