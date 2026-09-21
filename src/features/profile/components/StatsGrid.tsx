import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import type { PublicProfile } from '@/features/profile/types'

interface StatsGridProps {
  stats: PublicProfile['stats']
  className?: string
}

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Distribución games/videos como dona, en SVG a mano. Son dos sectores: un
 * `stroke-dasharray` sobre un círculo alcanza, y sumar una librería de charts
 * por esto no se paga.
 *
 * Va `aria-hidden` porque la misma información está al lado en texto — un
 * lector de pantalla no gana nada leyendo la geometría.
 */
function Donut({ games, videos }: { games: number; videos: number }) {
  const total = games + videos
  const videoArc = total === 0 ? 0 : (videos / total) * CIRCUMFERENCE

  return (
    <svg viewBox="0 0 40 40" className="size-16 -rotate-90" aria-hidden>
      <circle
        cx="20"
        cy="20"
        r={RADIUS}
        fill="none"
        strokeWidth="6"
        className="stroke-muted"
      />
      {total > 0 && (
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          className="stroke-primary"
          strokeDasharray={`${videoArc} ${CIRCUMFERENCE - videoArc}`}
        />
      )}
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * Stats del perfil (doc 06). **No calcula nada**: los tres números llegan del
 * contrato ya agregados por el backend (§4.5), que además los acota a las
 * listas publicadas para no filtrar el tamaño de las privadas.
 */
export function StatsGrid({ stats, className }: StatsGridProps) {
  const { games, videos } = stats.byContentType

  return (
    <section
      className={cn('space-y-3', className)}
      aria-label={t.profile.statsTitle}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t.profile.totalEntries} value={stats.totalEntries} />
        <Stat
          label={t.profile.episodesWatched}
          value={stats.totalEpisodesWatched}
        />
        <div className="col-span-2 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:col-span-1">
          <Donut games={games} videos={videos} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t.profile.distribution}
            </p>
            <p
              className="text-sm text-foreground"
              aria-label={t.profile.distributionLabel(games, videos)}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" aria-hidden />
                {videos} {t.profile.videos}
              </span>
              <br />
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted" aria-hidden />
                {games} {t.profile.games}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
