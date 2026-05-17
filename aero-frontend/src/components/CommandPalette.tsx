import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Calendar, FileText,
  Target, Bell, User, Search, ArrowRight, Hash,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface PaletteItem {
  id:      string
  label:   string
  labelKey?: string
  to?:     string
  icon:    React.ReactNode
  group:   string
  kbd?:    string
}

const NAV_ITEMS: Omit<PaletteItem, 'label'>[] = [
  { id: 'dashboard', labelKey: 'dashboard', to: '/dashboard', icon: <LayoutDashboard size={15} />, group: 'nav' },
  { id: 'tasks',     labelKey: 'tasks',     to: '/tasks',     icon: <CheckSquare size={15} />,     group: 'nav' },
  { id: 'calendar',  labelKey: 'calendar',  to: '/calendar',  icon: <Calendar size={15} />,        group: 'nav' },
  { id: 'notes',     labelKey: 'notes',     to: '/notes',     icon: <FileText size={15} />,        group: 'nav' },
  { id: 'habits',    labelKey: 'habits',    to: '/habits',    icon: <Target size={15} />,          group: 'nav' },
  { id: 'reminders', labelKey: 'reminders', to: '/reminders', icon: <Bell size={15} />,            group: 'nav' },
  { id: 'profile',   labelKey: 'profile',   to: '/profile',   icon: <User size={15} />,            group: 'nav' },
]

interface CommandPaletteProps {
  open:    boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const items: PaletteItem[] = NAV_ITEMS.map(i => ({
    ...i,
    label: t(i.labelKey!),
  }))

  const filtered = query
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items

  const handleSelect = useCallback((item: PaletteItem) => {
    if (item.to) navigate(item.to)
    onClose()
    setQuery('')
    setSelected(0)
  }, [navigate, onClose])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[selected]
        if (item) handleSelect(item)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected, handleSelect, onClose])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selected}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {}
          <motion.div
            className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-lg overflow-hidden"
            initial={{ scale: 0.97, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search size={15} className="text-txt-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none text-sm text-txt-primary placeholder:text-txt-muted font-sans"
              />
              <kbd className="hidden sm:flex items-center h-5 px-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] text-txt-muted font-mono">
                ESC
              </kbd>
            </div>

            {}
            <div ref={listRef} className="py-1.5 max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2 text-txt-muted">
                  <Hash size={20} />
                  <p className="text-sm">{t('noResults')}</p>
                </div>
              ) : (
                <>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-txt-muted uppercase tracking-widest">
                    {t('navigation')}
                  </p>
                  {filtered.map((item, i) => (
                    <button
                      key={item.id}
                      data-index={i}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelected(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        i === selected
                          ? 'bg-[var(--accent-muted)] text-accent'
                          : 'text-txt-primary hover:bg-[var(--bg-elevated)]'
                      )}
                    >
                      <span className={cn(
                        'shrink-0',
                        i === selected ? 'text-accent' : 'text-txt-muted'
                      )}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {i === selected && (
                        <ArrowRight size={13} className="text-accent shrink-0" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>

            {}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
              {[
                { key: '↑↓', label: t('navigate') },
                { key: '↵',  label: t('select') },
                { key: 'ESC', label: t('close') },
              ].map(k => (
                <div key={k.key} className="flex items-center gap-1.5">
                  <kbd className="h-5 px-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[10px] text-txt-muted font-mono">
                    {k.key}
                  </kbd>
                  <span className="text-[11px] text-txt-muted">{k.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
