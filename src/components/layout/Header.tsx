import { Link, NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { paths } from '@/router/paths'
import { profilePath } from '@/utils/slug'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/features/catalog/components/SearchBar'
import { useSessionStore } from '@/store/sessionStore'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  )

/** Header sticky (doc 06). En desktop trae nav y búsqueda; en mobile, compacto. */
export function Header() {
  const user = useSessionStore((s) => s.user)
  const { signOut } = useSignOut()

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

        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <SearchBar />
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
            // El avatar era un `<Link>` pelado al perfil, así que no había
            // ninguna forma de cerrar sesión desde la app: `useLogout` existía
            // y estaba testeado desde 3.1, pero sin puerta (tarea 4.13). El
            // menú es además el gesto que la gente busca para "mi cuenta".
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t.auth.account.menu(user.name)}
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserAvatar name={user.name} src={user.avatarUrl} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={profilePath(user.id)}>{t.nav.profile}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={paths.settings}>{t.nav.settings}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}>
                  {t.auth.account.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
