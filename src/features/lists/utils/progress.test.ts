import { describe, it, expect } from 'vitest'
import { formatAggregatedProgress } from '@/features/lists/utils/progress'

describe('formatAggregatedProgress', () => {
  it('formatea varios grupos con abreviación, zero-padeando watched y total', () => {
    expect(
      formatAggregatedProgress([
        { abbreviation: 'S1', watched: 12, total: 12 },
        { abbreviation: 'S2', watched: 3, total: 0 },
      ]),
    ).toBe('[S1 12/12] - [S2 03/-]')
  })

  it('total=0 es "desconocido" (en emisión), no "cero episodios" -> se imprime "-"', () => {
    expect(formatAggregatedProgress([{ abbreviation: 'S2', watched: 3, total: 0 }])).toBe(
      '[S2 03/-]',
    )
  })

  it('un grupo sin abreviación no deja un espacio suelto dentro del corchete', () => {
    expect(formatAggregatedProgress([{ abbreviation: '', watched: 5, total: 12 }])).toBe(
      '[05/12]',
    )
  })

  it('no trunca totales de 3+ dígitos (solo zero-padea, no recorta)', () => {
    expect(formatAggregatedProgress([{ abbreviation: 'S1', watched: 5, total: 120 }])).toBe(
      '[S1 05/120]',
    )
  })

  it('sin grupos, no hay nada que renderizar', () => {
    expect(formatAggregatedProgress([])).toBe('')
  })
})
