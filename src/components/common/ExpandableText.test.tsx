import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpandableText } from '@/components/common/ExpandableText'
import { t } from '@/i18n/en'

/**
 * jsdom no calcula layout real: scrollHeight/clientHeight son 0 por defecto,
 * así que simulamos overflow definiendo esos getters en el prototipo (ver
 * nota en ExpandableText.tsx).
 */
function mockOverflow(overflows: boolean) {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    value: overflows ? 90 : 40,
  })
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 40,
  })
}

afterEach(() => {
  Reflect.deleteProperty(window.HTMLElement.prototype, 'scrollHeight')
  Reflect.deleteProperty(window.HTMLElement.prototype, 'clientHeight')
})

describe('ExpandableText', () => {
  it('siempre pinta el texto, desborde o no', () => {
    mockOverflow(false)
    render(<ExpandableText text="A short description." />)
    expect(screen.getByText('A short description.')).toBeInTheDocument()
  })

  it('no muestra "Read more" si el texto entra sin desbordar', () => {
    mockOverflow(false)
    render(<ExpandableText text="A short description." />)
    expect(
      screen.queryByRole('button', { name: t.common.readMore }),
    ).not.toBeInTheDocument()
  })

  it('muestra "Read more" y alterna a "Read less" si el texto desborda', async () => {
    mockOverflow(true)
    const user = userEvent.setup()
    render(<ExpandableText text="A very long description that overflows." />)

    const button = await screen.findByRole('button', { name: t.common.readMore })
    await user.click(button)

    expect(
      screen.getByRole('button', { name: t.common.readLess }),
    ).toBeInTheDocument()
  })
})
