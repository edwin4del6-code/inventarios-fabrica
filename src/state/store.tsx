import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { applyAction, DomainError, normalizeAction } from '@shared/domain'
import { buildSeed } from '@shared/seed'
import type { Action, InventoryState } from '@shared/types'

export type ConnectionMode = 'loading' | 'live' | 'local'

interface StoreValue {
  state: InventoryState
  mode: ConnectionMode
  /** Aplica la acción al instante y la confirma con la API. Devuelve false si fue rechazada localmente. */
  dispatch: (action: Action, opts?: { resetToken?: string }) => boolean
}

const StoreCtx = createContext<StoreValue | null>(null)
const API = '/api/inventory'
const POLL_MS = 4000

class ApiError extends Error {}

async function request(init?: RequestInit, timeoutMs = 8000): Promise<InventoryState> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(API, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('application/json')) throw new Error('La API no está disponible.')
    const body = await res.json()
    if (!res.ok) throw new ApiError(body?.error ?? 'No se pudo completar la operación.')
    return body as InventoryState
  } finally {
    clearTimeout(t)
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<InventoryState>(() => buildSeed())
  const [mode, setMode] = useState<ConnectionMode>('loading')
  const stateRef = useRef(state)
  const modeRef = useRef<ConnectionMode>('loading')
  const pending = useRef(0)
  const version = useRef(0)
  const localDirty = useRef(false)

  const setState = useCallback((s: InventoryState) => {
    stateRef.current = s
    setStateRaw(s)
  }, [])
  const changeMode = useCallback((m: ConnectionMode) => {
    modeRef.current = m
    setMode(m)
  }, [])

  const refresh = useCallback(async () => {
    const v = version.current
    try {
      const s = await request()
      if (modeRef.current === 'local' && localDirty.current) return
      if (pending.current === 0 && v === version.current) setState(s)
      if (modeRef.current !== 'live') changeMode('live')
    } catch {
      if (modeRef.current === 'loading') changeMode('local')
    }
  }, [changeMode, setState])

  useEffect(() => {
    refresh()
    let tick = 0
    const id = setInterval(() => {
      tick++
      // En modo local se reintenta con menos frecuencia (cada ~16 s).
      if (modeRef.current === 'local' && tick % 4 !== 0) return
      refresh()
    }, POLL_MS)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  const dispatch = useCallback(
    (raw: Action, opts?: { resetToken?: string }) => {
      const prev = stateRef.current
      let action: Action
      let next: InventoryState
      try {
        action = normalizeAction(raw)
        next = applyAction(prev, action, new Date().toISOString(), buildSeed)
      } catch (e) {
        toast.error(e instanceof DomainError ? e.message : 'No se pudo completar la operación.')
        return false
      }
      version.current++
      setState(next)

      if (modeRef.current !== 'live') {
        localDirty.current = true
        return true
      }

      pending.current++
      const headers: Record<string, string> = {}
      if (opts?.resetToken) headers['x-reset-token'] = opts.resetToken
      request({ method: 'POST', body: JSON.stringify(action), headers }, 15000)
        .then((s) => {
          pending.current--
          version.current++
          if (pending.current === 0) setState(s)
        })
        .catch((e) => {
          pending.current--
          version.current++
          if (pending.current === 0) setState(prev)
          toast.error(e instanceof ApiError ? e.message : 'No se pudo guardar en la base de datos. Se revirtió el cambio.')
          refresh()
        })
      return true
    },
    [refresh, setState],
  )

  const value = useMemo(() => ({ state, mode, dispatch }), [state, mode, dispatch])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}
