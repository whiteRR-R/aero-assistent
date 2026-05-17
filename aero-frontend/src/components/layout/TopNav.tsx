import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Calendar, FileText,
  Target, Bell, User, LogOut, Sun, Moon,
  Search, Square, Menu, X, MessageSquare, Zap, BarChart2,
} from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'
import { useFocusStore, formatFocusTime } from '@/store/focusStore'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/tasks',     icon: CheckSquare,     key: 'tasks' },
  { to: '/calendar',  icon: Calendar,        key: 'calendar' },
  { to: '/notes',     icon: FileText,        key: 'notes' },
  { to: '/habits',    icon: Target,          key: 'habits' },
  { to: '/reminders', icon: Bell,            key: 'reminders' },
  { to: '/chat',      icon: MessageSquare,   key: 'aiChat' },
  { to: '/review',    icon: BarChart2,       key: 'weeklyReview' },
]

const LANGS = [
  { code: 'en' as const, label: 'EN' },
  { code: 'ru' as const, label: 'RU' },
  { code: 'kk' as const, label: 'KZ' },
]

interface TopNavProps {
  onOpenPalette: () => void
  onOpenCapture: () => void
}

export function TopNav({ onOpenPalette, onOpenCapture }: TopNavProps) {
  const { theme, toggleTheme, lang, setLang } = useSettingsStore()
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isActive, mode, timeLeft, stop } = useFocusStore()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <>
      {}
      <header className="h-[54px] shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center px-4 lg:px-5 gap-0 relative z-30 overflow-hidden">

        {}
        <NavLink to="/dashboard" className="flex items-center gap-2.5 mr-6 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white font-display font-bold text-[11px] leading-none select-none">A</span>
          </div>
          <span className="font-display font-bold text-[14px] text-txt-primary tracking-tight hidden sm:block">
            AERO
          </span>
        </NavLink>

        {}
        <div className="w-px h-5 bg-[var(--border)] mr-5 hidden md:block" />

        {}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
          {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-2 px-2.5 lg:px-3 h-8 rounded-lg text-[13px] font-medium transition-colors min-w-0',
                  isActive
                    ? 'text-accent bg-[var(--accent-muted)]'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)]'
                )
              }
              title={t(key)}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="topnav-pill"
                      className="absolute inset-0 rounded-lg bg-[var(--accent-muted)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={14} strokeWidth={isActive ? 2.25 : 1.75} className="relative shrink-0" />
                  <span className="relative hidden xl:inline max-w-[118px] truncate">{t(key)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {}
        <div className="flex items-center gap-1.5 ml-auto">

          {}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.88, x: 8 }}
                className={cn(
                  'hidden lg:flex items-center gap-1.5 px-2 h-7 rounded-full border text-[11px] font-mono font-semibold mr-1 shrink-0',
                  mode === 'focus'
                    ? 'bg-[var(--accent-muted)] border-[var(--border-accent)] text-accent'
                    : 'bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.28)] text-success'
                )}
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full animate-pulse-dot',
                  mode === 'focus' ? 'bg-accent' : 'bg-success'
                )} />
                <span className="hidden 2xl:inline">{mode === 'focus' ? t('focusMode') : t('breakMode')}</span>
                <span className="hidden 2xl:inline opacity-60">·</span>
                <span>{formatFocusTime(timeLeft)}</span>
                <button onClick={stop} className="opacity-50 hover:opacity-100 transition-opacity">
                  <Square size={9} fill="currentColor" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {}
          <button
            onClick={onOpenCapture}
            title={t('quickCaptureHotkey')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-[var(--accent-muted)] border border-[var(--border-accent)] text-accent hover:bg-accent hover:text-white text-[11px] font-medium transition-all shrink-0"
          >
            <Zap size={12} />
            <span className="hidden xl:inline">{t('capture')}</span>
          </button>

          {}
          <button
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 h-7 rounded-lg border border-[var(--border)] text-txt-muted hover:text-txt-primary hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] text-[11px] transition-colors shrink-0"
          >
            <Search size={12} />
            <span className="hidden xl:inline">{t('search')}</span>
            <span className="hidden 2xl:inline font-mono opacity-50 text-[10px]">Ctrl K</span>
          </button>

          {}
          <div className="hidden xl:flex items-center gap-px p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] shrink-0">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  'h-6 px-2 rounded-md text-[11px] font-semibold transition-colors',
                  lang === l.code
                    ? 'bg-accent text-white'
                    : 'text-txt-muted hover:text-txt-primary'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('lightTheme') : t('darkTheme')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
          </button>

          {}
          <NavLink
            to="/profile"
            className={({ isActive }) => cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors',
              isActive && 'text-accent bg-[var(--accent-muted)]'
            )}
            title={t('profile')}
          >
            <User size={15} strokeWidth={1.75} />
          </NavLink>

          {}
          <button
            onClick={handleLogout}
            title={t('logout')}
            className="w-8 h-8 rounded-lg hidden md:flex items-center justify-center text-txt-secondary hover:text-danger hover:bg-[rgba(248,113,113,0.08)] transition-colors"
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>

          {}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-20 bg-black/40 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-[54px] left-0 right-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border)] md:hidden shadow-lg"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex flex-col p-3 gap-0.5">
                {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--accent-muted)] text-accent'
                        : 'text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)]'
                    )}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {t(key)}
                  </NavLink>
                ))}

                {}
                <div className="flex gap-1 pt-2 mt-1 border-t border-[var(--border)]">
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        lang === l.code ? 'bg-accent text-white' : 'bg-[var(--bg-elevated)] text-txt-muted'
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] text-danger transition-colors"
                  >
                    <LogOut size={12} /> {t('logout')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
