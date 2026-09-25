import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { useSessionStore } from '@/store/sessionStore'
import { useThemeStore, type ThemePreference } from '@/store/themeStore'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
  { value: 'system', label: t.theme.system },
]

/**
 * Elegir el tema es una opción entre tres excluyentes, así que por debajo es
 * un **radiogroup** de verdad y no tres botones con `aria-pressed`: el lector
 * de pantalla anuncia "2 de 3" y las flechas funcionan solas. Los radios van
 * `sr-only` y el anillo de foco se dibuja sobre la etiqueta, para que quien
 * navega con teclado sin lector vea dónde está parado.
 */
function ThemePicker() {
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)

  return (
    <fieldset
      role="radiogroup"
      aria-label={t.settings.themeTitle}
      className="flex w-fit gap-1 rounded-lg border border-border p-1"
    >
      {THEME_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            preference === option.value
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <input
            type="radio"
            name="theme-preference"
            className="sr-only"
            value={option.value}
            checked={preference === option.value}
            onChange={() => setPreference(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

/**
 * Ajustes (doc 06): tema y cuenta. La página vive detrás de `<RequireAuth>`,
 * así que `user` está resuelto — igual se contempla el `null` para no depender
 * de eso desde acá.
 */
export default function SettingsPage() {
  const user = useSessionStore((s) => s.user)
  const { signOut, isPending } = useSignOut()

  return (
    <PageWrapper className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-foreground">{t.settings.title}</h1>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t.settings.themeTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{t.settings.themeBody}</p>
        </div>
        <ThemePicker />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t.settings.accountTitle}
        </h2>
        {user && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <UserAvatar name={user.name} src={user.avatarUrl} className="size-10" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t.settings.signedInAs}</p>
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">{t.settings.logoutBody}</p>
        <Button type="button" variant="outline" disabled={isPending} onClick={signOut}>
          {isPending ? t.auth.account.loggingOut : t.auth.account.logout}
        </Button>
      </section>
    </PageWrapper>
  )
}
