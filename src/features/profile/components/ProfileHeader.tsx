import { Link } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { paths } from '@/router/paths'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import type { PublicProfile } from '@/features/profile/types'

interface ProfileHeaderProps {
  profile: PublicProfile
  /** El visitante es el dueño: se le avisa que esto es público (doc 06). */
  isOwnProfile: boolean
  className?: string
}

/** Cabecera del perfil público (doc 06): avatar, nombre y, si es propio, el aviso. */
export function ProfileHeader({
  profile,
  isOwnProfile,
  className,
}: ProfileHeaderProps) {
  return (
    <header className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <UserAvatar
          name={profile.name}
          src={profile.avatarUrl}
          className="size-16"
        />
        <h1 className="min-w-0 truncate text-2xl font-semibold text-foreground">
          {profile.name}
        </h1>
      </div>

      {isOwnProfile && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Globe
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {t.profile.ownBannerTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.profile.ownBannerBody}
            </p>
          </div>
          <Link
            to={paths.settings}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t.profile.ownBannerCta}
          </Link>
        </div>
      )}
    </header>
  )
}
