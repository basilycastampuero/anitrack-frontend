import { Link } from 'react-router-dom'
import { Folder } from 'lucide-react'
import { publicListPath } from '@/utils/slug'
import { t } from '@/i18n/en'
import type { ChecklistNode } from '@/features/lists/types'

interface ChecklistCardProps {
  checklist: ChecklistNode
  userId: number
}

/** Tarjeta de una lista publicada (doc 06): imagen, nombre y contador. */
export function ChecklistCard({ checklist, userId }: ChecklistCardProps) {
  return (
    <Link
      to={publicListPath(userId, checklist.id)}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/60 hover:bg-accent/40"
    >
      {checklist.imageUrl ? (
        <img
          src={checklist.imageUrl}
          alt=""
          loading="lazy"
          className="size-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Folder className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {checklist.name}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t.profile.entriesCount(checklist.linkCount)}
        </span>
      </span>
    </Link>
  )
}
