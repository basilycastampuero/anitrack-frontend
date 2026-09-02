# feature: auth

Sesión por cookie de Odoo (ADR-005): sin tokens en el front. `useMe` resuelve
`GET /auth/me` y sincroniza `sessionStore`. Login y register están
implementados (Sprint 3a, tareas 3.1/3.2); el callback OAuth de Twitch y el
botón social quedan para 3.3a.

- `services/` — `auth.service.ts` (login/logout/me/register)
- `hooks/` — `useMe`, `useLogin`, `useRegister`, `useLogout`, `queryKeys.ts`
  (única fuente de `queryKey` del feature — nunca escribirla a mano en otro
  lado)
- `types/` — `UserSession`, `LoginRequest`, `RegisterRequest`
- `components/` — `LoginForm`, `RegisterForm` (RHF + Zod; el schema del form
  valida más estricto que el contrato)

`useLogout` vacía además el cache privado de `lists` al salir (doc 12 §3): no
alcanza con limpiar `sessionStore`, porque TanStack Query se queda con datos
del usuario anterior en memoria.
