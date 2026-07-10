import { setupWorker } from 'msw/browser'
import { handlers } from '@/mocks/handlers'

export const worker = setupWorker(...handlers)

/** Arranca MSW en el navegador (solo en modo mock). Se llama antes de montar React. */
export async function startMockWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass', // deja pasar assets, imágenes de /mock-images, etc.
    quiet: false,
  })
}
