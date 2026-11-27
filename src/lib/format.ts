import type { Currency } from '@shared/types'

/** Tasa de referencia para mostrar valores en dólares. */
export const USD_RATE = 4000

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function money(value: number, currency: Currency = 'COP') {
  if (currency === 'USD') return usd.format(value / USD_RATE).replace('US$', 'US$ ')
  return cop.format(Math.round(value)).replace(/\s/g, '')
}

/** Formato corto para ejes de gráficas: $1,2 M, $350 mil. */
export function moneyShort(value: number, currency: Currency = 'COP') {
  const v = currency === 'USD' ? value / USD_RATE : value
  const sym = currency === 'USD' ? 'US$' : '$'
  if (Math.abs(v) >= 1_000_000) return `${sym}${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (Math.abs(v) >= 1_000 && currency === 'COP') return `${sym}${Math.round(v / 1000)} mil`
  return `${sym}${int.format(v)}`
}

export const num = (n: number) => int.format(Math.round(n))

export const pct = (n: number, digits = 0) =>
  `${(n * 100).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`

export const signedPct = (n: number, digits = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${pct(Math.abs(n), digits)}`

const TZ = 'America/Bogota'
export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: TZ }).format(new Date(iso)).replace('.', '')
export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ })
    .format(new Date(iso)).replace('.', '')

/** Día de la semana (0 = lunes) y lunes de la semana de una fecha, en hora de Colombia. */
export function bogotaParts(iso: string) {
  const local = new Date(new Date(iso).getTime() - 5 * 3600 * 1000)
  const dow = (local.getUTCDay() + 6) % 7
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow)
  return { dow, monday }
}
