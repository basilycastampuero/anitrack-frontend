import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface RatingStarsProps {
  /** 1–10, o `null` si el usuario no puntuó. */
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  className?: string
}

const STARS = 5
const MAX = STARS * 2

/** Cuánto se llena la estrella `index` para un puntaje dado: 0, 0.5 o 1. */
function fillOf(value: number, index: number): number {
  return Math.min(Math.max(value - index * 2, 0), 2) / 2
}

/**
 * Puntaje 1–10 con medias estrellas (doc 06). Detrás del flag `ratings`
 * (ADR-004): el backend de Chano no tiene el campo todavía.
 *
 * Por debajo es un **radiogroup de diez radios** visualmente ocultos, uno por
 * media estrella, y no un puñado de `<div onClick>`: así el teclado funciona
 * solo (flechas mueven entre opciones, igual que cualquier grupo de radios) y
 * el lector de pantalla anuncia "7 de 10" en vez de leer diez iconos sueltos.
 * Las estrellas son puramente decorativas y van `aria-hidden`.
 */
export function RatingStars({ value, onChange, disabled, className }: RatingStarsProps) {
  const current = value ?? 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <fieldset
        role="radiogroup"
        aria-label={t.lists.entry.ratingLabel}
        disabled={disabled}
        className="flex items-center"
      >
        {Array.from({ length: STARS }).map((_, index) => {
          const fill = fillOf(current, index)
          return (
            <span key={index} className="relative block size-6">
              <Star className="absolute inset-0 size-6 text-muted-foreground/40" aria-hidden />
              {fill > 0 && (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                  aria-hidden
                >
                  <Star className="size-6 fill-primary text-primary" />
                </span>
              )}
              {[index * 2 + 1, index * 2 + 2].map((score, half) => (
                <label
                  key={score}
                  className={cn(
                    'absolute inset-y-0 w-1/2',
                    half === 0 ? 'left-0' : 'right-0',
                    disabled ? 'cursor-default' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name="entry-rating"
                    className="sr-only"
                    value={score}
                    checked={current === score}
                    disabled={disabled}
                    onChange={() => onChange(score)}
                  />
                  <span className="sr-only">{t.lists.entry.ratingValue(score, MAX)}</span>
                </label>
              ))}
            </span>
          )
        })}
      </fieldset>
      <span className="text-sm tabular-nums text-muted-foreground">
        {value == null ? '—' : `${value}/${MAX}`}
      </span>
      {value != null && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {t.lists.entry.clearRating}
        </button>
      )}
    </div>
  )
}
