import { Award, Boxes, Receipt, Wallet } from 'lucide-react'
import { saleCode } from '@shared/domain'
import { Button, Card, CardHeader, EmptyState, PageHeader, ProductThumb, StatCard, Table, Td, Th } from '@/components/ui'
import { fmtDateTime, num } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { useUI } from '@/state/ui'

export function Ventas() {
  const { state, products, byId, fmt } = useInventory()
  const { openModal } = useUI()
  const revenue = products.reduce((a, p) => a + p.sold * p.price, 0)
  const units = products.reduce((a, p) => a + p.sold, 0)
  const top = [...products].sort((a, b) => b.sold - a.sold)[0]
  const sales = [...state.sales].sort((a, b) => b.id - a.id).slice(0, 50)

  return (
    <>
      <PageHeader title="Ventas" subtitle="Registro de ventas de la tienda" actions={<Button onClick={() => openModal({ type: 'sale' })}><Receipt /> Registrar venta</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos esta semana" value={fmt(revenue)} hint="unidades vendidas × precio" icon={Wallet} />
        <StatCard label="Unidades vendidas" value={num(units)} hint="en la semana" icon={Boxes} tone="cyan" />
        <StatCard label="Producto más vendido" value={top && top.sold > 0 ? top.name : '—'} hint={top && top.sold > 0 ? `${num(top.sold)} unidades · ${fmt(top.sold * top.price)}` : 'sin ventas'} icon={Award} tone="amber" />
      </div>
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Ventas recientes" subtitle="Últimas ventas registradas en la tienda" className="pb-5" />
        {sales.length === 0 ? (
          <EmptyState icon={Receipt} title="Aún no hay ventas" description="Registra la primera venta con el botón Registrar venta." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Venta</Th><Th>Fecha y hora</Th><Th>Producto</Th><Th className="text-right">Cantidad</Th><Th className="text-right">Precio</Th><Th className="text-right">Total</Th></tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const p = byId.get(s.productId)
                return (
                  <tr key={s.id} className="animate-fade-in transition-colors hover:bg-muted/40">
                    <Td className="font-bold">{saleCode(s.id)}</Td>
                    <Td className="text-muted-foreground">{fmtDateTime(s.createdAt)}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProductThumb name={p?.name ?? '?'} image={p?.image ?? null} size="sm" />
                        <span className="font-semibold">{p?.name ?? 'Producto'}</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular">{num(s.qty)}</Td>
                    <Td className="text-right tabular">{fmt(s.unitPrice)}</Td>
                    <Td className="text-right font-bold tabular">{fmt(s.qty * s.unitPrice)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
