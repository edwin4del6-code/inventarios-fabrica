import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, Coins, Factory, Minus, Percent, Plus, Save, Send, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { forecast, margin, SCENARIO_LABEL } from '@shared/domain'
import { SALES_HISTORY } from '@shared/seed'
import type { Product, Scenario } from '@shared/types'
import { Badge, Button, Card, CardHeader, IntInput, PageHeader, ProductThumb, Select, StatCard, Table, Td, Th } from '@/components/ui'
import { fmtDateTime, num, pct, signedPct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'

const WEEKS = ['Sem 36', 'Sem 37', 'Sem 38', 'Sem 39']
const NEXT = 'Sem 40'

export const salesHistory = (p: Product) => SALES_HISTORY[p.sku] ?? [p.prevWeek, p.prevWeek, p.prevWeek, p.prevWeek]

export function Planeacion() {
  const { products, state, dispatch, fmt } = useInventory()
  const { navigate, setFactoryDraft } = useUI()
  const saved = state.settings.demandPlan
  const [scenario, setScenario] = useState<Scenario>(saved?.scenario ?? 'normal')
  const [open, setOpen] = useState<number | null>(null)

  const forecasts = useMemo(() => new Map(products.map((p) => [p.id, forecast(salesHistory(p), scenario)])), [products, scenario])

  const initialRows = () => {
    const r: Record<number, { plan: number | null; price: number | null }> = {}
    for (const p of products) {
      const s = saved?.rows.find((x) => x.productId === p.id)
      r[p.id] = s ? { plan: s.plan, price: s.price } : { plan: forecast(salesHistory(p), saved?.scenario ?? 'normal').demand, price: p.price }
    }
    return r
  }
  const [rows, setRows] = useState(initialRows)
  const row = (p: Product) => rows[p.id] ?? { plan: forecasts.get(p.id)!.demand, price: p.price }
  const setRow = (id: number, patch: Partial<{ plan: number | null; price: number | null }>) =>
    setRows((r) => ({ ...r, [id]: { ...(r[id] ?? { plan: 0, price: 0 }), ...patch } }))

  const calc = products.map((p) => {
    const f = forecasts.get(p.id)!
    const r = row(p)
    const plan = r.plan ?? 0
    const price = r.price ?? p.price
    return { p, f, plan, price, revenue: plan * price, cost: plan * p.cost, m: margin(price, p.cost), hist: salesHistory(p) }
  })

  const projRevenue = calc.reduce((a, c) => a + c.f.demand * c.price, 0)
  const lastRevenue = calc.reduce((a, c) => a + c.f.lastWeek * c.price, 0)
  const planned = calc.reduce((a, c) => a + c.plan, 0)
  const planRevenue = calc.reduce((a, c) => a + c.revenue, 0)
  const costs = calc.reduce((a, c) => a + c.cost, 0)
  const gross = planRevenue - costs
  const vsLast = lastRevenue ? (projRevenue - lastRevenue) / lastRevenue : 0

  const chart = [
    ...WEEKS.map((w, i) => ({ week: w, Real: calc.reduce((a, c) => a + c.hist[i], 0), Proyección: i === 3 ? calc.reduce((a, c) => a + c.hist[3], 0) : null as number | null })),
    { week: NEXT, Real: null as number | null, Proyección: calc.reduce((a, c) => a + c.f.demand, 0) },
  ]

  const byTrend = [...calc].sort((a, b) => b.f.trend - a.f.trend)
  const best = byTrend[0]
  const worst = byTrend[byTrend.length - 1]

  const generate = () => {
    setRows(Object.fromEntries(products.map((p) => [p.id, { plan: forecasts.get(p.id)!.demand, price: row(p).price ?? p.price }])))
    toast.success(`Planeación generada · ${SCENARIO_LABEL[scenario]}`)
  }
  const invalid = calc.some((c) => !rows[c.p.id] || rows[c.p.id].plan === null || !rows[c.p.id].price)
  const save = () => {
    if (invalid) return toast.error('Completa el plan y el precio de todos los productos.')
    const ok = dispatch({ action: 'savePlan', plan: { scenario, savedAt: new Date().toISOString(), rows: calc.map((c) => ({ productId: c.p.id, plan: c.plan, price: c.price })) } })
    if (ok) toast.success('Planeación guardada')
  }
  const sendToProduction = () => {
    if (invalid) return toast.error('Completa el plan de todos los productos.')
    setFactoryDraft(Object.fromEntries(calc.map((c) => [c.p.id, c.plan])))
    navigate('fabrica')
    toast.success('Plan copiado a la producción de la semana · revisa y guarda en Fábrica')
  }

  return (
    <>
      <PageHeader
        title="Planeación de demanda"
        subtitle="Proyección de la próxima semana con base en las ventas de las últimas 4 semanas"
        eyebrow={saved ? <Badge tone="gray">Guardada {fmtDateTime(saved.savedAt)}</Badge> : undefined}
        actions={
          <>
            <Select ariaLabel="Escenario" className="w-[190px]" value={scenario} onValueChange={setScenario}
              options={(Object.keys(SCENARIO_LABEL) as Scenario[]).map((s) => ({ value: s, label: SCENARIO_LABEL[s] }))} />
            <Button variant="outline" onClick={generate}><Sparkles /> Generar planeación</Button>
            <Button variant="outline" onClick={save}><Save /> Guardar</Button>
            <Button onClick={sendToProduction}><Send /> Enviar a producción</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Proyección próxima semana" value={fmt(projRevenue)} icon={Wallet}
          hint={<span className={vsLast >= 0 ? 'font-semibold text-primary' : 'font-semibold text-danger'}>{signedPct(vsLast, 1)} vs semana pasada</span>} />
        <StatCard label="Producción planeada" value={`${num(planned)} u.`} hint={`${products.length} productos`} icon={Factory} tone="blue" />
        <StatCard label="Costos proyectados" value={fmt(costs)} hint="plan × costo unitario" icon={Coins} tone="amber" />
        <StatCard label="Margen bruto estimado" value={fmt(gross)} hint={planRevenue ? `${pct(gross / planRevenue, 1)} sobre ingresos del plan` : '—'} icon={Percent} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Ventas vs proyección" subtitle="Unidades totales · real de las últimas 4 semanas y proyección de la próxima" />
          <div className="h-[280px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid vertical={false} stroke="hsl(220 14% 92%)" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} domain={['dataMin - 30', 'dataMax + 30']} allowDecimals={false} />
                <RTooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(220 14% 91%)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Real" stroke="hsl(134 54% 40%)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
                <Line type="monotone" dataKey="Proyección" stroke="hsl(217 80% 55%)" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Lectura rápida" subtitle="Generada a partir de la tendencia" />
          <div className="space-y-3 p-5 pt-4 sm:p-6 sm:pt-4">
            {best && (
              <div className="flex gap-3 rounded-xl bg-primary-soft/70 p-4">
                <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed"><span className="font-bold">{best.p.name}</span> es el producto que más creció: {signedPct(best.f.trend, 1)} la última semana. Se proyectan {num(best.f.demand)} unidades.</p>
              </div>
            )}
            {worst && worst !== best && (
              <div className="flex gap-3 rounded-xl bg-danger-soft/70 p-4">
                <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <p className="text-sm leading-relaxed"><span className="font-bold">{worst.p.name}</span> es el que más cayó: {signedPct(worst.f.trend, 1)} la última semana. Conviene producir con cautela.</p>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">Proyección = promedio ponderado de 4 semanas (pesos 1·2·3·4) × ajuste por tendencia (±5% si la última semana cambió más de 2%).</p>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Plan por producto" subtitle="Haz clic en una fila para ver el historial y la cobertura" className="pb-5" />
        <Table className="min-w-[1080px]">
          <thead>
            <tr>
              <Th>Producto</Th><Th className="text-right">Ventas sem. pasada</Th><Th className="text-right">Promedio 4 sem.</Th><Th>Tendencia</Th>
              <Th className="text-right">Demanda proyectada</Th><Th>Plan final</Th><Th>Precio</Th><Th className="text-right">Ingreso estimado</Th><Th>Margen</Th>
            </tr>
          </thead>
          <tbody>
            {calc.map((c) => {
              const r = row(c.p)
              const isOpen = open === c.p.id
              const t = c.f.trend
              const cover = c.plan - c.f.demand
              return (
                <Fragment key={c.p.id}>
                  <tr className={cn('cursor-pointer transition-colors hover:bg-muted/40', isOpen && 'bg-muted/40')} onClick={() => setOpen(isOpen ? null : c.p.id)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition', isOpen && 'rotate-180')} />
                        <ProductThumb name={c.p.name} image={c.p.image} size="sm" />
                        <span className="font-semibold">{c.p.name}</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular">{num(c.f.lastWeek)}</Td>
                    <Td className="text-right tabular">{c.f.avg4.toLocaleString('es-CO', { maximumFractionDigits: 1 })}</Td>
                    <Td>
                      <span className={cn('inline-flex items-center gap-1 text-sm font-semibold tabular', t > 0.02 ? 'text-primary' : t < -0.02 ? 'text-danger' : 'text-muted-foreground')}>
                        {t > 0.02 ? <ArrowUpRight className="h-4 w-4" /> : t < -0.02 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        {signedPct(t, 1)}
                      </span>
                    </Td>
                    <Td className="text-right font-semibold tabular">{num(c.f.demand)}</Td>
                    <Td>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Restar" onClick={() => setRow(c.p.id, { plan: Math.max(0, (r.plan ?? 0) - 1) })}><Minus /></Button>
                        <IntInput aria-label={`Plan ${c.p.name}`} value={r.plan} onValueChange={(v) => setRow(c.p.id, { plan: v })} className="h-8 w-16 text-center font-semibold" invalid={r.plan === null} />
                        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Sumar" onClick={() => setRow(c.p.id, { plan: (r.plan ?? 0) + 1 })}><Plus /></Button>
                      </div>
                    </Td>
                    <Td>
                      <div onClick={(e) => e.stopPropagation()}>
                        <IntInput aria-label={`Precio ${c.p.name}`} value={r.price} onValueChange={(v) => setRow(c.p.id, { price: v })} className="h-8 w-28 text-right" invalid={!r.price} />
                      </div>
                    </Td>
                    <Td className="text-right font-semibold tabular">{fmt(c.revenue)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-sm font-semibold tabular">{pct(c.m)}</span>
                        <Badge tone={c.m >= 0.35 ? 'green' : 'amber'}>{c.m >= 0.35 ? 'Margen saludable' : 'Revisar margen'}</Badge>
                      </div>
                    </Td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/30">
                      <td colSpan={9} className="border-b px-6 py-5">
                        <div className="flex animate-fade-in flex-wrap items-end gap-8">
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial de 4 semanas</p>
                            <div className="flex items-end gap-3">
                              {c.hist.map((v, i) => {
                                const max = Math.max(...c.hist, c.f.demand, 1)
                                return (
                                  <div key={i} className="flex flex-col items-center gap-1.5">
                                    <span className="text-xs font-semibold tabular">{v}</span>
                                    <div className="w-10 rounded-md bg-primary/70" style={{ height: `${(v / max) * 72 + 6}px` }} />
                                    <span className="text-[11px] text-muted-foreground">{WEEKS[i]}</span>
                                  </div>
                                )
                              })}
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-xs font-semibold tabular text-transit">{c.f.demand}</span>
                                <div className="w-10 rounded-md border-2 border-dashed border-transit/60 bg-transit-soft" style={{ height: `${(c.f.demand / Math.max(...c.hist, c.f.demand, 1)) * 72 + 6}px` }} />
                                <span className="text-[11px] text-muted-foreground">{NEXT}</span>
                              </div>
                            </div>
                          </div>
                          <div className={cn('rounded-xl px-4 py-3 text-sm font-semibold', cover >= 0 ? 'bg-primary-soft text-primary' : 'bg-danger-soft text-danger')}>
                            {cover >= 0 ? `+${num(cover)} unidades de cobertura` : `Faltan ${num(-cover)} unidades para cubrir la demanda`}
                            <p className="mt-0.5 text-xs font-normal text-muted-foreground">Plan {num(c.plan)} · demanda proyectada {num(c.f.demand)}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
