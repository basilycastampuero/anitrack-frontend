import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListEntryRow } from '@/features/lists/components/ListEntryRow'
import type { ListEntry } from '@/features/lists/types'

function versionEntry(overrides: {
  displayName?: string
  version?: ListEntry['version']
} = {}): ListEntry & { version: NonNullable<ListEntry['version']> } {
  return {
    linkId: 5000,
    kind: 'version',
    displayName: overrides.displayName ?? 'Demon Slayer — Season 1',
    imageUrl: null,
    order: 0,
    contentType: 'V',
    franchiseId: 3,
    notes: null,
    version: overrides.version ?? {
      versionId: 1005,
      contentId: 104,
      abbreviation: 'KnY',
      watchedEpisodes: 12,
      totalEpisodes: 26,
      isSynced: false,
    },
  }
}

describe('ListEntryRow', () => {
  it('muestra el nombre, la abreviación y el progreso formateado', () => {
    render(<ListEntryRow entry={versionEntry()} />)

    expect(screen.getByText('Demon Slayer — Season 1')).toBeInTheDocument()
    expect(screen.getByText('KnY')).toBeInTheDocument()
    expect(screen.getByText('12/26')).toBeInTheDocument()
  })

  it('total desconocido (0) se muestra como "—", barra indeterminada', () => {
    const entry = versionEntry({
      version: {
        versionId: 1018,
        contentId: 113,
        abbreviation: 'S2',
        watchedEpisodes: 3,
        totalEpisodes: 0,
        isSynced: false,
      },
    })
    render(<ListEntryRow entry={entry} />)

    expect(screen.getByText('3/—')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  })

  it('sin abreviación, no renderiza el badge de abreviación', () => {
    const entry = versionEntry({
      version: {
        versionId: 1010,
        contentId: 107,
        abbreviation: null,
        watchedEpisodes: 1,
        totalEpisodes: 1,
        isSynced: false,
      },
    })
    render(<ListEntryRow entry={entry} />)

    expect(screen.queryByText('KnY')).not.toBeInTheDocument()
  })

  it('muestra el badge "Synced" solo cuando isSynced es true', () => {
    const { rerender } = render(<ListEntryRow entry={versionEntry()} />)
    expect(screen.queryByText('Synced')).not.toBeInTheDocument()

    rerender(
      <ListEntryRow
        entry={versionEntry({
          version: {
            versionId: 1005,
            contentId: 104,
            abbreviation: 'KnY',
            watchedEpisodes: 12,
            totalEpisodes: 26,
            isSynced: true,
          },
        })}
      />,
    )
    expect(screen.getByText('Synced')).toBeInTheDocument()
  })
})
