import { Link, NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
import { paths } from '@/router/paths'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/store/sessionStore'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  )

/** Header sticky (doc 06). En desktop trae nav y búsqueda; en mobile, compacto. */
export function Header() {
  const user = useSessionStore((s) => s.user)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link to={paths.home} className="flex items-center gap-2 font-bold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            A
          </span>
          <span className="hidden sm:inline">{t.app.name}</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          <NavLink to={paths.catalog} className={navLinkClass}>
            {t.nav.catalog}
          </NavLink>
          <NavLink to={paths.myLists} className={navLinkClass}>
            {t.nav.myLists}
          </NavLink>
        </nav>

        {/* Placeholder de SearchBar (la funcional llega en Sprint 2). */}
        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <Link
            to={paths.search}
            className="flex items-center gap-2 rounded-md border border-input bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Search className="size-4" aria-hidden />
            {t.common.search}
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            to={paths.search}
            className="md:hidden"
            aria-label={t.common.search}
          >
            <Button variant="ghost" size="icon">
              <Search className="size-5" aria-hidden />
            </Button>
          </Link>
          <ThemeToggle />
          {user ? (
            <Link to={paths.profile.replace(':userId', String(user.id))}>
              <UserAvatar name={user.name} src={user.avatarUrl} />
            </Link>
          ) : (
            <Link to={paths.login}>
              <Button size="sm">{t.nav.login}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
