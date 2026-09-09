import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetMockDb } from '@/mocks/reset'

// Limpia el DOM montado por RTL después de cada test.
//
// También resetea acá (no en cada archivo, junto a `server.resetHandlers()`)
// el estado mutable de MSW (deuda #7, bitácora 13): `setupFiles` corre para
// TODA la suite sin que un archivo nuevo tenga que acordarse de importarlo,
// que es justo el problema que causó la deuda (varios archivos lo esquivaron
// a mano en vez de arreglarlo). Es barato — son objetos en memoria, no I/O —
// así que no importa pagarlo también en archivos que no tocan MSW.
afterEach(() => {
  cleanup()
  resetMockDb()
})

// jsdom no implementa estas APIs del Pointer Events / scroll que Radix usa
// internamente (Select, DropdownMenu). Sin esto, abrir esos componentes en
// tests tira "not a function" aunque el comportamiento real no dependa de ellas.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom no implementa matchMedia; lo usan el theme store y hooks responsive.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
