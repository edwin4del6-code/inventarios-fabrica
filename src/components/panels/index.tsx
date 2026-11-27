import { Factory, Pencil, Receipt, Truck } from 'lucide-react'
import { margin, shipmentCode } from '@shared/domain'
import type { HistoryType, Stage } from '@shared/types'
import { Badge, Button, ProductThumb, Sheet, StatusBadge } from '@/components/ui'
import { fmtDate, fmtDateTime, num, pct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { STAGE_META, STAGES } from '@/lib/stages'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'

function StageSheet({ stage }: { stage: Stage }) {
  const { products, activeShipments, byId, fmt } = useInventory()
  const { openSheet, openModal } = useUI()
  const meta = STAGE_META[stage]
  const total = products.reduce((a, p) => a + p[stage], 0)
  const max = Math.max(1, ...products.map((p) => p[stage]))
  const rows = [...products].sort((a, b) => b[stage] - a[stage])
  const action = {
    factory: { label: 'Registrar producción', icon: Factory, run: () => openModal({ type: 'production' }) },
    transit: { label: 'Crear nuevo envío', icon: Truck, run: () => openModal({ type: 'shipment' }) },
    store: { label: 'Crear nuevo envío', icon: Truck, run: () => openModal({ type: 'shipment' }) },
    sold: { label: 'Registrar venta', icon: Receipt, run: () => openModal({ type: 'sale' }) },
  }[stage]

  return (
    <Sheet open onOpenChange={(o) => !o && openSheet(null)} title={meta.label} description={meta.description}>
      <div className="space-y-6 p-6">
        <div className={cn('flex items-center gap-4 rounded-xl p-5', meta.bg)}>
          <div className={cn('grid h-12 w-12 place-items-center rounded-xl bg-card shadow-soft', meta.text)}><meta.icon className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Total en {meta.label.toLowerCase()}</p>
            <p className="text-3xl font-extrabold tracking-tight tabular">{num(total)} <span className="text-base font-semibold text-muted-foreground">unidades</span></p>
          </div>
        </div>
        <Button className="w-full" onClick={action.run}><action.icon /> {action.label}</Button>

        {stage === 'transit' && (
          <div>
            <h4 className="mb-3 text-sm font-bold">Envíos activos</h4>
            {activeShipments.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No hay envíos en camino.</p>
            ) : (
              <div className="space-y-2">
                {activeShipments.map((s) => (
                  <div key={s.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{shipmentCode(s.id)}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.items.map((i) => `${byId.get(i.productId)?.name ?? '—'} ${i.qty}`).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h4 className="mb-3 text-sm font-bold">Unidades por producto</h4>
          <div className="space-y-1">
            {rows.map((p) => (
              <button key={p.id} onClick={() => openSheet({ type: 'product', productId: p.id })} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted">
                <ProductThumb name={p.name} image={p.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-sm font-bold tabular">{num(p[stage])}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', meta.bar)} style={{ width: `${(p[stage] / max) * 100}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          {stage === 'store' && <p className="mt-3 text-xs text-muted-foreground">Valor en tienda: {fmt(products.reduce((a, p) => a + p.store * p.price, 0))}</p>}
        </div>
      </div>
    </Sheet>
  )
}

const TYPE_TONE: Record<HistoryType, Stage> = {
  Producción: 'factory', Transferencia: 'factory', 'En tránsito': 'transit', Recepción: 'store', Venta: 'sold',
}

function ProductSheet({ productId }: { productId: number }) {
  const { byId, state, fmt, status } = useInventory()
  const { openSheet, openModal } = useUI()
  const p = byId.get(productId)
  if (!p) return null
  const history = state.history.filter((h) => h.productId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id).slice(0, 20)
  const m = margin(p.price, p.cost)

  return (
    <Sheet open onOpenChange={(o) => !o && openSheet(null)} title={p.name} description={`${p.sku} · ${p.unit}`}>
      <div className="space-y-6 p-6">
        <ProductThumb name={p.name} image={p.image} size="xl" />
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status(p.store)} />
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => openModal({ type: 'product', productId: p.id })}><Pencil /> Editar</Button>
          <Button size="sm" onClick={() => openModal({ type: 'sale', productId: p.id })} disabled={p.store === 0}><Receipt /> Vender</Button>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold">Unidades por etapa</h4>
          <div className="grid grid-cols-2 gap-2">
            {STAGES.map((s) => {
              const meta = STAGE_META[s]
              return (
                <div key={s} className="rounded-xl border p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className={cn('grid h-6 w-6 place-items-center rounded-md', meta.bg, meta.text)}><meta.icon className="h-3.5 w-3.5" /></span>
                    {meta.label}
                  </div>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight tabular">{num(p[s])}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold">Precio y margen</h4>
          <dl className="divide-y rounded-xl border text-sm">
            <div className="flex justify-between px-4 py-3"><dt className="text-muted-foreground">Costo unitario</dt><dd className="font-semibold tabular">{fmt(p.cost)}</dd></div>
            <div className="flex justify-between px-4 py-3"><dt className="text-muted-foreground">Precio de venta</dt><dd className="font-semibold tabular">{fmt(p.price)}</dd></div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-muted-foreground">Margen estimado</dt>
              <dd><Badge tone={m >= 0.35 ? 'green' : 'amber'}>{pct(m, 1)}</Badge></dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold">Historial reciente</h4>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Sin movimientos todavía.</p>
          ) : (
            <ol className="relative space-y-4 border-l pl-5">
              {history.map((h) => {
                const meta = STAGE_META[h.tone ?? TYPE_TONE[h.type]]
                return (
                  <li key={h.id} className="relative">
                    <span className={cn('absolute -left-[27px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-card', meta.bar)} />
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-sm font-bold', meta.text)}>{h.type}</span>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(h.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{h.detail}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export function Panels() {
  const { sheet } = useUI()
  if (!sheet) return null
  if (sheet.type === 'stage') return <StageSheet key={sheet.stage} stage={sheet.stage} />
  return <ProductSheet key={sheet.productId} productId={sheet.productId} />
}
