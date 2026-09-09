import { describe, it, expect } from 'vitest'
import { formatReleaseDate } from '@/utils/date'

describe('formatReleaseDate', () => {
  it('formatea una fecha ISO en un formato legible', () => {
    expect(formatReleaseDate('2022-11-18')).toBe('Nov 18, 2022')
  })

  it('no corre un día hacia atrás en zonas con offset negativo', () => {
    // Regresión: sin timeZone: 'UTC', Intl.DateTimeFormat usa la zona local
    // del runtime y "2022-11-18" (medianoche UTC) cae en 2022-11-17.
    expect(formatReleaseDate('2019-04-06')).toBe('Apr 6, 2019')
  })

  it('devuelve el string original si la fecha es inválida', () => {
    expect(formatReleaseDate('not-a-date')).toBe('not-a-date')
  })
})
