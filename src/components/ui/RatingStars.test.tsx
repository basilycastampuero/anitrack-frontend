import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RatingStars } from '@/components/ui/RatingStars'

describe('RatingStars', () => {
  it('es un radiogroup de diez opciones, una por media estrella', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: 'Your rating' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(10)
  })

  it('marca la opción del valor actual y no otra', () => {
    render(<RatingStars value={7} onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: '7 out of 10' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '8 out of 10' })).not.toBeChecked()
  })

  it('elegir una media estrella avisa el puntaje impar', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<RatingStars value={null} onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: '5 out of 10' }))

    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('permite volver a "sin puntaje"', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<RatingStars value={8} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('sin puntaje no ofrece limpiar y muestra un guion', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
