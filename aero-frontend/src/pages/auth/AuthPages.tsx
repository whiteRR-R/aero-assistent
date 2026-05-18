import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Button, Input } from '@/components/ui'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const LANGS = [
  { code: 'en' as const, label: 'EN' },
  { code: 'ru' as const, label: 'RU' },
  { code: 'kk' as const, label: 'KZ' },
]


function AuthShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, theme, toggleTheme } = useSettingsStore()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--bg-base)]"
      data-theme={theme}
    >
      {}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      >
        <span
          className="font-display font-bold text-[var(--text-primary)] leading-none"
          style={{ fontSize: 'clamp(120px, 22vw, 320px)', opacity: 0.025, letterSpacing: '-0.04em' }}
        >
          AERO
        </span>
      </div>

      {}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          opacity: 0.025,
        }}
      />

      {}
      <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
        <div className="flex items-center gap-px p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={cn(
                'h-6 px-2.5 rounded-md text-[11px] font-semibold transition-colors',
                lang === l.code ? 'bg-accent text-white' : 'text-txt-muted hover:text-txt-primary'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleTheme}
          className="h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--bg-surface)] border border-[var(--border)] text-txt-muted hover:text-txt-primary transition-colors"
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] mx-auto px-5"
      >
        {}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <span className="text-white font-display font-bold text-[12px] leading-none select-none">A</span>
          </div>
          <div>
            <p className="font-display font-bold text-[15px] text-txt-primary tracking-tight leading-tight">AERO</p>
            <p className="text-[10px] text-txt-muted leading-tight">Personal Assistant</p>
          </div>
        </div>

        {}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-7 shadow-lg">
          {children}
        </div>

        {}
        <p className="text-center text-[11px] text-txt-muted mt-5">
          {`EN · RU · KZ  ·  Focus Timer  ·  Ctrl+K`}
        </p>
      </motion.div>
    </div>
  )
}


const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})
type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data)
      setUser(res.user)
      navigate('/dashboard')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <AuthShell>
      <h2 className="font-display font-bold text-xl text-txt-primary mb-1 tracking-tight">
        {t('welcomeBack')}
      </h2>
      <p className="text-txt-secondary text-sm mb-6">
        {t('noAccount')}{' '}
        <Link to="/register" className="text-accent font-semibold hover:underline">
          {t('signUp')}
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('email')} type="email" placeholder="you@example.com"
          icon={<Mail size={14} />} error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('password')} type={showPwd ? 'text' : 'password'}
          placeholder="••••••••" icon={<Lock size={14} />}
          error={errors.password?.message}
          suffix={
            <button type="button" tabIndex={-1} onClick={() => setShowPwd(p => !p)}
              className="text-txt-muted hover:text-txt-secondary transition-colors">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          {...register('password')}
        />
        <Button type="submit" variant="primary" className="w-full !h-10" loading={isSubmitting} size="lg">
          {t('signIn')} <ArrowRight size={15} />
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-[var(--bg-surface)] text-[11px] text-txt-muted">{t('orContinueWith')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { name: 'Google', provider: 'google' },
          { name: 'GitHub', provider: 'github' },
        ].map(p => (
          <a key={p.name} href={`${apiOrigin}/api/oauth2/authorization/${p.provider}`}
            className="flex items-center justify-center gap-2 h-9 rounded-lg border border-[var(--border)] text-sm font-medium text-txt-secondary hover:text-txt-primary hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors">
            {p.name === 'Google' ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            )}
            {p.name}
          </a>
        ))}
      </div>
    </AuthShell>
  )
}


const registerSchema = z.object({
  fullName: z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8),
})
type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await authApi.register(data)
      toast.success(res.message || 'Registration successful. Check your email for verification.')
      navigate('/login')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <AuthShell>
      <h2 className="font-display font-bold text-xl text-txt-primary mb-1 tracking-tight">
        {t('createAccount')}
      </h2>
      <p className="text-txt-secondary text-sm mb-6">
        {t('haveAccount')}{' '}
        <Link to="/login" className="text-accent font-semibold hover:underline">
          {t('signIn')}
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('fullName')} placeholder="Your full name"
          icon={<User size={14} />} error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label={t('email')} type="email" placeholder="you@example.com"
          icon={<Mail size={14} />} error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('password')} type={showPwd ? 'text' : 'password'}
          placeholder="Min 8 characters" icon={<Lock size={14} />}
          error={errors.password?.message}
          suffix={
            <button type="button" tabIndex={-1} onClick={() => setShowPwd(p => !p)}
              className="text-txt-muted hover:text-txt-secondary transition-colors">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          {...register('password')}
        />
        <Button type="submit" variant="primary" className="w-full !h-10" loading={isSubmitting} size="lg">
          {t('signUp')} <ArrowRight size={15} />
        </Button>
      </form>
    </AuthShell>
  )
}
  const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:8080'
