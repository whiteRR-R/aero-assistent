import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, subDays, parseISO, eachDayOfInterval, startOfYear } from 'date-fns'
import { Plus, Flame, Target, Archive, Trash2, TrendingUp } from 'lucide-react'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip, Cell
} from 'recharts'
import confetti from 'canvas-confetti'
import { habitsApi } from '@/api/habits.api'
import { useAuthStore } from '@/store/authStore'
import { Button, Modal, Input, EmptyState, ProgressRing, Skeleton } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import type { HabitResponse, HabitRequest, HabitFrequency } from '@/types'


const habitSchema = z.object({
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']).default('DAILY'),
  targetPerWeek: z.coerce.number().min(1).max(7).default(7),
  color: z.string().optional(),
  icon: z.string().optional(),
})
type HabitFormData = z.infer<typeof habitSchema>

const PRESET_COLORS = ['#7C6AF7', '#34D399', '#FBBF24', '#F87171', '#60A5FA', '#FB923C']
const FREQ_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'CUSTOM', label: 'Custom' },
]

function isoDateInTimezone(timezone?: string) {
  const tz = timezone || 'UTC'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')?.value ?? '1970'
  const month = parts.find(p => p.type === 'month')?.value ?? '01'
  const day = parts.find(p => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function HabitForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
}: {
  defaultValues?: Partial<HabitFormData>
  onSubmit: (d: HabitRequest) => void
  onCancel: () => void
  loading: boolean
}) {
  const [pickedColor, setPickedColor] = useState(defaultValues?.color ?? '#7C6AF7')
  const { register, handleSubmit, formState: { errors } } = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: { frequency: 'DAILY', targetPerWeek: 7, ...defaultValues },
  })
  return (
    <form onSubmit={handleSubmit(d => onSubmit({ ...d, color: pickedColor }))} className="space-y-4">
      <Input label="Habit Name" placeholder="e.g. Morning run, Read 30 min"
        error={errors.name?.message} {...register('name')} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Description</label>
        <textarea rows={2}
          className="w-full px-3 py-2 bg-bg-elevated border border-bdr rounded-md text-sm text-txt-primary placeholder:text-txt-muted resize-none focus:border-accent focus:outline-none transition-colors"
          placeholder="Why does this matter?"
          {...register('description')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Frequency</label>
          <select className="h-9 px-3 rounded-md text-sm" {...register('frequency')}>
            {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <Input label="Target / week" type="number" min={1} max={7}
          {...register('targetPerWeek')} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Color</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setPickedColor(c)}
              className={cn('w-7 h-7 rounded-full border-2 transition-all', pickedColor === c ? 'border-txt-primary scale-110' : 'border-transparent')}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {defaultValues?.name ? 'Update habit' : 'Create habit'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}


function HabitHeatmap({ completedDates }: { completedDates: string[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)
  const end = new Date()
  const start = startOfYear(end)
  const days = eachDayOfInterval({ start, end })
  const doneSet = new Set(completedDates.map(d => d.slice(0, 10)))

  const weeks: Date[][] = []
  let week: Date[] = []
  days.forEach((d, i) => {
    week.push(d)
    if (d.getDay() === 6 || i === days.length - 1) { weeks.push(week); week = [] }
  })

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="relative overflow-x-auto">
      {tooltip && (
        <div className="absolute z-10 px-2 py-1 bg-bg-overlay border border-bdr rounded text-xs text-txt-primary font-mono pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 32 }}>
          {tooltip.label}
        </div>
      )}
      <div className="flex gap-0.5">
        {}
        <div className="flex w-full">
          {weeks.map((wk, wi) => {
            const firstDay = wk[0]
            const showMonth = firstDay.getDate() <= 7
            return (
              <div key={wi} className="flex flex-col gap-0.5" style={{ minWidth: 12 }}>
                {showMonth && wi > 0 && (
                  <span className="text-[9px] text-txt-muted font-mono mb-0.5">
                    {months[firstDay.getMonth()]}
                  </span>
                )}
                {!showMonth && <span className="h-4 block" />}
                {wk.map(day => {
                  const key = format(day, 'yyyy-MM-dd')
                  const done = doneSet.has(key)
                  return (
                    <div key={key}
                      className="w-3 h-3 rounded-[2px] cursor-default transition-colors"
                      style={{ background: done ? 'var(--accent)' : 'var(--bg-elevated)' }}
                      onMouseEnter={e => {
                        const r = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({ x: r.left, y: r.top, label: format(day, 'MMM d') + (done ? ' ✓' : '') })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


function HabitCard({ habit, onEdit, onArchive, onDelete }: {
  habit: HabitResponse
  onEdit: (h: HabitResponse) => void
  onArchive: (id: number) => void
  onDelete: (id: number) => void
}) {
  const { user } = useAuthStore()
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('ru') ? 'ru' : i18n.language.startsWith('kk') ? 'kk' : 'en'
  const tr = {
    en: { markDone: 'Complete', doneToday: 'Done today', checkedIn: 'completed', alreadyDone: 'Already marked for today' },
    ru: { markDone: 'Выполнить', doneToday: 'Выполнено сегодня', checkedIn: 'выполнено', alreadyDone: 'Уже отмечено на сегодня' },
    kk: { markDone: 'Орындау', doneToday: 'Бүгін орындалды', checkedIn: 'орындалды', alreadyDone: 'Бүгінге белгіленген' },
  }[lang]
  const qc = useQueryClient()
  const today = isoDateInTimezone(user?.timezone)

  const { data: stats } = useQuery({
    queryKey: ['habits', habit.id, 'stats'],
    queryFn: () => habitsApi.stats(habit.id),
  })

  const checkMut = useMutation({
    mutationFn: () => habitsApi.checkIn(habit.id, today),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habits', habit.id, 'stats'] })
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 }, colors: [habit.color ?? '#7C6AF7', '#34D399'] })
      toast.success(`${habit.name} — ${tr.checkedIn}!`)
    },
    onError: (e: Error) => { toast.error(e.message) },
  })

  const uncheckMut = useMutation({
    mutationFn: () => habitsApi.uncheck(habit.id, today),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habits', habit.id, 'stats'] })
    },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        qc.invalidateQueries({ queryKey: ['habits'] })
        qc.invalidateQueries({ queryKey: ['habits', habit.id, 'stats'] })
        toast.success(tr.alreadyDone)
        return
      }
      toast.error(e instanceof Error ? e.message : 'Request failed')
    },
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { label: format(d, 'EEE')[0], date: format(d, 'yyyy-MM-dd') }
  })
  const completedSet = new Set(stats?.completedDatesThisMonth ?? [])
  const isCheckedToday = stats?.checkedToday ?? completedSet.has(today)

  const progress = stats ? Math.min(stats.completionRateThisWeek, 100) : 0
  const accentColor = habit.color ?? 'var(--accent)'

  return (
    <div className="bg-bg-surface border border-bdr rounded-xl p-5 hover:border-bdr-accent transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
            <Target size={16} style={{ color: accentColor }} />
          </div>
          <div>
            <p className="font-sora font-semibold text-sm text-txt-primary">{habit.name}</p>
            <p className="text-xs text-txt-muted">{habit.frequency.toLowerCase()}</p>
          </div>
        </div>

        {}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: `${accentColor}12` }}>
          <Flame size={13} style={{ color: accentColor }} />
          <span className="font-sora font-bold text-sm" style={{ color: accentColor }}>
            {habit.currentStreak}
          </span>
        </div>
      </div>

      {}
      <div className="flex items-center gap-1.5 mb-4">
        {weekDays.map(({ label, date }) => {
          const done = completedSet.has(date)
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-200',
                done
                  ? 'text-white scale-110'
                  : date === today ? 'border border-dashed text-txt-muted' : 'bg-bg-elevated text-txt-muted'
              )}
                style={done ? { background: accentColor } : date === today ? { borderColor: accentColor, color: accentColor } : {}}>
                {done ? '✓' : label}
              </div>
            </div>
          )
        })}
      </div>

      {}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-txt-muted">This week</span>
          <span className="text-xs font-mono" style={{ color: accentColor }}>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: accentColor }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {}
      <div className="flex gap-2">
        {isCheckedToday ? (
          <Button size="sm" variant="ghost" className="flex-1 text-success border-success/30"
            onClick={() => uncheckMut.mutate()} loading={uncheckMut.isPending}>
            ✓ {tr.doneToday}
          </Button>
        ) : (
          <Button size="sm" variant="primary" className="flex-1"
            style={{ background: accentColor }}
            onClick={() => checkMut.mutate()} loading={checkMut.isPending}>
            {tr.markDone}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(habit)} className="px-2">
          <TrendingUp size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onArchive(habit.id)} className="px-2">
          <Archive size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(habit.id)} className="px-2 hover:text-danger">
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}


export function HabitsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<HabitResponse | null>(null)
  const [statsHabit, setStatsHabit] = useState<HabitResponse | null>(null)

  const { data: habits, isLoading } = useQuery({
    queryKey: ['habits', { activeOnly: true }],
    queryFn: () => habitsApi.list(true),
  })

  const { data: statsData } = useQuery({
    queryKey: ['habits', statsHabit?.id, 'stats'],
    queryFn: () => habitsApi.stats(statsHabit!.id),
    enabled: !!statsHabit,
  })

  const createMut = useMutation({
    mutationFn: habitsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit created'); setCreateOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (d: { id: number; data: HabitRequest }) => habitsApi.update(d.id, d.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit updated'); setEditHabit(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const archiveMut = useMutation({
    mutationFn: habitsApi.archive,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit archived') },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: habitsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit deleted') },
    onError: (e: Error) => toast.error(e.message),
  })

  
  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { day: format(d, 'EEE'), date: format(d, 'yyyy-MM-dd'), count: 0 }
  })

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <PageHeader
        title="Habits"
        subtitle={`${habits?.length ?? 0} active habits`}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> New Habit
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : !habits || habits.length === 0 ? (
        <EmptyState
          icon={<Target size={28} />}
          title="No habits yet"
          description="Build consistency with daily habit tracking and streak analytics"
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create first habit
            </Button>
          }
        />
      ) : (
        <>
          {}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8"
          >
            {habits.map(habit => (
              <motion.div key={habit.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <HabitCard
                  habit={habit}
                  onEdit={setEditHabit}
                  onArchive={id => archiveMut.mutate(id)}
                  onDelete={id => deleteMut.mutate(id)}
                />
              </motion.div>
            ))}
          </motion.div>

          {}
          {habits.length > 0 && (
            <div className="bg-bg-surface border border-bdr rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sora font-semibold text-sm text-txt-primary">Streak Overview</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {habits.map(h => (
                  <button key={h.id}
                    onClick={() => setStatsHabit(statsHabit?.id === h.id ? null : h)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                      statsHabit?.id === h.id ? 'border-bdr-accent bg-accent/5' : 'border-bdr hover:border-bdr-accent bg-bg-elevated'
                    )}
                  >
                    <ProgressRing
                      progress={Math.min((h.currentStreak / Math.max(h.longestStreak, 1)) * 100, 100)}
                      size={52} stroke={3} color={h.color ?? 'var(--accent)'}
                    >
                      <span className="font-mono text-[10px] font-bold" style={{ color: h.color ?? 'var(--accent)' }}>
                        {h.currentStreak}
                      </span>
                    </ProgressRing>
                    <p className="text-xs text-txt-secondary text-center truncate w-full">{h.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {}
          {statsHabit && statsData && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-bg-surface border border-bdr rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sora font-semibold text-sm text-txt-primary">
                  {statsHabit.name} — Year Heatmap
                </h2>
                <div className="flex items-center gap-4 text-xs text-txt-muted">
                  <span>Current streak: <span className="text-accent font-mono">{statsData.currentStreak}</span></span>
                  <span>Longest: <span className="text-txt-primary font-mono">{statsData.longestStreak}</span></span>
                  <span>Total: <span className="text-txt-primary font-mono">{statsData.totalCompletions}</span></span>
                </div>
              </div>
              <HabitHeatmap completedDates={statsData.completedDatesThisMonth} />

              {}
              <div className="mt-6">
                <h3 className="text-xs text-txt-muted uppercase tracking-wider mb-3">Completion Rate</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-elevated rounded-lg p-4">
                    <p className="text-xs text-txt-muted mb-1">This Week</p>
                    <p className="font-sora font-bold text-2xl text-accent">
                      {Math.round(statsData.completionRateThisWeek)}%
                    </p>
                  </div>
                  <div className="bg-bg-elevated rounded-lg p-4">
                    <p className="text-xs text-txt-muted mb-1">This Month</p>
                    <p className="font-sora font-bold text-2xl text-txt-primary">
                      {Math.round(statsData.completionRateThisMonth)}%
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Habit">
        <HabitForm onSubmit={d => createMut.mutate(d)} onCancel={() => setCreateOpen(false)} loading={createMut.isPending} />
      </Modal>
      <Modal open={!!editHabit} onClose={() => setEditHabit(null)} title="Edit Habit">
        {editHabit && (
          <HabitForm
            defaultValues={{ name: editHabit.name, description: editHabit.description ?? '', frequency: editHabit.frequency, targetPerWeek: editHabit.targetPerWeek, color: editHabit.color ?? undefined }}
            onSubmit={d => updateMut.mutate({ id: editHabit.id, data: d })}
            onCancel={() => setEditHabit(null)}
            loading={updateMut.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
