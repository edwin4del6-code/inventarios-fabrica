import { Pencil, Plus } from 'lucide-react'
import { margin } from '@shared/domain'
import { Badge, Button, Card, CardHeader, PageHeader, ProductThumb, StatusBadge, Table, Td, Th } from '@/components/ui'
import { pct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { useUI } from '@/state/ui'

export function Productos() {
  const { products, fmt, status } = useInventory()
  const { openModal, openSheet } = useUI()
  return (
    <>
      <PageHeader title="Productos" subtitle="Catálogo de productos, costos y precios" actions={<Button onClick={() => openModal({ type: 'product' })}><Plus /> Agregar producto</Button>} />
      <Card className="overflow-hidden">
        <CardHeader title="Catálogo" subtitle={`${products.length} productos activos`} className="pb-5" />
        <Table>
          <thead>
            <tr><Th>Producto</Th><Th>SKU</Th><Th>Unidad</Th><Th className="text-right">Costo</Th><Th className="text-right">Precio</Th><Th className="text-right">Margen</Th><Th>Estado</Th><Th className="text-right">Acción</Th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const m = margin(p.price, p.cost)
              return (
                <tr key={p.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => openSheet({ type: 'product', productId: p.id })}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductThumb name={p.name} image={p.image} />
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{p.sku}</Td>
                  <Td>{p.unit}</Td>
                  <Td className="text-right tabular">{fmt(p.cost)}</Td>
                  <Td className="text-right tabular">{fmt(p.price)}</Td>
                  <Td className="text-right"><Badge tone={m >= 0.35 ? 'green' : 'amber'}>{pct(m, 1)}</Badge></Td>
                  <Td><StatusBadge status={status(p.store)} /></Td>
                  <Td className="text-right">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openModal({ type: 'product', productId: p.id }) }}>
                      <Pencil /> Editar producto
                    </Button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
