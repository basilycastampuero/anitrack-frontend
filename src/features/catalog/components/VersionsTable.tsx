import type { ReactNode } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { CountryFlag } from '@/components/common/CountryFlag'
import { cn } from '@/lib/utils'
import { formatEpisodeCount } from '@/utils/episodes'
import { formatReleaseDate } from '@/utils/date'
import { t } from '@/i18n/en'
import type { VersionDetail } from '@/features/catalog/types'

interface VersionsTableProps {
  versions: VersionDetail[]
  /**
   * Acción por fila, inyectada por la página. Es lo que deja que el botón de
   * "agregar a una lista" viva en `features/lists` sin que `catalog` importe
   * nada de ahí (doc 15 §3.4): esta tabla solo reserva el lugar.
   */
  renderAction?: (version: VersionDetail) => ReactNode
}

interface FieldProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * Una celda de la tabla: mobile-first, mismo markup en ambos anchos — solo el
 * label inline se oculta desde `sm:` porque el header de columnas (renderizado
 * una única vez) ya lo cubre. Evita duplicar el valor en dos layouts distintos
 * (mobile card + desktop grid), lo que además rompería queries de test por
 * texto al aparecer el mismo valor dos veces en el DOM.
 */
function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs font-medium text-muted-foreground sm:hidden">
        {label}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  )
}

const HEADERS = [
  { key: 'name', label: t.detail.version.name },
  { key: 'episodes', label: t.detail.version.episodes },
  { key: 'releaseDate', label: t.detail.version.releaseDate },
  { key: 'country', label: t.detail.version.country },
  { key: 'platform', label: t.detail.version.platform },
  { key: 'dubbingStudio', label: t.detail.version.dubbingStudio },
] as const

/** Tabla de versiones (doc 06): nombre, episodios, fecha, país, plataforma, doblaje. */
export function VersionsTable({ versions, renderAction }: VersionsTableProps) {
  if (versions.length === 0) {
    return (
      <EmptyState
        title={t.detail.noVersionsTitle}
        description={t.detail.noVersionsBody}
        className="py-6"
      />
    )
  }

  return (
    <div
      className="overflow-hidden rounded-md border border-border"
      aria-label={t.detail.versionsTableLabel}
    >
      <div
        className={cn(
          'hidden gap-4 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid',
          renderAction ? 'sm:grid-cols-7' : 'sm:grid-cols-6',
        )}
      >
        {HEADERS.map((header) => (
          <span key={header.key}>{header.label}</span>
        ))}
        {renderAction && (
          <span className="sr-only">{t.lists.wizard.trigger}</span>
        )}
      </div>
      <ul className="divide-y divide-border">
        {versions.map((version) => (
          <li
            key={version.id}
            className={cn(
              'grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-3 sm:items-center sm:gap-y-0 sm:py-2',
              renderAction ? 'sm:grid-cols-7' : 'sm:grid-cols-6',
            )}
          >
            <Field
              label={t.detail.version.name}
              className="col-span-2 sm:col-span-1"
            >
              <span className="font-medium">{version.name}</span>
            </Field>
            <Field label={t.detail.version.episodes}>
              {formatEpisodeCount(version.episodes)}
            </Field>
            <Field label={t.detail.version.releaseDate}>
              {formatReleaseDate(version.releaseDate)}
            </Field>
            <Field label={t.detail.version.country}>
              {version.country ? (
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlag country={version.country} />
                  {version.country.name}
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Field label={t.detail.version.platform}>
              {version.platform?.name ?? '—'}
            </Field>
            <Field label={t.detail.version.dubbingStudio}>
              {version.dubbingStudio?.name ?? '—'}
            </Field>
            {renderAction && (
              <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
                {renderAction(version)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
