import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { isMockMode } from '@/lib/env'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'

interface OAuthButtonsProps {
  /** Destino final tras resolver la sesión en `/auth/callback` (mismo `?next=` de LoginPage). */
  next?: string
}

/**
 * Doc 04 (OAuth Twitch): no es un endpoint JSON, es navegación del navegador
 * hacia `/auth/oauth/twitch?redirect=<url-spa>` — el backend resuelve el flujo
 * `auth_oauth` existente y redirige de vuelta con la cookie ya puesta. Por eso
 * el botón real es un `<a href>`, nunca un `onClick` con `fetch`.
 *
 * `redirect` apunta a nuestra propia `/auth/callback`, arrastrando el `next`
 * original para que esa página sepa a dónde mandar al usuario una vez que
 * confirme la sesión (doc 12 §5, 3.3a).
 */
function buildTwitchOAuthUrl(next?: string): string {
  const callbackUrl = new URL(paths.authCallback, window.location.origin)
  if (next) callbackUrl.searchParams.set('next', next)

  const oauthUrl = new URL('/auth/oauth/twitch', window.location.origin)
  oauthUrl.searchParams.set('redirect', callbackUrl.toString())
  return oauthUrl.toString()
}

export function OAuthButtons({ next }: OAuthButtonsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="shrink" />
        <span className="text-xs text-muted-foreground uppercase">
          {t.auth.oauth.orDivider}
        </span>
        <Separator className="shrink" />
      </div>

      {isMockMode ? (
        // Sin backend real no hay redirect que resolver (ADR-001): el botón
        // queda deshabilitado en vez de simular un login que no puede pasar.
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Un <button disabled> no dispara eventos de puntero, así que el
                trigger del tooltip va en un wrapper habilitado alrededor. */}
            <span className="block w-full">
              <Button type="button" variant="outline" className="w-full" disabled>
                {t.auth.oauth.twitch}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t.auth.oauth.disabledInMock}</TooltipContent>
        </Tooltip>
      ) : (
        <Button asChild variant="outline" className="w-full">
          <a href={buildTwitchOAuthUrl(next)}>{t.auth.oauth.twitch}</a>
        </Button>
      )}
    </div>
  )
}
