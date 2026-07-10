import { NavLink } from 'react-router-dom'
import { Home, LayoutGrid, Search, ListChecks, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { paths } from '@/router/paths'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import { useSessionStore } from '@/store/sessionStore'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * Bottom tab bar mobile (doc 06): la decisión responsive clave — la app se usa
 * "tipo app" en el celular. Oculta en desktop (el Header lleva la navegación).
 */
export function BottomTabs() {
  const user = useSessionStore((s) => s.user)

  const tabs: Tab[] = [
    { to: paths.home, label: t.nav.home, icon: Home },
    { to: paths.catalog, label: t.nav.catalog, icon: LayoutGrid },
    { to: paths.search, label: t.nav.search, icon: Search },
    { to: paths.myLists, label: t.nav.myLists, icon: ListChecks },
    {
      to: user ? paths.profile.replace(':userId', String(user.id)) : paths.login,
      label: t.nav.profile,
      icon: User,
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => (
          <li key={tab.label} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === paths.home}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <tab.icon className="size-5" aria-hidden />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
