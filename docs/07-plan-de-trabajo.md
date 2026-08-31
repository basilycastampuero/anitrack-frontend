# 07 — Plan de Trabajo Detallado

> 5 bloques de ~2 semanas (S1, S2, S3a, S3b, S4). Cada tarea tiene criterio de
> aceptación (CA). El orden dentro de un sprint es el orden recomendado de
> ejecución. ⚠️ = depende de respuesta del dev backend.
>
> **Leyenda de estado:** ✅ hecho · 🟡 en curso · ⬜ no empezado · ⛔ bloqueado.
> **Leyenda de prioridad:** 🔴 núcleo (sin esto no hay producto) · 🟡 importante
> · ⚪ recortable si aprieta el plazo.

## Fase 0 — Preparación (antes o durante el arranque del Sprint 1)

| # | Tarea | CA | Estado |
|---|---|---|---|
| 0.1 | Enviar doc 08 al dev de Odoo | Respuestas registradas en el propio doc | 🟡 **Parcial** — solo respondidas las de *Deploy/hosting* (Railway, sin staging). Transporte/API, Auth y Modelo de datos siguen sin respuesta |
| 0.2 | Validar decisiones de docs 03–06 con vos (dueño) | ADRs marcados aceptados/ajustados | ✅ |
| 0.3 | Crear repo `anitrack-frontend` en GitHub | Repo con README apuntando a estos docs | ✅ `basilycastampuero/anitrack-frontend` — en la cuenta **principal**, no en la secundaria que preveía esta tarea (motivo en [10-sprint2-avance.md](./10-sprint2-avance.md)). `main` y `sprint-2-catalogo` pusheadas |

> ⚠️ **0.1 es el bloqueo #1 y sigue abierto.** Sin las respuestas de transporte
> y auth, las tareas 3.3 (OAuth Twitch) y 4.1 (integración real) no tienen
> insumo. No bloquea el resto del plan (MSW cubre el 100%) y el spike 2.8 ya se
> puede hacer contra el Odoo local, pero cuanto más tarde lleguen las
> respuestas, más caro sale el adaptador del Sprint 4.

## Sprint 1 — Fundaciones (semanas 1–2)

**Objetivo demo:** app navegable con layout, dark mode, y home con datos mock.

| # | Tarea | Detalle | CA |
|---|---|---|---|
| 1.1 | Scaffold | Vite + React + TS strict, paths alias `@/` | `npm run dev` levanta; `tsc --noEmit` limpio |
| 1.2 | Tooling | ESLint (flat config) + Prettier + scripts; Vitest configurado | `npm run lint`/`test` pasan en CI local |
| 1.3 | Tailwind v4 + shadcn/ui init | Tokens de tema (light/dark) definidos en `@theme` | Botón shadcn renderiza en ambos temas |
| 1.4 | Estructura de carpetas | La del ADR-009, con README corto por carpeta | Estructura commiteada |
| 1.5 | Router + páginas placeholder | Todas las rutas del doc 06 con lazy loading | Navegar a cada ruta muestra su placeholder |
| 1.6 | Layout | Header desktop + bottom tabs mobile + toggle tema (Zustand persist) | Responsive verificado en 360px y 1440px |
| 1.7 | Tipos + schemas Zod del dominio | Docs 04/05 traducidos a código | `z.infer` = tipos exportados; tests de schema |
| 1.8 | Axios instance + interceptors | `withCredentials`, error normalizado a `ApiError`, 401 handler | Test unitario del interceptor |
| 1.9 | MSW + seed | Handlers de TODO el contrato + seed del ADR-008 | `/catalog` mock responde en devtools |
| 1.10 | QueryClient config | defaults: `staleTime 60s`, retry 1, error boundary integration | Provider montado |
| 1.11 | Design system tanda 1 | `FranchiseCard`, `GenreBadge`, `LoadingSkeleton`, `EmptyState`, `ErrorState`, `UserAvatar` | Página `/dev/ui` (solo dev) que los muestra en ambos temas |
| 1.12 | Home v1 | Carruseles con datos MSW + skeletons | Demo: home carga con latencia simulada visible |

**Conceptos a aprender en este sprint:** Tailwind v4 CSS-first config; MSW 2.x
(request handlers, delay, escenarios); arquitectura de QueryClient.

## Sprint 2 — Catálogo completo (semanas 3–4)

**Objetivo demo:** explorar el catálogo de punta a punta (grid → franquicia →
contenido → versiones), buscar, filtrar. Todo con MSW.

| # | Tarea | Detalle | CA | Estado |
|---|---|---|---|---|
| 2.1 | `catalog.service` + hooks | `useFranchiseList(filters)`, `useFranchiseDetail(id)`, `useSearch(q)` | Tests con MSW | ✅ (cerrada ya en Sprint 1) + `useGenres`/`usePlatforms` |
| 2.2 | FilterBar + estado en URL | hook `useCatalogFilters()` sobre searchParams | Refresh conserva filtros; back/forward OK | ✅ hook + `FilterBar` (chips, multi-select géneros/plataformas, rango de años, sort) + 17 tests |
| 2.3 | Página catálogo | Grid + paginación + skeleton + empty | Los 4 estados (loading/data/empty/error) demostrables | ✅ `CatalogPage` con grid, `PaginationControls` y los 4 estados + 10 tests |
| 2.4 | Detalle franquicia | Header, tabs V/G, ContentSection, tabla de versiones | Con seed multi-versión y episodios desconocidos | ⬜ |
| 2.5 | Detalle contenido | Ruta propia/modal-route | Deep-link directo funciona | ⬜ |
| 2.6 | SearchBar global | Debounce + dropdown + teclado + página resultados | Test de debounce e interacción | ⬜ |
| 2.7 | Galería de imágenes | Colapsable, lazy | — | ⬜ |
| 2.8 | ⚠️ Spike integración real | Probar 1 endpoint real (franchises) vía proxy de Vite contra el **Odoo local** (`docker compose --profile backend up`) | Decisión documentada: adaptador necesario sí/no | ✅ **No hace falta adaptador**: se escribió un controlador REST propio en `ll-odoo` (rama `anitrack/rest-catalog-api`, sin commitear/pushear) que emite directo el contrato del doc 04; 7/7 respuestas reales validadas contra los esquemas Zod del frontend. Matiz: la traducción no desapareció, se movió a Python del lado del backend — detalle completo en [11-spike-integracion-real.md](./11-spike-integracion-real.md) |

**Conceptos:** searchParams como estado; `keepPreviousData`/`placeholderData`
para paginación sin parpadeo; prefetch on-hover de cards.

## Sprint 3 — el corazón, partido en dos

El Sprint 3 original tenía 11 tareas, y las más pesadas del proyecto (auth,
árbol accesible, optimistic updates, wizard de 3 caminos). Se parte en **3a** y
**3b**, cada uno con su propio objetivo demo. **La numeración 3.1–3.11 se
conserva** para que las referencias cruzadas de los otros docs sigan siendo
válidas.

El corte está donde la app cambia de naturaleza: al terminar 3a existe sesión y
listas navegables (un CRUD); en 3b aparece el tracking, que es el valor real
del producto y donde vive todo el riesgo técnico (optimistic + rollback).

### Sprint 3a — Auth + estructura de listas (semanas 5–6)

**Objetivo demo:** iniciar sesión, crear y organizar listas propias, ver sus
entries (todavía sin poder modificar progreso).

| # | Tarea | Detalle | CA |
|---|---|---|---|
| 3.1 | `auth.service` + store sesión | login/logout/me; Zustand `sessionStore`; `<RequireAuth>` | Redirect a login y `next=` funcionan |
| 3.2 | Páginas login/register | RHF + Zod, errores de API en el form | Estados: éxito, credenciales malas, server error |
| 3.4 | `lists.service` + hooks | CRUD checklists, entries, links, library-index | Tests |
| 3.5 | ChecklistTree | Árbol accesible + CRUD carpetas + onboarding "starter lists" | Crear/renombrar/borrar/publicar con optimistic |
| 3.6 | Vista de entries | `ListEntryRow` + `FranchiseEntryGroup` + `ProgressBar` | Agregación `[S1 12/12]` renderiza igual que Odoo |
| 3.3 | ⚠️ Callback OAuth Twitch | Según respuesta backend; con MSW se simula | Flujo mock completo |

> 3.3 va **al final** del sprint a propósito: depende de la Fase 0.1, que sigue
> abierta. Con login por credenciales (3.1/3.2) el sprint ya cumple su objetivo
> demo; si no hay respuesta de Chano, 3.3 se corre a 3b sin costo.

**Conceptos:** auth por cookie en SPA (por qué no localStorage tokens);
invalidación selectiva de queries; árboles accesibles (roles ARIA `tree`).

### Sprint 3b — Tracking y vinculación (semanas 7–8)

**Objetivo demo:** vincular una versión desde el catálogo, subir progreso con
optimistic update, ver el perfil público con stats.

| # | Tarea | Detalle | CA | Prioridad |
|---|---|---|---|---|
| 3.7 | `EpisodeStepper` optimistic | Patrón onMutate/rollback; también en card de detalle | Corte de red simulado → rollback + toast | 🔴 núcleo |
| 3.8 | `LinkWizard` | Flujo completo del doc 06 incl. ALREADY_LINKED y synced copy | Los 3 caminos demostrables | 🔴 núcleo |
| 3.9 | `library-index` en catálogo | Cards muestran "in your list" | Se actualiza al agregar/quitar | 🟡 importante |
| 3.10 | Perfil público + stats | StatsGrid client-side v1 | Perfil vacío (EmptyState) y poblado | 🟡 importante |
| 3.11 | RatingStars + notas [flag] | ADR-004; visible solo con flag | Flag off ⇒ ni rastro en la UI | ⚪ recortable |

3.7 y 3.8 son el producto: sin ellos AniTrack es un catálogo con listas vacías.
Si el sprint se desborda, lo que se recorta es 3.11 primero y 3.10 después
(el perfil puede quedar en v1 mínimo sin StatsGrid).

**Conceptos:** optimistic updates en profundidad (onMutate / onError / rollback
/ onSettled); por qué el rollback es la parte que hay que testear, no el happy
path.

## Sprint 4 — Integración, pulido y deploy (semanas 9–10)

| # | Tarea | Detalle | CA |
|---|---|---|---|
| 4.1 | ⚠️ Integración backend real | Adaptador en `lib/api/`; apagar MSW por env (`VITE_API_MODE=real\|mock`) | Flujos core contra Odoo real |
| 4.2 | Animaciones | Transiciones de ruta, stagger, layout animations, reduced-motion | Revisión visual completa |
| 4.3 | Barrido responsive + a11y | 360/768/1024/1440; teclado; contraste | Checklist en PR |
| 4.4 | Manejo de errores global | ErrorBoundary por página, retry, 404, offline banner | Errores inyectados por MSW demostrables |
| 4.5 | Performance | code-splitting por ruta (ya), `React.lazy` de modales pesados, memo en grids, bundle analyze | Lighthouse ≥ 90 perf/a11y en `/catalog` |
| 4.6 | Tests | Unit (utils, adapters, schemas) + componentes críticos (stepper, wizard, filterbar) + 1 flujo integración (agregar a lista) | Coverage razonable en features core, CI verde |
| 4.7 | Deploy | Vercel/Netlify + rewrites `/api` y `/web/image` → Odoo (ADR-005) | URL pública funcionando |
| 4.8 | README de portafolio | Screenshots/GIF, stack, arquitectura, link a docs, demo con cuenta seed | Redactado en inglés |
| 4.9 | (stretch) Infinite scroll catálogo | `useInfiniteQuery` | — |
| 4.10 | (stretch) Drag & drop en árbol/entries | dnd-kit | — |

## Definition of Done (toda tarea de UI)

- [ ] TypeScript sin `any` ni `as` injustificados
- [ ] Estados loading (skeleton) / empty / error implementados
- [ ] Dark mode y mobile verificados
- [ ] Strings en `i18n/en.ts`, no hardcodeados
- [ ] Componente < ~150 líneas o dividido
- [ ] Sin llamadas a API fuera de services; sin fetch en useEffect

## Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| El dev backend no implementa la API a tiempo | Alta | Alto | MSW cubre el 100%; el deliverable de portafolio no depende de Odoo; demo con `VITE_API_MODE=mock` |
| **El doc 08 no se responde nunca** (materializándose: solo la sección de hosting tiene respuesta) | Alta | Medio | 3.3 y 4.1 no se planifican hasta tener insumo; el resto avanza igual. El spike 2.8 contra el Odoo local reemplaza parte de las respuestas (el transporte se descubre leyendo el backend). Fecha límite propia: si a fin del Sprint 3a no hay respuestas de auth, se congela 4.1 y el deliverable queda 100% mock |
| El contrato real difiere del propuesto | Media | Medio | Adaptador aislado + schemas Zod detectan drift en runtime |
| Modelo Odoo cambia (rama activa) | Media | Medio | Contrato acordado temprano (Fase 0); re-mapear solo en adaptador |
| CORS/cookies bloquean integración | Media | Alto | ADR-005 same-origin por proxy; plan B CORS documentado |
| Scope creep del brief (reviews, recomendaciones) | Media | Medio | Doc 01 fija alcance; extras = v2 |
| Plazo más corto que las 10 semanas del plan | — | Alto | Orden de recorte explícito: primero los ⚪ (3.11, 4.9, 4.10), después los 🟡 de S3b (3.10, 3.9), después S4 al mínimo (4.1 fuera + deploy + README). S1→S3b son el producto y no se tocan |
