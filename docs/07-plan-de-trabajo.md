# 07 — Plan de Trabajo Detallado

> 4 sprints de ~2 semanas (ajustable a 1 semana c/u si el plazo es 1 mes).
> Cada tarea tiene criterio de aceptación (CA). El orden dentro de un sprint es
> el orden recomendado de ejecución. ⚠️ = depende de respuesta del dev backend.

## Fase 0 — Preparación (antes o durante el arranque del Sprint 1)

| # | Tarea | CA |
|---|---|---|
| 0.1 | Enviar doc 08 al dev de Odoo | Respuestas registradas en el propio doc |
| 0.2 | Validar decisiones de docs 03–06 con vos (dueño) | ADRs marcados aceptados/ajustados |
| 0.3 | Crear repo `anitrack-frontend` en GitHub (cuenta secundaria, ver ssh alias `github.com-segundo`) | Repo con README apuntando a estos docs |

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

| # | Tarea | Detalle | CA |
|---|---|---|---|
| 2.1 | `catalog.service` + hooks | `useFranchiseList(filters)`, `useFranchiseDetail(id)`, `useSearch(q)` | Tests con MSW |
| 2.2 | FilterBar + estado en URL | hook `useCatalogFilters()` sobre searchParams | Refresh conserva filtros; back/forward OK |
| 2.3 | Página catálogo | Grid + paginación + skeleton + empty | Los 4 estados (loading/data/empty/error) demostrables |
| 2.4 | Detalle franquicia | Header, tabs V/G, ContentSection, tabla de versiones | Con seed multi-versión y episodios desconocidos |
| 2.5 | Detalle contenido | Ruta propia/modal-route | Deep-link directo funciona |
| 2.6 | SearchBar global | Debounce + dropdown + teclado + página resultados | Test de debounce e interacción |
| 2.7 | Galería de imágenes | Colapsable, lazy | — |
| 2.8 | ⚠️ Spike integración real | Si ya hay respuestas del backend: probar 1 endpoint real (franchises) vía proxy de Vite | Decisión documentada: adaptador necesario sí/no |

**Conceptos:** searchParams como estado; `keepPreviousData`/`placeholderData`
para paginación sin parpadeo; prefetch on-hover de cards.

## Sprint 3 — Auth + Listas + Tracking (semanas 5–6) — el corazón

**Objetivo demo:** login, crear listas, vincular una versión desde el catálogo,
subir progreso con optimistic update, ver perfil público.

| # | Tarea | Detalle | CA |
|---|---|---|---|
| 3.1 | `auth.service` + store sesión | login/logout/me; Zustand `sessionStore`; `<RequireAuth>` | Redirect a login y `next=` funcionan |
| 3.2 | Páginas login/register | RHF + Zod, errores de API en el form | Estados: éxito, credenciales malas, server error |
| 3.3 | ⚠️ Callback OAuth Twitch | Según respuesta backend; con MSW se simula | Flujo mock completo |
| 3.4 | `lists.service` + hooks | CRUD checklists, entries, links, library-index | Tests |
| 3.5 | ChecklistTree | Árbol accesible + CRUD carpetas + onboarding "starter lists" | Crear/renombrar/borrar/publicar con optimistic |
| 3.6 | Vista de entries | `ListEntryRow` + `FranchiseEntryGroup` + `ProgressBar` | Agregación `[S1 12/12]` renderiza igual que Odoo |
| 3.7 | `EpisodeStepper` optimistic | Patrón onMutate/rollback; también en card de detalle | Corte de red simulado → rollback + toast |
| 3.8 | `LinkWizard` | Flujo completo del doc 06 incl. ALREADY_LINKED y synced copy | Los 3 caminos demostrables |
| 3.9 | `library-index` en catálogo | Cards muestran "in your list" | Se actualiza al agregar/quitar |
| 3.10 | Perfil público + stats | StatsGrid client-side v1 | Perfil vacío (EmptyState) y poblado |
| 3.11 | RatingStars + notas [flag] | ADR-004; visible solo con flag | Flag off ⇒ ni rastro en la UI |

**Conceptos:** optimistic updates en profundidad; auth por cookie en SPA
(por qué no localStorage tokens); invalidación selectiva de queries.

## Sprint 4 — Integración, pulido y deploy (semanas 7–8)

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
| El contrato real difiere del propuesto | Media | Medio | Adaptador aislado + schemas Zod detectan drift en runtime |
| Modelo Odoo cambia (rama activa) | Media | Medio | Contrato acordado temprano (Fase 0); re-mapear solo en adaptador |
| CORS/cookies bloquean integración | Media | Alto | ADR-005 same-origin por proxy; plan B CORS documentado |
| Scope creep del brief (reviews, recomendaciones) | Media | Medio | Doc 01 fija alcance; extras = v2 |
| Plazo de 1 mes en vez de 2 | — | Alto | Prioridad estricta: S1→S3 son el producto; S4 recortable (deploy mínimo + pulido esencial) |
