import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FranchiseGallery } from '@/features/catalog/components/FranchiseGallery'
import { t } from '@/i18n/en'
import type { ImageRef } from '@/features/catalog/types'

const images: ImageRef[] = [
  { id: 1, name: 'Key visual', url: '/mock-images/poster-1.svg' },
  { id: 2, name: 'Cover', url: '/mock-images/poster-2.svg' },
]

describe('FranchiseGallery', () => {
  it('no renderiza nada si la franquicia no tiene imágenes de galería', () => {
    const { container } = render(<FranchiseGallery images={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('arranca colapsada: el trigger está pero las imágenes no', () => {
    render(<FranchiseGallery images={images} />)

    expect(
      screen.getByRole('button', { name: t.detail.gallery.show(2) }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('al expandir, monta las imágenes lazy con su nombre como alt', async () => {
    const user = userEvent.setup()
    render(<FranchiseGallery images={images} />)

    await user.click(screen.getByRole('button', { name: t.detail.gallery.show(2) }))

    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('alt', 'Key visual')
    expect(imgs[0]).toHaveAttribute('loading', 'lazy')

    // El trigger cambia de label y colapsa de nuevo al volver a clickear.
    await user.click(screen.getByRole('button', { name: t.detail.gallery.hide }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
