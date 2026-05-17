import { cn } from '@/utils/cn'
import { forwardRef, useRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, TrendingUp, TrendingDown, ChevronDown, Check } from 'lucide-react'


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'vivid'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = [
      'relative inline-flex items-center justify-center gap-2 font-sans font-medium',
      'transition-colors duration-150 rounded-lg select-none cursor-pointer',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      'active:scale-[0.97] focus-visible:outline-none',
    ].join(' ')

    const variants = {
      primary:   'bg-accent text-white hover:bg-[var(--accent-hover)]',
      vivid:     'bg-accent text-white hover:bg-[var(--accent-hover)]',
      secondary: 'bg-[var(--bg-elevated)] text-txt-primary border border-[var(--border)] hover:border-[var(--border-strong)]',
      ghost:     'text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)]',
      danger:    'text-danger border border-danger/30 hover:bg-danger/8',
      outline:   'border border-[var(--border-accent)] text-accent hover:bg-[var(--accent-muted)]',
    }
    const sizes = {
      xs: 'h-6 px-2.5 text-[11px] rounded-md',
      sm: 'h-7 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-5 text-[14px]',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'


interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'vivid'
  className?: string
  dot?: boolean
}

export function Badge({ label, variant = 'default', className, dot }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-elevated)] text-txt-secondary border-[var(--border)]',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger:  'bg-danger/10  text-danger  border-danger/20',
    info:    'bg-info/10    text-info    border-info/20',
    accent:  'bg-[var(--accent-muted)] text-accent border-[var(--border-accent)]',
    vivid:   'bg-accent text-white border-transparent',
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wide',
      variants[variant], className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {label}
    </span>
  )
}


interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-9 px-3 bg-[var(--bg-elevated)] border border-[var(--border)]',
            'rounded-lg text-sm text-txt-primary placeholder:text-txt-muted',
            'focus:border-accent focus:outline-none focus:shadow-glow',
            icon && 'pl-9', suffix && 'pr-10',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle size={11} /> {error}
        </p>
      )}
      {hint && !error && <p className="text-[11px] text-txt-muted">{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'


interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg',
          'text-sm text-txt-primary placeholder:text-txt-muted resize-none',
          'focus:border-accent focus:outline-none focus:shadow-glow',
          error && 'border-danger', className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full h-9 px-3 pr-8 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg',
            'text-sm text-txt-primary appearance-none cursor-pointer',
            'focus:border-accent focus:outline-none focus:shadow-glow',
            'hover:border-[var(--border-strong)] transition-all',
            className
          )}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none"
        />
      </div>
    </div>
  )
)
Select.displayName = 'Select'


interface CustomSelectProps {
  label?: string
  options: { value: string; label: string }[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}

export function CustomSelect({
  label, options, value, onChange, placeholder, className, size = 'md', disabled,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className={cn(
            'w-full flex items-center justify-between px-3 bg-[var(--bg-elevated)] border rounded-lg',
            'text-sm cursor-pointer transition-all select-none',
            size === 'sm' ? 'h-8 text-xs' : 'h-9',
            open
              ? 'border-accent shadow-glow'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
            disabled && 'opacity-50 cursor-not-allowed',
            !selected && 'text-txt-muted',
            selected && 'text-txt-primary',
            className
          )}
        >
          <span>{selected?.label ?? placeholder ?? options[0]?.label ?? ''}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="shrink-0 ml-2"
          >
            <ChevronDown size={12} className="text-txt-muted" />
          </motion.span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -6 }}
              transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full left-0 right-0 mt-1.5 z-[200] py-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl overflow-hidden"
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange?.(opt.value); setOpen(false) }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors',
                    opt.value === value
                      ? 'bg-[var(--accent-muted)] text-accent'
                      : 'text-txt-primary hover:bg-[var(--bg-elevated)]'
                  )}
                >
                  {opt.label}
                  {opt.value === value && <Check size={12} className="text-accent shrink-0" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}


interface ToggleProps { checked: boolean; onChange: () => void; size?: 'sm' | 'md' }
export function Toggle({ checked, onChange, size = 'md' }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        size === 'md' ? 'w-10 h-5.5' : 'w-8 h-4',
        checked ? 'bg-accent' : 'bg-[var(--bg-elevated)] border border-[var(--border-strong)]'
      )}
    >
      <motion.span
        layout
        className={cn(
          'absolute top-0.5 rounded-full bg-white shadow-sm',
          size === 'md' ? 'w-4.5 h-4.5' : 'w-3 h-3',
        )}
        animate={{ left: checked ? (size === 'md' ? 20 : 16) : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}


export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}


interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
  accent?: boolean
}
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'relative w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-lg overflow-hidden',
              width
            )}
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="font-display font-bold text-[15px] text-txt-primary">{title}</h3>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <div className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-txt-muted">
        {icon}
      </div>
      <div className="space-y-1.5">
        <p className="font-display font-bold text-base text-txt-primary">{title}</p>
        <p className="text-sm text-txt-secondary max-w-xs leading-relaxed">{description}</p>
      </div>
      {action}
    </motion.div>
  )
}


interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  gradient?: boolean
  trend?: 'up' | 'down' | null
  sub?: string
}
export function StatCard({ label, value, icon, gradient, trend, sub }: StatCardProps) {
  return (
    <div className={cn(
      'card p-4 space-y-3',
      gradient && 'border-[var(--border-accent)] bg-[var(--accent-subtle)]'
    )}>
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            gradient
              ? 'bg-accent text-white'
              : 'bg-[var(--bg-elevated)] text-txt-secondary'
          )}>
            {icon}
          </div>
        )}
        {trend && (
          <span className={cn('text-xs font-semibold flex items-center gap-0.5', trend === 'up' ? 'text-success' : 'text-danger')}>
            {trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          </span>
        )}
      </div>
      <div>
        <p className={cn(
          'font-display font-bold text-2xl leading-none',
          gradient ? 'text-accent' : 'text-txt-primary'
        )}>
          {value}
        </p>
        <p className="text-[11px] text-txt-muted uppercase tracking-wider mt-1.5 font-semibold">{label}</p>
        {sub && <p className="text-xs text-txt-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}


interface ProgressRingProps {
  progress: number
  size?: number
  stroke?: number
  gradient?: boolean
  color?: string
  children?: ReactNode
}
export function ProgressRing({ progress, size = 56, stroke = 4, color, children }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(progress, 100) / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color ?? 'var(--accent)'}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  )
}


interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  gradient?: boolean
}
export function PageHeader({ title, subtitle, actions, gradient }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start justify-between mb-6"
    >
      <div>
        <h1 className={cn(
          'font-display font-bold text-xl tracking-tight',
          gradient ? 'text-accent' : 'text-txt-primary'
        )}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-txt-secondary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
