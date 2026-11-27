import { Toaster } from 'sonner'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Modals } from '@/components/modals'
import { Panels } from '@/components/panels'
import { TooltipProvider } from '@/components/ui'
import { Configuracion } from '@/pages/Configuracion'
import { Dashboard } from '@/pages/Dashboard'
import { Fabrica } from '@/pages/Fabrica'
import { Planeacion } from '@/pages/Planeacion'
import { Productos } from '@/pages/Productos'
import { Reportes } from '@/pages/Reportes'
import { Tienda } from '@/pages/Tienda'
import { Transito } from '@/pages/Transito'
import { Ventas } from '@/pages/Ventas'
import { StoreProvider } from '@/state/store'
import { UIProvider, useUI, type PageId } from '@/state/ui'

const PAGE_COMPONENTS: Record<PageId, () => JSX.Element> = {
  dashboard: Dashboard,
  fabrica: Fabrica,
  tienda: Tienda,
  transito: Transito,
  ventas: Ventas,
  planeacion: Planeacion,
  productos: Productos,
  reportes: Reportes,
  configuracion: Configuracion,
}

function Shell() {
  const { page } = useUI()
  const Page = PAGE_COMPONENTS[page]
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main key={page} className="mx-auto w-full max-w-[1400px] animate-fade-in px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Page />
        </main>
      </div>
      <Modals />
      <Panels />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <TooltipProvider>
          <Shell />
          <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
        </TooltipProvider>
      </UIProvider>
    </StoreProvider>
  )
}
