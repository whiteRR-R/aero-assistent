import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, RefreshCw, AlertTriangle, CheckCircle2, Flame, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { briefApi } from '@/api/brief.api'
import { Skeleton, Button } from '@/components/ui'
import { cn } from '@/utils/cn'


function Pill({
  icon, value, label, variant = 'default',
}: {
  icon: React.ReactNode
  value: number | string
  label: string
  variant?: 'default' | 'warn' | 'good'
}) {
  const color =
    variant === 'warn' ? 'text-warning' :
    variant === 'good' ? 'text-success' :
    'text-accent'
  return (
    <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-lg px-3 py-1.5 border border-[var(--border)]">
      <span className={cn('shrink-0', color)}>{icon}</span>
      <span className={cn('font-mono font-bold text-sm', color)}>{value}</span>
      <span className="text-[11px] text-txt-muted">{label}</span>
    </div>
  )
}

export function DailyBriefWidget() {
  const [open, setOpen] = useState(true)
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ru') ? 'ru' : i18n.language.startsWith('kk') ? 'kk' : 'en'
  const tr = {
    en: {
      title: 'AI Daily Brief', generating: 'generating…', refresh: 'Refresh brief',
      quota: 'AI quota exhausted (Gemini free tier). Stats are still live — the brief will resume once the quota resets (usually within a minute).',
      aiError: 'Could not reach the AI service. Stats are still accurate.',
      dueToday: 'due today', habitsPending: 'habits pending', events: 'events', yesterday: 'yesterday',
      loadFailed: 'Could not load brief. Check your AI configuration.', retry: 'Retry',
    },
    ru: {
      title: 'Ежедневная AI-сводка', generating: 'генерация…', refresh: 'Обновить сводку',
      quota: 'Лимит AI исчерпан (бесплатный Gemini). Статистика актуальна — сводка появится после сброса лимита.',
      aiError: 'Не удалось подключиться к AI. Статистика по-прежнему точная.',
      dueToday: 'на сегодня', habitsPending: 'привычек не отмечено', events: 'события', yesterday: 'вчера',
      loadFailed: 'Не удалось загрузить сводку. Проверьте настройки AI.', retry: 'Повторить',
    },
    kk: {
      title: 'Күнделікті AI-шолу', generating: 'жасалуда…', refresh: 'Шолуды жаңарту',
      quota: 'AI лимиті таусылды (Gemini free tier). Статистика өзекті — лимит жаңарғанда шолу қайта пайда болады.',
      aiError: 'AI қызметіне қосылу мүмкін болмады. Статистика дәл.',
      dueToday: 'бүгінге', habitsPending: 'әдет белгіленбеген', events: 'оқиғалар', yesterday: 'кеше',
      loadFailed: 'Шолуды жүктеу мүмкін болмады. AI баптауларын тексеріңіз.', retry: 'Қайталау',
    },
  }[lang]

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['daily-brief'],
    queryFn:  briefApi.dailyBrief,
    staleTime: 10 * 60_000,   
    gcTime:    30 * 60_000,
  })

  return (
    <div className="rounded-2xl border border-[rgba(245,158,11,0.28)] bg-[linear-gradient(160deg,var(--bg-card),var(--bg-elevated))] overflow-hidden shadow-[0_14px_28px_-22px_rgba(245,158,11,0.28)]">
      {}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer select-none bg-[rgba(245,158,11,0.06)]"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
            <Sparkles size={14} className="text-accent" />
          </div>
          <span className="font-display font-bold text-sm text-txt-primary">{tr.title}</span>
          {isFetching && (
            <span className="text-[10px] text-txt-muted animate-pulse">{tr.generating}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); refetch() }}
            className="p-1.5 rounded-md hover:bg-[var(--bg-surface)] transition-colors text-txt-muted hover:text-txt-primary border border-transparent hover:border-[var(--border)]"
            title={tr.refresh}
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <ChevronDown
            size={16}
            className={cn('text-txt-muted transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="brief-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[var(--border)]">
              {isLoading ? (
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : data ? (
                <>
                  {}
                  {data.brief === 'RATE_LIMITED' ? (
                    <div className="flex items-start gap-2 pt-4 mb-4 text-sm text-warning bg-[var(--bg-elevated)] rounded-lg px-3 py-2.5 border border-warning/20">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>
                        {tr.quota}
                      </span>
                    </div>
                  ) : data.brief === 'AI_ERROR' ? (
                    <div className="flex items-start gap-2 pt-4 mb-4 text-sm text-txt-muted bg-[var(--bg-elevated)] rounded-lg px-3 py-2.5 border border-[var(--border)]">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{tr.aiError}</span>
                    </div>
                  ) : (
                    <p className="text-base text-txt-secondary leading-8 pt-4 mb-4 max-w-none">
                      {data.brief}
                    </p>
                  )}

                  {}
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      icon={<CheckCircle2 size={13} />}
                      value={data.stats.tasksDueToday}
                      label={tr.dueToday}
                      variant={data.stats.tasksDueToday > 0 ? 'warn' : 'good'}
                    />
                    {data.stats.overdueCount > 0 && (
                      <Pill
                        icon={<AlertTriangle size={13} />}
                        value={data.stats.overdueCount}
                        label={t('overdue', 'overdue')}
                        variant="warn"
                      />
                    )}
                    <Pill
                      icon={<Flame size={13} />}
                      value={data.stats.habitsAtRisk}
                      label={tr.habitsPending}
                      variant={data.stats.habitsAtRisk > 0 ? 'warn' : 'good'}
                    />
                    <Pill
                      icon={<Calendar size={13} />}
                      value={data.stats.eventsToday}
                      label={tr.events}
                    />
                    <Pill
                      icon={<CheckCircle2 size={13} />}
                      value={`${Math.round(data.stats.yesterdayCompletionPct)}%`}
                      label={tr.yesterday}
                      variant={data.stats.yesterdayCompletionPct >= 70 ? 'good' : 'default'}
                    />
                  </div>
                </>
              ) : (
                <div className="pt-4 flex items-center gap-2 text-sm text-txt-muted">
                  <Sparkles size={15} />
                  <span>{tr.loadFailed}</span>
                  <Button size="sm" variant="ghost" onClick={() => refetch()}>{tr.retry}</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
