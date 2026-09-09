import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FranchiseEntryGroup } from '@/features/lists/components/FranchiseEntryGroup'
import type { ListEntry } from '@/features/lists/types'

/** Espejo del entry "Spy x Family" del seed de MSW (src/mocks/seed/lists.ts):
 * franchise-link con 2 hijos, S2 con total desconocido. */
function franchiseEntry(overrides: Partial<ListEntry> = {}): ListEntry {
  return {
    linkId: 5001,
    kind: 'franchise',
    displayName: 'Spy x Family',
    imageUrl: null,
    order: 1,
    contentType: 'V',
    franchiseId: 10,
    notes: null,
    showProgress: true,
    aggregatedProgress: {
      groups: [
        { abbreviation: 'S1', watched: 25, total: 25 },
        { abbreviation: 'S2', watched: 3, total: 0 },
      ],
    },
    childEntries: [
      {
        linkId: 5002,
        kind: 'version',
        displayName: 'Season 1',
        imageUrl: null,
        order: 0,
        contentType: 'V',
        franchiseId: 10,
        notes: null,
        version: {
          versionId: 1017,
          contentId: 113,
          abbreviation: 'S1',
          watchedEpisodes: 25,
          totalEpisodes: 25,
          isSynced: false,
        },
      },
      {
        linkId: 5003,
        kind: 'version',
        displayName: 'Season 2',
        imageUrl: null,
        order: 1,
        contentType: 'V',
        franchiseId: 10,
        notes: null,
        version: {
          versionId: 1018,
          contentId: 113,
          abbreviation: 'S2',
          watchedEpisodes: 3,
          totalEpisodes: 0,
          isSynced: false,
        },
      },
    ],
    ...overrides,
  }
}

describe('FranchiseEntryGroup', () => {
  it('renderiza el header con el nombre y el progreso agregado formateado (CA doc 07)', () => {
    render(<FranchiseEntryGroup entry={franchiseEntry()} />)

    expect(screen.getByText('Spy x Family')).toBeInTheDocument()
    expect(screen.getByText('[S1 25/25] - [S2 03/-]')).toBeInTheDocument()
  })

  it('renderiza cada hijo como una ListEntryRow, ya expandido por defecto', () => {
    render(<FranchiseEntryGroup entry={franchiseEntry()} />)

    expect(screen.getByText('Season 1')).toBeInTheDocument()
    expect(screen.getByText('Season 2')).toBeInTheDocument()
    expect(screen.getByText('25/25')).toBeInTheDocument()
    expect(screen.getByText('3/—')).toBeInTheDocument()
  })

  it('colapsa y expande al hacer click en el header', async () => {
    const user = userEvent.setup()
    render(<FranchiseEntryGroup entry={franchiseEntry()} />)

    await user.click(screen.getByRole('button', { name: /Spy x Family/ }))
    expect(screen.queryByText('Season 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Spy x Family/ }))
    expect(screen.getByText('Season 1')).toBeInTheDocument()
  })

  it('showProgress=false no muestra ningún texto de progreso agregado (igual que Odoo)', () => {
    render(<FranchiseEntryGroup entry={franchiseEntry({ showProgress: false })} />)

    expect(screen.queryByText(/\[S1/)).not.toBeInTheDocument()
  })
})
