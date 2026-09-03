import { describe, it, expect } from 'vitest'
import { paths, safeNext } from '@/router/paths'

/**
 * Regresión #4 de la revisión pre-merge: `?next=` se leía crudo de la query
 * string y se pasaba directo a `navigate()`. `safeNext` es el único punto
 * que los 4 call sites (LoginPage, RegisterPage, useAuthCallback,
 * OAuthButtons vía prop) deben usar para resolverlo.
 */
describe('safeNext', () => {
  it('acepta una ruta interna válida', () => {
    expect(safeNext('/my-lists')).toBe('/my-lists')
  })

  it('sin valor cae al fallback (home por defecto)', () => {
    expect(safeNext(null)).toBe(paths.home)
    expect(safeNext('')).toBe(paths.home)
  })

  it('rechaza protocolo-relativo //evil.com', () => {
    expect(safeNext('//evil.com')).toBe(paths.home)
  })

  it('rechaza el truco de backslash /\\evil.com', () => {
    expect(safeNext('/\\evil.com')).toBe(paths.home)
  })

  it('rechaza una URL absoluta externa', () => {
    expect(safeNext('https://evil.com')).toBe(paths.home)
  })

  it('rechaza un esquema javascript:', () => {
    expect(safeNext('javascript:alert(1)')).toBe(paths.home)
  })

  it('respeta un fallback explícito distinto de home', () => {
    expect(safeNext(null, paths.myLists)).toBe(paths.myLists)
    expect(safeNext('//evil.com', paths.myLists)).toBe(paths.myLists)
  })
})
