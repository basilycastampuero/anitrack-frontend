import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'

/** Servidor MSW para tests (Node). Los tests que peguen a servicios lo activan. */
export const server = setupServer(...handlers)
