


import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import { Download, Plus, Bell, Clock, User, FileText, Trash2, Save } from 'lucide-react'
import { format, parseISO, addDays } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { eventsApi } from '@/api/events.api'
import { remindersApi } from '@/api/reminders.api'
import { profileApi } from '@/api/profile.api'
import { Button, Input, Modal, Badge, Skeleton, EmptyState, StatCard } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { formatDate, formatMonoDate, formatTimeAgo } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { EventResponse, EventRequest, ReminderResponse, ReminderRequest, ReminderStatus, ReminderRefType, UserResponse, UpdateProfileRequest } from '@/types'


const EVENT_COLORS = ['#7C6AF7', '#34D399', '#FBBF24', '#F87171', '#60A5FA', '#FB923C']
const RECURRENCE_OPTIONS = [
  { value: '', label: 'No recurrence' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
]


const eventSchema = z.object({
  title:       z.string().min(1, 'Title required'),
  description: z.string().optional(),
  location:    z.string().optional(),
  startTime:   z.string().min(1, 'Start time required'),
  endTime:     z.string().optional(),
  allDay:      z.boolean().optional(),
  color:       z.string().optional(),
  recurrence:  z.string().optional(),
})
type EventFormData = z.infer<typeof eventSchema>

function EventForm({ defaultValues, onSubmit, onDelete, onCancel, loading }: {
  defaultValues?: Partial<EventFormData>
  onSubmit: (d: EventRequest) => void
  onDelete?: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [pickedColor, setPickedColor] = useState(defaultValues?.color ?? '#7C6AF7')
  const { register, handleSubmit, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues,
  })
  const submit = (data: EventFormData) => {
    onSubmit({ ...data, color: pickedColor, startTime: new Date(data.startTime).toISOString(), endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined })
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label="Title" placeholder="Event title" error={errors.title?.message} {...register('title')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Start" type="datetime-local" error={errors.startTime?.message} {...register('startTime')} />
        <Input label="End" type="datetime-local" {...register('endTime')} />
      </div>
      <Input label="Location" placeholder="Where?" {...register('location')} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Description</label>
        <textarea rows={2} className="w-full px-3 py-2 bg-bg-elevated border border-bdr rounded-md text-sm text-txt-primary placeholder:text-txt-muted resize-none focus:border-accent focus:outline-none transition-colors"
          placeholder="Optional details..." {...register('description')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Recurrence</label>
          <select className="h-9 px-3 rounded-md text-sm" {...register('recurrence')}>
            {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Color</label>
          <div className="flex gap-2 pt-1">
            {EVENT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setPickedColor(c)}
                className={cn('w-6 h-6 rounded-full border-2 transition-all', pickedColor === c ? 'border-txt-primary scale-110' : 'border-transparent')}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {defaultValues?.title ? 'Update' : 'Create event'}
        </Button>
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export function CalendarPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<EventResponse | null>(null)
  const [defaultStart, setDefaultStart] = useState('')
  const calendarRef = useRef<FullCalendar>(null)

  const [range, setRange] = useState({
    from: new Date().toISOString(),
    to: addDays(new Date(), 30).toISOString(),
  })

  const { data: events } = useQuery({
    queryKey: ['events', 'calendar', range],
    queryFn: () => eventsApi.calendar(range.from, range.to),
  })

  const createMut = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event created'); setCreateOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMut = useMutation({
    mutationFn: (d: { id: number; data: EventRequest }) => eventsApi.update(d.id, d.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event updated'); setEditEvent(null) },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => eventsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event deleted'); setEditEvent(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const calendarEvents: EventInput[] = (events ?? []).map(e => ({
    id: String(e.id),
    title: e.title,
    start: e.startTime,
    end: e.endTime ?? undefined,
    allDay: e.allDay,
    backgroundColor: e.color ?? 'var(--accent)',
    borderColor: 'transparent',
    extendedProps: { data: e },
  }))

  const handleDateClick = (arg: DateClickArg) => {
    setDefaultStart(arg.dateStr + 'T09:00')
    setCreateOpen(true)
  }

  const handleEventClick = (arg: EventClickArg) => {
    setEditEvent(arg.event.extendedProps.data as EventResponse)
  }

  const handleExportIcal = async () => {
    try {
      const blob = await eventsApi.exportIcal()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'aero-calendar.ics'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Calendar exported')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    }
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <PageHeader
        title="Calendar"
        subtitle={`${events?.length ?? 0} events this month`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleExportIcal}>
              <Download size={15} /> Export .ics
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> New Event
            </Button>
          </div>
        }
      />
      <div className="bg-bg-surface border border-bdr rounded-xl p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          height="auto"
          datesSet={info => setRange({ from: info.startStr, to: info.endStr })}
        />
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Event" width="max-w-xl">
        <EventForm
          defaultValues={{ startTime: defaultStart }}
          onSubmit={d => createMut.mutate(d)}
          onCancel={() => setCreateOpen(false)}
          loading={createMut.isPending}
        />
      </Modal>

      <Modal open={!!editEvent} onClose={() => setEditEvent(null)} title="Edit Event" width="max-w-xl">
        {editEvent && (
          <EventForm
            defaultValues={{
              title: editEvent.title,
              description: editEvent.description ?? '',
              location: editEvent.location ?? '',
              startTime: editEvent.startTime.slice(0, 16),
              endTime: editEvent.endTime?.slice(0, 16),
              allDay: editEvent.allDay,
              color: editEvent.color ?? '',
              recurrence: editEvent.recurrence ?? '',
            }}
            onSubmit={d => updateMut.mutate({ id: editEvent.id, data: d })}
            onDelete={() => deleteMut.mutate(editEvent.id)}
            onCancel={() => setEditEvent(null)}
            loading={updateMut.isPending}
          />
        )}
      </Modal>
    </div>
  )
}




const reminderSchema = z.object({
  title:    z.string().min(1, 'Title required'),
  message:  z.string().optional(),
  refType:  z.enum(['TASK', 'EVENT', 'HABIT', 'CUSTOM']),
  remindAt: z.string().min(1, 'Time required'),
})
type ReminderFormData = z.infer<typeof reminderSchema>

const STATUS_BADGE_MAP: Record<ReminderStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning', SENT: 'success', FAILED: 'danger', CANCELLED: 'default',
}
const REFTYPE_OPTIONS: { value: ReminderRefType; label: string }[] = [
  { value: 'CUSTOM', label: 'Custom' },
  { value: 'TASK',   label: 'Task' },
  { value: 'EVENT',  label: 'Event' },
  { value: 'HABIT',  label: 'Habit' },
]

function ReminderForm({ defaultValues, onSubmit, onCancel, loading }: {
  defaultValues?: Partial<ReminderFormData>
  onSubmit: (d: ReminderRequest) => void
  onCancel: () => void
  loading: boolean
}) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors } } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { refType: 'CUSTOM', ...defaultValues },
  })
  const submit = (data: ReminderFormData) => {
    onSubmit({ ...data, remindAt: new Date(data.remindAt).toISOString() })
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label={t('title')} placeholder={t('newReminder')} error={errors.title?.message} {...register('title')} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">{t('message')}</label>
        <textarea rows={2} className="w-full px-3 py-2 bg-bg-elevated border border-bdr rounded-md text-sm text-txt-primary placeholder:text-txt-muted resize-none focus:border-accent focus:outline-none transition-colors"
          placeholder={t('optional')} {...register('message')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">{t('type')}</label>
          <select className="h-9 px-3 rounded-md text-sm" {...register('refType')}>
            {REFTYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.value === 'TASK' ? t('tasks') : o.value === 'EVENT' ? t('calendar') : o.value === 'HABIT' ? t('habits') : 'Custom'}
              </option>
            ))}
          </select>
        </div>
        <Input label={t('remindAt')} type="datetime-local" error={errors.remindAt?.message} {...register('remindAt')} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {defaultValues?.title ? t('updateReminder') : t('createReminder')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}

function groupReminders(reminders: ReminderResponse[]) {
  const now = new Date()
  const tomorrow = addDays(now, 1)
  const weekEnd = addDays(now, 7)
  const groups: Record<string, ReminderResponse[]> = { today: [], tomorrow: [], week: [], later: [] }
  reminders.forEach(r => {
    const d = parseISO(r.remindAt)
    if (format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) groups.today.push(r)
    else if (format(d, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) groups.tomorrow.push(r)
    else if (d <= weekEnd) groups.week.push(r)
    else groups.later.push(r)
  })
  return groups
}

export function RemindersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editReminder, setEditReminder] = useState<ReminderResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReminderStatus>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['reminders', {}],
    queryFn: () => remindersApi.list({ size: 100 }),
  })
  const reminders = data?.content ?? []
  const filteredReminders = statusFilter === 'ALL'
    ? reminders
    : reminders.filter(r => r.status === statusFilter)
  const groups = groupReminders(filteredReminders)

  const createMut = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Reminder set'); setCreateOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMut = useMutation({
    mutationFn: (d: { id: number; data: ReminderRequest }) => remindersApi.update(d.id, d.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Reminder updated'); setEditReminder(null) },
    onError: (e: Error) => toast.error(e.message),
  })
  const cancelMut = useMutation({
    mutationFn: remindersApi.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Reminder cancelled') },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMut = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Reminder deleted') },
    onError: (e: Error) => toast.error(e.message),
  })

  const pendingCount = reminders.filter(r => r.status === 'PENDING').length
  const sentCount = reminders.filter(r => r.status === 'SENT').length
  const failedCount = reminders.filter(r => r.status === 'FAILED').length
  const statusLabel: Record<ReminderStatus, string> = {
    PENDING: t('pending'),
    SENT: t('sent'),
    FAILED: t('failed'),
    CANCELLED: t('cancelled'),
  }
  const groupLabels: Record<string, string> = {
    today: t('todayGroup'),
    tomorrow: t('tomorrowGroup'),
    week: t('thisWeekGroup'),
    later: t('laterGroup'),
  }
  const refTypeLabel: Record<ReminderRefType, string> = {
    CUSTOM: 'Custom',
    TASK: t('tasks'),
    EVENT: t('calendar'),
    HABIT: t('habits'),
  }

  return (
    <div className="p-8 max-w-[980px] mx-auto">
      <PageHeader
        title={t('reminders')}
        subtitle={`${pendingCount} ${t('pending')}`}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> {t('newReminder')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label={t('pending')} value={pendingCount} icon={<Clock size={14} />} />
        <StatCard label={t('sent')} value={sentCount} icon={<Bell size={14} />} />
        <StatCard label={t('failed')} value={failedCount} icon={<FileText size={14} />} />
        <StatCard label={t('reminders')} value={reminders.length} icon={<Bell size={14} />} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          { key: 'ALL', label: t('allStatuses') },
          { key: 'PENDING', label: t('pending') },
          { key: 'SENT', label: t('sent') },
          { key: 'FAILED', label: t('failed') },
          { key: 'CANCELLED', label: t('cancelled') },
        ] as const).map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setStatusFilter(opt.key)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-medium border transition-colors',
              statusFilter === opt.key
                ? 'bg-[var(--accent-muted)] border-[var(--border-accent)] text-accent'
                : 'bg-[var(--bg-surface)] border-[var(--border)] text-txt-secondary hover:text-txt-primary hover:border-[var(--border-strong)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filteredReminders.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title={t('noReminders')}
          description={t('noRemindersDesc')}
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> {t('newReminder')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([key, list]) => {
            if (list.length === 0) return null
            return (
              <div key={key}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-semibold text-txt-muted uppercase tracking-widest">{groupLabels[key]}</p>
                  <div className="flex-1 h-px bg-bdr" />
                </div>
                <div className="space-y-2">
                  {list.map(reminder => (
                    <motion.div key={reminder.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className="group flex items-start gap-4 p-4 bg-bg-surface border border-bdr rounded-xl hover:border-bdr-accent transition-all"
                    >
                      {}
                      <div className="flex flex-col items-center pt-1 shrink-0">
                        <div className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          reminder.status === 'PENDING'  ? 'bg-warning' :
                          reminder.status === 'SENT'     ? 'bg-success' :
                          reminder.status === 'FAILED'   ? 'bg-danger'  : 'bg-txt-muted'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-txt-primary">{reminder.title}</p>
                          <Badge label={statusLabel[reminder.status]} variant={STATUS_BADGE_MAP[reminder.status]} />
                        </div>
                        {reminder.message && (
                          <p className="text-xs text-txt-secondary mt-0.5">{reminder.message}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="font-mono text-xs text-accent">
                            {formatMonoDate(reminder.remindAt)}
                          </span>
                          <span className="text-xs text-txt-muted bg-bg-elevated px-1.5 py-0.5 rounded">
                            {refTypeLabel[reminder.refType]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="sm" variant="ghost" className="px-2"
                          onClick={() => setEditReminder(reminder)}>
                          {t('edit')}
                        </Button>
                        {reminder.status === 'PENDING' && (
                          <Button size="sm" variant="ghost" className="px-2"
                            onClick={() => cancelMut.mutate(reminder.id)} loading={cancelMut.isPending}>
                            {t('cancelReminder')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="px-2 hover:text-danger"
                          onClick={() => deleteMut.mutate(reminder.id)} loading={deleteMut.isPending}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('newReminder')}>
        <ReminderForm onSubmit={d => createMut.mutate(d)} onCancel={() => setCreateOpen(false)} loading={createMut.isPending} />
      </Modal>
      <Modal open={!!editReminder} onClose={() => setEditReminder(null)} title={t('updateReminder')}>
        {editReminder && (
          <ReminderForm
            defaultValues={{ title: editReminder.title, message: editReminder.message ?? '', refType: editReminder.refType, remindAt: editReminder.remindAt.slice(0, 16) }}
            onSubmit={d => updateMut.mutate({ id: editReminder.id, data: d })}
            onCancel={() => setEditReminder(null)}
            loading={updateMut.isPending}
          />
        )}
      </Modal>
    </div>
  )
}




export function ProfilePage() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: profileApi.get })
  const { data: history } = useQuery({ queryKey: ['profile', 'history'], queryFn: profileApi.history })
  const { data: prefs } = useQuery({ queryKey: ['reminders', 'prefs'], queryFn: remindersApi.preferences })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const profileSchema = z.object({
    fullName: z.string().min(2).optional(),
    bio:      z.string().max(1000).optional(),
    timezone: z.string().optional(),
    locale:   z.string().optional(),
  })
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<UpdateProfileRequest>({
    values: profile ? { fullName: profile.fullName, bio: profile.bio ?? '', timezone: profile.timezone, locale: profile.locale } : undefined,
  })

  const updateMut = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (u) => { qc.setQueryData(['profile'], u); toast.success('Profile updated') },
    onError: (e: Error) => toast.error(e.message),
  })

  const avatarMut = useMutation({
    mutationFn: profileApi.uploadAvatar,
    onSuccess: (u) => { qc.setQueryData(['profile'], u); toast.success('Avatar updated') },
    onError: (e: Error) => toast.error(e.message),
  })

  const prefsMut = useMutation({
    mutationFn: remindersApi.updatePreferences,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders', 'prefs'] }); toast.success('Preferences saved') },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    avatarMut.mutate(file)
  }

  const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Almaty', 'Asia/Tashkent', 'Asia/Tokyo']
  const REMINDER_MINS = [5, 15, 30, 60, 120]

  if (isLoading) return (
    <div className="p-8 max-w-[640px] mx-auto space-y-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  )

  const avatarSrc = avatarPreview ?? profile?.avatarUrl

  return (
    <div className="p-8 max-w-[640px] mx-auto">
      <PageHeader title="Profile" subtitle="Manage your account and preferences" />

      {}
      <div className="flex items-center gap-5 mb-8 p-5 bg-bg-surface border border-bdr rounded-xl">
        <label className="relative cursor-pointer group shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-elevated border border-bdr">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-txt-muted font-sora font-bold">
                {profile?.fullName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <User size={18} className="text-white" />
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
        </label>
        <div>
          <p className="font-sora font-bold text-lg text-txt-primary">{profile?.fullName}</p>
          <p className="text-sm text-txt-secondary">{profile?.email}</p>
          <p className="text-xs text-txt-muted mt-1 font-mono">
            via {profile?.provider} · since {profile?.createdAt ? format(parseISO(profile.createdAt), 'MMM yyyy') : '—'}
          </p>
        </div>
      </div>

      {}
      <form onSubmit={handleSubmit(data => updateMut.mutate(data))} className="space-y-4 mb-8">
        <div className="text-sm font-semibold text-txt-primary mb-2 font-sora">Personal Info</div>
        <Input label="Full Name" {...register('fullName')} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Bio</label>
          <textarea rows={3} className="w-full px-3 py-2 bg-bg-elevated border border-bdr rounded-md text-sm text-txt-primary placeholder:text-txt-muted resize-none focus:border-accent focus:outline-none transition-colors"
            placeholder="Tell something about yourself..." {...register('bio')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Timezone</label>
            <select className="h-9 px-3 rounded-md text-sm" {...register('timezone')}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Language</label>
            <select className="h-9 px-3 rounded-md text-sm" {...register('locale')}>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
          </div>
        </div>
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
          <Save size={15} /> Save changes
        </Button>
      </form>

      {}
      {prefs && (
        <div className="mb-8 p-5 bg-bg-surface border border-bdr rounded-xl space-y-4">
          <p className="text-sm font-semibold text-txt-primary font-sora">Notifications</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-txt-secondary">Email reminders</span>
            <button
              onClick={() => prefsMut.mutate({ emailEnabled: !prefs.emailEnabled })}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors',
                prefs.emailEnabled ? 'bg-accent' : 'bg-bg-elevated border border-bdr'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow',
                prefs.emailEnabled ? 'left-5' : 'left-0.5'
              )} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-txt-secondary">Daily digest</span>
            <button
              onClick={() => prefsMut.mutate({ dailyDigest: !prefs.dailyDigest })}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors',
                prefs.dailyDigest ? 'bg-accent' : 'bg-bg-elevated border border-bdr'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow',
                prefs.dailyDigest ? 'left-5' : 'left-0.5'
              )} />
            </button>
          </div>
          <div>
            <p className="text-xs text-txt-muted mb-2">Reminder lead time</p>
            <div className="flex gap-2">
              {REMINDER_MINS.map(m => (
                <button key={m}
                  onClick={() => prefsMut.mutate({ reminderMinutes: prefs.reminderMinutes.includes(m) ? prefs.reminderMinutes.filter(x => x !== m) : [...prefs.reminderMinutes, m] })}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-mono border transition-all',
                    prefs.reminderMinutes.includes(m) ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-elevated border-bdr text-txt-muted hover:border-bdr-accent'
                  )}>
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {}
      {history && history.length > 0 && (
        <div className="p-5 bg-bg-surface border border-bdr rounded-xl">
          <p className="text-sm font-semibold text-txt-primary font-sora mb-4">Change History</p>
          <div className="space-y-2">
            {history.slice(0, 10).map(h => (
              <div key={h.id} className="flex items-start justify-between gap-4 py-2 border-b border-bdr last:border-0">
                <div className="flex-1">
                  <p className="text-xs font-medium text-txt-primary">{h.fieldName}</p>
                  <p className="text-xs text-txt-muted mt-0.5">
                    <span className="line-through">{h.oldValue || '—'}</span>
                    <span className="text-success mx-1">→</span>
                    <span>{h.newValue || '—'}</span>
                  </p>
                </div>
                <span className="text-[10px] text-txt-muted font-mono shrink-0">
                  {formatTimeAgo(h.changedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
