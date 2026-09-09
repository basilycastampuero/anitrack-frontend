import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { server } from '@/mocks/server'
import { listsService } from '@/features/lists/services/lists.service'
import { authService } from '@/features/auth/services/auth.service'
import type { ChecklistNode } from '@/features/lists/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

// A propósito NO hay un `afterEach(() => server.resetHandlers())` acá: este
// archivo no registra handlers por-test con `server.use(...)`, así que no hay
// nada que resetear ahí. Lo que sí se resetea — el DATO, no el handler — es
// `resetMockDb()`, enganchado globalmente en el `afterEach` de
// `src/test/setup.ts`. Eso es justo lo que este archivo demuestra: cada `it`
// de acá empieza contra el mismo mundo sin importar qué hizo el anterior.
//
// Para comprobarlo "en frío" (deuda #7, bitácora 13): comentar la llamada a
// `resetMockDb()` en `src/test/setup.ts` y correr este archivo — los tests B,
// D y F (que dependen de que A, C y E respectivamente NO hayan dejado rastro)
// pasan a fallar. Con el reset puesto, los seis pasan.

function findNode(nodes: ChecklistNode[], id: number): ChecklistNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

describe('resetMockDb restores mutable MSW state between tests', () => {
  describe('checklist tree (recursive delete)', () => {
    it('test A: deletes "All-time" (id 4), nested under "Favorites" (id 3)', async () => {
      expect(findNode(await listsService.getChecklists(), 4)).not.toBeNull()
      await listsService.deleteChecklist(4)
      expect(findNode(await listsService.getChecklists(), 4)).toBeNull()
    })

    it('test B: "All-time" is back — the previous test deletion does not leak in', async () => {
      expect(findNode(await listsService.getChecklists(), 4)).not.toBeNull()
    })
  })

  describe('deep clone (not shallow)', () => {
    it('test C: renames "2010s" (id 6), 4 levels deep under Favorites > All-time > By decade', async () => {
      const before = findNode(await listsService.getChecklists(), 6)
      expect(before?.name).toBe('2010s')
      await listsService.updateChecklist(6, { name: 'Renamed deep node' })
      const after = findNode(await listsService.getChecklists(), 6)
      expect(after?.name).toBe('Renamed deep node')
    })

    it('test D: "2010s" got its original name back — a shallow clone would share this nested node and leak the rename', async () => {
      const node = findNode(await listsService.getChecklists(), 6)
      expect(node?.name).toBe('2010s')
    })
  })

  describe('mock session (currentUserId)', () => {
    it('test E: logs in as user 2 (Sam Cortez)', async () => {
      const user = await authService.login({
        login: 'sam@example.com',
        password: 'password123',
      })
      expect(user.id).toBe(2)
      await expect(authService.me()).resolves.toMatchObject({ id: 2 })
    })

    it('test F: session is back to the default user (1) — the previous login does not leak in', async () => {
      await expect(authService.me()).resolves.toMatchObject({ id: 1 })
    })
  })
})
