import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { TopNav } from './TopNav'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickCapture } from '@/components/QuickCapture'
import { useFocusStore } from '@/store/focusStore'


export { PageHeader } from '@/components/ui'

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.12 } },
}

export function AppLayout() {
  const location = useLocation()
  const [paletteOpen,  setPaletteOpen]  = useState(false)
  const [captureOpen,  setCaptureOpen]  = useState(false)
  const { isActive, tick } = useFocusStore()

  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setCaptureOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  
  useEffect(() => {
    if (!isActive) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActive, tick])

  
  const isChat = location.pathname === '/chat'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)]">
      <TopNav onOpenPalette={() => setPaletteOpen(true)} onOpenCapture={() => setCaptureOpen(true)} />

      <main className={cn(
        'flex-1 overflow-x-hidden min-h-0',
        isChat ? 'overflow-hidden flex flex-col' : 'overflow-y-auto',
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={isChat ? 'flex flex-col flex-1 min-h-0' : 'min-h-full'}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      <QuickCapture
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
      />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '13px',
            fontWeight: '500',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-elevated)' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: 'var(--bg-elevated)' } },
        }}
      />
    </div>
  )
}
