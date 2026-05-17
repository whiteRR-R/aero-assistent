import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, X, Tag, Clock, Trash2, Image as Img,
  Kanban, List, CheckSquare, GripVertical,
  Pencil, CalendarDays, Upload, ChevronDown,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { tasksApi } from '@/api/tasks.api'
import { apiClient } from '@/api/client'
import {
  Button, Badge, Input, Textarea, Select, CustomSelect,
  Skeleton, EmptyState, StatCard, Modal, PageHeader,
} from '@/components/ui'
import { formatDeadline, weekdayInitial } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { TaskResponse, TaskStatus, TaskPriority, TaskRequest } from '@/types'


const taskSchema = z.object({
  title:       z.string().min(1).max(500),
  description: z.string().optional(),
  status:      z.enum(['TODO','IN_PROGRESS','DONE','CANCELLED']).optional(),
  priority:    z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  deadline:    z.string().optional(),
  tagsInput:   z.string().optional(),
})
type TF = z.infer<typeof taskSchema>


const STATUS_BADGE: Record<TaskStatus,'default'|'accent'|'success'|'danger'> = {
  TODO:'default', IN_PROGRESS:'accent', DONE:'success', CANCELLED:'danger'
}
const PRING: Record<TaskPriority,string> = {
  LOW:'bg-txt-muted', MEDIUM:'bg-warning', HIGH:'bg-orange-400', URGENT:'bg-danger'
}
const PTEXT: Record<TaskPriority,string> = {
  LOW:'text-txt-muted', MEDIUM:'text-warning', HIGH:'text-orange-400', URGENT:'text-danger'
}
const COLUMN_CONFIG: { status: TaskStatus; colorClass: string; bgClass: string }[] = [
  { status: 'TODO',        colorClass: 'bg-txt-muted',  bgClass: 'border-txt-muted/20' },
  { status: 'IN_PROGRESS', colorClass: 'bg-accent',     bgClass: 'border-accent/20' },
  { status: 'DONE',        colorClass: 'bg-success',    bgClass: 'border-success/20' },
  { status: 'CANCELLED',   colorClass: 'bg-danger',     bgClass: 'border-danger/20' },
]


function TaskForm({ defaultValues, onSubmit, onCancel, loading }: {
  defaultValues?: Partial<TF>; onSubmit:(d:TaskRequest)=>void; onCancel:()=>void; loading:boolean
}) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState:{errors} } = useForm<TF>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status:'TODO', priority:'MEDIUM', ...defaultValues },
  })
  const submit = (d:TF) => {
    const { tagsInput, ...rest } = d
    const tags = tagsInput ? tagsInput.split(',').map(x=>x.trim()).filter(Boolean) : []
    const deadline = rest.deadline ? new Date(rest.deadline).toISOString() : undefined
    onSubmit({ ...rest, tags, deadline })
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label={t('title')} placeholder="What needs to be done?" error={errors.title?.message} {...register('title')}/>
      <Textarea label={t('description')} rows={3} placeholder={t('optional')} {...register('description')}/>
      <div className="grid grid-cols-2 gap-3">
        <Select label={t('status')} options={[
          {value:'TODO',label:t('todo')},{value:'IN_PROGRESS',label:t('inProgress')},
          {value:'DONE',label:t('done')},{value:'CANCELLED',label:t('cancelled')}
        ]} {...register('status')}/>
        <Select label={t('priority')} options={[
          {value:'LOW',label:t('low')},{value:'MEDIUM',label:t('medium')},
          {value:'HIGH',label:t('high')},{value:'URGENT',label:t('urgent')}
        ]} {...register('priority')}/>
      </div>
      <Input label={t('deadline')} type="datetime-local" {...register('deadline')}/>
      <Input label={t('tags')} placeholder={t('tagsPlaceholder')} icon={<Tag size={13}/>} {...register('tagsInput')}/>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="vivid" loading={loading} className="flex-1">
          {defaultValues?.title ? t('updateTask') : t('createTask')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}


function TaskDetailPanel({ task, onClose, onDeleted }:{
  task:TaskResponse; onClose:()=>void; onDeleted:()=>void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  
  const [imgPreview, setImgPreview] = useState<string|null>(null)
  const [pendingFile, setPendingFile] = useState<File|null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageCacheBuster, setImageCacheBuster] = useState(0)
  const [resolvedTaskImgSrc, setResolvedTaskImgSrc] = useState<string|null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateMut = useMutation({
    mutationFn:(d:TaskRequest)=>tasksApi.update(task.id,d),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['tasks']});toast.success(t('updated'));setEditOpen(false)},
    onError:(e:Error)=>toast.error(e.message),
  })
  const deleteMut = useMutation({
    mutationFn:()=>tasksApi.delete(task.id),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['tasks']});onDeleted()},
    onError:(e:Error)=>toast.error(e.message),
  })
  const imgMut = useMutation({
    mutationFn:(f:File)=>tasksApi.uploadImage(task.id,f),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:['tasks']})
      setPendingFile(null)
      setImageCacheBuster(Date.now())
      toast.success(t('imageUploaded'))
    },
    onError:(e:Error)=>toast.error(e.message),
  })

  const deadline = task.deadline ? formatDeadline(task.deadline) : null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setImgPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
    setPendingFile(f)
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    setUploading(true)
    try { await imgMut.mutateAsync(pendingFile) }
    finally { setUploading(false) }
  }

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
  const taskImgPath = task.imageUrl ? normalizeUploadPath(task.imageUrl) : null
  const persistedTaskImg = taskImgPath
    ? `${taskImgPath}${taskImgPath.includes('?') ? '&' : '?'}v=${imageCacheBuster}`
    : null
  const currentImg = imgPreview ?? resolvedTaskImgSrc

  useEffect(() => {
    let disposed = false
    let objectUrl: string | null = null

    if (imgPreview) {
      setResolvedTaskImgSrc(null)
      return
    }
    if (!persistedTaskImg) {
      setResolvedTaskImgSrc(null)
      return
    }

    ;(async () => {
      try {
        const res = await apiClient.get<Blob>(persistedTaskImg, { responseType: 'blob' })
        if (disposed) return
        objectUrl = URL.createObjectURL(res.data)
        setResolvedTaskImgSrc(objectUrl)
      } catch {
        if (!disposed) setResolvedTaskImgSrc(null)
      }
    })()

    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imgPreview, persistedTaskImg])

  return (
    <motion.div
      initial={{x:'100%',opacity:0}} animate={{x:0,opacity:1}} exit={{x:'100%',opacity:0}}
      transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
      className="fixed right-0 top-0 h-full w-[420px] bg-[var(--bg-surface)] border-l border-[var(--border)] z-40 flex flex-col shadow-2xl"
    >
      <div className="h-0.5 bg-gradient-vivid"/>

      {}
      <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',PRING[task.priority])}/>
            <Badge label={task.status.replace('_',' ')} variant={STATUS_BADGE[task.status]}/>
          </div>
          <h2 className="font-display font-bold text-base text-txt-primary leading-snug">{task.title}</h2>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors">
          <X size={15}/>
        </button>
      </div>

      {}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3">
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">{t('priority')}</p>
            <p className={cn('text-sm font-semibold',PTEXT[task.priority])}>{task.priority}</p>
          </div>
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3">
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">{t('deadline')}</p>
            {deadline
              ? <p className={cn('text-sm font-semibold',deadline.urgent?'text-danger':'text-txt-primary')}>{deadline.label}</p>
              : <p className="text-sm text-txt-muted">—</p>}
          </div>
        </div>

        {}
        {task.deadline && (
          <div className="flex items-center gap-2 text-xs text-txt-muted">
            <CalendarDays size={13}/>
            {format(parseISO(task.deadline),'d MMM yyyy · HH:mm')}
          </div>
        )}

        {}
        {task.description && (
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">{t('description')}</p>
            <p className="text-sm text-txt-secondary leading-relaxed">{task.description}</p>
          </div>
        )}

        {}
        {task.tags.length > 0 && (
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">{t('tags')}</p>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tg=>(
                <span key={tg} className="px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full text-[11px] text-txt-secondary">#{tg}</span>
              ))}
            </div>
          </div>
        )}

        {}
        <div>
          <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Image</p>
          {currentImg ? (
            <div className="relative rounded-xl overflow-hidden border border-[var(--border)] group">
              <img src={currentImg} alt="task" className="w-full max-h-48 object-cover"/>
              {pendingFile && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-2">
                  <span className="text-white text-xs font-medium flex-1">Unsaved preview</span>
                  <Button size="xs" variant="vivid" loading={uploading} onClick={confirmUpload}>
                    <Upload size={11}/> Save
                  </Button>
                  <Button size="xs" variant="ghost" className="text-white/70 hover:text-white"
                    onClick={()=>{setImgPreview(null);setPendingFile(null)}}>
                    <X size={11}/>
                  </Button>
                </div>
              )}
              {!pendingFile && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs gap-1.5">
                  <Img size={16}/> Change
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect}/>
                </label>
              )}
            </div>
          ) : (
            <label
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-[var(--border)] text-txt-muted hover:border-[var(--border-accent)] hover:text-accent transition-all cursor-pointer"
            >
              <Img size={18}/>
              <span className="text-xs">Click to select image</span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect}/>
            </label>
          )}
        </div>

        <p className="text-[11px] text-txt-muted font-mono">{format(parseISO(task.createdAt),'d MMM yyyy · HH:mm')}</p>
      </div>

      {}
      <div className="p-5 border-t border-[var(--border)] space-y-2">
        <Button variant="outline" className="w-full" onClick={()=>setEditOpen(true)}>
          <Pencil size={14}/> {t('editTask')}
        </Button>
        <Button variant="danger" className="w-full" onClick={()=>deleteMut.mutate()} loading={deleteMut.isPending}>
          <Trash2 size={14}/> {t('deleteTask')}
        </Button>
      </div>

      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title={t('editTask')}>
        <TaskForm
          defaultValues={{title:task.title,description:task.description??'',status:task.status,priority:task.priority,deadline:task.deadline?.slice(0,16),tagsInput:task.tags.join(', ')}}
          onSubmit={d=>updateMut.mutate(d)} onCancel={()=>setEditOpen(false)} loading={updateMut.isPending}
        />
      </Modal>
    </motion.div>
  )
}


function KanbanCard({ task, onClick }: { task:TaskResponse; onClick:()=>void }) {
  const deadline = task.deadline ? formatDeadline(task.deadline) : null
  const done = task.status === 'DONE'
  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('taskId', String(task.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onClick}
      className={cn(
        'group rounded-2xl p-4 border backdrop-blur-sm',
        'bg-[linear-gradient(160deg,var(--bg-card),var(--bg-elevated))] border-[var(--border)]',
        'cursor-grab active:cursor-grabbing hover:border-[var(--border-accent)] hover:shadow-[0_8px_28px_-14px_var(--accent-glow)]',
        'transition-all duration-150 select-none',
        done && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={cn('w-2 h-2 rounded-full mt-1 shrink-0', PRING[task.priority])}/>
        <p className={cn(
          'text-sm font-semibold text-txt-primary leading-snug line-clamp-2 flex-1',
          done && 'line-through text-txt-muted'
        )}>
          {task.title}
        </p>
        <GripVertical size={12} className="text-txt-muted shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 transition-opacity"/>
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {task.tags.slice(0,3).map(tg => (
            <span key={tg} className="px-2 py-0.5 bg-[var(--bg-overlay)] rounded-full text-[10px] text-txt-muted border border-[var(--border)]">#{tg}</span>
          ))}
        </div>
      )}

      {deadline && (
        <div className={cn('flex items-center gap-1 text-[11px] font-mono', deadline.urgent ? 'text-danger' : 'text-txt-muted')}>
          <Clock size={10}/>{deadline.label}
        </div>
      )}
    </div>
  )
}


function KanbanColumn({ status, label, colorClass, bgClass, tasks, onTaskClick, onDrop }: {
  status: TaskStatus; label: string; colorClass: string; bgClass: string
  tasks: TaskResponse[]; onTaskClick:(t:TaskResponse)=>void; onDrop:(taskId:number)=>void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div className="flex flex-col min-w-[290px] max-w-[340px] flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      {}
      <div className="flex items-center gap-2 mb-3 px-1.5">
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 shadow-sm', colorClass)}/>
        <span className="text-xs font-bold text-txt-secondary uppercase tracking-widest">{label}</span>
        <span className="ml-auto text-[10px] font-mono bg-[var(--bg-overlay)] text-txt-muted px-2 py-0.5 rounded-full border border-[var(--border)]">
          {tasks.length}
        </span>
      </div>

      {}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={e => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node))
            setIsDragOver(false)
        }}
        onDrop={e => {
          e.preventDefault()
          const id = parseInt(e.dataTransfer.getData('taskId'))
          if (!isNaN(id)) onDrop(id)
          setIsDragOver(false)
        }}
        className={cn(
          'flex-1 min-h-[140px] space-y-2.5 p-2.5 rounded-xl border-2 border-dashed transition-all duration-150',
          isDragOver
            ? `border-opacity-60 bg-opacity-5 ${bgClass} border-current`
            : 'border-[var(--border)]/40',
        )}
      >
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <KanbanCard task={task} onClick={() => onTaskClick(task)} />
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className={cn(
            'h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-txt-muted',
            isDragOver ? bgClass : 'border-[var(--border)]'
          )}>
            {isDragOver ? '↓ Drop here' : 'Empty'}
          </div>
        )}
      </div>
    </div>
  )
}


function TaskRow({ task, onClick }: { task:TaskResponse; onClick:()=>void }) {
  const deadline = task.deadline ? formatDeadline(task.deadline) : null
  const done = task.status === 'DONE'
  return (
    <motion.button onClick={onClick} whileHover={{x:2}} transition={{duration:0.15}}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left group',
        'bg-[linear-gradient(160deg,var(--bg-card),var(--bg-elevated))] border-[var(--border)] hover:border-[var(--border-accent)]',
        'hover:shadow-[0_8px_24px_-16px_var(--accent-glow)]',
        done && 'opacity-50'
      )}>
      <div className={cn('w-2 h-2 rounded-full shrink-0', PRING[task.priority])}/>
      <span className={cn('flex-1 text-sm font-semibold truncate', done?'line-through text-txt-muted':'text-txt-primary')}>
        {task.title}
      </span>
      {task.tags.slice(0,2).map(tg=>(
        <span key={tg} className="hidden sm:inline-flex px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full text-[10px] text-txt-muted">#{tg}</span>
      ))}
      {deadline && (
        <span className={cn('hidden sm:flex items-center gap-1 text-xs font-mono shrink-0',deadline.urgent?'text-danger':'text-txt-muted')}>
          <Clock size={11}/>{deadline.label}
        </span>
      )}
      <Badge label={task.status.replace('_',' ')} variant={STATUS_BADGE[task.status]}/>
    </motion.button>
  )
}


export function TasksPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [view, setView] = useState<'kanban'|'list'>('kanban')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<TaskResponse|null>(null)
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [hideClosed, setHideClosed] = useState(true)
  const [page, setPage] = useState(0)
  const [, setDeadlineTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setDeadlineTick(v => v + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  
  const kanbanParams = { priority: filterPriority || undefined, page: 0, size: 200 }
  const listParams   = { priority: filterPriority || undefined, page, size: 20 }

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ['tasks', 'kanban', kanbanParams],
    queryFn: () => tasksApi.list(kanbanParams),
    enabled: view === 'kanban',
  })
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['tasks', 'list', listParams],
    queryFn: () => tasksApi.list(listParams),
    enabled: view === 'list',
  })
  const { data: stats } = useQuery({ queryKey:['tasks','stats'], queryFn:tasksApi.stats })

  const createMut = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({queryKey:['tasks']})
      toast.success(t('taskCreated'))
      setCreateOpen(false)
    },
    onError: (e:Error) => toast.error(e.message),
  })

  
  const moveMut = useMutation({
    mutationFn: ({ task, newStatus }: { task:TaskResponse; newStatus:TaskStatus }) =>
      tasksApi.update(task.id, {
        title:    task.title,
        description: task.description ?? undefined,
        status:   newStatus,
        priority: task.priority,
        deadline: task.deadline ?? undefined,
        tags:     task.tags,
      }),
    onMutate: async ({ task, newStatus }) => {
      await qc.cancelQueries({ queryKey: ['tasks', 'kanban'] })
      const prev = qc.getQueryData(['tasks', 'kanban', kanbanParams])
      qc.setQueryData(['tasks', 'kanban', kanbanParams], (old: any) => {
        if (!old) return old
        return {
          ...old,
          content: old.content.map((t: TaskResponse) =>
            t.id === task.id ? { ...t, status: newStatus } : t
          )
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['tasks', 'kanban', kanbanParams], ctx?.prev)
      toast.error('Failed to move task')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleDrop = (taskId: number, newStatus: TaskStatus) => {
    const allTasks = kanbanData?.content ?? []
    const task = allTasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    moveMut.mutate({ task, newStatus })
  }

  const priorityOptions = [
    { value: '', label: t('allPriorities') },
    { value: 'LOW', label: t('low') },
    { value: 'MEDIUM', label: t('medium') },
    { value: 'HIGH', label: t('high') },
    { value: 'URGENT', label: t('urgent') },
  ]

  const kanbanTasks = kanbanData?.content ?? []
  const listTasks   = listData?.content ?? []

  const visibleKanbanTasks = hideClosed
    ? kanbanTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
    : kanbanTasks
  const visibleListTasks = hideClosed
    ? listTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
    : listTasks

  const hiddenCount = (kanbanTasks.length - visibleKanbanTasks.length)

  return (
    <div className="p-6 lg:p-8 max-w-[1680px] mx-auto">
      <PageHeader
        title={t('tasks')}
        gradient
        subtitle={stats ? `${stats.total} total · ${stats.inProgress} ${t('inProgress')}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            {}
            <div className="flex items-center gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setView('kanban')}
                className={cn(
                  'h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all',
                  view === 'kanban' ? 'bg-[var(--bg-surface)] text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-primary'
                )}>
                <Kanban size={13}/> {t('kanban')}
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all',
                  view === 'list' ? 'bg-[var(--bg-surface)] text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-primary'
                )}>
                <List size={13}/> {t('listView')}
              </button>
            </div>
            <Button variant="vivid" onClick={() => setCreateOpen(true)}>
              <Plus size={15}/>{t('newTask')}
            </Button>
          </div>
        }
      />

      {}
      {stats && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 mb-6">
          <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_15%_0%,var(--accent-glow),transparent_45%)]" />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={t('todo')}       value={stats.todo}/>
            <StatCard label={t('inProgress')} value={stats.inProgress} gradient/>
            <StatCard label={t('done')}       value={stats.done}/>
            <StatCard label={t('overdue')}    value={stats.overdue} trend={stats.overdue>0?'down':null}/>
          </div>
        </div>
      )}

      {}
      <div className="flex flex-wrap items-center gap-3 mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3.5">
        <CustomSelect
          options={priorityOptions}
          value={filterPriority}
          onChange={v => setFilterPriority(v)}
          size="sm"
          className="w-40"
        />
        <button
          onClick={() => setHideClosed(v => !v)}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-semibold border transition-colors',
            hideClosed
              ? 'bg-[var(--accent-muted)] text-accent border-[var(--border-accent)]'
              : 'bg-[var(--bg-elevated)] text-txt-secondary border-[var(--border)]'
          )}
        >
          {hideClosed ? 'Скрыты выполненные/отменённые' : 'Показаны все задачи'}
        </button>
        {hideClosed && hiddenCount > 0 && (
          <span className="text-xs text-txt-muted">Скрыто: {hiddenCount}</span>
        )}
        {filterPriority && (
          <button onClick={() => setFilterPriority('')}
            className="text-xs text-txt-muted hover:text-txt-primary flex items-center gap-1 transition-colors">
            <X size={11}/> {t('clearFilter')}
          </button>
        )}
      </div>

      {}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          {kanbanLoading ? (
            <div className="flex gap-4">
              {Array.from({length:4},(_,i)=>(
                <div key={i} className="min-w-[270px] space-y-2">
                  <Skeleton className="h-5 w-32"/>
                  {Array.from({length:3},(_,j)=><Skeleton key={j} className="h-20"/>)}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 min-w-max">
              {COLUMN_CONFIG.map(({ status, colorClass, bgClass }) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={t(status === 'IN_PROGRESS' ? 'inProgress' : status.toLowerCase())}
                  colorClass={colorClass}
                  bgClass={bgClass}
                  tasks={visibleKanbanTasks.filter(t => t.status === status)}
                  onTaskClick={setSelected}
                  onDrop={taskId => handleDrop(taskId, status)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {}
      {view === 'list' && (
        <>
          {listLoading ? (
            <div className="space-y-2">{Array.from({length:6},(_,i)=><Skeleton key={i} className="h-14"/>)}</div>
          ) : visibleListTasks.length === 0 ? (
            <EmptyState icon={<CheckSquare size={28}/>} title={t('noTasks')} description={t('noTasksDesc')}
              action={<Button variant="vivid" onClick={()=>setCreateOpen(true)}><Plus size={14}/>{t('newTask')}</Button>}/>
          ) : (
            <motion.div initial="hidden" animate="show"
              variants={{hidden:{},show:{transition:{staggerChildren:0.04}}}} className="space-y-2">
              {visibleListTasks.map(task=>(
                <motion.div key={task.id} variants={{hidden:{opacity:0,y:8},show:{opacity:1,y:0,transition:{duration:0.25}}}}>
                  <TaskRow task={task} onClick={()=>setSelected(task)}/>
                </motion.div>
              ))}
            </motion.div>
          )}

          {listData && listData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button size="sm" variant="secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}>{t('previous')}</Button>
              <span className="text-xs text-txt-muted font-mono">{page+1}/{listData.totalPages}</span>
              <Button size="sm" variant="secondary" disabled={listData.last} onClick={()=>setPage(p=>p+1)}>{t('next')}</Button>
            </div>
          )}
        </>
      )}

      {}
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title={t('newTask')} accent>
        <TaskForm onSubmit={d=>createMut.mutate(d)} onCancel={()=>setCreateOpen(false)} loading={createMut.isPending}/>
      </Modal>

      {}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setSelected(null)}/>
            <TaskDetailPanel task={selected} onClose={()=>setSelected(null)} onDeleted={()=>setSelected(null)}/>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
