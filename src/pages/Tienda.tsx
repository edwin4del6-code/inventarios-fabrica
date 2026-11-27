import { AlertTriangle, Boxes, Receipt, Wallet } from 'lucide-react'
import { Button, Card, CardHeader, PageHeader, ProductThumb, StatCard, StatusBadge, Table, Td, Th } from '@/components/ui'
import { num } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { useUI } from '@/state/ui'

export function Tienda() {
  const { products, fmt, status, threshold } = useInventory()
  const { openModal, openSheet } = useUI()
  const units = products.reduce((a, p) => a + p.store, 0)
  const value = products.reduce((a, p) => a + p.store * p.price, 0)
  const low = products.filter((p) => status(p.store) !== 'ok').length

  return (
    <>
      <PageHeader title="Inventario tienda" subtitle="Unidades disponibles para la venta" actions={<Button onClick={() => openModal({ type: 'sale' })}><Receipt /> Registrar venta</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total unidades" value={num(units)} hint="disponibles en tienda" icon={Boxes} tone="violet" />
        <StatCard label="Valor estimado" value={fmt(value)} hint="unidades × precio de venta" icon={Wallet} />
        <StatCard label="Productos con stock bajo" value={low} hint={`umbral: ${threshold} unidades o menos`} icon={AlertTriangle} tone={low ? 'amber' : 'green'} />
      </div>
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Productos en tienda" subtitle="Haz clic en un producto para ver su detalle" className="pb-5" />
        <Table>
          <thead>
            <tr><Th>Producto</Th><Th>SKU</Th><Th className="text-right">Cantidad</Th><Th className="text-right">Precio venta</Th><Th className="text-right">Valor inventario</Th><Th>Estado</Th><Th className="text-right">Acción</Th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => openSheet({ type: 'product', productId: p.id })}>
                <Td>
                  <div className="flex items-center gap-3">
                    <ProductThumb name={p.name} image={p.image} />
                    <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.unit}</p></div>
                  </div>
                </Td>
                <Td className="text-muted-foreground">{p.sku}</Td>
                <Td className="text-right font-semibold tabular">{num(p.store)}</Td>
                <Td className="text-right tabular">{fmt(p.price)}</Td>
                <Td className="text-right tabular">{fmt(p.store * p.price)}</Td>
                <Td><StatusBadge status={status(p.store)} /></Td>
                <Td className="text-right">
                  <Button size="sm" variant="secondary" disabled={p.store === 0} onClick={(e) => { e.stopPropagation(); openModal({ type: 'sale', productId: p.id }) }}>
                    <Receipt /> Vender
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
