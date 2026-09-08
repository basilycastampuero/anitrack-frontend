import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { StarterListsPrompt } from '@/features/lists/components/StarterListsPrompt'
import { listsService } from '@/features/lists/services/lists.service'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

function renderPrompt() {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <StarterListsPrompt />
    </QueryClientProvider>,
  )
}

describe('StarterListsPrompt', () => {
  it('muestra el título, la descripción y el botón de crear', () => {
    renderPrompt()

    expect(screen.getByText(t.lists.starterListsPrompt.title)).toBeInTheDocument()
    expect(screen.getByText(t.lists.starterListsPrompt.body)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t.lists.starterListsPrompt.cta }),
    ).toBeInTheDocument()
  })

  it('al hacer click deshabilita el botón y muestra el estado de carga mientras crea las cinco', async () => {
    const user = userEvent.setup()
    renderPrompt()

    const button = screen.getByRole('button', { name: t.lists.starterListsPrompt.cta })
    await user.click(button)

    expect(await screen.findByRole('button', { name: t.lists.starterListsPrompt.creating })).toBeDisabled()

    // Cinco POST secuenciales de 300ms cada uno (~1.5s): supera el timeout
    // por defecto de `waitFor` (1s).
    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: t.lists.starterListsPrompt.cta }),
        ).not.toBeDisabled()
      },
      { timeout: 4000 },
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  }, 8000)

  it('si la creación falla, muestra el mensaje de error del ApiError en vez del genérico', async () => {
    vi.spyOn(listsService, 'createChecklist').mockRejectedValue(
      new ApiError('INTERNAL', 'Injected failure', 500),
    )
    const user = userEvent.setup()
    renderPrompt()

    await user.click(screen.getByRole('button', { name: t.lists.starterListsPrompt.cta }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Injected failure')
  })
})
