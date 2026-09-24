import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingsPage from '@/pages/SettingsPage'
import { useSessionStore } from '@/store/sessionStore'
import { useThemeStore } from '@/store/themeStore'
import { t } from '@/i18n/en'

const user = {
  id: 7,
  odooUserId: 21,
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
}

beforeEach(() => {
  useSessionStore.setState({ user, status: 'authenticated' })
  useThemeStore.setState({ preference: 'system' })
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage (4.13)', () => {
  it('CA: el selector de tema es un radiogroup y persiste la elección', async () => {
    const ui = userEvent.setup()
    renderPage()

    const group = screen.getByRole('radiogroup', { name: t.settings.themeTitle })
    expect(group).toBeInTheDocument()
    // "system" es el default del store (doc 06).
    expect(screen.getByRole('radio', { name: t.theme.system })).toBeChecked()

    await ui.click(screen.getByRole('radio', { name: t.theme.dark }))

    expect(useThemeStore.getState().preference).toBe('dark')
    expect(screen.getByRole('radio', { name: t.theme.dark })).toBeChecked()
  })

  it('CA: la sección de cuenta muestra los datos de sesión y el botón de salir', () => {
    renderPage()

    expect(screen.getByText(user.name)).toBeInTheDocument()
    expect(screen.getByText(user.email)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t.auth.account.logout }),
    ).toBeInTheDocument()
  })
})
