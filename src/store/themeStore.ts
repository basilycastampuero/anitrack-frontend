import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  toggle: () => void
}

/**
 * Preferencia de tema persistida en localStorage (doc 06: default system).
 * La aplicación al <html> vive en el hook useApplyTheme para reaccionar también
 * a cambios del sistema cuando la preferencia es "system".
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      toggle: () => {
        const current = get().preference
        set({ preference: current === 'dark' ? 'light' : 'dark' })
      },
    }),
    { name: 'anitrack-theme' },
  ),
)
