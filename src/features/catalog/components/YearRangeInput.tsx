import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/en'

interface YearRangeInputProps {
  yearFrom: number | undefined
  yearTo: number | undefined
  onChange: (patch: { yearFrom?: number; yearTo?: number }) => void
}

function parseYear(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/**
 * Rango de años con dos inputs numéricos (doc 06 sugiere slider, pero no hay
 * librería de sliders en el proyecto y no vale la pena traer una para esto).
 * Estado local + commit en blur/Enter: evita reescribir la URL en cada
 * tecla mientras el usuario todavía está escribiendo el año.
 */
export function YearRangeInput({ yearFrom, yearTo, onChange }: YearRangeInputProps) {
  const [from, setFrom] = useState(yearFrom?.toString() ?? '')
  const [to, setTo] = useState(yearTo?.toString() ?? '')

  // Sincroniza el input si el filtro cambia desde afuera (ej. clearFilters).
  useEffect(() => setFrom(yearFrom?.toString() ?? ''), [yearFrom])
  useEffect(() => setTo(yearTo?.toString() ?? ''), [yearTo])

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="numeric"
        placeholder={t.catalog.yearFrom}
        aria-label={t.catalog.yearFrom}
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        onBlur={() => onChange({ yearFrom: parseYear(from) })}
        onKeyDown={(e) => e.key === 'Enter' && onChange({ yearFrom: parseYear(from) })}
        className="w-24"
      />
      <span className="text-sm text-muted-foreground" aria-hidden>
        –
      </span>
      <Input
        type="number"
        inputMode="numeric"
        placeholder={t.catalog.yearTo}
        aria-label={t.catalog.yearTo}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        onBlur={() => onChange({ yearTo: parseYear(to) })}
        onKeyDown={(e) => e.key === 'Enter' && onChange({ yearTo: parseYear(to) })}
        className="w-24"
      />
    </div>
  )
}
