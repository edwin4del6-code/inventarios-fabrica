import { BarChart3, CalendarRange, LayoutDashboard, Package, Settings, type LucideIcon } from 'lucide-react'
import { useInventory } from '@/lib/hooks'
import { STAGE_META } from '@/lib/stages'
import { cn } from '@/lib/utils'
import { useUI, type PageId } from '@/state/ui'

interface Item { id: PageId; label: string; icon: LucideIcon; badge?: number }

export function Logo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-soft">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M3 19 10 6l3.5 6.2L15.5 9 21 19z" />
        </svg>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[15px] font-extrabold tracking-tight">{name}</p>
        <p className="text-xs font-medium text-muted-foreground">Inventario</p>
      </div>
    </div>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { page, navigate } = useUI()
  const { state, activeShipments } = useInventory()

  const groups: { title?: string; items: Item[] }[] = [
    { items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    { title: 'Inventario', items: [{ id: 'fabrica', label: 'Fábrica', icon: STAGE_META.factory.icon }, { id: 'tienda', label: 'Tienda', icon: STAGE_META.store.icon }] },
    { title: 'Movimientos', items: [{ id: 'transito', label: 'En tránsito', icon: STAGE_META.transit.icon, badge: activeShipments.length }, { id: 'ventas', label: 'Ventas', icon: STAGE_META.sold.icon }] },
    { title: 'Planificación', items: [{ id: 'planeacion', label: 'Planeación de demanda', icon: CalendarRange }] },
    { title: 'Catálogo', items: [{ id: 'productos', label: 'Productos', icon: Package }, { id: 'reportes', label: 'Reportes', icon: BarChart3 }, { id: 'configuracion', label: 'Configuración', icon: Settings }] },
  ]

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <Logo name={state.settings.companyName} />
      <nav className="mt-8 flex-1 space-y-6 overflow-y-auto">
        {groups.map((g, i) => (
          <div key={i}>
            {g.title && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">{g.title}</p>}
            <ul className="space-y-1">
              {g.items.map((it) => {
                const active = page === it.id
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => {
                        navigate(it.id)
                        onNavigate?.()
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                        active ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <it.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate text-left">{it.label}</span>
                      {!!it.badge && (
                        <span className={cn('min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular', active ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
                          {it.badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-6 rounded-xl border border-primary/15 bg-gradient-to-br from-primary-soft via-primary-soft/60 to-card p-4">
        <p className="text-sm font-bold text-primary">Flujo del producto</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Fábrica → En tránsito → Tienda → Vendido</p>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
      <SidebarContent />
    </aside>
  )
}
