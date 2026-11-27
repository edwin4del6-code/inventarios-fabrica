import { AlertTriangle, ChevronRight, CircleCheck, Truck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { HistoryEntry, Stage } from '@shared/types'
import { Badge, Button, Card, CardHeader, PageHeader, ProductThumb, Select, StatusBadge, Table, Td, Th } from '@/components/ui'
import { bogotaParts, num, pct, signedPct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { STAGE_META, STAGES } from '@/lib/stages'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_MS = 86400000

export function weeklyMovement(history: HistoryEntry[], week: 'current' | 'prev', productId?: number) {
  const anchor = history.reduce((m, h) => (h.createdAt > m ? h.createdAt : m), '') || new Date().toISOString()
  const monday = bogotaParts(anchor).monday - (week === 'prev' ? 7 * DAY_MS : 0)
  const data = DAYS.map((d) => ({ day: d, Producción: 0, Envíos: 0, Recepciones: 0, Ventas: 0 }))
  for (const h of history) {
    if (productId && h.productId !== productId) continue
    const { dow, monday: m } = bogotaParts(h.createdAt)
    if (m !== monday) continue
    const key = h.type === 'Producción' ? 'Producción' : h.type === 'En tránsito' ? 'Envíos' : h.type === 'Recepción' ? 'Recepciones' : h.type === 'Venta' ? 'Ventas' : null
    if (key) data[dow][key] += Math.max(0, h.qty)
  }
  const from = new Date(monday)
  const to = new Date(monday + 6 * DAY_MS)
  const f = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '')
  return { data, range: `${f(from)} – ${f(to)}` }
}

export const CHART_COLORS = {
  Producción: STAGE_META.factory.hex,
  Envíos: STAGE_META.transit.hex,
  Recepciones: STAGE_META.store.hex,
  Ventas: STAGE_META.sold.hex,
}

export function Dashboard() {
  const { products, byId, state, activeShipments, fmt, status, threshold } = useInventory()
  const { openSheet, openModal } = useUI()
  const [week, setWeek] = useState<'current' | 'prev'>('current')
  const [filter, setFilter] = useState<string>('all')
  const selected = filter !== 'all' ? byId.get(Number(filter)) : undefined
  const list = selected ? [selected] : products

  const totals = useMemo(() => {
    const t = { factory: 0, transit: 0, store: 0, sold: 0 } as Record<Stage, number>
    for (const p of list) for (const s of STAGES) t[s] += p[s]
    return t
  }, [list])
  const flow = STAGES.reduce((a, s) => a + totals[s], 0) || 1
  const weekProd = list.reduce((a, p) => a + p.weekProduction, 0)
  const prevProd = list.reduce((a, p) => a + p.prevWeek, 0)
  const prodChange = prevProd ? (weekProd - prevProd) / prevProd : 0
  const shipmentsForList = selected ? activeShipments.filter((s) => s.items.some((i) => i.productId === selected.id)) : activeShipments

  const secondary: Record<Stage, string> = {
    factory: week === 'current' ? `${signedPct(prodChange)} vs sem. anterior` : `${num(prevProd)} producidas sem. anterior`,
    transit: `${shipmentsForList.length} ${shipmentsForList.length === 1 ? 'envío activo' : 'envíos activos'}`,
    store: `${fmt(list.reduce((a, p) => a + p.store * p.price, 0))} en inventario`,
    sold: `${fmt(list.reduce((a, p) => a + p.sold * p.price, 0))} en ventas`,
  }

  const movement = useMemo(() => weeklyMovement(state.history, week, selected?.id), [state.history, week, selected?.id])
  const alerts = products.filter((p) => status(p.store) !== 'ok').sort((a, b) => a.store - b.store)

  const sendRestock = (id: number) => {
    const p = byId.get(id)!
    const qty = Math.min(Math.max(0, threshold + 1 - p.store), p.factory)
    openModal({ type: 'shipment', prefill: qty > 0 ? { [id]: qty } : {} })
  }

  return (
    <>
      <PageHeader
        title="Inventory Overview"
        subtitle="Vista general del flujo de inventario"
        actions={
          <>
            <Select
              ariaLabel="Semana"
              className="w-[170px]"
              value={week}
              onValueChange={setWeek}
              options={[{ value: 'current', label: 'Semana actual' }, { value: 'prev', label: 'Semana anterior' }]}
            />
            <Select
              ariaLabel="Producto"
              className="w-[200px]"
              value={filter}
              onValueChange={setFilter}
              options={[{ value: 'all', label: 'Todos los productos' }, ...products.map((p) => ({ value: String(p.id), label: p.name }))]}
            />
          </>
        }
      />

      {selected && (
        <div className="-mt-2 mb-6 flex animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft py-1.5 pl-3 pr-1.5 text-sm text-primary">
            Mostrando únicamente <span className="font-bold">{selected.name} · {selected.sku}</span>
            <button onClick={() => setFilter('all')} className="rounded-full p-1 transition hover:bg-primary/10" aria-label="Quitar filtro"><X className="h-3.5 w-3.5" /></button>
          </span>
        </div>
      )}

      {/* Tarjetas de etapa */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
        {STAGES.map((s, i) => {
          const meta = STAGE_META[s]
          const share = totals[s] / flow
          return (
            <div key={s} className="flex items-stretch">
              <button
                onClick={() => openSheet({ type: 'stage', stage: s })}
                className="group flex-1 rounded-2xl border bg-card p-6 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest text-muted-foreground/70 tabular">0{i + 1}</span>
                  <span className={cn('grid h-10 w-10 place-items-center rounded-xl', meta.bg, meta.text)}><meta.icon className="h-5 w-5" /></span>
                </div>
                <p className="mt-5 text-sm font-semibold text-muted-foreground">{meta.label}</p>
                <p className="mt-1 text-4xl font-extrabold tracking-[-0.03em] tabular">{num(totals[s])}</p>
                <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">del flujo total</span>
                    <span className="font-semibold tabular">{pct(share)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full transition-all duration-500', meta.bar)} style={{ width: `${share * 100}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <span className={cn('font-semibold', s === 'factory' && week === 'current' ? (prodChange >= 0 ? 'text-primary' : 'text-danger') : 'text-foreground')}>{secondary[s]}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
              </button>
              {i < 3 && (
                <div className="hidden w-8 shrink-0 items-center justify-center xl:flex">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabla */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Inventory by Product" subtitle="Unidades de cada producto en cada etapa" className="pb-5" />
        <Table>
          <thead>
            <tr><Th>Producto</Th><Th>SKU</Th><Th className="text-right">Fábrica</Th><Th className="text-right">En tránsito</Th><Th className="text-right">Tienda</Th><Th className="text-right">Vendido</Th><Th className="text-right">Precio</Th><Th>Estado</Th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} onClick={() => openSheet({ type: 'product', productId: p.id })} className="cursor-pointer transition-colors hover:bg-muted/40">
                <Td>
                  <div className="flex items-center gap-3">
                    <ProductThumb name={p.name} image={p.image} />
                    <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.unit}</p></div>
                  </div>
                </Td>
                <Td className="text-muted-foreground">{p.sku}</Td>
                <Td className="text-right tabular">{num(p.factory)}</Td>
                <Td className="text-right tabular">{num(p.transit)}</Td>
                <Td className="text-right font-semibold tabular">{num(p.store)}</Td>
                <Td className="text-right tabular">{num(p.sold)}</Td>
                <Td className="text-right tabular">{fmt(p.price)}</Td>
                <Td><StatusBadge status={status(p.store)} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Movimiento semanal"
            subtitle={`${week === 'current' ? 'Semana actual' : 'Semana anterior'} · ${movement.range}`}
          />
          <div className="h-[300px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movement.data} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="hsl(220 14% 92%)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} />
                <RTooltip cursor={{ fill: 'hsl(220 16% 96%)' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(220 14% 91%)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {Object.entries(CHART_COLORS).map(([k, c]) => <Bar key={k} dataKey={k} fill={c} radius={[4, 4, 0, 0]} maxBarSize={14} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Alertas de tienda" subtitle="Productos que necesitan reposición" action={alerts.length ? <Badge tone="amber">{alerts.length}</Badge> : undefined} />
          <div className="p-5 pt-4 sm:p-6 sm:pt-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl bg-primary-soft/60 px-4 py-10 text-center">
                <CircleCheck className="h-8 w-8 text-primary" />
                <p className="mt-3 font-bold">Todo en orden</p>
                <p className="mt-1 text-sm text-muted-foreground">Ningún producto está por debajo del umbral de {threshold} unidades.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.map((p) => {
                  const out = p.store === 0
                  return (
                    <li key={p.id} className={cn('flex items-center gap-3 rounded-xl border p-3', out ? 'border-danger/20 bg-danger-soft/50' : 'border-warning/20 bg-warning-soft/40')}>
                      <ProductThumb name={p.name} image={p.image} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className={cn('flex items-center gap-1 text-xs font-medium', out ? 'text-danger' : 'text-warning')}>
                          <AlertTriangle className="h-3 w-3" /> {out ? 'Agotado' : `Stock bajo · ${p.store} en tienda`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => sendRestock(p.id)} disabled={p.factory === 0}>
                        <Truck /> Enviar
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
