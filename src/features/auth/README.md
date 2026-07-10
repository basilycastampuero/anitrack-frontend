# feature: auth

Sesión por cookie de Odoo (ADR-005): sin tokens en el front. `useMe` resuelve
`GET /auth/me` y sincroniza `sessionStore`. Las páginas de login/register y el
callback OAuth de Twitch se implementan en Sprint 3.

- `services/` — `auth.service.ts` (login/logout/me)
- `hooks/` — `useMe`
- `types/` — `UserSession`, `LoginRequest`
