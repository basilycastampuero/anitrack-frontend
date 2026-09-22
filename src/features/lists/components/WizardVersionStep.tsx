import { Button } from '@/components/ui/button'
import { formatEpisodeCount } from '@/utils/episodes'
import { formatReleaseDate } from '@/utils/date'
import type { VersionDetail } from '@/features/catalog/types'

interface WizardVersionStepProps {
  versions: VersionDetail[]
  onChoose: (versionId: number) => void
}

/**
 * Paso 1 del wizard (doc 06): elegir versión. No se renderiza cuando el
 * content tiene una sola versión, ni cuando el botón de origen ya vino con una
 * elegida — que es el caso de la tabla de versiones.
 */
export function WizardVersionStep({
  versions,
  onChoose,
}: WizardVersionStepProps) {
  return (
    <ul className="space-y-2">
      {versions.map((version) => (
        <li key={version.id}>
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full justify-start py-2 text-left"
            onClick={() => onChoose(version.id)}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium">{version.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatEpisodeCount(version.episodes)} ·{' '}
                {formatReleaseDate(version.releaseDate)}
                {version.country ? ` · ${version.country.name}` : ''}
              </span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  )
}
