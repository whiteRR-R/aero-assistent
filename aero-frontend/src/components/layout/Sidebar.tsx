import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Calendar, FileText,
  Target, Bell, User, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon,
} from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, key: 'dashboard' },
  { to: '/tasks',      icon: CheckSquare,     key: 'tasks' },
  { to: '/calendar',   icon: Calendar,        key: 'calendar' },
  { to: '/notes',      icon: FileText,        key: 'notes' },
  { to: '/habits',     icon: Target,          key: 'habits' },
  { to: '/reminders',  icon: Bell,            key: 'reminders' },
]

const LANGS = [
  { code: 'en' as const, label: 'EN' },
  { code: 'ru' as const, label: 'RU' },
  { code: 'kk' as const, label: 'KZ' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme, lang, setLang } = useSettingsStore()
  const { logout } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const w = sidebarCollapsed ? 56 : 216

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-screen bg-[var(--bg-surface)] border-r border-[var(--border)] shrink-0 z-30 overflow-hidden"
      style={{ minWidth: w }}
    >
      {}
      <div className="flex items-center gap-3 px-3.5 h-[52px] border-b border-[var(--border)] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-[11px] leading-none select-none">A</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.14 }}
            >
              <p className="font-display font-bold text-sm text-txt-primary tracking-tight leading-tight">AERO</p>
              <p className="text-[10px] text-txt-muted leading-tight">Personal Assistant</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {}
      <nav className="flex-1 py-2 space-y-px overflow-y-auto overflow-x-hidden px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 px-2.5 h-9 rounded-lg transition-colors group',
                isActive
                  ? 'bg-[var(--accent-muted)] text-accent'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-[var(--accent-muted)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                  />
                )}
                <Icon size={15} className="relative shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="relative text-[13px] font-medium whitespace-nowrap"
                    >
                      {t(key)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {}
      <div className="border-t border-[var(--border)] py-2 px-2 space-y-px">

        {}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex gap-1 px-0.5 pb-1"
            >
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors',
                    lang === l.code
                      ? 'bg-accent text-white'
                      : 'bg-[var(--bg-elevated)] text-txt-muted hover:text-txt-primary'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)] transition-colors"
          title={theme === 'dark' ? t('lightTheme') : t('darkTheme')}
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={1.75} />
            : <Moon size={15} strokeWidth={1.75} />
          }
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-[13px] font-medium whitespace-nowrap"
              >
                {theme === 'dark' ? t('lightTheme') : t('darkTheme')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2.5 h-9 rounded-lg transition-colors',
              isActive
                ? 'bg-[var(--accent-muted)] text-accent'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)]'
            )
          }
        >
          <User size={15} strokeWidth={1.75} className="shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-[13px] font-medium whitespace-nowrap"
              >
                {t('profile')}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        {}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-txt-secondary hover:text-danger hover:bg-[rgba(248,113,113,0.06)] transition-colors"
        >
          <LogOut size={15} strokeWidth={1.75} className="shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-[13px] font-medium whitespace-nowrap"
              >
                {t('logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {}
      <motion.button
        onClick={toggleSidebar}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="absolute -right-3 top-[58px] w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center text-txt-muted hover:text-txt-primary transition-colors z-10 shadow-card"
      >
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </motion.button>
    </motion.aside>
  )
}
