import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

type Theme = 'dark' | 'light'
type Lang  = 'en' | 'ru' | 'kk'

interface SettingsState {
  theme: Theme
  lang: Lang
  sidebarCollapsed: boolean
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
  toggleTheme: () => void
  toggleSidebar: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      lang: 'en',
      sidebarCollapsed: false,

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      setLang: (lang) => {
        set({ lang })
        i18n.changeLanguage(lang)
        localStorage.setItem('aero_lang', lang)
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'aero-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
          i18n.changeLanguage(state.lang)
        }
      },
    }
  )
)

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}
