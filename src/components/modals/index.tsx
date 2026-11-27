import { ArrowRight, Factory, Package, Receipt, Sparkles, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { generateSku, margin, shipmentCode } from '@shared/domain'
import { Button, Field, Input, IntInput, Modal, ProductThumb, Select } from '@/components/ui'
import { num, pct } from '@/lib/format'
import { useInventory } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'

function useClose() {
  const { openModal } = useUI()
  return () => openModal(null)
}

function ProductPicker({ value, onChange, extra }: { value: number | undefined; onChange: (id: number) => void; extra?: (id: number) => string }) {
  const { products } = useInventory()
  return (
    <Select
      ariaLabel="Producto"
      value={value ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
      placeholder="Elige un producto"
      options={products.map((p) => ({ value: String(p.id), label: `${p.name} · ${p.sku}${extra ? ` — ${extra(p.id)}` : ''}` }))}
    />
  )
}

// ───────────── Registrar producción ─────────────
function ProductionModal({ productId: initial }: { productId?: number }) {
  const { products, byId, dispatch } = useInventory()
  const close = useClose()
  const [productId, setProductId] = useState<number | undefined>(initial ?? products[0]?.id)
  const [qty, setQty] = useState<number | null>(null)
  const p = productId ? byId.get(productId) : undefined
  const valid = !!p && !!qty && qty > 0

  const submit = () => {
    if (!valid) return
    if (dispatch({ action: 'produce', productId: p!.id, qty: qty! })) {
      toast.success(`Producción registrada · +${num(qty!)} ${p!.name}`)
      close()
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      icon={Factory}
      title="Registrar producción"
      description="Suma unidades al stock de fábrica."
      onSubmit={submit}
      footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button type="submit" disabled={!valid}>Registrar producción</Button></>}
    >
      <div className="space-y-4">
        <Field label="Producto"><ProductPicker value={productId} onChange={setProductId} /></Field>
        <Field label="Cantidad producida" hint="Unidades enteras">
          <IntInput autoFocus value={qty} onValueChange={setQty} placeholder="0" />
        </Field>
        {p && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft/70 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Stock actual en fábrica</span>
            <span className="flex items-center gap-2 font-bold tabular">
              {num(p.factory)} <ArrowRight className="h-3.5 w-3.5 text-primary" /> <span className="text-primary">{num(p.factory + (qty ?? 0))}</span>
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ───────────── Enviar a tienda ─────────────
function ShipmentModal({ prefill }: { prefill?: Record<number, number> }) {
  const { products, state, dispatch, threshold } = useInventory()
  const close = useClose()
  const [qty, setQty] = useState<Record<number, number | null>>(() => ({ ...(prefill ?? {}) }))
  const nextCode = shipmentCode(state.shipments.reduce((m, s) => Math.max(m, s.id), 0) + 1)

  const total = Object.values(qty).reduce<number>((a, b) => a + (b ?? 0), 0)
  const errors = products.filter((p) => (qty[p.id] ?? 0) > p.factory)
  const valid = total > 0 && errors.length === 0

  const suggest = () => {
    const next: Record<number, number | null> = {}
    let count = 0
    for (const p of products) {
      const need = Math.max(0, threshold + 1 - p.store)
      const q = Math.min(need, p.factory)
      if (q > 0) { next[p.id] = q; count++ }
    }
    setQty(next)
    if (count === 0) toast.info('Todos los productos en tienda están por encima del umbral.')
  }

  const submit = () => {
    if (!valid) return
    const items = products.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, qty: qty[p.id]! }))
    if (dispatch({ action: 'createShipment', items })) {
      toast.success(`Envío ${nextCode} creado · ${num(total)} unidades en camino`)
      close()
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      icon={Truck}
      title="Enviar a tienda"
      description={<>Nuevo envío <span className="font-semibold text-foreground">{nextCode}</span> · Fábrica → Tienda</>}
      onSubmit={submit}
      className="max-w-2xl"
      footer={
        <>
          <span className="mr-auto text-sm text-muted-foreground">Total: <span className="font-bold text-foreground tabular">{num(total)}</span> unidades</span>
          <Button variant="ghost" onClick={close}>Cancelar</Button>
          <Button type="submit" disabled={!valid}>Crear envío</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Umbral de stock bajo: <span className="font-semibold text-foreground">{threshold} unidades</span></p>
        <Button variant="secondary" size="sm" onClick={suggest}><Sparkles /> Sugerir reposición</Button>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_80px_96px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_90px_90px_110px]">
          <span>Producto</span><span className="hidden text-right sm:block">En tienda</span><span className="text-right">Disponible</span><span className="text-right">A enviar</span>
        </div>
        <div className="max-h-[46vh] divide-y overflow-y-auto">
          {products.map((p) => {
            const over = (qty[p.id] ?? 0) > p.factory
            return (
              <div key={p.id} className={cn('grid grid-cols-[1fr_80px_96px] items-center gap-3 px-4 py-2.5 sm:grid-cols-[1fr_90px_90px_110px]', over && 'bg-danger-soft/50')}>
                <div className="flex min-w-0 items-center gap-3">
                  <ProductThumb name={p.name} image={p.image} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{over ? <span className="font-medium text-danger">Supera lo disponible</span> : p.sku}</p>
                  </div>
                </div>
                <span className={cn('hidden text-right text-sm tabular sm:block', p.store <= threshold && 'font-semibold text-warning', p.store === 0 && 'text-danger')}>{num(p.store)}</span>
                <span className="text-right text-sm font-semibold tabular">{num(p.factory)}</span>
                <IntInput
                  aria-label={`A enviar ${p.name}`}
                  value={qty[p.id] ?? null}
                  invalid={over}
                  disabled={p.factory === 0}
                  onValueChange={(v) => setQty((q) => ({ ...q, [p.id]: v }))}
                  placeholder="0"
                  className="h-9 text-right"
                />
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

// ───────────── Registrar venta ─────────────
function SaleModal({ productId: initial }: { productId?: number }) {
  const { products, byId, dispatch, fmt } = useInventory()
  const close = useClose()
  const first = initial ?? products.find((p) => p.store > 0)?.id ?? products[0]?.id
  const [productId, setProductId] = useState<number | undefined>(first)
  const [qty, setQty] = useState<number | null>(null)
  const [price, setPrice] = useState<number | null>(first ? byId.get(first)?.price ?? null : null)
  const p = productId ? byId.get(productId) : undefined
  const over = !!p && (qty ?? 0) > p.store
  const valid = !!p && !!qty && qty > 0 && !over && !!price && price > 0

  const submit = () => {
    if (!valid) return
    if (dispatch({ action: 'sale', productId: p!.id, qty: qty!, unitPrice: price! })) {
      toast.success(`Venta registrada · ${num(qty!)} ${p!.name} por ${fmt(qty! * price!)}`)
      close()
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      icon={Receipt}
      title="Registrar venta"
      description="Resta unidades de la tienda y las suma a Vendido."
      onSubmit={submit}
      footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button type="submit" disabled={!valid}>Confirmar venta</Button></>}
    >
      <div className="space-y-4">
        <Field label="Producto">
          <ProductPicker
            value={productId}
            extra={(id) => `${byId.get(id)?.store ?? 0} en tienda`}
            onChange={(id) => {
              setProductId(id)
              setPrice(byId.get(id)?.price ?? null)
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cantidad vendida" error={over ? `Solo hay ${p!.store} unidades en tienda.` : null} hint={p ? `Disponible en tienda: ${num(p.store)}` : undefined}>
            <IntInput autoFocus value={qty} onValueChange={setQty} placeholder="0" invalid={over} />
          </Field>
          <Field label="Precio unitario" hint="Precio de venta del producto">
            <IntInput value={price} onValueChange={setPrice} placeholder="0" />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3.5">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-extrabold tracking-tight tabular">{fmt((qty ?? 0) * (price ?? 0))}</span>
        </div>
      </div>
    </Modal>
  )
}

// ───────────── Producto (crear / editar) ─────────────
function ProductModal({ productId }: { productId?: number }) {
  const { byId, products, dispatch, fmt } = useInventory()
  const close = useClose()
  const existing = productId ? byId.get(productId) : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [sku, setSku] = useState(existing?.sku ?? '')
  const [unit, setUnit] = useState(existing?.unit ?? '')
  const [cost, setCost] = useState<number | null>(existing?.cost ?? null)
  const [price, setPrice] = useState<number | null>(existing?.price ?? null)
  const autoSku = useMemo(() => (name.trim() ? generateSku(name, products.map((p) => p.sku)) : 'ABC-001'), [name, products])
  const valid = name.trim() !== '' && unit.trim() !== '' && cost !== null && !!price
  const m = price ? margin(price, cost ?? 0) : 0

  const submit = () => {
    if (!valid) return
    const product = { name, sku, unit, cost: cost!, price: price! }
    const ok = existing
      ? dispatch({ action: 'updateProduct', id: existing.id, product })
      : dispatch({ action: 'createProduct', product })
    if (ok) {
      toast.success(existing ? `Producto “${name.trim()}” actualizado` : `Producto “${name.trim()}” agregado · ${sku.trim().toUpperCase() || autoSku}`)
      close()
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      icon={Package}
      title={existing ? 'Editar producto' : 'Agregar producto'}
      description={existing ? `${existing.name} · ${existing.sku}` : 'Agrega un producto al catálogo.'}
      onSubmit={submit}
      footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button type="submit" disabled={!valid}>{existing ? 'Guardar cambios' : 'Agregar producto'}</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Kumis" /></Field>
        <Field label="SKU" hint={existing ? undefined : 'Si lo dejas vacío se genera solo'}>
          <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder={existing?.sku ?? autoSku} />
        </Field>
        <Field label="Unidad"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ej. Botella 1 L" /></Field>
        <Field label="Costo (COP)"><IntInput value={cost} onValueChange={setCost} placeholder="0" /></Field>
        <Field label="Precio (COP)"><IntInput value={price} onValueChange={setPrice} placeholder="0" /></Field>
      </div>
      {price ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Margen estimado</span>
          <span className={cn('font-bold tabular', m >= 0.35 ? 'text-primary' : 'text-warning')}>{pct(m, 1)} · {fmt(price - (cost ?? 0))} por unidad</span>
        </div>
      ) : null}
    </Modal>
  )
}

export function Modals() {
  const { modal } = useUI()
  if (!modal) return null
  const key = JSON.stringify(modal)
  switch (modal.type) {
    case 'production': return <ProductionModal key={key} productId={modal.productId} />
    case 'shipment': return <ShipmentModal key={key} prefill={modal.prefill} />
    case 'sale': return <SaleModal key={key} productId={modal.productId} />
    case 'product': return <ProductModal key={key} productId={modal.productId} />
  }
}
