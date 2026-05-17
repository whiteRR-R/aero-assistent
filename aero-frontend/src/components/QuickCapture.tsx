import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, CheckSquare, Target, Calendar, HelpCircle, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { briefApi, type QuickCaptureResponse } from '@/api/brief.api'
import { cn } from '@/utils/cn'

function ActionIcon({ action }: { action: QuickCaptureResponse['action'] }) {
  if (action === 'task') return <CheckSquare size={15} className="text-accent" />
  if (action === 'habit') return <Target size={15} className="text-success" />
  if (action === 'event') return <Calendar size={15} className="text-warning" />
  return <HelpCircle size={15} className="text-txt-muted" />
}

interface Props {
  open: boolean
  onClose: () => void
}

export function QuickCapture({ open, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ru') ? 'ru' : i18n.language.startsWith('kk') ? 'kk' : 'en'
  const suggestions = {
    en: [
      'Add task: finish report by Friday urgent',
      'Remind me to call dentist tomorrow at 10am',
      'Start habit: read 20 minutes daily',
      'Meeting with team next Monday 2pm',
    ],
    ru: [
      'Добавь задачу: закончить отчет к пятнице срочно',
      'Напомни позвонить стоматологу завтра в 10:00',
      'Начать привычку: читать 20 минут каждый день',
      'Встреча с командой в следующий понедельник в 14:00',
    ],
    kk: [
      'Тапсырма қосу: есепті жұмаға дейін шұғыл аяқтау',
      'Ертең 10:00-де тіс дәрігеріне қоңырау шалуды еске сал',
      'Әдет бастау: күн сайын 20 минут оқу',
      'Келесі дүйсенбі 14:00-де командамен кездесу',
    ],
  }[lang]

  const [text, setText] = useState('')
  const [result, setResult] = useState<QuickCaptureResponse | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setResult(null)
      setText('')
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: string) => briefApi.quickCapture(payload),
    onSuccess: (res) => {
      setResult(res)
      if (res.action === 'task') qc.invalidateQueries({ queryKey: ['tasks'] })
      if (res.action === 'habit') qc.invalidateQueries({ queryKey: ['habits'] })
      if (res.action === 'event') qc.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const submit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    mutate(trimmed)
  }, [text, isPending, mutate])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (result) {
        setText('')
        setResult(null)
        inputRef.current?.focus()
      } else {
        submit()
      }
    }
  }

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="qc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            key="qc-modal"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
          >
            <div className="card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                <div className="w-6 h-6 rounded-md bg-[var(--accent-muted)] flex items-center justify-center">
                  <Zap size={12} className="text-accent" />
                </div>
                <span className="font-display font-bold text-sm text-txt-primary flex-1">{t('quickCaptureTitle')}</span>
                <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-txt-muted bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                  Ctrl+Shift+A
                </kbd>
                <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-elevated)] text-txt-muted transition-colors ml-1">
                  <X size={15} />
                </button>
              </div>

              <div className="p-4">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => { setText(e.target.value); setResult(null) }}
                  onKeyDown={handleKey}
                  rows={2}
                  placeholder={t('quickCapturePlaceholder')}
                  className={cn(
                    'w-full resize-none rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]',
                    'px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted',
                    'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors',
                    'font-sans leading-relaxed',
                  )}
                />

                {!text && !result && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setText(s); inputRef.current?.focus() }}
                        className="text-[11px] text-txt-muted bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-3 py-1 hover:border-[var(--border-strong)] hover:text-txt-secondary transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        'mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 border',
                        result.action === 'unknown'
                          ? 'bg-[var(--bg-elevated)] border-[var(--border)] text-txt-muted'
                          : 'bg-[var(--accent-muted)] border-[var(--border-accent)]'
                      )}
                    >
                      <ActionIcon action={result.action} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-txt-primary">{result.summary}</p>
                        {result.action !== 'unknown' && (
                          <p className="text-[11px] text-txt-muted mt-0.5">{t('quickCaptureEnterAnotherHint')}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[11px] text-txt-muted">
                    {result ? t('quickCaptureEnterAnother') : t('quickCaptureFooterHint')}
                  </p>
                  <button
                    onClick={result ? () => { setText(''); setResult(null) } : submit}
                    disabled={!text.trim() && !result}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      'bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    {isPending ? (
                      <><Loader2 size={13} className="animate-spin" /> {t('quickCaptureProcessing')}</>
                    ) : result ? (
                      t('quickCaptureNew')
                    ) : (
                      <><Zap size={13} /> {t('capture')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function useQuickCapture() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
