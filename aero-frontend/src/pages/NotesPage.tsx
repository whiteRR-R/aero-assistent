import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Pin, PinOff, Plus, X, FileText, Tag, Trash2, FolderPlus } from 'lucide-react'
import { formatTimeAgo } from '@/utils/formatters'
import { notesApi } from '@/api/notes.api'
import { Button, Input, Modal, EmptyState, Skeleton } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { NoteResponse, NoteRequest, NoteCategoryResponse } from '@/types'


const noteSchema = z.object({
  title: z.string().min(1, 'Title required').max(500),
  content: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  tagsInput: z.string().optional(),
  pinned: z.boolean().optional(),
})
type NoteFormData = z.infer<typeof noteSchema>

function NoteForm({
  defaultValues,
  categories,
  onSubmit,
  onCancel,
  loading,
}: {
  defaultValues?: Partial<NoteFormData>
  categories: NoteCategoryResponse[]
  onSubmit: (d: NoteRequest) => void
  onCancel: () => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues,
  })
  const submit = (data: NoteFormData) => {
    const tags = data.tagsInput ? data.tagsInput.split(',').map(t => t.trim()).filter(Boolean) : []
    onSubmit({ title: data.title, content: data.content, categoryId: data.categoryId || undefined, tags, pinned: data.pinned })
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label="Title" placeholder="Note title" error={errors.title?.message} {...register('title')} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Content</label>
        <textarea rows={6}
          className="w-full px-3 py-2 bg-bg-elevated border border-bdr rounded-md text-sm text-txt-primary placeholder:text-txt-muted resize-none focus:border-accent focus:outline-none transition-colors"
          placeholder="Write your thoughts..."
          {...register('content')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Category</label>
          <select className="h-9 px-3 rounded-md text-sm" {...register('categoryId')}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Tags" placeholder="tag1, tag2" icon={<Tag size={14} />} {...register('tagsInput')} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {defaultValues?.title ? 'Update' : 'Create note'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}


function NoteCard({ note, onEdit, onDelete, onPin }: {
  note: NoteResponse
  onEdit: (n: NoteResponse) => void
  onDelete: (id: number) => void
  onPin: (id: number) => void
}) {
  const catColor = note.category?.color ?? 'var(--accent)'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group bg-bg-surface border border-bdr rounded-xl overflow-hidden hover:border-bdr-accent transition-all duration-200 cursor-pointer',
        note.pinned && 'border-accent/25 bg-accent-subtle'
      )}
      onClick={() => onEdit(note)}
    >
      {}
      <div className="h-1 w-full" style={{ background: catColor }} />

      <div className="p-4">
        {}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-sora font-semibold text-sm text-txt-primary leading-snug flex-1 line-clamp-2">
            {note.title}
          </h3>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={e => { e.stopPropagation(); onPin(note.id) }}
              className="p-1 rounded text-txt-muted hover:text-accent transition-colors">
              {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(note.id) }}
              className="p-1 rounded text-txt-muted hover:text-danger transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {}
        {note.content && (
          <p className="text-xs text-txt-secondary leading-relaxed line-clamp-3 mb-3">
            {note.content}
          </p>
        )}

        {}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-bg-elevated rounded text-[10px] text-txt-muted border border-bdr">

              </span>
            ))}
          </div>
        )}

        {}
        <div className="flex items-center justify-between">
          {note.category && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded"
              style={{ background: `${catColor}18`, color: catColor }}>
              {note.category.name}
            </span>
          )}
          <span className="text-[10px] text-txt-muted font-mono ml-auto">
            {formatTimeAgo(note.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}


export function NotesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editNote, setEditNote] = useState<NoteResponse | null>(null)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#7C6AF7')
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  const noteParams = { categoryId: selectedCat ?? undefined, pinned: pinnedOnly || undefined, size: 50 }

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', noteParams],
    queryFn: () => notesApi.list(noteParams),
    enabled: !debouncedSearch,
  })

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['notes', 'search', debouncedSearch],
    queryFn: () => notesApi.search(debouncedSearch),
    enabled: !!debouncedSearch,
  })

  const { data: categories } = useQuery({
    queryKey: ['notes', 'categories'],
    queryFn: notesApi.categories.list,
  })

  const displayNotes = debouncedSearch ? (searchResults?.content ?? []) : (notes?.content ?? [])

  const createMut = useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); toast.success('Note created'); setCreateOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (d: { id: number; data: NoteRequest }) => notesApi.update(d.id, d.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); toast.success('Note updated'); setEditNote(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); toast.success('Note deleted') },
    onError: (e: Error) => toast.error(e.message),
  })

  const pinMut = useMutation({
    mutationFn: notesApi.togglePin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const createCatMut = useMutation({
    mutationFn: () => notesApi.categories.create({ name: newCatName, color: newCatColor }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes', 'categories'] }); toast.success('Category created'); setCatFormOpen(false); setNewCatName('') },
    onError: (e: Error) => toast.error(e.message),
  })

  const CAT_COLORS = ['#7C6AF7', '#34D399', '#FBBF24', '#F87171', '#60A5FA', '#FB923C', '#EC4899']

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <PageHeader
        title="Notes"
        subtitle={`${displayNotes.length} notes`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCatFormOpen(true)}>
              <FolderPlus size={15} /> Category
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> New Note
            </Button>
          </div>
        }
      />

      {}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search notes by title or content..."
          className="w-full h-10 pl-10 pr-10 bg-bg-surface border border-bdr rounded-lg text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:outline-none transition-colors"
        />
        {search && (
          <button onClick={() => { setSearch(''); setDebouncedSearch('') }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6">
        <button onClick={() => { setSelectedCat(null); setPinnedOnly(false) }}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
            !selectedCat && !pinnedOnly ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-txt-secondary border-bdr hover:border-bdr-accent'
          )}>
          All
        </button>
        <button onClick={() => { setPinnedOnly(true); setSelectedCat(null) }}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
            pinnedOnly ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-txt-secondary border-bdr hover:border-bdr-accent'
          )}>
          <Pin size={11} /> Pinned
        </button>
        {(categories ?? []).map(cat => (
          <button key={cat.id}
            onClick={() => { setSelectedCat(cat.id); setPinnedOnly(false) }}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              selectedCat === cat.id
                ? 'text-white border-transparent'
                : 'bg-bg-elevated text-txt-secondary border-bdr hover:border-bdr-accent'
            )}
            style={selectedCat === cat.id ? { background: cat.color ?? 'var(--accent)', borderColor: cat.color ?? 'var(--accent)' } : {}}>
            {cat.name}
          </button>
        ))}
        <button onClick={() => setCatFormOpen(true)}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-txt-muted border border-dashed border-bdr hover:border-bdr-accent hover:text-accent transition-all">
          <Plus size={11} /> New
        </button>
      </div>

      {}
      {(isLoading || searchLoading) ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className={cn('w-full break-inside-avoid', i % 3 === 0 ? 'h-48' : i % 3 === 1 ? 'h-32' : 'h-56')} />
          ))}
        </div>
      ) : displayNotes.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title={debouncedSearch ? 'No notes found' : 'No notes yet'}
          description={debouncedSearch ? `No results for "${debouncedSearch}"` : 'Capture your thoughts, ideas and insights'}
          action={
            !debouncedSearch ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> Create first note
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          <AnimatePresence>
            {displayNotes.map(note => (
              <div key={note.id} className="break-inside-avoid mb-4">
                <NoteCard
                  note={note}
                  onEdit={setEditNote}
                  onDelete={id => deleteMut.mutate(id)}
                  onPin={id => pinMut.mutate(id)}
                />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Note" width="max-w-xl">
        <NoteForm
          categories={categories ?? []}
          onSubmit={d => createMut.mutate(d)}
          onCancel={() => setCreateOpen(false)}
          loading={createMut.isPending}
        />
      </Modal>

      {}
      <Modal open={!!editNote} onClose={() => setEditNote(null)} title="Edit Note" width="max-w-xl">
        {editNote && (
          <NoteForm
            defaultValues={{
              title: editNote.title,
              content: editNote.content ?? '',
              categoryId: editNote.category?.id,
              tagsInput: editNote.tags.join(', '),
              pinned: editNote.pinned,
            }}
            categories={categories ?? []}
            onSubmit={d => updateMut.mutate({ id: editNote.id, data: d })}
            onCancel={() => setEditNote(null)}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      {}
      <Modal open={catFormOpen} onClose={() => setCatFormOpen(false)} title="New Category">
        <div className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Work, Personal, Ideas"
            value={newCatName} onChange={e => setNewCatName(e.target.value)} />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Color</label>
            <div className="flex gap-2">
              {CAT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewCatColor(c)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-all', newCatColor === c ? 'border-txt-primary scale-110' : 'border-transparent')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" loading={createCatMut.isPending}
              onClick={() => createCatMut.mutate()} disabled={!newCatName.trim()} className="flex-1">
              Create category
            </Button>
            <Button variant="ghost" onClick={() => setCatFormOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
