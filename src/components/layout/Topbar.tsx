import { Factory, Menu, Receipt, Search, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ProductThumb, Sheet, Tooltip } from '@/components/ui'
import { useInventory } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { useUI } from '@/state/ui'
import { SidebarContent } from './Sidebar'

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function SearchBox() {
  const { products } = useInventory()
  const { openSheet } = useUI()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        ref.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const n = normalize(q.trim())
    if (!n) return products.slice(0, 6)
    return products.filter((p) => normalize(p.name).includes(n) || normalize(p.sku).includes(n)).slice(0, 8)
  }, [q, products])

  const pick = (id: number) => {
    openSheet({ type: 'product', productId: id })
    setQ('')
    setOpen(false)
    ref.current?.blur()
  }

  return (
    <div className="relative min-w-0 flex-1 lg:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && results[active]) pick(results[active].id)
          if (e.key === 'Escape') ref.current?.blur()
        }}
        placeholder="Buscar producto o SKU…"
        className="h-10 w-full rounded-lg border bg-muted/50 pl-9 pr-16 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/10"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:block">Ctrl /</kbd>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border bg-card p-1.5 shadow-lift animate-fade-in">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados para “{q}”</p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p.id)}
                onMouseEnter={() => setActive(i)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', i === active && 'bg-muted')}
              >
                <ProductThumb name={p.name} image={p.image} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.sku} · {p.unit}</span>
                </span>
                <span className="text-xs tabular text-muted-foreground">{p.store} en tienda</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ConnectionPill() {
  const { mode } = useInventory()
  const live = mode === 'live'
  const loading = mode === 'loading'
  return (
    <Tooltip content={live ? 'Conectado a la base de datos · se actualiza cada 4 s' : loading ? 'Conectando con la base de datos…' : 'Sin conexión a la base de datos · datos de ejemplo'}>
      <span
        className={cn(
          'inline-flex h-8 shrink-0 cursor-default items-center gap-2 rounded-full border px-3 text-xs font-semibold',
          live ? 'border-primary/20 bg-primary-soft text-primary' : loading ? 'bg-muted text-muted-foreground' : 'border-warning/20 bg-warning-soft text-warning',
        )}
      >
        <span className="relative flex h-2 w-2">
          {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-primary' : loading ? 'bg-muted-foreground/50' : 'bg-warning')} />
        </span>
        <span className="hidden sm:inline">{live ? 'En vivo' : loading ? 'Conectando…' : 'Modo local'}</span>
      </span>
    </Tooltip>
  )
}

export function Topbar() {
  const { openModal } = useUI()
  const { state } = useInventory()
  const [menu, setMenu] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b bg-card/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Button variant="outline" size="sm" className="h-10 lg:hidden" onClick={() => setMenu(true)}>
          <Menu /> Menú
        </Button>
        <SearchBox />
        <div className="ml-auto flex items-center gap-2">
          <ConnectionPill />
          <div className="hidden items-center gap-2 md:flex">
            <Tooltip content="Registrar producción">
              <Button variant="outline" onClick={() => openModal({ type: 'production' })}>
                <Factory /> <span className="hidden 2xl:inline">Registrar producción</span>
              </Button>
            </Tooltip>
            <Button onClick={() => openModal({ type: 'shipment' })}>
              <Truck /> <span className="hidden xl:inline">Enviar a tienda</span>
            </Button>
            <Tooltip content="Registrar venta">
              <Button variant="outline" onClick={() => openModal({ type: 'sale' })}>
                <Receipt /> <span className="hidden 2xl:inline">Registrar venta</span>
              </Button>
            </Tooltip>
          </div>
          <div className="ml-1 hidden items-center gap-2.5 border-l pl-3 sm:flex">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-700 text-xs font-bold text-white">AD</div>
            <div className="hidden leading-tight xl:block">
              <p className="text-sm font-bold">Admin</p>
              <p className="text-xs text-muted-foreground">{state.settings.companyName}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Acciones rápidas en celular */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 md:hidden">
        <Button size="sm" variant="outline" onClick={() => openModal({ type: 'production' })}><Factory /> Producción</Button>
        <Button size="sm" onClick={() => openModal({ type: 'shipment' })}><Truck /> Enviar a tienda</Button>
        <Button size="sm" variant="outline" onClick={() => openModal({ type: 'sale' })}><Receipt /> Venta</Button>
      </div>
      <Sheet open={menu} onOpenChange={setMenu} title="Menú" side="left" hideHeader>
        <SidebarContent onNavigate={() => setMenu(false)} />
      </Sheet>
    </header>
  )
}
