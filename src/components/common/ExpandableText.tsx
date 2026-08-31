import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface ExpandableTextProps {
  text: string
  className?: string
}

/**
 * Párrafo colapsado a 3 líneas con toggle "Read more/less" (doc 06: descripción
 * expandible). El botón solo aparece si el texto realmente desborda el clamp
 * (se mide `scrollHeight` vs `clientHeight`) en vez de un umbral de caracteres,
 * que da falsos positivos/negativos según el ancho real (mobile vs desktop).
 *
 * Nota de test: jsdom no calcula layout real, así que `scrollHeight`/`clientHeight`
 * son 0 por defecto y el botón nunca aparece salvo que el test los mockee.
 */
export function ExpandableText({ text, className }: ExpandableTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    function measure() {
      const el = ref.current
      if (!el) return
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [text])

  return (
    <div className={className}>
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', !expanded && 'line-clamp-3')}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t.common.readLess : t.common.readMore}
        </Button>
      )}
    </div>
  )
}
