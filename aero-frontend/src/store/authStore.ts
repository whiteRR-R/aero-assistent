import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserResponse } from '@/types'
import { clearTokens } from '@/api/client'

interface AuthState {
  user: UserResponse | null
  isAuthenticated: boolean
  setUser: (u: UserResponse) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => { clearTokens(); set({ user: null, isAuthenticated: false }) },
    }),
    { name: 'aero-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
)
