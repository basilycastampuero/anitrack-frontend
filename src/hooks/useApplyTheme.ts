import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

/**
 * Aplica la preferencia de tema a <html> (clase `dark`) y reacciona a cambios
 * del sistema cuando la preferencia es "system". Se monta una vez en el layout.
 */
export function useApplyTheme(): void {
  const preference = useThemeStore((s) => s.preference)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        preference === 'dark' || (preference === 'system' && media.matches)
      root.classList.toggle('dark', isDark)
    }

    apply()
    if (preference === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [preference])
}
