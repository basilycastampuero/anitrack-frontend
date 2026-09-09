import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaginationControls } from '@/features/catalog/components/PaginationControls'
import { t } from '@/i18n/en'

describe('PaginationControls', () => {
  it('no se renderiza si todo entra en una página', () => {
    const { container } = render(
      <PaginationControls page={1} pageSize={24} total={10} onPageChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('deshabilita "previous" en la primera página', () => {
    render(
      <PaginationControls page={1} pageSize={10} total={35} onPageChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: t.common.previous })).toBeDisabled()
    expect(screen.getByRole('button', { name: t.common.next })).toBeEnabled()
    expect(screen.getByText(t.common.pageOf(1, 4))).toBeInTheDocument()
  })

  it('deshabilita "next" en la última página', () => {
    render(
      <PaginationControls page={4} pageSize={10} total={35} onPageChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: t.common.next })).toBeDisabled()
    expect(screen.getByRole('button', { name: t.common.previous })).toBeEnabled()
  })

  it('avanza y retrocede de página', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PaginationControls page={2} pageSize={10} total={35} onPageChange={onPageChange} />,
    )

    await user.click(screen.getByRole('button', { name: t.common.next }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: t.common.previous }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
