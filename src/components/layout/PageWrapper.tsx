import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

/** Contenedor de página: ancho máximo y padding consistente (doc 06). */
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-6', className)}>
      {children}
    </div>
  )
}
