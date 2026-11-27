import { Factory, History, Package, Save, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Card, CardHeader, IntInput, PageHeader, ProductThumb, StatCard, Table, Td, Th } from '@/components/ui'
import { num, signedPct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'

export function Fabrica() {
  const { products, dispatch } = useInventory()
  const { factoryDraft, setFactoryDraft } = useUI()
  const [draft, setDraft] = useState<Record<number, number | null>>({})

  // Plan enviado desde Planeación de demanda.
  useEffect(() => {
    if (factoryDraft) {
      setDraft(factoryDraft)
      setFactoryDraft(null)
    }
  }, [factoryDraft, setFactoryDraft])

  const value = (id: number, saved: number) => (draft[id] !== undefined ? draft[id] : saved)
  const dirty = products.some((p) => draft[p.id] !== undefined && draft[p.id] !== p.weekProduction)
  const invalid = products.some((p) => value(p.id, p.weekProduction) === null)

  const total = products.reduce((a, p) => a + p.weekProduction, 0)
  const prev = products.reduce((a, p) => a + p.prevWeek, 0)
  const change = prev ? (total - prev) / prev : 0

  const save = () => {
    if (!dirty || invalid) return
    const items = products.map((p) => ({ productId: p.id, qty: value(p.id, p.weekProduction) as number }))
    const delta = products.reduce((a, p) => a + ((value(p.id, p.weekProduction) as number) - p.weekProduction), 0)
    if (dispatch({ action: 'saveWeekProduction', items })) {
      setDraft({})
      toast.success(`Producción guardada · ${delta >= 0 ? '+' : ''}${num(delta)} unidades en fábrica`)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="green">Semana 40 · 2026</Badge>}
        title="Carga semanal de producción"
        subtitle="Registra lo producido en la semana. La diferencia se suma al stock de fábrica."
        actions={
          <>
            {dirty && <Badge tone="amber" dot>Cambios sin guardar</Badge>}
            <Button variant="outline" onClick={() => setDraft(Object.fromEntries(products.map((p) => [p.id, p.prevWeek])))}>
              <History /> Usar cantidades de la semana pasada
            </Button>
            <Button onClick={save} disabled={!dirty || invalid}><Save /> Guardar producción</Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total producido esta semana" value={num(total)} hint="unidades registradas" icon={Factory} />
        <StatCard label="Productos activos" value={products.length} hint="en el catálogo" icon={Package} tone="blue" />
        <StatCard
          label="Variación vs semana anterior"
          value={<span className={change >= 0 ? 'text-primary' : 'text-danger'}>{signedPct(change, 1)}</span>}
          hint={`${num(prev)} unidades la semana anterior`}
          icon={change >= 0 ? TrendingUp : TrendingDown}
          tone={change >= 0 ? 'green' : 'red'}
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Producción por producto" subtitle="Edita la columna “Producción de la semana” y guarda los cambios." className="pb-5" />
        <form onSubmit={(e) => { e.preventDefault(); save() }}>
          <Table>
            <thead>
              <tr><Th>Producto</Th><Th>SKU</Th><Th className="text-right">Semana anterior</Th><Th className="w-44">Producción de la semana</Th><Th className="text-right">Variación</Th><Th className="text-right">Stock fábrica</Th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const v = value(p.id, p.weekProduction)
                const changed = draft[p.id] !== undefined && draft[p.id] !== p.weekProduction
                const diff = p.prevWeek ? ((v ?? 0) - p.prevWeek) / p.prevWeek : 0
                const nextStock = p.factory + ((v ?? 0) - p.weekProduction)
                return (
                  <tr key={p.id} className={cn('transition-colors', changed && 'bg-warning-soft/30')}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProductThumb name={p.name} image={p.image} />
                        <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.unit}</p></div>
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">{p.sku}</Td>
                    <Td className="text-right tabular">{num(p.prevWeek)}</Td>
                    <Td>
                      <IntInput
                        aria-label={`Producción de ${p.name}`}
                        value={v}
                        invalid={v === null || nextStock < 0}
                        onValueChange={(n) => setDraft((d) => ({ ...d, [p.id]: n }))}
                        className="h-9 w-32 text-right font-semibold"
                      />
                    </Td>
                    <Td className="text-right">
                      <span className={cn('inline-flex items-center gap-1 font-semibold tabular', diff > 0 ? 'text-primary' : diff < 0 ? 'text-danger' : 'text-muted-foreground')}>
                        {diff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : diff < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                        {signedPct(diff, 1)}
                      </span>
                    </Td>
                    <Td className="text-right tabular">
                      {changed ? <span className={cn('font-semibold', nextStock < 0 ? 'text-danger' : 'text-primary')}>{num(p.factory)} → {num(nextStock)}</span> : num(p.factory)}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <button type="submit" hidden />
        </form>
      </Card>
    </>
  )
}
