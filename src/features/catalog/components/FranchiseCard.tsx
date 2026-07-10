import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Gamepad2, Film } from 'lucide-react'
import { GenreBadge } from '@/components/common/GenreBadge'
import { cn } from '@/lib/utils'
import { franchisePath } from '@/utils/slug'
import { t } from '@/i18n/en'
import type { FranchiseSummary } from '@/features/catalog/types'

interface FranchiseCardProps {
  franchise: FranchiseSummary
  inLibrary?: boolean
}

function TypeBadge({ games, videos }: { games: number; videos: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
      {videos > 0 && <Film className="size-3" aria-label={t.card.videos} />}
      {games > 0 && <Gamepad2 className="size-3" aria-label={t.card.games} />}
    </div>
  )
}

/**
 * Card de franquicia (doc 06): poster 2:3, nombre, hasta 2 géneros, badge de
 * tipo, indicador "in your list" y hover animado con motion.
 */
export function FranchiseCard({ franchise, inLibrary }: FranchiseCardProps) {
  const { from, to } = franchise.yearRange
  const years = from ? (to && to !== from ? `${from}–${to}` : `${from}`) : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Link
        to={franchisePath(franchise.id, franchise.name)}
        className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-shadow group-hover:shadow-md">
          <div className="aspect-[2/3] w-full">
            {franchise.imageUrl ? (
              <img
                src={franchise.imageUrl}
                alt={franchise.name}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Film className="size-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="absolute left-2 top-2">
            <TypeBadge
              games={franchise.contentCounts.games}
              videos={franchise.contentCounts.videos}
            />
          </div>
          {inLibrary && (
            <div
              className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground"
              title={t.card.inYourList}
            >
              <Check className="size-3" aria-hidden />
            </div>
          )}
        </div>

        <div className="mt-2 space-y-1">
          <h3
            className={cn(
              'line-clamp-1 text-sm font-semibold text-foreground',
              'group-hover:text-primary',
            )}
          >
            {franchise.name}
          </h3>
          {years && <p className="text-xs text-muted-foreground">{years}</p>}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {franchise.genres.slice(0, 2).map((genre) => (
              <GenreBadge key={genre.id} genre={genre} />
            ))}
            {franchise.genres.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{franchise.genres.length - 2}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
