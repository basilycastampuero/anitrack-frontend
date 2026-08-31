import { Globe } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CountryRef } from '@/features/catalog/types'

interface CountryFlagProps {
  country: CountryRef
  className?: string
}

/** Bandera de un country con tooltip (doc 06). Cae a un ícono genérico sin imagen. */
export function CountryFlag({ country, className }: CountryFlagProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm',
            className,
          )}
        >
          {country.imageUrl ? (
            <img
              src={country.imageUrl}
              alt={country.name}
              className="size-full object-cover"
            />
          ) : (
            <Globe
              className="size-full text-muted-foreground"
              aria-label={country.name}
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{country.name}</TooltipContent>
    </Tooltip>
  )
}
