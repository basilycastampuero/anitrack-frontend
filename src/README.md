# Estructura de `src/`

Feature-based (ADR-009). Regla de flujo: **components → hooks → services → API**.
Las `pages/` solo ensamblan features; ninguna llamada a la API vive fuera de
`services/`; sin fetching en `useEffect` (se usa TanStack Query).

```
src/
  assets/           # estáticos importados
  components/
    ui/             # shadcn/ui (vendorizado; no se lintea/formatea)
    common/         # design system propio (GenreBadge, EmptyState, ...)
    layout/         # Header, BottomTabs, PageWrapper, RootLayout, RequireAuth
  features/
    auth/    {services, hooks, types}
    catalog/ {components, services, hooks, types}   # search integrado aquí
    lists/   {services, hooks, types}               # checklists + links (tracking)
    profile/ {types}
  hooks/            # globales: useMediaQuery, useApplyTheme
  i18n/             # en.ts — todos los strings visibles (ADR-007)
  lib/              # http (axios), queryClient, env, features (flags), utils (cn)
  mocks/            # MSW: handlers + seed (ADR-008)
  pages/            # ensamblado de features por ruta
  router/           # rutas (lazy) y paths
  store/            # Zustand: sessionStore, themeStore
  test/             # setup de Vitest
  types/            # tipos compartidos (api, media)
  utils/            # funciones puras (progress, slug)
```

## Capas clave

- **`lib/http.ts`**: única instancia de Axios (`withCredentials`), normaliza todo
  error a `ApiError` y limpia la sesión ante 401. La adaptación a un backend Odoo
  con otra forma se haría aquí / en `lib/api/` sin tocar componentes (ADR-001).
- **`services/`**: cada respuesta se valida con Zod (detecta drift del contrato).
- **`store/`**: la cookie de sesión es la verdad; el store solo cachea el perfil.
