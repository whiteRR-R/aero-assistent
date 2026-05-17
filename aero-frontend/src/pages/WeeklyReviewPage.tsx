import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Sparkles, TrendingUp, TrendingDown, CheckCircle2, Flame, Star, RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { briefApi } from '@/api/brief.api'
import { HeatmapWidget } from '@/components/HeatmapWidget'
import { Skeleton, Button } from '@/components/ui'
import { cn } from '@/utils/cn'

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-overlay)] border border-[var(--border-strong)] rounded-lg px-3 py-2 shadow-md">
      <p className="text-[11px] text-txt-muted font-mono mb-0.5">{label}</p>
      <p className="font-display font-bold text-accent text-sm">{payload[0].value}</p>
    </div>
  )
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }

function StatCard({
  label, value, sub, icon, highlight = false,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className={cn('card p-4 flex flex-col gap-2', highlight && 'border-accent/40 bg-[var(--accent-muted)]')}>
      <div className="flex items-center justify-between">
        <span className="text-txt-muted">{icon}</span>
        {sub && <span className="text-[11px] text-txt-muted font-mono">{sub}</span>}
      </div>
      <div>
        <p className="font-display font-bold text-2xl text-txt-primary">{value}</p>
        <p className="text-[11px] text-txt-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const DAY_MAP: Record<string, { en: string; ru: string; kk: string }> = {
  monday: { en: 'Monday', ru: 'Понедельник', kk: 'Дүйсенбі' },
  tuesday: { en: 'Tuesday', ru: 'Вторник', kk: 'Сейсенбі' },
  wednesday: { en: 'Wednesday', ru: 'Среда', kk: 'Сәрсенбі' },
  thursday: { en: 'Thursday', ru: 'Четверг', kk: 'Бейсенбі' },
  friday: { en: 'Friday', ru: 'Пятница', kk: 'Жұма' },
  saturday: { en: 'Saturday', ru: 'Суббота', kk: 'Сенбі' },
  sunday: { en: 'Sunday', ru: 'Воскресенье', kk: 'Жексенбі' },
}

export function WeeklyReviewPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('ru') ? 'ru' : i18n.language.startsWith('kk') ? 'kk' : 'en'
  const tr = {
    en: {
      title: 'Weekly Review',
      subtitle: 'Your AI-powered productivity summary for the past 7 days',
      refresh: 'Refresh',
      aiAssessment: 'AI Assessment',
      generating: 'generating...',
      reviewError: 'Could not load review right now.',
      reviewUnavailable: 'AI summary is temporarily unavailable. Please try again later.',
      tasksCompleted: 'tasks completed',
      vsLastWeek: 'vs last week',
      improving: 'improving',
      declining: 'declining',
      habitCheckins: 'habit check-ins',
      mostProductive: 'most productive',
      tasksThisWeek: 'Tasks this week',
      completionRate: 'completion rate',
      completed: 'Completed',
      created: 'Created',
      weeklySnapshot: 'Weekly Snapshot',
      momentum: 'Momentum',
      consistency: 'Consistency',
    },
    ru: {
      title: 'Недельный обзор',
      subtitle: 'AI-сводка вашей продуктивности за последние 7 дней',
      refresh: 'Обновить',
      aiAssessment: 'AI-оценка',
      generating: 'генерация...',
      reviewError: 'Не удалось загрузить обзор.',
      reviewUnavailable: 'AI-сводка временно недоступна. Попробуйте чуть позже.',
      tasksCompleted: 'задач выполнено',
      vsLastWeek: 'к прошлой неделе',
      improving: 'улучшение',
      declining: 'снижение',
      habitCheckins: 'отметок привычек',
      mostProductive: 'самый продуктивный',
      tasksThisWeek: 'Задачи за неделю',
      completionRate: 'процент выполнения',
      completed: 'Выполнено',
      created: 'Создано',
      weeklySnapshot: 'Снимок недели',
      momentum: 'Прогресс',
      consistency: 'Стабильность',
    },
    kk: {
      title: 'Апталық шолу',
      subtitle: 'Соңғы 7 күндегі өнімділіктің AI-қорытындысы',
      refresh: 'Жаңарту',
      aiAssessment: 'AI бағасы',
      generating: 'жасалуда...',
      reviewError: 'Шолуды жүктеу мүмкін болмады.',
      reviewUnavailable: 'AI-түйіндемесі уақытша қолжетімсіз. Кейінірек қайталап көріңіз.',
      tasksCompleted: 'тапсырма орындалды',
      vsLastWeek: 'өткен аптамен',
      improving: 'жақсару',
      declining: 'төмендеу',
      habitCheckins: 'әдет белгілеуі',
      mostProductive: 'ең өнімді',
      tasksThisWeek: 'Осы аптадағы тапсырмалар',
      completionRate: 'орындалу пайызы',
      completed: 'Орындалды',
      created: 'Құрылды',
      weeklySnapshot: 'Апталық көрініс',
      momentum: 'Қарқын',
      consistency: 'Тұрақтылық',
    },
  }[lang]

  const locale = lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-US'
  const formattedToday = new Intl.DateTimeFormat(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date())

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['weekly-review'],
    queryFn: briefApi.weeklyReview,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  })

  const completionBar = data ? [
    { label: tr.completed, value: data.stats.tasksCompleted },
    { label: tr.created, value: data.stats.tasksCreated },
  ] : []

  const vsLast = data?.stats.vsLastWeekPct ?? 0
  const vsLastPositive = vsLast >= 0
  const momentum = data ? Math.round((data.stats.tasksCompleted + data.stats.habitsCheckedIn) / 2) : 0
  const consistency = data ? Math.round(data.stats.completionRate) : 0
  const mostProductiveRaw = `${data?.stats.mostProductiveDay ?? ''}`.trim()
  const mostProductiveDay = DAY_MAP[mostProductiveRaw.toLowerCase()]?.[lang] ?? mostProductiveRaw

  const reviewTextRaw = `${data?.review ?? ''}`.trim()
  const reviewLooksBroken = !reviewTextRaw || /^ai[\s_-]*error$/i.test(reviewTextRaw)
  const reviewText = reviewLooksBroken ? tr.reviewUnavailable : reviewTextRaw

  return (
    <div className="p-5 lg:p-7 max-w-[1520px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-3 mb-5"
      >
        <div>
          <p className="text-xs text-txt-muted font-mono mb-0.5">{formattedToday}</p>
          <h1 className="font-display font-bold text-2xl text-txt-primary tracking-tight">{tr.title}</h1>
          <p className="text-sm text-txt-secondary mt-1 max-w-2xl">{tr.subtitle}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 shrink-0">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          {tr.refresh}
        </Button>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={fadeUp} className="rounded-2xl border border-[rgba(245,158,11,0.32)] bg-[linear-gradient(155deg,rgba(245,158,11,0.12),var(--bg-surface)_42%,var(--bg-elevated))] p-5 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.35)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <span className="font-display font-bold text-sm text-txt-primary">{tr.aiAssessment}</span>
            {isFetching && <span className="text-[10px] text-txt-muted animate-pulse">{tr.generating}</span>}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-4/6' : 'w-full'}`} />
              ))}
            </div>
          ) : data ? (
            <p className="text-base text-txt-secondary leading-8 max-w-none">{reviewText}</p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-txt-muted">
              <Sparkles size={15} />
              <span>{tr.reviewError}</span>
            </div>
          )}
        </motion.div>

        {data && (
          <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<CheckCircle2 size={16} />} label={tr.tasksCompleted} value={data.stats.tasksCompleted} highlight />
            <StatCard
              icon={vsLastPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              label={tr.vsLastWeek}
              value={`${vsLastPositive ? '+' : ''}${Math.round(vsLast)}%`}
              sub={vsLastPositive ? tr.improving : tr.declining}
            />
            <StatCard icon={<Flame size={16} />} label={tr.habitCheckins} value={data.stats.habitsCheckedIn} />
            <StatCard icon={<Star size={16} />} label={tr.mostProductive} value={mostProductiveDay} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.85fr)] gap-4">
          <motion.div variants={fadeUp} className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.04),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <h2 className="font-display font-bold text-sm text-txt-primary mb-1">{tr.tasksThisWeek}</h2>
            {data && <p className="text-[11px] text-txt-muted mb-4 font-mono">{Math.round(data.stats.completionRate)}% {tr.completionRate}</p>}
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={completionBar} barCategoryGap="35%">
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Fira Code' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {completionBar.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? 'var(--accent)' : 'var(--bg-elevated)'}
                        stroke={i === 0 ? 'var(--accent)' : 'var(--border-strong)'}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--bg-surface),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <h3 className="font-display font-bold text-sm text-txt-primary mb-3">{tr.weeklySnapshot}</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<TrendingUp size={15} />} label={tr.momentum} value={momentum} />
              <StatCard icon={<CheckCircle2 size={15} />} label={tr.consistency} value={`${consistency}%`} />
            </div>
          </motion.div>
        </div>

        <motion.div variants={fadeUp}>
          <HeatmapWidget
            days={365}
            large
            className="rounded-2xl border border-[rgba(245,158,11,0.2)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.04),var(--bg-elevated))] p-4 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]"
          />
          </motion.div>
      </motion.div>
    </div>
  )
}
