import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Check, ChevronDown, X, type LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { STATUS_LABEL, type StockStatus } from '@shared/domain'
import { cn } from '@/lib/utils'

// ─── Button ───
type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-soft hover:bg-primary/90 hover:shadow-lift',
  secondary: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
  outline: 'border bg-card text-foreground shadow-soft hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-danger text-white hover:bg-danger/90',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9',
}
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

// ─── Card ───
export function Card({ className, hover, ...props }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn('rounded-xl border bg-card shadow-soft transition-shadow duration-200', hover && 'hover:shadow-lift', className)}
      {...props}
    />
  )
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Badge ───
type Tone = 'green' | 'red' | 'amber' | 'gray' | 'blue' | 'violet' | 'cyan'
const tones: Record<Tone, string> = {
  green: 'bg-primary-soft text-primary',
  red: 'bg-danger-soft text-danger',
  amber: 'bg-warning-soft text-warning',
  gray: 'bg-muted text-muted-foreground',
  blue: 'bg-transit-soft text-transit',
  violet: 'bg-store-soft text-store',
  cyan: 'bg-sold-soft text-sold',
}
export function Badge({ tone = 'gray', className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: StockStatus }) {
  const tone: Tone = status === 'out' ? 'red' : status === 'low' ? 'amber' : 'green'
  return <Badge tone={tone} dot>{STATUS_LABEL[status]}</Badge>
}

// ─── Inputs ───
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-card px-3 text-sm shadow-soft outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:bg-muted',
        invalid && 'border-danger/60 focus:border-danger focus:ring-danger/10',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

/** Campo numérico de enteros ≥ 0. Devuelve null cuando está vacío. */
export function IntInput({ value, onValueChange, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | null; onValueChange: (v: number | null) => void; invalid?: boolean }) {
  return (
    <Input
      inputMode="numeric"
      value={value === null ? '' : String(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
        onValueChange(digits === '' ? null : parseInt(digits, 10))
      }}
      onFocus={(e) => e.target.select()}
      className={cn('tabular', className)}
      {...props}
    />
  )
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-danger">{error}</span> : hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

// ─── Select ───
export function Select<T extends string>({ value, onValueChange, options, placeholder, className, ariaLabel }: {
  value: T | undefined
  onValueChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn('inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 text-sm font-medium shadow-soft outline-none transition hover:bg-muted/50 focus:ring-4 focus:ring-primary/10 data-[placeholder]:text-muted-foreground', className)}
      >
        <span className="truncate"><SelectPrimitive.Value placeholder={placeholder} /></span>
        <SelectPrimitive.Icon><ChevronDown className="h-4 w-4 text-muted-foreground" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} className="z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-card shadow-lift animate-fade-in">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={o.value} className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-muted data-[state=checked]:font-semibold">
                <SelectPrimitive.ItemIndicator className="absolute left-2.5"><Check className="h-4 w-4 text-primary" /></SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

// ─── Tooltip ───
export function Tooltip({ content, children, side = 'bottom' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-[80] max-w-xs rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-white shadow-lift animate-fade-in">
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
export const TooltipProvider = TooltipPrimitive.Provider

// ─── Dialog (modal) ───
export function Modal({ open, onOpenChange, title, description, icon: Icon, children, footer, onSubmit, className }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: ReactNode
  icon?: LucideIcon
  children: ReactNode
  footer: ReactNode
  /** Se ejecuta al presionar Enter o al enviar el formulario. */
  onSubmit: () => void
  className?: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] data-[state=open]:animate-overlay-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn('fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-card shadow-2xl outline-none data-[state=open]:animate-dialog-in', className)}
        >
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            <div className="flex items-start gap-3 border-b px-6 py-5">
              {Icon && (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
              )}
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-lg font-extrabold tracking-tight">{title}</DialogPrimitive.Title>
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
              </div>
              <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-6 py-4">{footer}</div>
            <button type="submit" hidden />
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ─── Sheet (panel lateral) ───
export function Sheet({ open, onOpenChange, title, description, children, side = 'right', className, hideHeader }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: ReactNode
  children: ReactNode
  side?: 'left' | 'right'
  className?: string
  hideHeader?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-[2px] data-[state=open]:animate-overlay-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 z-50 flex w-full flex-col bg-card shadow-2xl outline-none',
            side === 'right' ? 'right-0 max-w-md border-l data-[state=open]:animate-sheet-in' : 'left-0 max-w-[280px] border-r data-[state=open]:animate-sheet-left-in',
            className,
          )}
        >
          {hideHeader ? (
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          ) : (
            <div className="flex items-start justify-between gap-3 border-b px-6 py-5">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-extrabold tracking-tight">{title}</DialogPrimitive.Title>
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
              </div>
              <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ─── Bloques de página ───
export function PageHeader({ title, subtitle, eyebrow, actions }: { title: string; subtitle?: string; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-[-0.025em] sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground sm:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'green', className }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'cyan'
  className?: string
}) {
  const t = {
    green: 'bg-primary-soft text-primary', amber: 'bg-warning-soft text-warning', red: 'bg-danger-soft text-danger',
    blue: 'bg-transit-soft text-transit', violet: 'bg-store-soft text-store', cyan: 'bg-sold-soft text-sold',
  }[tone]
  return (
    <Card hover className={cn('p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', t)}><Icon className="h-[18px] w-[18px]" /></div>
      </div>
      <div className="mt-3 truncate text-2xl font-extrabold tracking-tight tabular sm:text-[28px]">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  )
}

export function ProductThumb({ name, image, size = 'md', className }: { name: string; image: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = { sm: 'h-8 w-8 text-xs rounded-md', md: 'h-10 w-10 text-sm rounded-lg', lg: 'h-14 w-14 text-lg rounded-lg', xl: 'h-48 w-full text-5xl rounded-xl' }[size]
  return (
    <div className={cn('relative grid shrink-0 place-items-center overflow-hidden bg-primary-soft font-bold text-primary', s, className)}>
      <span>{name.charAt(0).toUpperCase()}</span>
      {image && (
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></div>
      <p className="mt-4 font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Tabla con desplazamiento horizontal en pantallas pequeñas. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className={cn('w-full min-w-[640px] border-collapse text-sm', className)}>{children}</table>
    </div>
  )
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn('whitespace-nowrap border-b bg-muted/40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', className)}>{children}</th>
)
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn('whitespace-nowrap border-b px-4 py-3.5 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', className)}>{children}</td>
)
