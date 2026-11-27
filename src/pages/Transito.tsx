import { ArrowRight, CheckCircle2, PackageCheck, PackageOpen, Plus, Truck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { shipmentCode } from '@shared/domain'
import { Badge, Button, Card, EmptyState, PageHeader, ProductThumb, StatCard } from '@/components/ui'
import { fmtDate, fmtDateTime, num } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'

type Tab = 'all' | 'in_transit' | 'received'

export function Transito() {
  const { state, byId, activeShipments, dispatch } = useInventory()
  const { openModal } = useUI()
  const [tab, setTab] = useState<Tab>('all')
  const shipments = [...state.shipments].sort((a, b) => b.id - a.id)
  const shown = tab === 'all' ? shipments : shipments.filter((s) => s.status === tab)
  const units = activeShipments.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0)
  // Referencia: el movimiento más reciente registrado (o ahora, si es posterior).
  const latest = state.shipments.reduce((m, s) => Math.max(m, new Date(s.receivedAt ?? s.createdAt).getTime()), 0)
  const ref = Math.min(Date.now(), Math.max(latest, 0)) || Date.now()
  const recent = state.shipments.filter((s) => s.status === 'received' && s.receivedAt && ref - new Date(s.receivedAt).getTime() <= 7 * 86400000).length

  const receive = (id: number) => {
    if (dispatch({ action: 'receiveShipment', shipmentId: id })) toast.success(`Envío ${shipmentCode(id)} recibido en tienda`)
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: shipments.length },
    { id: 'in_transit', label: 'En tránsito', count: activeShipments.length },
    { id: 'received', label: 'Recibidos', count: shipments.length - activeShipments.length },
  ]

  return (
    <>
      <PageHeader title="En tránsito" subtitle="Envíos de fábrica hacia la tienda" actions={<Button onClick={() => openModal({ type: 'shipment' })}><Plus /> Nuevo envío</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Envíos activos" value={activeShipments.length} hint="en camino a la tienda" icon={Truck} tone="blue" />
        <StatCard label="Unidades en camino" value={num(units)} hint="suma de envíos activos" icon={PackageOpen} tone="blue" />
        <StatCard label="Recibidos (últimos 7 días)" value={recent} hint="envíos entregados en tienda" icon={PackageCheck} />
      </div>

      <div className="mt-8 inline-flex max-w-full overflow-x-auto rounded-xl border bg-card p-1 shadow-soft">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition', tab === t.id ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            {t.label}
            <span className={cn('rounded-full px-1.5 text-xs tabular', tab === t.id ? 'bg-primary text-white' : 'bg-muted')}>{t.count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="mt-4">
          <EmptyState icon={Truck} title="No hay envíos aquí" description="Crea un envío desde el botón Enviar a tienda" action={<Button onClick={() => openModal({ type: 'shipment' })}><Truck /> Enviar a tienda</Button>} />
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {shown.map((s) => {
            const total = s.items.reduce((a, i) => a + i.qty, 0)
            const active = s.status === 'in_transit'
            return (
              <Card key={s.id} hover className="flex animate-fade-in flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('grid h-10 w-10 place-items-center rounded-xl', active ? 'bg-transit-soft text-transit' : 'bg-primary-soft text-primary')}>
                      {active ? <Truck className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-extrabold tracking-tight">{shipmentCode(s.id)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}{s.receivedAt && ` · recibido ${fmtDateTime(s.receivedAt)}`}</p>
                    </div>
                  </div>
                  <Badge tone={active ? 'blue' : 'green'} dot>{active ? 'En tránsito' : 'Recibido'}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  Fábrica <ArrowRight className="h-3.5 w-3.5" /> Tienda
                </div>
                <ul className="mt-3 flex-1 divide-y rounded-xl border">
                  {s.items.map((i) => {
                    const p = byId.get(i.productId)
                    return (
                      <li key={i.productId} className="flex items-center gap-3 px-3 py-2">
                        <ProductThumb name={p?.name ?? '?'} image={p?.image ?? null} size="sm" />
                        <span className="flex-1 truncate text-sm font-medium">{p?.name ?? 'Producto'}</span>
                        <span className="text-sm font-semibold tabular">{num(i.qty)}</span>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Total <span className="font-bold text-foreground tabular">{num(total)}</span> unidades</span>
                  {active && <Button size="sm" onClick={() => receive(s.id)}><PackageCheck /> Marcar como recibido</Button>}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
