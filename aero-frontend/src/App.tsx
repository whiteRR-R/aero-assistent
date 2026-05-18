import '@/i18n'
import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore, applyTheme } from '@/store/settingsStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui'


const LoginPage    = lazy(() => import('@/pages/auth/AuthPages').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/AuthPages').then(m => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const TasksPage    = lazy(() => import('@/pages/TasksPage').then(m => ({ default: m.TasksPage })))
const HabitsPage   = lazy(() => import('@/pages/AllPages').then(m => ({ default: m.HabitsPage })))
const NotesPage    = lazy(() => import('@/pages/AllPages').then(m => ({ default: m.NotesPage })))
const CalendarPage = lazy(() => import('@/pages/AllPages').then(m => ({ default: m.CalendarPage })))
const RemindersPage = lazy(() => import('@/pages/AllPages').then(m => ({ default: m.RemindersPage })))
const ProfilePage  = lazy(() => import('@/pages/AllPages').then(m => ({ default: m.ProfilePage })))
const ChatPage         = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const WeeklyReviewPage = lazy(() => import('@/pages/WeeklyReviewPage').then(m => ({ default: m.WeeklyReviewPage })))


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})


function PageLoader() {
  return (
    <div className="p-8 space-y-4 max-w-[1200px]">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}


function OAuth2Callback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  useEffect(() => {
    const token = params.get('token') || params.get('accessToken')
    if (!token) { navigate('/login'); return }
    
    import('@/api/client').then(({ setTokens }) => {
      setTokens(token, '')
      import('@/api/profile.api').then(({ profileApi }) => {
        profileApi.get()
          .then(user => { setUser(user); navigate('/dashboard', { replace: true }) })
          .catch(() => {
            import('@/api/client').then(({ clearTokens }) => clearTokens())
            navigate('/login', { replace: true })
          })
      })
    })
  }, [params, navigate, setUser])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] gap-4">
      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
        <span className="text-white font-display font-bold text-base select-none">A</span>
      </div>
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-txt-secondary font-medium">Signing you in...</p>
    </div>
  )
}


function ThemeInit() {
  const { theme } = useSettingsStore()
  useEffect(() => { applyTheme(theme) }, [theme])
  return null
}


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInit />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/oauth2/callback" element={<OAuth2Callback />} />

            {}
            <Route element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }>
              <Route path="/"           element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/tasks"      element={<TasksPage />} />
              <Route path="/calendar"   element={<CalendarPage />} />
              <Route path="/notes"      element={<NotesPage />} />
              <Route path="/habits"     element={<HabitsPage />} />
              <Route path="/reminders"  element={<RemindersPage />} />
              <Route path="/profile"    element={<ProfilePage />} />
              <Route path="/chat"    element={<ChatPage />} />
              <Route path="/review"  element={<WeeklyReviewPage />} />
            </Route>

            {}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
