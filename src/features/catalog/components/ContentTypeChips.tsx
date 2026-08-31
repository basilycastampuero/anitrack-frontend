import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from '@/types/media.types'
import type { ContentType, VideoType } from '@/types/media.types'
import type { CatalogFilters } from '@/features/catalog/types'
import { t } from '@/i18n/en'

interface ContentTypeChipsProps {
  contentType: ContentType | undefined
  videoType: VideoType | undefined
  onChange: (patch: Partial<CatalogFilters>) => void
}

const CHIPS: { value: ContentType | undefined; label: string }[] = [
  { value: undefined, label: t.catalog.allTypes },
  { value: 'V', label: t.card.videos },
  { value: 'G', label: t.card.games },
]

const ALL_VIDEO_TYPES = 'ALL'

function VideoTypeSelect({
  videoType,
  onSelect,
}: {
  videoType: VideoType | undefined
  onSelect: (videoType: VideoType | undefined) => void
}) {
  return (
    <Select
      value={videoType ?? ALL_VIDEO_TYPES}
      onValueChange={(value) =>
        // Los únicos valores posibles son ALL_VIDEO_TYPES o uno de VIDEO_TYPES
        // (son los únicos que renderizamos como SelectItem más abajo).
        onSelect(value === ALL_VIDEO_TYPES ? undefined : (value as VideoType))
      }
    >
      <SelectTrigger size="sm" aria-label={t.catalog.videoType} className="w-[8.5rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VIDEO_TYPES}>{t.catalog.allVideoTypes}</SelectItem>
        {VIDEO_TYPES.map((videoTypeOption) => (
          <SelectItem key={videoTypeOption} value={videoTypeOption}>
            {VIDEO_TYPE_LABELS[videoTypeOption]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Chips de tipo de contenido (doc 06). "Games" limpia el videoType (no aplica);
 * el select de videoType solo aparece con `contentType === 'V'`.
 */
export function ContentTypeChips({ contentType, videoType, onChange }: ContentTypeChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CHIPS.map((chip) => {
        const isActive = contentType === chip.value
        return (
          <Button
            key={chip.label}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            aria-pressed={isActive}
            onClick={() =>
              onChange({
                contentType: chip.value,
                videoType: chip.value === 'V' ? videoType : undefined,
              })
            }
          >
            {chip.label}
          </Button>
        )
      })}
      {contentType === 'V' && (
        <VideoTypeSelect
          videoType={videoType}
          onSelect={(nextVideoType) => onChange({ videoType: nextVideoType })}
        />
      )}
    </div>
  )
}
