import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, Trash2, Bot, User, Loader2, Wrench, MessageSquare, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { chatApi, type MessageItem, type ConversationSummary } from '@/api/chat.api'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'


function MdText({ text }: { text: string }) {
  
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="font-mono text-[11px] bg-[var(--bg-elevated)] px-1 py-0.5 rounded">{part.slice(1, -1)}</code>
        if (part === '\n') return <br key={i} />
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}


function ToolBadge({ tool, summary }: { tool: string; summary: string }) {
  const ICON_MAP: Record<string, string> = {
    create_task: '✓ Task',
    list_tasks:  '📋 Tasks',
    get_task_stats: '📊 Stats',
    create_habit: '✓ Habit',
    list_habits: '🔄 Habits',
    list_upcoming_events: '📅 Events',
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-muted)] border border-[var(--border-accent)] text-accent text-[11px] font-medium">
      <Wrench size={9} strokeWidth={2.5} />
      <span>{ICON_MAP[tool] ?? tool}</span>
      <span className="text-accent/60">·</span>
      <span className="text-accent/80">{summary}</span>
    </div>
  )
}


function MessageBubble({ msg }: { msg: MessageItem }) {
  const isUser = msg.role === 'USER'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn('flex gap-3 max-w-[84%]', isUser && 'ml-auto flex-row-reverse')}
    >
      {}
      <div className={cn(
        'w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5',
        isUser ? 'bg-accent' : 'bg-[var(--bg-elevated)] border border-[var(--border)]'
      )}>
        {isUser
          ? <User size={13} className="text-white" />
          : <Bot size={13} className="text-accent" />
        }
      </div>

      <div className={cn('flex flex-col gap-1.5', isUser && 'items-end')}>
        {}
        {msg.toolCalls?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-0.5">
            {msg.toolCalls.map((tc, i) => (
              <ToolBadge key={i} tool={tc.tool} summary={tc.summary} />
            ))}
          </div>
        )}

        {}
        <div className={cn(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-accent text-white rounded-tr-sm'
            : 'bg-[var(--bg-surface)] border border-[var(--border)] text-txt-primary rounded-tl-sm'
        )}>
          <MdText text={msg.content} />
        </div>

        {}
        <span className="text-[10px] text-txt-muted font-mono px-1">
          {format(parseISO(msg.createdAt), 'HH:mm')}
        </span>
      </div>
    </motion.div>
  )
}


function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[84%]">
      <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border)] mt-0.5">
        <Bot size={13} className="text-accent" />
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-txt-muted"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}


function ConvItem({
  conv, active, onClick, onDelete,
}: {
  conv: ConversationSummary
  active: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        active
          ? 'bg-[var(--accent-muted)] text-accent'
          : 'hover:bg-[var(--bg-elevated)] text-txt-secondary hover:text-txt-primary'
      )}
    >
      <MessageSquare size={13} className="shrink-0" />
      <span className="flex-1 text-[12px] font-medium truncate">
        {conv.title ?? 'New conversation'}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-danger"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}


const SUGGESTIONS = [
  { en: 'Show my tasks for today', ru: 'Покажи мои задачи на сегодня' },
  { en: 'Create task: buy groceries', ru: 'Создай задачу: купить продукты' },
  { en: 'Add daily habit: read 30 minutes', ru: 'Добавь привычку: читать 30 минут' },
  { en: "What's on my calendar this week?", ru: 'Что у меня в календаре на этой неделе?' },
  { en: 'Show task statistics', ru: 'Покажи статистику задач' },
  { en: 'Create urgent task: project deadline', ru: 'Создай срочную задачу: дедлайн проекта' },
]


export function ChatPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const [activeConvId, setActiveConvId] = useState<number | undefined>()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [input, setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const lang: 'en' | 'ru' = i18n.language.startsWith('ru') ? 'ru' : 'en'

  
  const { data: convsData, refetch: refetchConvs } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatApi.listConversations(),
  })
  const conversations = convsData?.content ?? []

  
  const loadConversation = useCallback(async (id: number) => {
    try {
      const conv = await chatApi.getConversation(id)
      setActiveConvId(id)
      setMessages(conv.messages)
    } catch {
      toast.error(t('failedLoadConversation', 'Failed to load conversation'))
    }
  }, [t])

  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  
  const deleteMut = useMutation({
    mutationFn: chatApi.deleteConversation,
    onSuccess: (_, id) => {
      if (activeConvId === id) {
        setActiveConvId(undefined)
        setMessages([])
      }
      refetchConvs()
    },
  })

  
  const send = async () => {
    const text = input.trim()
    if (!text || sending) return

    
    const optimisticMsg: MessageItem = {
      id: Date.now(),
      role: 'USER',
      content: text,
      toolCalls: [],
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    setInput('')
    setSending(true)

    try {
      const res = await chatApi.sendMessage(text, activeConvId)

      
      if (!activeConvId || activeConvId !== res.conversationId) {
        setActiveConvId(res.conversationId)
        refetchConvs()
      }

      const aiMsg: MessageItem = {
        id: res.messageId,
        role: 'ASSISTANT',
        content: res.content,
        toolCalls: res.toolCalls ?? [],
        createdAt: res.createdAt,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('failedSendMessage', 'Failed to send message'))
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const startNew = () => {
    setActiveConvId(undefined)
    setMessages([])
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full overflow-hidden">

      {}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden"
          >
            <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                  <Bot size={12} className="text-white" />
                </div>
                <span className="text-[12px] font-semibold text-txt-primary">{t('aiAssistant', 'AI Assistant')}</span>
              </div>
              <button onClick={startNew}
                className="w-6 h-6 rounded-md flex items-center justify-center text-txt-muted hover:text-accent hover:bg-[var(--accent-muted)] transition-colors"
                title={t('newChat', 'New chat')}
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {conversations.length === 0 ? (
                <p className="text-[11px] text-txt-muted text-center py-6">{t('noConversationsYet', 'No conversations yet')}</p>
              ) : conversations.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === activeConvId}
                  onClick={() => loadConversation(conv.id)}
                  onDelete={e => { e.stopPropagation(); deleteMut.mutate(conv.id) }}
                />
              ))}
            </div>

            <div className="p-2 border-t border-[var(--border)]">
              <div className="px-2 py-1.5 rounded-lg bg-[var(--accent-muted)] text-accent text-[10px] font-medium text-center">
                {t('poweredByGemini', 'Powered by Gemini')}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {}
      <div className="flex-1 flex flex-col min-w-0">

        {}
        <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <ChevronRight size={14} className={cn('transition-transform', sidebarOpen && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
            <span className="text-sm font-semibold text-txt-primary">
              {activeConvId
                ? (conversations.find(c => c.id === activeConvId)?.title ?? 'Conversation')
                : t('newConversation', 'New conversation')}
            </span>
          </div>
          {activeConvId && (
            <button
              onClick={startNew}
              className="ml-auto flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors text-[11px]"
            >
              <Plus size={11} /> {t('newChat', 'New chat')}
            </button>
          )}
        </div>

        {}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && !sending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full gap-6 text-center"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-muted)] border border-[var(--border-accent)] flex items-center justify-center mx-auto mb-4">
                  <Bot size={26} className="text-accent" />
                </div>
                <h2 className="font-display font-bold text-lg text-txt-primary mb-1">AERO AI</h2>
                <p className="text-sm text-txt-secondary max-w-[320px]">
                  {t('aiAssistantIntro', 'Your productivity assistant. Ask me to create tasks, add habits, or check your schedule.')}
                </p>
              </div>

              {}
              <div className="flex flex-wrap justify-center gap-2 max-w-[520px]">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s[lang]); inputRef.current?.focus() }}
                    className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[12px] text-txt-secondary hover:text-txt-primary hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    {s[lang]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {}
        <div className="shrink-0 p-4 border-t border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="flex items-end gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2.5 focus-within:border-[var(--accent)] focus-within:shadow-glow transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('askAeroPlaceholder', 'Ask AERO anything... (Enter to send, Shift+Enter for new line)')}
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-txt-primary placeholder:text-txt-muted max-h-32 scrollbar-thin"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-white disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-txt-muted text-center mt-2">
            {t('aiFooterDisclaimer', 'AI can create tasks and habits · Always verify important deadlines')}
          </p>
        </div>
      </div>
    </div>
  )
}
