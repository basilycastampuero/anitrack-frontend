import { describe, it, expect } from 'vitest'
import { formatEpisodeCount } from '@/utils/episodes'

describe('formatEpisodeCount', () => {
  it('trata 0 como desconocido/en emisión, nunca "0 episodes"', () => {
    expect(formatEpisodeCount(0)).toBe('Unknown')
  })

  it('usa singular para 1 episodio', () => {
    expect(formatEpisodeCount(1)).toBe('1 episode')
  })

  it('usa plural para más de 1 episodio', () => {
    expect(formatEpisodeCount(26)).toBe('26 episodes')
  })
})
