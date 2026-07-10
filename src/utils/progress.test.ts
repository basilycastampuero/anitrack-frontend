import { describe, it, expect } from 'vitest'
import { toProgress, formatProgress } from '@/utils/progress'

describe('toProgress', () => {
  it('calcula el porcentaje con total conocido', () => {
    expect(toProgress(3, 12)).toEqual({ watched: 3, total: 12, percent: 25 })
  })

  it('trata total=0 como desconocido (barra indeterminada)', () => {
    expect(toProgress(3, 0)).toEqual({ watched: 3, total: null, percent: null })
  })

  it('acota el porcentaje a 100 si watched excede el total', () => {
    expect(toProgress(15, 12).percent).toBe(100)
  })
})

describe('formatProgress', () => {
  it('usa — para total desconocido', () => {
    expect(formatProgress(toProgress(3, 0))).toBe('3/—')
  })

  it('muestra ambos valores cuando el total es conocido', () => {
    expect(formatProgress(toProgress(3, 12))).toBe('3/12')
  })
})
