import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string
  src?: string | null
  className?: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Avatar con imagen o iniciales de respaldo (doc 06). */
export function UserAvatar({ name, src, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('size-8', className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
