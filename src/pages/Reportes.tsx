import { Coins, Percent, RefreshCcw, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, PageHeader, ProductThumb, StatCard } from '@/components/ui'
import { num, pct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { STAGE_META, STAGES } from '@/lib/stages'

export function Reportes() {
  const { products, fmt } = useInventory()
  const revenue = products.reduce((a, p) => a + p.sold * p.price, 0)
  const cogs = products.reduce((a, p) => a + p.sold * p.cost, 0)
  const gross = revenue - cogs
  const sold = products.reduce((a, p) => a + p.sold, 0)
  const store = products.reduce((a, p) => a + p.store, 0)
  const sellThrough = sold + store ? sold / (sold + store) : 0

  const data = products.map((p) => ({ name: p.name, ...Object.fromEntries(STAGES.map((s) => [STAGE_META[s].label, p[s]])) }))
  const top = [...products].map((p) => ({ p, rev: p.sold * p.price })).sort((a, b) => b.rev - a.rev)
  const maxRev = Math.max(1, top[0]?.rev ?? 1)

  return (
    <>
      <PageHeader title="Reportes" subtitle="Resumen de desempeño de la semana" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos" value={fmt(revenue)} hint={`${num(sold)} unidades vendidas`} icon={Wallet} />
        <StatCard label="Costo de ventas" value={fmt(cogs)} hint="unidades vendidas × costo" icon={Coins} tone="amber" />
        <StatCard label="Margen bruto" value={fmt(gross)} hint={revenue ? `${pct(gross / revenue, 1)} de los ingresos` : '—'} icon={Percent} tone="violet" />
        <StatCard label="Sell-through" value={pct(sellThrough, 1)} hint="vendido ÷ (vendido + tienda)" icon={RefreshCcw} tone="cyan" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Unidades por etapa" subtitle="Distribución de cada producto en el flujo" />
          <div className="h-[340px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="hsl(220 14% 92%)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={56} tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} />
                <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} />
                <RTooltip cursor={{ fill: 'hsl(220 16% 96%)' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(220 14% 91%)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {STAGES.map((s, i) => (
                  <Bar key={s} dataKey={STAGE_META[s].label} stackId="a" fill={STAGE_META[s].hex} radius={i === 3 ? [4, 4, 0, 0] : 0} maxBarSize={36} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Top productos" subtitle="Por ingresos de la semana" />
          <ul className="space-y-4 p-5 pt-5 sm:p-6">
            {top.map(({ p, rev }, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground tabular">{i + 1}</span>
                <ProductThumb name={p.name} image={p.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-sm font-bold tabular">{fmt(rev)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(rev / maxRev) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
