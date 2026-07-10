import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/themeStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { t } from '@/i18n/en'

/**
 * Alterna entre claro y oscuro. Con preferencia "system" resuelve el estado
 * actual desde el media query para decidir hacia dónde alternar.
 */
export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')

  const isDark = preference === 'dark' || (preference === 'system' && systemDark)

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t.theme.toggle}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden />
      ) : (
        <Moon className="size-5" aria-hidden />
      )}
    </Button>
  )
}
