import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type FocusMode = 'focus' | 'break'

interface FocusState {
  isActive:      boolean
  mode:          FocusMode
  timeLeft:      number   
  sessions:      number   
  focusDuration: number   
  breakDuration: number   

  start:  () => void
  stop:   () => void
  tick:   () => void
  reset:  () => void
  setDurations: (focus: number, brk: number) => void
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      isActive:      false,
      mode:          'focus',
      timeLeft:      25 * 60,
      sessions:      0,
      focusDuration: 25 * 60,
      breakDuration: 5 * 60,

      start: () => set({ isActive: true }),
      stop:  () => set({ isActive: false }),

      tick: () => {
        const { timeLeft, mode, sessions, focusDuration, breakDuration } = get()
        if (timeLeft <= 1) {
          if (mode === 'focus') {
            set({ mode: 'break', timeLeft: breakDuration, sessions: sessions + 1, isActive: true })
          } else {
            set({ mode: 'focus', timeLeft: focusDuration, isActive: false })
          }
        } else {
          set({ timeLeft: timeLeft - 1 })
        }
      },

      reset: () => {
        const { focusDuration } = get()
        set({ isActive: false, mode: 'focus', timeLeft: focusDuration })
      },

      setDurations: (focus, brk) => set({
        focusDuration: focus,
        breakDuration: brk,
        timeLeft: focus,
        isActive: false,
        mode: 'focus',
      }),
    }),
    {
      name: 'aero-focus',
      partialize: (s) => ({ sessions: s.sessions, focusDuration: s.focusDuration, breakDuration: s.breakDuration }),
    }
  )
)

export function formatFocusTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
