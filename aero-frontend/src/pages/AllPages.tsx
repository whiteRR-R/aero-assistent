


import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, subDays, parseISO, eachDayOfInterval, startOfYear } from 'date-fns'
import { Plus, Flame, Target, Archive, Trash2, BarChart2, X, Download, Bell, Clock, Search, Pin, PinOff, FileText, FolderPlus, User, Save, ChevronDown, Camera, Sparkles, Trophy, CheckCircle2, Zap, Upload, Copy, Pencil } from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import confetti from 'canvas-confetti'
import { useTranslation } from 'react-i18next'
import { habitsApi } from '@/api/habits.api'
import { notesApi } from '@/api/notes.api'
import { eventsApi } from '@/api/events.api'
import { remindersApi } from '@/api/reminders.api'
import { profileApi } from '@/api/profile.api'
import { apiClient } from '@/api/client'
import { Button, Input, Textarea, Select, Modal, Badge, EmptyState, Skeleton, ProgressRing, Toggle, PageHeader, StatCard } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatMonoDate, formatTimeAgo } from '@/utils/formatters'
import { addDays } from 'date-fns'
import toast from 'react-hot-toast'
import type { HabitResponse, HabitRequest, NoteResponse, NoteRequest, NoteCategoryResponse, EventResponse, EventRequest, ReminderResponse, ReminderRequest, ReminderStatus, ReminderRefType, UpdateProfileRequest } from '@/types'
import { useAuthStore } from '@/store/authStore'

const COLORS = ['#6C63FF','#FF6584','#43E97B','#FFD166','#4CC9F0','#FB923C']

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




const habitSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  frequency: z.enum(['DAILY','WEEKLY','CUSTOM']).default('DAILY'),
  targetPerWeek: z.coerce.number().min(1).max(7).default(7),
  color: z.string().optional(),
})
type HF = z.infer<typeof habitSchema>

function HabitForm({dv,onSubmit,onCancel,loading}:{dv?:Partial<HF>;onSubmit:(d:HabitRequest)=>void;onCancel:()=>void;loading:boolean}) {
  const { t } = useTranslation()
  const [color, setColor] = useState(dv?.color??'#6C63FF')
  const { register, handleSubmit, formState:{errors} } = useForm<HF>({
    resolver: zodResolver(habitSchema), defaultValues:{frequency:'DAILY',targetPerWeek:7,...dv}
  })
  return (
    <form onSubmit={handleSubmit(d=>onSubmit({...d,color}))} className="space-y-4">
      <Input label={t('newHabit')} placeholder="e.g. Morning run" error={errors.name?.message} {...register('name')}/>
      <Textarea label={t('description')} rows={2} placeholder={t('optional')} {...register('description')}/>
      <div className="grid grid-cols-2 gap-3">
        <Select label={t('frequency')} options={[{value:'DAILY',label:t('daily')},{value:'WEEKLY',label:t('weekly')},{value:'CUSTOM',label:'Custom'}]} {...register('frequency')}/>
        <Input label={t('targetPerWeek')} type="number" min={1} max={7} {...register('targetPerWeek')}/>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">{t('color')}</label>
        <div className="flex gap-2">{COLORS.map(c=>(
          <button key={c} type="button" onClick={()=>setColor(c)}
            className={cn('w-7 h-7 rounded-full border-2 transition-all',color===c?'border-txt-primary scale-110':'border-transparent')}
            style={{background:c}}/>
        ))}</div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="vivid" loading={loading} className="flex-1">{dv?.name?t('updateHabit'):t('createHabit')}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}

function HabitHeatmap({dates}:{dates:string[]}) {
  const [tip, setTip] = useState<{x:number;y:number;label:string}|null>(null)
  const end = new Date(), start = startOfYear(end)
  const days = eachDayOfInterval({start,end})
  const done = new Set(dates.map(d=>d.slice(0,10)))
  const weeks: Date[][] = []; let wk: Date[] = []
  days.forEach((d,i)=>{ wk.push(d); if(d.getDay()===6||i===days.length-1){weeks.push(wk);wk=[]} })
  return (
    <div className="relative overflow-x-auto">
      {tip&&<div className="fixed z-50 px-2 py-1 bg-[var(--bg-overlay)] border border-[var(--border-accent)] rounded-lg text-xs text-txt-primary font-mono pointer-events-none" style={{left:tip.x,top:tip.y-36}}>{tip.label}</div>}
      <div className="flex gap-0.5">
        {weeks.map((wk,wi)=>(
          <div key={wi} className="flex flex-col gap-0.5">
            {wk.map(day=>{
              const k=format(day,'yyyy-MM-dd'), d=done.has(k)
              return (
                <motion.div key={k} whileHover={{scale:1.3}}
                  className="w-3 h-3 rounded-[2px] cursor-default"
                  style={{background:d?'var(--accent)':'var(--bg-elevated)'}}
                  onMouseEnter={e=>{const r=(e.target as HTMLElement).getBoundingClientRect();setTip({x:r.left,y:r.top,label:format(day,'MMM d')+(d?' ✓':'')})}}
                  onMouseLeave={()=>setTip(null)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function HabitCard({habit,onEdit,onArchive,onDelete}:{habit:HabitResponse;onEdit:(h:HabitResponse)=>void;onArchive:(id:number)=>void;onDelete:(id:number)=>void}) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const today = isoDateInTimezone(user?.timezone)
  const {data:stats} = useQuery({queryKey:['habits',habit.id,'stats'],queryFn:()=>habitsApi.stats(habit.id)})
  const accent = habit.color ?? 'var(--accent)'

  const checkMut = useMutation({
    mutationFn:()=>habitsApi.checkIn(habit.id,today),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:['habits']})
      qc.invalidateQueries({queryKey:['habits',habit.id,'stats']})
      confetti({particleCount:70,spread:60,origin:{y:0.7},colors:[accent,'#43E97B','#FFD166']})
      toast.success(`${habit.name} — ${t('checkIn')}! 🔥`)
    },
    onError:(e:unknown)=>{
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        qc.invalidateQueries({queryKey:['habits']})
        qc.invalidateQueries({queryKey:['habits',habit.id,'stats']})
        return
      }
      toast.error(e instanceof Error ? e.message : 'Request failed')
    },
  })
  const uncheckMut = useMutation({
    mutationFn:()=>habitsApi.uncheck(habit.id,today),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:['habits']})
      qc.invalidateQueries({queryKey:['habits',habit.id,'stats']})
    },
    onError:(e:Error)=>toast.error(e.message),
  })

  const weekDays = Array.from({length:7},(_,i)=>{const d=subDays(new Date(),6-i);return{label:format(d,'EEE')[0],date:format(d,'yyyy-MM-dd')}})
  const doneSet = new Set(stats?.completedDatesThisMonth??[])
  const isCheckedToday = stats?.checkedToday ?? doneSet.has(today)
  const progress = stats?Math.min(stats.completionRateThisWeek,100):0

  return (
    <motion.div layout whileHover={{y:-2}} transition={{duration:0.2}}
      className="card p-5 group"
      style={{borderColor:isCheckedToday?`${accent}40`:undefined}}
    >
      {}
      <div className="h-0.5 w-full rounded-t-xl mb-4 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{background:`linear-gradient(90deg, ${accent}, transparent)`}}/>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${accent}18`,border:`1px solid ${accent}30`}}>
            <Target size={18} style={{color:accent}}/>
          </div>
          <div>
            <p className="font-display font-bold text-sm text-txt-primary">{habit.name}</p>
            <p className="text-[11px] text-txt-muted">{habit.frequency.toLowerCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{background:`${accent}15`}}>
          <Flame size={13} style={{color:accent}}/>
          <span className="font-display font-bold text-sm" style={{color:accent}}>{habit.currentStreak}</span>
        </div>
      </div>

      {}
      <div className="flex items-center gap-2 mb-4">
        {weekDays.map(({label,date})=>{
          const d=doneSet.has(date)
          return (
            <motion.div key={date} whileHover={{scale:1.15}}
              className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all',
                d?'text-white shadow-glow':date===today?'border-2 text-txt-secondary':'bg-[var(--bg-elevated)] text-txt-muted'
              )}
              style={d?{background:accent}:date===today?{borderColor:accent,color:accent}:{}}>
              {d?'✓':label}
            </motion.div>
          )
        })}
      </div>

      {}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-txt-muted">{t('thisWeek')}</span>
          <span className="text-xs font-mono font-bold" style={{color:accent}}>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{background:`linear-gradient(90deg,${accent},${accent}aa)`}}
            initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:1,ease:[0.16,1,0.3,1]}}/>
        </div>
      </div>

      <div className="flex gap-2">
        {isCheckedToday ? (
          <Button size="sm" variant="ghost" className="flex-1 border" style={{color:'var(--success)',borderColor:'rgba(67,233,123,0.3)'}}
            onClick={()=>uncheckMut.mutate()} loading={uncheckMut.isPending}>{t('doneToday')}</Button>
        ) : (
          <Button size="sm" className="flex-1 text-white shadow-glow" style={{background:accent}}
            onClick={()=>checkMut.mutate()} loading={checkMut.isPending}>{t('checkIn')}</Button>
        )}
        <Button size="sm" variant="secondary" className="px-2.5" onClick={()=>onEdit(habit)}><BarChart2 size={13}/></Button>
        <Button size="sm" variant="secondary" className="px-2.5" onClick={()=>onArchive(habit.id)}><Archive size={13}/></Button>
        <Button size="sm" variant="ghost" className="px-2.5 hover:text-danger" onClick={()=>onDelete(habit.id)}><Trash2 size={13}/></Button>
      </div>
    </motion.div>
  )
}

export function HabitsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<HabitResponse|null>(null)
  const [statsHabit, setStatsHabit] = useState<HabitResponse|null>(null)

  const {data:habits,isLoading} = useQuery({queryKey:['habits',{activeOnly:true}],queryFn:()=>habitsApi.list(true)})
  const {data:statsData} = useQuery({
    queryKey:['habits',statsHabit?.id,'stats'],
    queryFn:()=>habitsApi.stats(statsHabit!.id),
    enabled:!!statsHabit,
  })

  const today = isoDateInTimezone(user?.timezone)
  const createMut = useMutation({mutationFn:habitsApi.create,onSuccess:()=>{qc.invalidateQueries({queryKey:['habits']});toast.success(t('taskCreated'));setCreateOpen(false)},onError:(e:Error)=>toast.error(e.message)})
  const updateMut = useMutation({mutationFn:(d:{id:number;data:HabitRequest})=>habitsApi.update(d.id,d.data),onSuccess:()=>{qc.invalidateQueries({queryKey:['habits']});toast.success(t('updated'));setEditHabit(null)},onError:(e:Error)=>toast.error(e.message)})
  const archiveMut = useMutation({mutationFn:habitsApi.archive,onSuccess:()=>{qc.invalidateQueries({queryKey:['habits']});toast.success(t('archive'))},onError:(e:Error)=>toast.error(e.message)})
  const deleteMut  = useMutation({mutationFn:habitsApi.delete,onSuccess:()=>{qc.invalidateQueries({queryKey:['habits']});toast.success(t('delete'))},onError:(e:Error)=>toast.error(e.message)})

  
  const quickCheckMut = useMutation({
    mutationFn:(id:number)=>habitsApi.checkIn(id,today),
    onSuccess:(_,id)=>{
      qc.invalidateQueries({queryKey:['habits']})
      confetti({particleCount:50,spread:50,origin:{y:0.7}})
      toast.success(`${habits?.find(h=>h.id===id)?.name} — ${t('checkIn')}! 🔥`)
    },
    onError:(e:unknown)=>{
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        qc.invalidateQueries({queryKey:['habits']})
        return
      }
      toast.error(e instanceof Error ? e.message : 'Request failed')
    },
  })

  
  const topStreak = habits?.reduce((best,h) => h.currentStreak > (best?.currentStreak??0) ? h : best, habits[0])
  const totalActive = habits?.length ?? 0

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
      <PageHeader title={t('habits')} gradient
        subtitle={`${totalActive} ${t('activeHabits')}`}
        actions={<Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={15}/>{t('newHabit')}</Button>}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full"/>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({length:3},(_,i)=><Skeleton key={i} className="h-56"/>)}
          </div>
        </div>
      ) : !habits||habits.length===0 ? (
        <EmptyState icon={<Target size={28}/>} title={t('noHabits')} description={t('noHabitsDesc')}
          action={<Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={14}/>{t('createHabit')}</Button>}/>
      ) : (
        <>
          {}
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
            className="card p-5 mb-6 relative overflow-hidden">
            {}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-muted)] via-transparent to-transparent opacity-50 pointer-events-none"/>

            <div className="relative flex items-center gap-6 flex-wrap">
              {}
              {topStreak && topStreak.currentStreak > 0 && (
                <div className="flex items-center gap-3 pr-6 border-r border-[var(--border)]">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{background:`${topStreak.color??'var(--accent)'}20`}}>
                    <Trophy size={22} style={{color:topStreak.color??'var(--accent)'}}/>
                  </div>
                  <div>
                    <p className="text-xs text-txt-muted">{t('currentStreak')}</p>
                    <p className="font-display font-extrabold text-xl" style={{color:topStreak.color??'var(--accent)'}}>
                      {topStreak.currentStreak} 🔥
                    </p>
                    <p className="text-[11px] text-txt-secondary truncate max-w-[120px]">{topStreak.name}</p>
                  </div>
                </div>
              )}

              {}
              <div className="flex gap-4 flex-1 flex-wrap">
                <div>
                  <p className="text-xs text-txt-muted">{t('activeHabits')}</p>
                  <p className="font-display font-bold text-2xl text-txt-primary">{totalActive}</p>
                </div>
              </div>

              {}
              <div className="w-full mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider mb-2">{t('checkIn')} today</p>
                <div className="flex flex-wrap gap-2">
                  {habits.map(h => (
                    <motion.button key={h.id} whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                      onClick={()=>quickCheckMut.mutate(h.id)}
                      disabled={quickCheckMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                      style={{
                        borderColor:`${h.color??'var(--accent)'}40`,
                        background:`${h.color??'var(--accent)'}0D`,
                        color:h.color??'var(--accent)',
                      }}>
                      <Zap size={11}/> {h.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {}
          <motion.div initial="hidden" animate="show"
            variants={{hidden:{},show:{transition:{staggerChildren:0.07}}}}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {habits.map(h=>(
              <motion.div key={h.id} variants={{hidden:{opacity:0,y:12},show:{opacity:1,y:0}}}>
                <HabitCard habit={h} onEdit={h=>setStatsHabit(h)} onArchive={id=>archiveMut.mutate(id)} onDelete={id=>deleteMut.mutate(id)}/>
              </motion.div>
            ))}
          </motion.div>

          {}
          <div className="card p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm text-txt-primary flex items-center gap-2">
                <Flame size={15} className="text-warning"/> {t('currentStreak')} Overview
              </h2>
              <p className="text-xs text-txt-muted">Click to view heatmap</p>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-3 min-w-max">
              {habits.map(h=>(
                <button key={h.id} onClick={()=>setStatsHabit(statsHabit?.id===h.id?null:h)}
                  className={cn('w-[220px] shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                    statsHabit?.id===h.id
                      ? 'border-[var(--border-accent)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border)] hover:border-[var(--border-accent)] bg-[var(--bg-elevated)]'
                  )}>
                  <ProgressRing
                    progress={Math.min((h.currentStreak/Math.max(h.longestStreak,1))*100,100)}
                    size={56} stroke={4} color={h.color??'var(--accent)'}
                  >
                    <div className="text-center">
                      <span className="font-mono font-bold text-sm" style={{color:h.color??'var(--accent)'}}>{h.currentStreak}</span>
                    </div>
                  </ProgressRing>
                  <p className="text-[11px] text-txt-secondary text-center truncate w-full">{h.name}</p>
                  <div className="flex items-center gap-1">
                    <Flame size={10} className="text-warning opacity-60"/>
                    <span className="text-[10px] text-txt-muted">{h.longestStreak} best</span>
                  </div>
                </button>
              ))}
              </div>
            </div>
          </div>

          {}
          <AnimatePresence>
            {statsHabit&&statsData&&(
              <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="card p-5">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div>
                    <h2 className="font-display font-bold text-base text-txt-primary">{statsHabit.name}</h2>
                    <p className="text-xs text-txt-muted">{t('yearHeatmap')}</p>
                  </div>
                  <div className="flex items-center gap-5 text-xs text-txt-muted font-mono">
                    <div className="text-center">
                      <p className="font-bold text-accent text-base">{statsData.currentStreak}</p>
                      <p>{t('currentStreak')}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-txt-primary text-base">{statsData.longestStreak}</p>
                      <p>{t('longestStreak')}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-txt-primary text-base">{statsData.totalCompletions}</p>
                      <p>{t('totalCompletions')}</p>
                    </div>
                  </div>
                </div>

                <HabitHeatmap dates={statsData.completedDatesThisMonth}/>

                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
                    <p className="text-xs text-txt-muted mb-1">{t('thisWeek')}</p>
                    <p className="font-display font-extrabold text-2xl gradient-text">{Math.round(statsData.completionRateThisWeek)}%</p>
                  </div>
                  <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
                    <p className="text-xs text-txt-muted mb-1">{t('thisMonth')}</p>
                    <p className="font-display font-extrabold text-2xl text-txt-primary">{Math.round(statsData.completionRateThisMonth)}%</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title={t('newHabit')} accent>
        <HabitForm onSubmit={d=>createMut.mutate(d)} onCancel={()=>setCreateOpen(false)} loading={createMut.isPending}/>
      </Modal>
      <Modal open={!!editHabit} onClose={()=>setEditHabit(null)} title={t('newHabit')}>
        {editHabit&&<HabitForm
          dv={{name:editHabit.name,description:editHabit.description??'',frequency:editHabit.frequency,targetPerWeek:editHabit.targetPerWeek,color:editHabit.color??undefined}}
          onSubmit={d=>updateMut.mutate({id:editHabit.id,data:d})} onCancel={()=>setEditHabit(null)} loading={updateMut.isPending}
        />}
      </Modal>
    </div>
  )
}




const noteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  tagsInput: z.string().optional(),
})
type NF = z.infer<typeof noteSchema>

function NoteForm({dv,cats,onSubmit,onCancel,loading}:{dv?:Partial<NF>;cats:NoteCategoryResponse[];onSubmit:(d:NoteRequest)=>void;onCancel:()=>void;loading:boolean}) {
  const { t } = useTranslation()
  const {register,handleSubmit,formState:{errors}} = useForm<NF>({resolver:zodResolver(noteSchema),defaultValues:dv})
  const submit = (d:NF) => {
    const tags = d.tagsInput?d.tagsInput.split(',').map(x=>x.trim()).filter(Boolean):[]
    onSubmit({title:d.title,content:d.content,categoryId:d.categoryId||undefined,tags})
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label={t('title')} placeholder="Note title" error={errors.title?.message} {...register('title')}/>
      <Textarea label={t('description')} rows={5} placeholder="Write your thoughts..." {...register('content')}/>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">{t('category')}</label>
          <select className="h-10 px-3 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-txt-primary" {...register('categoryId')}>
            <option value="">{t('noCategory')}</option>
            {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label={t('tags')} placeholder="tag1, tag2" icon={<FileText size={13}/>} {...register('tagsInput')}/>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="vivid" loading={loading} className="flex-1">{dv?.title?t('save'):t('createNote')}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}

function NoteCard({
  note,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onPin,
}:{
  note:NoteResponse
  selected:boolean
  onSelect:(n:NoteResponse)=>void
  onEdit:(n:NoteResponse)=>void
  onDelete:(id:number)=>void
  onPin:(id:number)=>void
}) {
  const catColor = note.category?.color??'var(--accent)'
  return (
    <motion.div layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
      className={cn(
        'group card overflow-hidden cursor-pointer transition-all',
        note.pinned&&'border-[var(--border-accent)]',
        selected && 'ring-2 ring-[var(--accent-glow)] border-[var(--border-accent)]'
      )}
      onClick={()=>onSelect(note)}>
      <div className="h-1 w-full" style={{background:catColor}}/>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-bold text-sm text-txt-primary line-clamp-2 flex-1">{note.title}</h3>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={e=>{e.stopPropagation();onEdit(note)}} className="p-1 rounded-lg text-txt-muted hover:text-txt-primary transition-colors">
              <Pencil size={12}/>
            </button>
            <button onClick={e=>{e.stopPropagation();onPin(note.id)}} className="p-1 rounded-lg text-txt-muted hover:text-accent transition-colors">
              {note.pinned ? <PinOff size={12}/> : <Pin size={12}/>}
            </button>
            <button onClick={e=>{e.stopPropagation();onDelete(note.id)}} className="p-1 rounded-lg text-txt-muted hover:text-danger transition-colors"><Trash2 size={12}/></button>
          </div>
        </div>
        {note.content&&<p className="text-xs text-txt-secondary leading-relaxed line-clamp-3 mb-3">{note.content}</p>}
        {note.tags.length>0&&(
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.slice(0,3).map(tg=>(
              <span key={tg} className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded-full text-[10px] text-txt-muted border border-[var(--border)]">#{tg}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          {note.category&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${catColor}18`,color:catColor}}>{note.category.name}</span>}
          <span className="text-[10px] text-txt-muted font-mono ml-auto">{formatTimeAgo(note.updatedAt)}</span>
        </div>
      </div>
    </motion.div>
  )
}

export function NotesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search,setSearch] = useState(''); const [dSearch,setDSearch] = useState('')
  const [selCat,setSelCat] = useState<number|null>(null); const [pinned,setPinned] = useState(false); const [uncategorizedOnly,setUncategorizedOnly] = useState(false)
  const [createOpen,setCreateOpen] = useState(false); const [editNote,setEditNote] = useState<NoteResponse|null>(null)
  const [selectedId,setSelectedId] = useState<number|null>(null)
  const [catOpen,setCatOpen] = useState(false); const [newCatName,setNewCatName] = useState(''); const [newCatColor,setNewCatColor] = useState('#6C63FF')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = (v:string) => {
    setSearch(v)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(()=>setDSearch(v),250)
  }
  const noteParams = {categoryId:selCat??undefined,pinned:pinned||undefined,size:60}

  const {data:notes,isLoading} = useQuery({queryKey:['notes',noteParams],queryFn:()=>notesApi.list(noteParams),enabled:!dSearch})
  const {data:searchRes,isLoading:sLoad} = useQuery({queryKey:['notes','search',dSearch],queryFn:()=>notesApi.search(dSearch),enabled:!!dSearch})
  const {data:cats} = useQuery({queryKey:['notes','categories'],queryFn:notesApi.categories.list})

  const display = useMemo(() => {
    const base = dSearch?(searchRes?.content??[]):(notes?.content??[])
    const filtered = uncategorizedOnly ? base.filter(n => !n.category) : base
    return [...filtered].sort((a,b)=> {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [dSearch, notes, searchRes, uncategorizedOnly])

  const selected = useMemo(
    () => display.find(n => n.id === selectedId) ?? null,
    [display, selectedId]
  )

  const createMut = useMutation({mutationFn:notesApi.create,onSuccess:()=>{qc.invalidateQueries({queryKey:['notes']});toast.success('Created');setCreateOpen(false)},onError:(e:Error)=>toast.error(e.message)})
  const updateMut = useMutation({mutationFn:(d:{id:number;data:NoteRequest})=>notesApi.update(d.id,d.data),onSuccess:()=>{qc.invalidateQueries({queryKey:['notes']});toast.success('Updated');setEditNote(null)},onError:(e:Error)=>toast.error(e.message)})
  const deleteMut = useMutation({mutationFn:notesApi.delete,onSuccess:()=>qc.invalidateQueries({queryKey:['notes']}),onError:(e:Error)=>toast.error(e.message)})
  const pinMut   = useMutation({mutationFn:notesApi.togglePin,onSuccess:()=>qc.invalidateQueries({queryKey:['notes']}),onError:(e:Error)=>toast.error(e.message)})
  const catMut   = useMutation({mutationFn:()=>notesApi.categories.create({name:newCatName,color:newCatColor}),onSuccess:()=>{qc.invalidateQueries({queryKey:['notes','categories']});toast.success('Category created');setCatOpen(false);setNewCatName('')},onError:(e:Error)=>toast.error(e.message)})

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (display.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!display.some(n => n.id === selectedId)) {
      setSelectedId(null)
    }
  }, [display, selectedId])

  const duplicateNote = (note: NoteResponse) => {
    createMut.mutate({
      title: `${note.title} (copy)`,
      content: note.content ?? '',
      categoryId: note.category?.id,
      tags: note.tags,
    })
  }

  const copyNote = async (note: NoteResponse) => {
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content ?? ''}`.trim())
      toast.success(t('save'))
    } catch {
      toast.error('Copy failed')
    }
  }

  const pinnedNotes = display.filter(n => n.pinned)
  const regularNotes = display.filter(n => !n.pinned)
  const uncategorizedCount = display.filter(n => !n.category).length
  const topTags = useMemo(() => {
    const map = new Map<string, number>()
    for (const note of display) {
      for (const tag of note.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1)
      }
    }
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8)
  }, [display])

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
      <PageHeader title={t('notes')} gradient subtitle={`${display.length}`}
        actions={<div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setCatOpen(true)}><FolderPlus size={14}/>{t('newCategory')}</Button>
          <Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={15}/>{t('newNote')}</Button>
        </div>}/>
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted"/>
        <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder={t('searchNotes')}
          className="w-full h-11 pl-10 pr-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-sm text-txt-primary placeholder:text-txt-muted focus:border-[var(--border-accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] transition-all"/>
        {search&&<button onClick={()=>{setSearch('');setDSearch('')}} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary"><X size={14}/></button>}
      </div>

      {(isLoading||sLoad) ? (
        <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-5">
          <Skeleton className="h-[560px]"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({length:6},(_,i)=><Skeleton key={i} className={cn('w-full',i%3===0?'h-48':i%3===1?'h-32':'h-56')}/>)}
          </div>
        </div>
      ) : display.length===0 ? (
        <EmptyState icon={<FileText size={28}/>} title={t('noNotes')} description={t('noNotesDesc')} action={!dSearch?<Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={14}/>{t('createNote')}</Button>:undefined}/>
      ) : (
        <div className={cn('grid gap-5 items-start', selected ? 'grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_360px]' : 'grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]')}>
          <aside className="card p-4 xl:sticky xl:top-24 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-[11px] text-txt-muted">{t('notes')}</p>
                <p className="font-display font-black text-xl text-txt-primary">{display.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-[11px] text-txt-muted">{t('pinned')}</p>
                <p className="font-display font-black text-xl text-txt-primary">{pinnedNotes.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={()=>{setSelCat(null);setPinned(false);setUncategorizedOnly(false)}} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all',!selCat&&!pinned&&!uncategorizedOnly?'bg-accent text-white border-transparent':'bg-[var(--bg-elevated)] text-txt-secondary border-[var(--border)]')}>
                <span>{t('allTasks')}</span><span>{display.length}</span>
              </button>
              <button onClick={()=>{setPinned(true);setSelCat(null);setUncategorizedOnly(false)}} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all',pinned?'bg-accent text-white border-transparent':'bg-[var(--bg-elevated)] text-txt-secondary border-[var(--border)]')}>
                <span className="flex items-center gap-1.5"><Pin size={11}/>{t('pinned')}</span><span>{pinnedNotes.length}</span>
              </button>
              <button onClick={()=>{setUncategorizedOnly(true);setSelCat(null);setPinned(false)}} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all',uncategorizedOnly?'bg-accent text-white border-transparent':'bg-[var(--bg-elevated)] text-txt-secondary border-[var(--border)]')}>
                <span>{t('noCategory')}</span><span>{uncategorizedCount}</span>
              </button>
              {(cats??[]).map(c=>(
                <button key={c.id} onClick={()=>{setSelCat(c.id);setPinned(false);setUncategorizedOnly(false)}}
                  className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all',selCat===c.id?'text-white border-transparent':'bg-[var(--bg-elevated)] text-txt-secondary border-[var(--border)]')}
                  style={selCat===c.id?{background:c.color??'var(--accent)'}:{}}>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>

            {topTags.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-txt-muted mb-2">{t('tags')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {topTags.map(([tag,count]) => (
                    <button key={tag} onClick={()=>{setSearch(tag);setDSearch(tag)}} className="px-2 py-1 rounded-lg border border-[var(--border)] text-[11px] text-txt-secondary bg-[var(--bg-elevated)]">

                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="space-y-5">
            {pinnedNotes.length > 0 && !pinned && !dSearch && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-txt-primary flex items-center gap-2"><Pin size={13}/>{t('pinned')}</h3>
                  <span className="text-xs text-txt-muted">{pinnedNotes.length}</span>
                </div>
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {pinnedNotes.map(n=>(
                      <NoteCard key={n.id} note={n} selected={selectedId===n.id} onSelect={n=>setSelectedId(prev => prev===n.id ? null : n.id)} onEdit={setEditNote} onDelete={id=>deleteMut.mutate(id)} onPin={id=>pinMut.mutate(id)} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-txt-primary">{pinned || dSearch || uncategorizedOnly ? t('notes') : t('updated')}</h3>
                <span className="text-xs text-txt-muted">{(pinned || dSearch || uncategorizedOnly) ? display.length : regularNotes.length}</span>
              </div>
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {(pinned || dSearch || uncategorizedOnly ? display : regularNotes).map(n=>(
                    <NoteCard
                      key={n.id}
                      note={n}
                      selected={selectedId === n.id}
                      onSelect={n=>setSelectedId(prev => prev === n.id ? null : n.id)}
                      onEdit={setEditNote}
                      onDelete={id=>deleteMut.mutate(id)}
                      onPin={id=>pinMut.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          </section>

          {selected && (
            <div className="card p-5 xl:sticky xl:top-24">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-black text-xl text-txt-primary leading-tight">{selected.title}</h3>
                  <button
                    onClick={()=>pinMut.mutate(selected.id)}
                    className="p-2 rounded-lg border border-[var(--border)] text-txt-muted hover:text-accent hover:border-[var(--border-accent)] transition-colors"
                  >
                    {selected.pinned ? <PinOff size={14}/> : <Pin size={14}/>}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] text-txt-secondary">
                    {selected.category?.name ?? t('noCategory')}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] text-txt-muted">{formatTimeAgo(selected.updatedAt)}</span>
                  {selected.pinned && <span className="text-xs px-2.5 py-1 rounded-full text-white bg-accent">{t('pinned')}</span>}
                </div>

                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => { setSearch(tag); setDSearch(tag) }}
                        className="px-2 py-1 rounded-full text-[11px] border border-[var(--border)] bg-[var(--bg-elevated)] text-txt-secondary hover:border-[var(--border-accent)]"
                      >

                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                  <p className="text-sm text-txt-primary whitespace-pre-wrap leading-relaxed min-h-[180px]">
                    {selected.content?.trim() || '—'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={()=>setEditNote(selected)}><Pencil size={13}/>{t('edit')}</Button>
                  <Button variant="secondary" onClick={()=>copyNote(selected)}><Copy size={13}/>{t('save')}</Button>
                  <Button variant="secondary" onClick={()=>duplicateNote(selected)}><Plus size={13}/>{t('newNote')}</Button>
                  <Button variant="ghost" className="hover:text-danger" onClick={()=>deleteMut.mutate(selected.id)}><Trash2 size={13}/>{t('delete')}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title={t('newNote')} width="max-w-xl" accent>
        <NoteForm cats={cats??[]} onSubmit={d=>createMut.mutate(d)} onCancel={()=>setCreateOpen(false)} loading={createMut.isPending}/>
      </Modal>
      <Modal open={!!editNote} onClose={()=>setEditNote(null)} title={t('edit')} width="max-w-xl">
        {editNote&&<NoteForm dv={{title:editNote.title,content:editNote.content??'',categoryId:editNote.category?.id,tagsInput:editNote.tags.join(', ')}} cats={cats??[]}
          onSubmit={d=>updateMut.mutate({id:editNote.id,data:d})} onCancel={()=>setEditNote(null)} loading={updateMut.isPending}/>}
      </Modal>
      <Modal open={catOpen} onClose={()=>setCatOpen(false)} title={t('newCategory')}>
        <div className="space-y-4">
          <Input label={t('categoryName')} placeholder="Work, Personal..." value={newCatName} onChange={e=>setNewCatName(e.target.value)}/>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">{t('color')}</label>
            <div className="flex gap-2">{COLORS.map(c=><button key={c} type="button" onClick={()=>setNewCatColor(c)} className={cn('w-7 h-7 rounded-full border-2 transition-all',newCatColor===c?'border-txt-primary scale-110':'border-transparent')} style={{background:c}}/>)}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="vivid" loading={catMut.isPending} onClick={()=>catMut.mutate()} disabled={!newCatName.trim()} className="flex-1">{t('createNote')}</Button>
            <Button variant="secondary" onClick={()=>setCatOpen(false)}>{t('cancel')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}




const evSchema = z.object({
  title:z.string().min(1),description:z.string().optional(),location:z.string().optional(),
  startTime:z.string().min(1),endTime:z.string().optional(),color:z.string().optional(),recurrence:z.string().optional(),
})
type EF = z.infer<typeof evSchema>
const RECUR = [{value:'',label:'No recurrence'},{value:'FREQ=DAILY',label:'Daily'},{value:'FREQ=WEEKLY',label:'Weekly'},{value:'FREQ=MONTHLY',label:'Monthly'}]

function EventForm({dv,onSubmit,onDelete,onCancel,loading}:{dv?:Partial<EF>;onSubmit:(d:EventRequest)=>void;onDelete?:()=>void;onCancel:()=>void;loading:boolean}) {
  const { t } = useTranslation()
  const [color,setColor] = useState(dv?.color??'#6C63FF')
  const {register,handleSubmit,formState:{errors}} = useForm<EF>({resolver:zodResolver(evSchema),defaultValues:dv})
  const submit = (d:EF) => onSubmit({...d,color,startTime:new Date(d.startTime).toISOString(),endTime:d.endTime?new Date(d.endTime).toISOString():undefined})
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label={t('title')} placeholder="Event title" error={errors.title?.message} {...register('title')}/>
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('startTime')} type="datetime-local" error={errors.startTime?.message} {...register('startTime')}/>
        <Input label={t('endTime')} type="datetime-local" {...register('endTime')}/>
      </div>
      <Input label={t('location')} placeholder="Where?" {...register('location')}/>
      <div className="grid grid-cols-2 gap-3">
        <Select label={t('recurrence')} options={RECUR} {...register('recurrence')}/>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">{t('color')}</label>
          <div className="flex gap-1.5 pt-1">{COLORS.map(c=><button key={c} type="button" onClick={()=>setColor(c)} className={cn('w-6 h-6 rounded-full border-2 transition-all',color===c?'border-txt-primary scale-110':'border-transparent')} style={{background:c}}/>)}</div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="vivid" loading={loading} className="flex-1">{dv?.title?t('updateEvent'):t('createEvent')}</Button>
        {onDelete&&<Button type="button" variant="danger" onClick={onDelete}><Trash2 size={14}/></Button>}
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}

export function CalendarPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [createOpen,setCreateOpen] = useState(false); const [editEv,setEditEv] = useState<EventResponse|null>(null)
  const [defStart,setDefStart] = useState('')
  const [range,setRange] = useState({from:new Date().toISOString(),to:addDays(new Date(),30).toISOString()})
  const {data:events} = useQuery({queryKey:['events','calendar',range],queryFn:()=>eventsApi.calendar(range.from,range.to)})
  const createMut = useMutation({mutationFn:eventsApi.create,onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});toast.success('Created');setCreateOpen(false)},onError:(e:Error)=>toast.error(e.message)})
  const updateMut = useMutation({mutationFn:(d:{id:number;data:EventRequest})=>eventsApi.update(d.id,d.data),onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});toast.success('Updated');setEditEv(null)},onError:(e:Error)=>toast.error(e.message)})
  const deleteMut = useMutation({mutationFn:(id:number)=>eventsApi.delete(id),onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});toast.success('Deleted');setEditEv(null)},onError:(e:Error)=>toast.error(e.message)})

  const calEvents: EventInput[] = (events??[]).map(e=>({id:String(e.id),title:e.title,start:e.startTime,end:e.endTime??undefined,allDay:e.allDay,backgroundColor:e.color??'var(--accent)',borderColor:'transparent',extendedProps:{data:e}}))
  const upcoming = [...(events ?? [])]
    .filter(e => new Date(e.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const todayCount = (events ?? []).filter(e => format(parseISO(e.startTime), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length
  const weekCount = (events ?? []).filter(e => {
    const d = parseISO(e.startTime)
    return d >= new Date() && d <= addDays(new Date(), 7)
  }).length

  const handleExport = async () => {
    try { const blob = await eventsApi.exportIcal(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='aero.ics';a.click();URL.revokeObjectURL(url);toast.success('Exported') }
    catch(e:unknown){toast.error(e instanceof Error?e.message:'Failed')}
  }

  return (
    <div className="p-5 lg:p-7 max-w-[1520px] mx-auto">
      <PageHeader
        title={t('calendar')}
        gradient
        subtitle={`${events?.length ?? 0} ${t('events')}`}
        actions={<div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}><Download size={14}/>{t('exportIcs')}</Button>
          <Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={15}/>{t('newEvent')}</Button>
        </div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--bg-card),var(--bg-elevated))] px-4 py-3">
          <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('events')}</p>
          <p className="text-2xl font-black font-display text-txt-primary">{events?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[rgba(245,158,11,0.28)] bg-[linear-gradient(145deg,rgba(245,158,11,0.12),var(--bg-card))] px-4 py-3">
          <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('today')}</p>
          <p className="text-2xl font-black font-display text-accent">{todayCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--bg-card),var(--bg-elevated))] px-4 py-3">
          <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('thisWeekGroup')}</p>
          <p className="text-2xl font-black font-display text-txt-primary">{weekCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--bg-card),var(--bg-elevated))] px-4 py-3">
          <p className="text-[11px] text-txt-muted uppercase tracking-wider">{t('upcomingEvents')}</p>
          <p className="text-2xl font-black font-display text-txt-primary">{upcoming.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="rounded-2xl border border-[rgba(245,158,11,0.2)] bg-[linear-gradient(160deg,var(--bg-surface),rgba(245,158,11,0.04),var(--bg-elevated))] p-4 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
          <FullCalendar plugins={[dayGridPlugin,timeGridPlugin,interactionPlugin]} initialView="dayGridMonth"
            events={calEvents}
            dateClick={(a:DateClickArg)=>{setDefStart(a.dateStr+'T09:00');setCreateOpen(true)}}
            eventClick={(a:EventClickArg)=>setEditEv(a.event.extendedProps.data as EventResponse)}
            headerToolbar={{left:'prev,next today',center:'title',right:'dayGridMonth,timeGridWeek,timeGridDay'}}
            height="auto" datesSet={i=>setRange({from:i.startStr,to:i.endStr})}/>
        </div>

        <aside className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--bg-surface),var(--bg-elevated))] p-4 shadow-[0_16px_34px_-26px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-txt-primary">{t('upcomingEventsTitle')}</h3>
            <span className="text-xs text-txt-muted">{upcoming.length}</span>
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-sm text-txt-muted">
                {t('noEvents', 'No events')}
              </div>
            ) : upcoming.slice(0, 16).map(ev => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setEditEv(ev)}
                className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 hover:border-[var(--border-accent)] hover:bg-[var(--bg-overlay)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.color ?? 'var(--accent)' }} />
                  <span className="text-[11px] font-mono text-accent">{format(parseISO(ev.startTime), 'dd MMM, HH:mm')}</span>
                </div>
                <p className="text-sm font-semibold text-txt-primary leading-tight line-clamp-2">{ev.title}</p>
                {ev.location && <p className="text-xs text-txt-muted mt-1 truncate">{ev.location}</p>}
              </button>
            ))}
          </div>
        </aside>
      </div>
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title={t('newEvent')} width="max-w-xl" accent>
        <EventForm dv={{startTime:defStart}} onSubmit={d=>createMut.mutate(d)} onCancel={()=>setCreateOpen(false)} loading={createMut.isPending}/>
      </Modal>
      <Modal open={!!editEv} onClose={()=>setEditEv(null)} title={t('edit')} width="max-w-xl">
        {editEv&&<EventForm dv={{title:editEv.title,description:editEv.description??'',location:editEv.location??'',startTime:editEv.startTime.slice(0,16),endTime:editEv.endTime?.slice(0,16),color:editEv.color??'',recurrence:editEv.recurrence??''}}
          onSubmit={d=>updateMut.mutate({id:editEv.id,data:d})} onDelete={()=>deleteMut.mutate(editEv.id)} onCancel={()=>setEditEv(null)} loading={updateMut.isPending}/>}
      </Modal>
    </div>
  )
}




const rmSchema = z.object({title:z.string().min(1),message:z.string().optional(),refType:z.enum(['TASK','EVENT','HABIT','CUSTOM']),remindAt:z.string().min(1)})
type RF = z.infer<typeof rmSchema>
const STATUS_MAP: Record<ReminderStatus,'default'|'warning'|'success'|'danger'> = {PENDING:'warning',SENT:'success',FAILED:'danger',CANCELLED:'default'}
const REFTYPE_OPTS: {value:ReminderRefType;label:string}[] = [{value:'CUSTOM',label:'Custom'},{value:'TASK',label:'Task'},{value:'EVENT',label:'Event'},{value:'HABIT',label:'Habit'}]

function ReminderForm({dv,onSubmit,onCancel,loading}:{dv?:Partial<RF>;onSubmit:(d:ReminderRequest)=>void;onCancel:()=>void;loading:boolean}) {
  const { t } = useTranslation()
  const {register,handleSubmit,formState:{errors}} = useForm<RF>({resolver:zodResolver(rmSchema),defaultValues:{refType:'CUSTOM',...dv}})
  return (
    <form onSubmit={handleSubmit(d=>onSubmit({...d,remindAt:new Date(d.remindAt).toISOString()}))} className="space-y-4">
      <Input label={t('title')} placeholder="Reminder title" error={errors.title?.message} {...register('title')}/>
      <Textarea label={t('message')} rows={2} placeholder={t('optional')} {...register('message')}/>
      <div className="grid grid-cols-2 gap-3">
        <Select label={t('type')} options={REFTYPE_OPTS} {...register('refType')}/>
        <Input label={t('remindAt')} type="datetime-local" error={errors.remindAt?.message} {...register('remindAt')}/>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="vivid" loading={loading} className="flex-1">{dv?.title?t('updateReminder'):t('createReminder')}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}

export function RemindersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [createOpen,setCreateOpen] = useState(false); const [editRm,setEditRm] = useState<ReminderResponse|null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL'|ReminderStatus>('ALL')
  const {data,isLoading} = useQuery({queryKey:['reminders',{}],queryFn:()=>remindersApi.list({size:100})})
  const reminders = data?.content??[]
  const visible = statusFilter === 'ALL' ? reminders : reminders.filter(r => r.status === statusFilter)

  const groups:{key:string;label:string;items:ReminderResponse[]}[] = [
    {key:'past',    label:t('historyTab'),      items:visible.filter(r=>parseISO(r.remindAt)<new Date())},
    {key:'today',   label:t('todayGroup'),    items:visible.filter(r=>format(parseISO(r.remindAt),'yyyy-MM-dd')===format(new Date(),'yyyy-MM-dd'))},
    {key:'tomorrow',label:t('tomorrowGroup'), items:visible.filter(r=>format(parseISO(r.remindAt),'yyyy-MM-dd')===format(addDays(new Date(),1),'yyyy-MM-dd'))},
    {key:'week',    label:t('thisWeekGroup'), items:visible.filter(r=>{const d=parseISO(r.remindAt);return d>addDays(new Date(),1)&&d<=addDays(new Date(),7)})},
    {key:'later',   label:t('laterGroup'),    items:visible.filter(r=>parseISO(r.remindAt)>addDays(new Date(),7))},
  ]

  const createMut = useMutation({mutationFn:remindersApi.create,onSuccess:()=>{qc.invalidateQueries({queryKey:['reminders']});toast.success('Set');setCreateOpen(false)},onError:(e:Error)=>toast.error(e.message)})
  const updateMut = useMutation({mutationFn:(d:{id:number;data:ReminderRequest})=>remindersApi.update(d.id,d.data),onSuccess:()=>{qc.invalidateQueries({queryKey:['reminders']});toast.success('Updated');setEditRm(null)},onError:(e:Error)=>toast.error(e.message)})
  const cancelMut = useMutation({mutationFn:remindersApi.cancel,onSuccess:()=>qc.invalidateQueries({queryKey:['reminders']}),onError:(e:Error)=>toast.error(e.message)})
  const deleteMut = useMutation({mutationFn:remindersApi.delete,onSuccess:()=>qc.invalidateQueries({queryKey:['reminders']}),onError:(e:Error)=>toast.error(e.message)})

  const statusLabel: Record<ReminderStatus, string> = {
    PENDING: t('pending'),
    SENT: t('sent'),
    FAILED: t('failed'),
    CANCELLED: t('cancelled'),
  }
  const pendingCount = reminders.filter(r => r.status === 'PENDING').length
  const sentCount = reminders.filter(r => r.status === 'SENT').length
  const failedCount = reminders.filter(r => r.status === 'FAILED').length

  return (
    <div className="p-6 lg:p-8 max-w-[1080px] mx-auto">
      <PageHeader title={t('reminders')} gradient subtitle={`${reminders.filter(r=>r.status==='PENDING').length} ${t('pending')}`}
        actions={<Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={15}/>{t('newReminder')}</Button>}/>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label={t('pending')} value={pendingCount} icon={<Bell size={14} />} />
        <StatCard label={t('sent')} value={sentCount} icon={<CheckCircle2 size={14} />} />
        <StatCard label={t('failed')} value={failedCount} icon={<X size={14} />} />
        <StatCard label={t('reminders')} value={reminders.length} icon={<Clock size={14} />} />
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
              'h-8 px-3 rounded-full text-xs font-semibold border transition-colors',
              statusFilter === opt.key
                ? 'bg-[var(--accent-muted)] border-[var(--border-accent)] text-accent'
                : 'bg-[var(--bg-surface)] border-[var(--border)] text-txt-secondary hover:text-txt-primary hover:border-[var(--border-strong)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="space-y-3">{Array.from({length:4},(_,i)=><Skeleton key={i} className="h-16"/>)}</div>
      : visible.length===0 ? <EmptyState icon={<Bell size={28}/>} title={t('noReminders')} description={t('noRemindersDesc')} action={<Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={14}/>{t('newReminder')}</Button>}/>
      : (
        <div className="space-y-8">
          {groups.map(g=>g.items.length===0?null:(
            <div key={g.key}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-bold text-txt-muted uppercase tracking-widest">{g.label}</p>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent"/>
              </div>
              <div className="space-y-2">
                {g.items.map(r=>(
                  <motion.div key={r.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                    className="group flex items-start gap-4 p-4 card hover:shadow-glow transition-all border border-[var(--border)] hover:border-[var(--border-strong)]">
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
                      r.status==='PENDING'?'bg-warning':r.status==='SENT'?'bg-success':r.status==='FAILED'?'bg-danger':'bg-txt-muted')}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-txt-primary">{r.title}</p>
                        <Badge label={statusLabel[r.status]} variant={STATUS_MAP[r.status]}/>
                      </div>
                      {r.message&&<p className="text-xs text-txt-secondary mt-0.5">{r.message}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="font-mono text-xs text-accent">{formatMonoDate(r.remindAt)}</span>
                        <span className="text-[10px] text-txt-muted bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full border border-[var(--border)]">{r.refType}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="xs" variant="secondary" onClick={()=>setEditRm(r)}>{t('edit')}</Button>
                      {r.status==='PENDING'&&<Button size="xs" variant="ghost" onClick={()=>cancelMut.mutate(r.id)} loading={cancelMut.isPending}>{t('cancel')}</Button>}
                      <Button size="xs" variant="ghost" className="hover:text-danger" onClick={()=>deleteMut.mutate(r.id)} loading={deleteMut.isPending}><Trash2 size={12}/></Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title={t('newReminder')} accent>
        <ReminderForm onSubmit={d=>createMut.mutate(d)} onCancel={()=>setCreateOpen(false)} loading={createMut.isPending}/>
      </Modal>
      <Modal open={!!editRm} onClose={()=>setEditRm(null)} title={t('edit')}>
        {editRm&&<ReminderForm dv={{title:editRm.title,message:editRm.message??'',refType:editRm.refType,remindAt:editRm.remindAt.slice(0,16)}}
          onSubmit={d=>updateMut.mutate({id:editRm.id,data:d})} onCancel={()=>setEditRm(null)} loading={updateMut.isPending}/>}
      </Modal>
    </div>
  )
}




export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const {data:profile,isLoading} = useQuery({queryKey:['profile'],queryFn:profileApi.get})
  const {data:history} = useQuery({queryKey:['profile','history'],queryFn:profileApi.history})
  const {data:habits} = useQuery({queryKey:['habits',{activeOnly:true}],queryFn:()=>habitsApi.list(true)})

  const [tab, setTab] = useState<'account'|'history'>('account')
  
  const [avatarPreview, setAvatarPreview] = useState<string|null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<File|null>(null)
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(0)
  const [resolvedAvatarSrc, setResolvedAvatarSrc] = useState<string|null>(null)


  const {register,handleSubmit,formState:{isSubmitting}} = useForm<UpdateProfileRequest>({
    values: profile?{fullName:profile.fullName,bio:profile.bio??'',timezone:profile.timezone,locale:profile.locale}:undefined,
  })

  const updateMut = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (u) => {
      qc.setQueryData(['profile'],u)
      
      if (u.locale && u.locale !== i18n.language) {
        i18n.changeLanguage(u.locale)
        localStorage.setItem('aero_lang', u.locale)
      }
      toast.success(t('saveChanges'))
    },
    onError:(e:Error)=>toast.error(e.message),
  })

  const avatarMut = useMutation({
    mutationFn: profileApi.uploadAvatar,
    onSuccess: (u) => {
      qc.setQueryData(['profile'],u)
      setPendingAvatar(null)
      setAvatarPreview(null)
      setAvatarCacheBuster(Date.now())
      toast.success(t('imageUploaded'))
    },
    onError:(e:Error)=>toast.error(e.message),
  })

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
    setPendingAvatar(f)
  }

  const TZS = ['UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Almaty','Asia/Tashkent','Asia/Tokyo']
  const normalizeUploadPath = (rawUrl: string) => {
    let path = rawUrl
    try {
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        const u = new URL(rawUrl)
        path = `${u.pathname}${u.search}`
      }
    } catch {
      path = rawUrl
    }
    if (path.startsWith('/api/')) path = path.slice(4)
    return path.startsWith('/') ? path : `/${path}`
  }
  const avatarPath = profile?.avatarUrl ? normalizeUploadPath(profile.avatarUrl) : null
  const persistedAvatar = avatarPath
    ? `${avatarPath}${avatarPath.includes('?') ? '&' : '?'}v=${avatarCacheBuster}`
    : null
  const displayAvatar = avatarPreview ?? resolvedAvatarSrc
  const initials = profile?.fullName?.[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    let disposed = false
    let objectUrl: string | null = null

    if (avatarPreview) {
      setResolvedAvatarSrc(null)
      return
    }
    if (!persistedAvatar) {
      setResolvedAvatarSrc(null)
      return
    }

    ;(async () => {
      try {
        const res = await apiClient.get<Blob>(persistedAvatar, { responseType: 'blob' })
        if (disposed) return
        objectUrl = URL.createObjectURL(res.data)
        setResolvedAvatarSrc(objectUrl)
      } catch {
        if (!disposed) setResolvedAvatarSrc(null)
      }
    })()

    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [avatarPreview, persistedAvatar])

  const tabs = [
    { key: 'account' as const,       label: t('accountTab') },
    { key: 'history' as const,       label: t('historyTab') },
  ]

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-56 rounded-3xl"/>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl"/><Skeleton className="h-28 rounded-2xl"/><Skeleton className="h-28 rounded-2xl"/>
        </div>
        <Skeleton className="h-12 rounded-2xl"/>
        <Skeleton className="h-64 rounded-2xl"/>
      </div>
    )
  }

  return (
    <div className="min-h-full">

      {}
      <div className="px-8 pt-6">
        <div className="card p-5 flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-end gap-4">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)]">
                {displayAvatar
                  ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" loading="lazy"/>
                  : <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl text-txt-primary">{initials}</div>
                }
              </div>
              <label className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={18} className="text-white"/>
                <span className="text-white text-[10px] font-semibold">Change</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect}/>
              </label>
              {pendingAvatar && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[9px] text-white font-black shadow-lg">!</span>
              )}
            </div>

            <div>
              <h1 className="font-display font-black text-2xl text-txt-primary leading-tight">{profile?.fullName}</h1>
              <p className="text-sm text-txt-secondary mt-0.5">{profile?.email}</p>
              <p className="text-xs text-txt-muted mt-0.5 font-mono capitalize opacity-60">via {profile?.provider}</p>
            </div>
          </div>

          {pendingAvatar && (
            <Button variant="vivid" size="sm" loading={avatarMut.isPending} onClick={()=>avatarMut.mutate(pendingAvatar)}>
              <Upload size={13}/> {t('editPhoto')}
            </Button>
          )}
        </div>
      </div>

      {}
      <div className="px-8 py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">

        {}
        <div className="xl:col-span-2 space-y-5">

          {}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('habits'),  value: habits?.length ?? 0,                    accent: true  },
              { label: t('language'),value: (profile?.locale ?? 'en').toUpperCase(), accent: false },
              { label: t('timezone'),value: profile?.timezone?.split('/').pop()?.replace(/_/g,' ') ?? 'UTC', accent: false },
              { label: 'History',    value: history?.length ?? 0,                   accent: false },
            ].map(s => (
              <div key={s.label} className={cn(
                'rounded-2xl p-4 border text-center',
                s.accent
                  ? 'border-[var(--border-accent)] bg-[var(--accent-subtle)]'
                  : 'card'
              )}>
                <p className={cn('font-display font-black text-2xl leading-none', s.accent ? 'text-accent' : 'text-txt-primary')}>{s.value}</p>
                <p className="text-[10px] text-txt-muted uppercase tracking-wider mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>

          {}
          <div className="flex gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-1">
            {tabs.map(tb => (
              <button key={tb.key} onClick={()=>setTab(tb.key)}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-xs font-bold transition-all',
                  tab === tb.key
                    ? 'bg-accent text-white shadow-glow'
                    : 'text-txt-muted hover:text-txt-primary'
                )}>
                {tb.label}
              </button>
            ))}
          </div>

          {}
          <AnimatePresence mode="wait">
            {tab === 'account' && (
              <motion.form key="account"
                initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                transition={{duration:0.2}}
                onSubmit={handleSubmit(d=>updateMut.mutate(d))}
                className="card p-6 space-y-4">
                <h3 className="font-display font-bold text-base text-txt-primary">{t('personalInfo')}</h3>
                <Input label={t('fullName')} {...register('fullName')}/>
                <Textarea label={t('bio')} rows={3} placeholder={t('optional')} {...register('bio')}/>
                <div className="grid grid-cols-2 gap-3">
                  <Select label={t('timezone')} options={TZS.map(tz=>({value:tz,label:tz}))} {...register('timezone')}/>
                  <Select label={t('language')}
                    options={[{value:'en',label:'English'},{value:'ru',label:'Русский'},{value:'kk',label:'Қазақша'}]}
                    {...register('locale')}/>
                </div>
                <Button type="submit" variant="vivid" loading={isSubmitting||updateMut.isPending} className="w-full h-10">
                  <Save size={15}/>{t('saveChanges')}
                </Button>
              </motion.form>
            )}

            {tab === 'history' && (
              <motion.div key="history"
                initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                transition={{duration:0.2}}
                className="card p-6">
                <h3 className="font-display font-bold text-base text-txt-primary mb-4">{t('changeHistory')}</h3>
                {!history||history.length===0 ? (
                  <div className="text-center py-12">
                    <Sparkles size={32} className="mx-auto mb-3 text-txt-muted opacity-40"/>
                    <p className="text-sm text-txt-muted">{t('noChanges')}</p>
                  </div>
                ) : (
                  <div className="space-y-0 divide-y divide-[var(--border)]">
                    {history.slice(0,20).map(h=>(
                      <div key={h.id} className="flex items-start justify-between gap-4 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-txt-primary capitalize">{h.fieldName}</p>
                          <p className="text-xs text-txt-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="line-through opacity-60 truncate max-w-[120px]">{h.oldValue||'—'}</span>
                            <span className="text-success shrink-0">→</span>
                            <span className="truncate max-w-[120px]">{h.newValue||'—'}</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-txt-muted font-mono shrink-0 mt-0.5">{formatTimeAgo(h.changedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {}
        <div className="space-y-4">
          {}
          <div className="card p-5">
            <h3 className="font-display font-bold text-sm text-txt-primary mb-4 flex items-center gap-2">
              <Flame size={16} className="text-warning"/> {t('habits')}
            </h3>
            {!habits||habits.length===0 ? (
              <p className="text-xs text-txt-muted text-center py-4">{t('noHabits')}</p>
            ) : (
              <div className="space-y-3">
                {habits.slice(0,5).map(h=>(
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:h.color??'var(--accent)'}}/>
                    <span className="text-xs font-medium text-txt-primary flex-1 truncate">{h.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame size={11} className="text-warning"/>
                      <span className="text-xs font-bold text-txt-secondary">{h.currentStreak}</span>
                    </div>
                  </div>
                ))}
                {habits.length > 5 && (
                  <p className="text-[11px] text-txt-muted text-center pt-1">+{habits.length-5} {t('more')}</p>
                )}
              </div>
            )}
          </div>

          {}
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-txt-primary">{t('accountTab')}</h3>
            {[
              { label: 'Email',     value: profile?.email },
              { label: t('language'), value: profile?.locale?.toUpperCase() },
              { label: t('timezone'), value: profile?.timezone },
              { label: t('joinedOn'), value: profile?.createdAt ? format(parseISO(profile.createdAt),'d MMM yyyy') : '—' },
            ].map(row=>(
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="text-xs text-txt-muted shrink-0">{row.label}</span>
                <span className="text-xs font-semibold text-txt-primary text-right truncate max-w-[160px]">{row.value??'—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
