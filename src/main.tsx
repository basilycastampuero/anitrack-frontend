import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/App'
import { isMockMode } from '@/lib/env'

/** Arranca MSW antes de montar React cuando estamos en modo mock (ADR-001). */
async function enableMocking() {
  if (!isMockMode) return
  const { startMockWorker } = await import('@/mocks/browser')
  await startMockWorker()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
