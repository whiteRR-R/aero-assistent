import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import { format, subDays, parseISO, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns'
import { CheckSquare, Target, Calendar, ArrowRight, Play, Square, RotateCcw, Coffee, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { tasksApi } from '@/api/tasks.api'
import { habitsApi } from '@/api/habits.api'
import { eventsApi } from '@/api/events.api'
import { useAuthStore } from '@/store/authStore'
import { useFocusStore, formatFocusTime } from '@/store/focusStore'
import { Skeleton, ProgressRing, Button } from '@/components/ui'
import { formatCalendarDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import type { TaskResponse } from '@/types'
import { DailyBriefWidget } from '@/components/DailyBriefWidget'
import { HeatmapWidget } from '@/components/HeatmapWidget'

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-overlay)] border border-[var(--border-strong)] rounded-lg px-3 py-2 shadow-md">
      <p className="text-[11px] text-txt-muted font-mono mb-0.5">{label}</p>
      <p className="font-display font-bold text-accent text-sm">{payload[0].value}</p>
    </div>
  )
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }

function FocusTimerWidget() {
  const { t } = useTranslation()
  const {
    isActive, mode, timeLeft, sessions,
    focusDuration, breakDuration,
    start, stop, reset,
  } = useFocusStore()

  const total = mode === 'focus' ? focusDuration : breakDuration
  const progress = ((total - timeLeft) / total) * 100

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(150deg,var(--bg-surface),var(--bg-elevated))] p-5 shadow-[0_16px_36px_-30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-sm text-txt-primary">{t('focusTimer')}</h2>
        <div className="flex items-center gap-1 text-[11px] text-txt-muted">
          <span>{sessions}</span>
          <span>{t('sessionsToday')}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
          mode === 'focus'
            ? 'bg-[var(--accent-muted)] border-[var(--border-accent)] text-accent'
            : 'bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.25)] text-success'
        )}>
          {mode === 'focus' ? <Play size={10} /> : <Coffee size={10} />}
          {mode === 'focus' ? t('focusMode') : t('breakMode')}
        </div>

        <ProgressRing
          progress={progress}
          size={112}
          stroke={5}
          color={mode === 'focus' ? 'var(--accent)' : 'var(--success)'}
        >
          <div className="flex flex-col items-center">
            <span className="font-mono font-bold text-xl text-txt-primary">
              {formatFocusTime(timeLeft)}
            </span>
          </div>
        </ProgressRing>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button variant="primary" size="sm" onClick={start} className="gap-1.5">
              <Play size={13} /> {t('startFocus')}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={stop} className="gap-1.5">
              <Square size={11} /> {t('stopTimer')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={13} />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { t, i18n } = useTranslation()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening')
  const locale = (i18n.language || 'en').startsWith('ru')
    ? 'ru-RU'
    : (i18n.language || 'en').startsWith('kk')
      ? 'kk-KZ'
      : 'en-US'
  const formattedToday = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const eventsFrom = startOfDay(new Date()).toISOString()
  const eventsTo = endOfDay(addDays(new Date(), 7)).toISOString()

  const { data: stats } = useQuery({ queryKey: ['tasks', 'stats'], queryFn: tasksApi.stats })
  const { data: taskPage } = useQuery({ queryKey: ['tasks', { page: 0, size: 80 }], queryFn: () => tasksApi.list({ size: 80 }) })
  const { data: habits } = useQuery({ queryKey: ['habits', { activeOnly: true }], queryFn: () => habitsApi.list(true) })
  const { data: events } = useQuery({
    queryKey: ['events', 'calendar', { from: eventsFrom, to: eventsTo }],
    queryFn: () => eventsApi.calendar(eventsFrom, eventsTo),
  })

  const allTasks = taskPage?.content ?? []
  const upcomingEvents = [...(events ?? [])].sort(
    (a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
  )
  const todayList = allTasks.filter(tk => tk.deadline && isToday(parseISO(tk.deadline)))
  const tomorrowList = allTasks.filter(tk => tk.deadline && isTomorrow(parseISO(tk.deadline)))

  const areaData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const day = format(d, 'MMM d')
    return {
      day: format(d, 'EEE'),
      count: allTasks.filter(tk => tk.completedAt && format(parseISO(tk.completedAt), 'MMM d') === day).length,
    }
  })

  const donutData = stats ? [
    { name: t('todo'), value: stats.todo, color: 'var(--text-muted)' },
    { name: t('inProgress'), value: stats.inProgress, color: 'var(--accent)' },
    { name: t('done'), value: stats.done, color: 'var(--success)' },
    { name: t('cancelled'), value: stats.cancelled, color: 'var(--danger)' },
  ].filter(d => d.value > 0) : []

  const firstName = user?.fullName?.split(' ')[0] ?? ''
  const completionRate = stats?.total ? Math.round((stats.done / stats.total) * 100) : 0
  const openTasks = stats ? stats.todo + stats.inProgress : 0

  return (
    <div className="p-4 lg:p-6 max-w-[1580px] mx-auto relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-18 bg-[radial-gradient(circle_at_10%_0%,var(--accent-glow),transparent_42%)]" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4"
      >
        <p className="text-xs text-txt-muted font-mono mb-0.5">{formattedToday}</p>
        <h1 className="font-display font-bold tracking-tight text-txt-primary" style={{ fontSize: 'clamp(20px, 2.8vw, 30px)' }}>
          {greeting}{firstName && <span className="text-accent">, {firstName}</span>}.
        </h1>
        <p className="text-sm text-txt-secondary mt-1">{t('tasks')}: {openTasks} · {t('done')}: {completionRate}%</p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={fadeUp} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-[rgba(245,158,11,0.38)] bg-[linear-gradient(145deg,rgba(245,158,11,0.14),var(--bg-surface)_40%,var(--bg-elevated))] p-5 lg:p-6 shadow-[0_18px_44px_-30px_rgba(245,158,11,0.3)]">
            <div className="absolute inset-0 pointer-events-none opacity-45 bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.28),transparent_45%)]" />
            <div className="relative flex items-center justify-between mb-3">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-2 py-0.5 mb-2">
                  <Sparkles size={10} className="text-accent" />
                  <p className="text-[10px] uppercase tracking-widest text-accent font-semibold">AI Daily Brief</p>
                </div>
                <h2 className="font-display font-black text-xl text-txt-primary">{t('weeklyReview', 'Overview')} + {t('aiChat')}</h2>
              </div>
              <Link to="/chat">
                <Button size="sm" variant="secondary" className="gap-1.5">
                  {t('aiChat')} <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
            <DailyBriefWidget />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(155deg,var(--bg-card),var(--bg-elevated))] p-4 shadow-[0_14px_30px_-26px_rgba(0,0,0,0.24)]">
              <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('tasks')}</p>
              <p className="font-display font-black text-2xl text-txt-primary mt-1">{openTasks}</p>
              <p className="text-xs text-txt-muted mt-1">{t('inProgress')}: {stats?.inProgress ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(245,158,11,0.35)] bg-[linear-gradient(155deg,rgba(245,158,11,0.12),var(--bg-card)_50%,var(--bg-elevated))] p-4 shadow-[0_16px_34px_-24px_rgba(245,158,11,0.28)]">
              <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('done')}</p>
              <p className="font-display font-black text-2xl text-accent mt-1">{completionRate}%</p>
              <p className="text-xs text-txt-muted mt-1">{stats?.done ?? 0} / {stats?.total ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(155deg,var(--bg-card),var(--bg-elevated))] p-4 shadow-[0_14px_30px_-26px_rgba(0,0,0,0.24)] col-span-2 xl:col-span-1">
              <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('upcomingEvents')}</p>
              <p className="font-display font-black text-2xl text-txt-primary mt-1">{upcomingEvents.length}</p>
              <p className="text-xs text-txt-muted mt-1">{t('today')}: {todayList.length} · {t('tomorrowGroup')}: {tomorrowList.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl border border-[rgba(245,158,11,0.24)] bg-[linear-gradient(145deg,var(--bg-surface),rgba(245,158,11,0.06),var(--bg-elevated))] p-3.5 shadow-[0_14px_30px_-26px_rgba(0,0,0,0.22)]">
          {stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile icon={<CheckSquare size={16} className="text-txt-muted" />} label={t('tasksDoneToday')} value={stats.done} />
              <MetricTile icon={<Target size={16} className="text-txt-muted" />} label={t('activeHabits')} value={habits?.length ?? 0} />
              <MetricTile icon={<Calendar size={16} className="text-txt-muted" />} label={t('upcomingEvents')} value={upcomingEvents.length} />
              <MetricTile icon={<CheckSquare size={16} className="text-txt-muted" />} label={t('overdue')} value={stats.overdue} />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div variants={fadeUp} className="lg:col-span-2 rounded-2xl border border-[rgba(245,158,11,0.2)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.05),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm text-txt-primary flex items-center gap-2">
                <Clock3 size={14} className="text-txt-muted" />
                {t('todaysTasks')} / {t('tomorrowGroup')}
              </h2>
              <Link to="/tasks">
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  {t('tasks')} <ArrowRight size={11} />
                </Button>
              </Link>
            </div>
            {todayList.length === 0 && tomorrowList.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center">
                  <CheckSquare size={20} className="text-txt-muted" />
                </div>
                <p className="text-sm text-txt-secondary">{t('noTasksToday')}</p>
                <Link to="/tasks">
                  <Button size="sm" variant="primary">{t('newTask')}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <TaskGroup title={t('today')} tasks={todayList} />
                <TaskGroup title={t('tomorrowGroup')} tasks={tomorrowList} />
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp}>
            <FocusTimerWidget />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <motion.div variants={fadeUp} className="lg:col-span-3 rounded-2xl border border-[rgba(245,158,11,0.2)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.04),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-sm text-txt-primary">{t('productivity')}</h2>
              <Link to="/review"><Button size="sm" variant="ghost" className="text-xs">{t('weeklyReview')} <ArrowRight size={11}/></Button></Link>
            </div>
            <ResponsiveContainer width="100%" height={148}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2.5} fill="url(#areaG)" animationDuration={1200} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--bg-surface),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <h2 className="font-display font-bold text-sm text-txt-primary mb-3">{t('taskStatus')}</h2>
            {stats && stats.total > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={168}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={44} outerRadius={64} dataKey="value" paddingAngle={2} animationBegin={0} animationDuration={900}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={6}
                      formatter={value => <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'Inter' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[50px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                  <span className="font-display font-bold text-xl text-accent">{stats.total}</span>
                  <span className="text-[9px] text-txt-muted uppercase tracking-wider">{t('total', 'total')}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 gap-2">
                <CheckSquare size={24} className="text-txt-muted" />
                <p className="text-xs text-txt-secondary">{t('noTasks')}</p>
              </div>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div variants={fadeUp} className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.05),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm text-txt-primary">{t('habitsToday')}</h2>
              <Link to="/habits"><Button size="sm" variant="ghost"><ArrowRight size={12} /></Button></Link>
            </div>
            {!habits ? (
              <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : habits.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Target size={24} className="text-txt-muted" />
                <p className="text-sm text-txt-secondary">{t('noHabits')}</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5">
                {habits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--bg-elevated),rgba(245,158,11,0.03))] px-3 py-2.5">
                    <ProgressRing progress={Math.min((habit.currentStreak / Math.max(habit.targetPerWeek, 7)) * 100, 100)} size={34} stroke={3}>
                      <span className="font-mono text-[9px] font-bold text-accent">{habit.currentStreak}</span>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-txt-primary truncate">{habit.name}</p>
                      <p className="text-[11px] text-txt-muted">{t('currentStreak')}: {habit.currentStreak}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--bg-surface),var(--bg-elevated))] p-5 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
                  <Calendar size={14} className="text-accent" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm text-txt-primary">{t('upcomingEventsTitle')}</h2>
                  <p className="text-[11px] text-txt-muted font-mono">{upcomingEvents.length} {t('upcomingEvents')}</p>
                </div>
              </div>
              <Link to="/calendar">
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  {t('calendar')} <ArrowRight size={11} />
                </Button>
              </Link>
            </div>
            {!events ? (
              <div className="flex gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-18 w-40 shrink-0" />)}</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="flex items-center gap-3 py-6 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="w-9 h-9 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center">
                  <Calendar size={16} className="text-txt-muted" />
                </div>
                <p className="text-sm text-txt-secondary">{t('upcomingEvents')} — 0</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {upcomingEvents.slice(0, 6).map(event => (
                  <motion.div
                    key={event.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ duration: 0.14 }}
                    className="bg-[linear-gradient(155deg,var(--bg-elevated),var(--bg-card))] rounded-xl p-3.5 transition-colors shadow-[0_12px_28px_rgba(0,0,0,0.16)] border border-[var(--border)]"
                    style={{ borderLeftColor: event.color ?? 'var(--accent)', borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: event.color ?? 'var(--accent)' }} />
                        <p className="font-mono text-[10px] text-accent">{formatCalendarDate(event.startTime)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-txt-primary leading-tight line-clamp-2 min-h-[38px]">{event.title}</p>
                    {event.location && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)]">
                        <p className="text-[11px] text-txt-muted truncate">{event.location}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div variants={fadeUp}>
          <HeatmapWidget
            days={365}
            large
            className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.04),var(--bg-elevated))] p-4 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 flex items-center gap-2.5">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-txt-muted">{label}</p>
        <p className="font-display font-black text-xl text-txt-primary">{value}</p>
      </div>
    </div>
  )
}

function TaskGroup({ title, tasks }: { title: string; tasks: TaskResponse[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-muted mb-2">{title}</p>
      <div className="space-y-1">
        {tasks.length === 0 ? <p className="text-xs text-txt-muted px-3 py-2">-</p> : tasks.slice(0, 6).map(task => <TodayRow key={task.id} task={task} />)}
      </div>
    </div>
  )
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-txt-muted',
  MEDIUM: 'bg-warning',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-danger',
}

function TodayRow({ task }: { task: TaskResponse }) {
  const done = task.status === 'DONE'
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
      done ? 'opacity-40' : 'hover:bg-[var(--bg-elevated)]'
    )}>
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[task.priority])} />
      <span className={cn(
        'flex-1 text-sm font-medium truncate',
        done ? 'line-through text-txt-muted' : 'text-txt-primary'
      )}>
        {task.title}
      </span>
      {task.deadline && (
        <span className="font-mono text-[10px] text-txt-muted shrink-0">
          {format(parseISO(task.deadline), 'HH:mm')}
        </span>
      )}
    </div>
  )
}
