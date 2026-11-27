import { Database, RotateCcw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Currency } from '@shared/types'
import { Badge, Button, Card, CardHeader, Field, Input, IntInput, PageHeader, Select } from '@/components/ui'
import { USD_RATE, num } from '@/lib/format'
import { useInventory } from '@/lib/hooks'

export function Configuracion() {
  const { state, dispatch, mode } = useInventory()
  const s = state.settings
  const [name, setName] = useState(s.companyName)
  const [threshold, setThreshold] = useState<number | null>(s.lowStockThreshold)
  const [currency, setCurrency] = useState<Currency>(s.currency)
  const [token, setToken] = useState('')
  const [touched, setTouched] = useState(false)

  // Si otra persona cambia la configuración y aquí no hay cambios, reflejarla.
  useEffect(() => {
    if (!touched) {
      setName(s.companyName)
      setThreshold(s.lowStockThreshold)
      setCurrency(s.currency)
    }
  }, [s.companyName, s.lowStockThreshold, s.currency, touched])

  const dirty = name.trim() !== s.companyName || threshold !== s.lowStockThreshold || currency !== s.currency
  const valid = name.trim() !== '' && threshold !== null

  const save = () => {
    if (!dirty || !valid) return
    if (dispatch({ action: 'saveSettings', settings: { companyName: name.trim(), lowStockThreshold: threshold!, currency } })) {
      setTouched(false)
      toast.success('Configuración guardada')
    }
  }

  const reset = () => {
    if (mode === 'live' && !token.trim()) return toast.error('Escribe el token de reinicio.')
    if (!window.confirm('¿Reiniciar todos los datos a los valores iniciales? Esta acción no se puede deshacer.')) return
    if (dispatch({ action: 'reset' }, { resetToken: token.trim() })) {
      setTouched(false)
      setToken('')
      toast.success('Datos reiniciados a los valores iniciales')
    }
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Preferencias generales del sistema" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="General" subtitle="Estos valores se guardan en la base de datos y los ve todo el equipo." />
          <form className="space-y-5 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); save() }}>
            <Field label="Nombre de la empresa">
              <Input value={name} onChange={(e) => { setName(e.target.value); setTouched(true) }} />
            </Field>
            <Field label="Umbral de stock bajo" hint="Unidades en tienda para marcar un producto con stock bajo.">
              <IntInput value={threshold} onValueChange={(v) => { setThreshold(v); setTouched(true) }} className="max-w-[200px]" invalid={threshold === null} />
            </Field>
            <Field label="Moneda" hint={currency === 'USD' ? `Los valores se convierten con una tasa de referencia de 1 USD = ${num(USD_RATE)} COP.` : 'Formato colombiano: $12.000'}>
              <Select
                ariaLabel="Moneda"
                className="max-w-[280px]"
                value={currency}
                onValueChange={(v) => { setCurrency(v); setTouched(true) }}
                options={[{ value: 'COP', label: 'COP · Peso colombiano' }, { value: 'USD', label: 'USD · Dólar' }]}
              />
            </Field>
            <div className="flex items-center justify-end gap-3 border-t pt-5">
              {dirty && <Badge tone="amber" dot>Cambios sin guardar</Badge>}
              <Button type="submit" disabled={!dirty || !valid}><Save /> Guardar cambios</Button>
            </div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Datos" subtitle="Base de datos y reinicio" />
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-sm">
              <Database className="h-5 w-5 text-muted-foreground" />
              <span>{mode === 'live' ? 'Conectado a Neon Postgres' : 'Modo local · los cambios viven solo en esta pestaña'}</span>
            </div>
            <Field label="Token de reinicio" hint="Necesario para reiniciar la base de datos (variable RESET_TOKEN).">
              <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••••" autoComplete="off" />
            </Field>
            <Button variant="outline" className="w-full text-danger hover:text-danger" onClick={reset}><RotateCcw /> Reiniciar datos</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
