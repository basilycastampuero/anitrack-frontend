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

> ⚠️ **0.1 sigue abierto, pero dejó de ser el bloqueo #1** (actualizado
> 2026-08-31). El transporte se resolvió leyendo y escribiendo el backend
> (ADR-010/011 para el catálogo, ADR-014/015/016 para auth y listas), y la
> política sobre `ll-odoo` ahora permite trabajarlo en local. Lo que queda
> genuinamente en manos de Chano es de **producción**: el `redirect_uri` de
> su app de Twitch (3.3b), el `invitation_scope` de la instancia real
> (ADR-015) y si acepta el trabajo como PR. No bloquea el resto del plan (MSW cubre el 100%) y el spike 2.8 ya se
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

> ✅ **Sprint 2 completo** (2026-08-31): las 8 tareas (2.1–2.8) cerradas,
> objetivo demo cumplido — cierre en
> [10-sprint2-avance.md](./10-sprint2-avance.md) (sección "Actualización
> 2026-08-31 — Tareas 2.6 y 2.7 + Cierre de Sprint 2").

| # | Tarea | Detalle | CA | Estado |
|---|---|---|---|---|
| 2.1 | `catalog.service` + hooks | `useFranchiseList(filters)`, `useFranchiseDetail(id)`, `useSearch(q)` | Tests con MSW | ✅ (cerrada ya en Sprint 1) + `useGenres`/`usePlatforms` |
| 2.2 | FilterBar + estado en URL | hook `useCatalogFilters()` sobre searchParams | Refresh conserva filtros; back/forward OK | ✅ hook + `FilterBar` (chips, multi-select géneros/plataformas, rango de años, sort) + 17 tests |
| 2.3 | Página catálogo | Grid + paginación + skeleton + empty | Los 4 estados (loading/data/empty/error) demostrables | ✅ `CatalogPage` con grid, `PaginationControls` y los 4 estados + 10 tests |
| 2.4 | Detalle franquicia | Header, tabs V/G, ContentSection, tabla de versiones | Con seed multi-versión y episodios desconocidos | ✅ header con géneros derivados client-side, tabs (default "Videos" si ambas — ver ADR-012) y `VersionsTable`; `AddToListButton` y galería quedan fuera a propósito (corazón de Sprint 3 y tarea 2.7) — detalle en [10-sprint2-avance.md](./10-sprint2-avance.md) |
| 2.5 | Detalle contenido | Ruta propia/modal-route | Deep-link directo funciona | ✅ ruta propia (no modal-route) reutilizando `ContentSection` sin auto-enlace; deep-link directo probado — detalle en [10-sprint2-avance.md](./10-sprint2-avance.md) |
| 2.6 | SearchBar global | Debounce + dropdown + teclado + página resultados | Test de debounce e interacción | ✅ combobox accesible (patrón ARIA APG, hecho a mano — ver ADR-013) + `/search` reutilizando grid y filtros del catálogo. Brecha conocida: el buscador mobile no es colapsable inline, sigue navegando a `/search` como en Sprint 1 — detalle en [10-sprint2-avance.md](./10-sprint2-avance.md) |
| 2.7 | Galería de imágenes | Colapsable, lazy | — | ✅ bloque colapsable en `FranchiseDetailPage` sobre `franchise.gallery` (ya llegaba del contrato, no se usaba); lazy real: las `<img>` no se montan mientras está colapsada — detalle en [10-sprint2-avance.md](./10-sprint2-avance.md) |
| 2.8 | ⚠️ Spike integración real | Probar 1 endpoint real (franchises) vía proxy de Vite contra el **Odoo local** (`docker compose --profile backend up`) | Decisión documentada: adaptador necesario sí/no | ✅ **No hace falta adaptador**: se escribió un controlador REST propio en `ll-odoo` (rama `anitrack/rest-catalog-api`, commiteado, sin pushear) que emite directo el contrato del doc 04; 7/7 respuestas reales validadas contra los esquemas Zod del frontend. Matiz: la traducción no desapareció, se movió a Python del lado del backend — detalle completo en [11-spike-integracion-real.md](./11-spike-integracion-real.md) |

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

> ✅ **Sprint 3a completo** (2026-09-08): carril A 8/8 (3.1–3.6, incluida
> 3.5a/3.5b/3.5c) y carril B 5/5 (B1–B5, backend real en `ll-odoo` sin
> pushear), objetivo demo cumplido — cierre en
> [13-sprint3a-avance.md](./13-sprint3a-avance.md) (sección "Actualización
> 2026-09-08 — 3.5c cierra el carril A + Cierre de Sprint 3a").

> **Replanificado el 2026-08-31** tras el diseño técnico del sprint. El *qué*
> no cambió; el *cómo* está en [12-diseno-sprint3a.md](./12-diseno-sprint3a.md)
> y las decisiones de peso quedaron como **ADR-014 a ADR-017**. Cambios
> respecto de la versión anterior de esta tabla, con su motivo:
>
> - **Dos carriles (ADR-017).** El carril **A** (frontend, contra MSW) es el
>   camino crítico y no depende del carril **B** (backend en `ll-odoo`), que
>   ahora es posible porque la política sobre ese repo cambió. Las tareas de
>   backend se numeran **B1–B5** para no romper la numeración 3.1–3.11, que
>   otros documentos referencian.
> - **3.5 se parte en 3.5a/3.5b/3.5c.** Tal como estaba era tres tareas
>   disfrazadas de una: árbol accesible (ARIA `tree`), CRUD con cuatro
>   mutaciones, y el onboarding de *starter lists* (ADR-003, lo único que toca
>   el dominio).
> - **El CA de 3.5 pedía optimistic updates**, pero el corte 3a/3b se definió
>   justamente en "donde aparece el riesgo del optimistic", y los conceptos de
>   optimistic están listados en 3b. Se resuelve así: optimistic **solo** en
>   las mutaciones idempotentes sobre un nodo que ya existe (renombrar,
>   publicar); crear y borrar van por invalidación, porque el optimistic ahí
>   obliga a ids temporales y reconciliación del árbol — costo alto, valor
>   bajo, y el aprendizaje profundo del patrón sigue siendo 3.7.
> - **El CA de 3.6 era inverificable** ("renderiza igual que Odoo"): la
>   agregación la calcula `compute_show_name` en Python y el contrato (doc 04)
>   dice que `aggregatedProgress` llega **pre-calculado**. Reformulado contra
>   el contrato, que sí se puede testear.
> - **3.3 (OAuth Twitch) se parte y se mueve** — ver la nota debajo de la
>   tabla.

#### Carril A — frontend (camino crítico, contra MSW)

| # | Tarea | Detalle | CA |
|---|---|---|---|
| 3.1 | `auth.service` + store sesión | Ya existen `auth.service`, `sessionStore`, `useMe` y `<RequireAuth>` (Sprint 1). Falta: hooks `useLogin`/`useLogout`/`useRegister` con invalidación de `['auth','me']`, header `X-Requested-With` en la instancia de axios (ADR-016), y limpiar todo el cache privado en el logout | Login setea sesión y redirige a `next=`; logout deja el cache sin datos de `/me/*`; test del ciclo login→logout |
| 3.2 | Páginas login/register | RHF + Zod, errores de API mapeados al form, link a OAuth (ver 3.3a) | Estados demostrables: éxito, credenciales malas, `VALIDATION` de campo, server error |
| 3.3a | Botón de login social (mock) | Solo la UI: botón "Continue with Twitch" + `/auth/callback` que lee `?error=` y llama `me`. Sin proveedor real | Flujo mock completo de punta a punta; `?error=access_denied` muestra mensaje propio |
| 3.4 | `lists.service` + hooks | Ya existen `getChecklists`/`getEntries`/`getLibraryIndex`. Falta: `create`/`update`/`remove` de checklists y el resto de hooks + `queryKeys` centralizadas | Tests con MSW de cada mutación y de la invalidación que dispara |
| 3.5a | `ChecklistTree` accesible (solo lectura) | Patrón ARIA `tree`/`treeitem` con roving tabindex; expandir/colapsar; selección sincronizada con `/my-lists/:checklistId` | Navegación completa por teclado (flechas, Home/End, Enter); refresh conserva la lista seleccionada |
| 3.5b | CRUD de carpetas | Crear (raíz y sub), renombrar, borrar con confirmación, toggle publicar | Renombrar y publicar son optimistic con rollback; crear y borrar invalidan; los 4 con estado de error visible |
| 3.5c | Onboarding "starter lists" | EmptyState con CTA que crea Watching / Completed / On Hold / Dropped / Plan to Watch (ADR-003) | Usuario sin listas ve el CTA; al aceptar quedan las 5 listas y el árbol se puebla |
| 3.6 | Vista de entries | `ListEntryRow` + `FranchiseEntryGroup` + `ProgressBar`, en modo **lectura** (el stepper es 3.7) | Dado un `aggregatedProgress` del contrato, el grupo renderiza `[S1 12/12] - [S2 03/-]`; hay test del caso "total desconocido" y del entry suelto |

#### Carril B — backend en `ll-odoo` (rama `anitrack/rest-catalog-api`, nunca se pushea al remoto de Chano)

| # | Tarea | Detalle | CA |
|---|---|---|---|
| B1 | Spike de sesión | `security/portal_access.xml` en `ll_webpage` (ADR-014) + `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (ADR-015/016). **Va primero**, antes que 3.5 del carril A | Con `curl`: login de un usuario portal devuelve `UserSession` y cookie `SameSite=Lax`; `me` sin cookie da `401` con el sobre del contrato; un POST sin el header da `403` |
| B2 | Seed de listas en el Odoo local | Extender `scripts/seed-odoo.mjs` con el usuario portal del seed de MSW, sus checklists anidadas y sus links | `npm run seed:odoo` sigue siendo idempotente y deja un usuario portal con listas equivalentes a las de MSW |
| B3 | Endpoints `/me/*` de lectura | `GET /me/checklists` (filtrando `checklist_database = False` en todos los niveles), `/me/checklists/:id/entries` con `aggregatedProgress` replicando `compute_show_name`, `/me/library-index` | Las tres respuestas validan contra los esquemas Zod del frontend |
| B4 | Endpoints `/me/*` de escritura + fuga de imágenes | CRUD de checklists; y cerrar la deuda de ADR-014: `/api/v1/images/<id>` pasa a exigir pertenencia a catálogo publicado, y las imágenes privadas van por ruta autenticada | Un usuario no puede leer ni escribir la lista de otro (test con dos usuarios portal); una imagen de checklist privada da `404` en la ruta pública |
| B5 | Checkpoint de contrato | Correr los esquemas Zod del frontend contra las respuestas reales de auth + listas, como el spike 2.8 | Todos los esquemas en verde, o el drift documentado con su decisión |

> **3.3 (OAuth Twitch) cambia de forma y se mueve a 3b.** Verificado el
> 2026-08-30 y de nuevo el 2026-08-31 contra el Odoo local: existen 3
> proveedores OAuth de fábrica (Odoo.com habilitado, Facebook y Google
> deshabilitados) y **ninguno es Twitch**; `/web/login` solo ofrece Odoo.com.
> El módulo `ll_oauth` **no** es un módulo de Twitch: agrega el campo
> `ll_oauth_extra_params` al formulario de `auth.oauth.provider` y sincroniza
> nombre/email/foto en `_auth_oauth_signin` — maquinaria genérica y útil, pero
> el proveedor es configuración que vive en la base, no en el código.
> Consecuencia: la parte que **no** depende de nadie (botón, ruta de callback,
> manejo de `?error=`) es barata y se hace ahora como **3.3a**; la parte cara
> —registrar una app en Twitch, crear el `auth.oauth.provider`, y verificar en
> qué grupo cae el usuario que crea `_auth_oauth_signin`— se hace end-to-end
> en 3b como **3.3b**, donde ya no compite con el camino crítico del sprint.

**Orden y paralelismo.** B1 arranca primero (descubre el riesgo de
cookie/CSRF/ACL con margen). En el carril A, 3.1 y 3.2 abren el sprint; 3.4 no
depende de ellos (MSW ya deja al usuario 1 logueado por default), así que
**3.4 y 3.6 pueden ir en paralelo a 3.1/3.2**. 3.5a→3.5b→3.5c es una cadena y
es la parte más cara. 3.3a se puede hacer en cualquier momento después de 3.2.
Detalle completo, con el grafo de dependencias y los archivos que toca cada
tarea, en [12-diseno-sprint3a.md](./12-diseno-sprint3a.md).

**Conceptos a aprender en este sprint:** auth por cookie en SPA (por qué no
tokens en `localStorage`); CSRF y por qué aparece recién ahora que hay
POST/PATCH/DELETE; ACL vs. reglas de registro en un ORM (`ir.model.access` vs.
`ir.rule`); invalidación selectiva de queries; árboles accesibles (rol ARIA
`tree` y roving tabindex).

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
| 3.3b | ⚠️ OAuth Twitch end-to-end | Registrar una app de Twitch propia, crear el `auth.oauth.provider` en el Odoo local, verificar en qué grupo cae el usuario que crea `_auth_oauth_signin` (ADR-015 espera Portal) | Login por Twitch real contra el Odoo local, de punta a punta | ⚪ recortable |

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
| **Divergencia silenciosa MSW vs. backend** (ADR-017: dos implementaciones del mismo contrato durante 3a) | Alta | Medio | Checkpoint de contrato B5 con los esquemas Zod del frontend contra las respuestas reales; es obligatorio para cerrar el sprint — **✅ Cerrado (B5, 2026-09-08):** corrido contra el Odoo real, 19/20 en verde y **1 drift real encontrado y corregido** (`POST /auth/register`, commit `b5f30a3`, `ll-odoo`) — la mitigación cumplió exactamente su función, ver [13-sprint3a-avance.md](./13-sprint3a-avance.md) |
| **Las reglas de ADR-014 rompen el backoffice de Chano** (una `ir.rule` mal acotada aplica también al grupo Administrator — ya pasó en la prueba con `global=True`) | Baja | Alto | Las reglas van con `groups=[base.group_portal]`, nunca `global`; viven en `ll_webpage`, no en `ll_checklist`; test de regresión que verifica que el admin conserva read/write/unlink — **✅ Verificado (B3/B4, 2026-09-08):** el admin conserva read/write/unlink en `ll.checklist.link.copy` tras ampliar la regla a ambos lados de la relación en B4 |
| **Fuga de imágenes privadas por `/api/v1/images/<id>`** (sirve cualquier imagen por id con `sudo()`, sin filtro; hoy inocuo, deja de serlo cuando una checklist tenga imagen) | Media | Medio | Tarea B4: la ruta pública exige pertenencia a catálogo publicado; las privadas van por ruta autenticada — **✅ Cerrado (B4, 2026-09-08, commit `3c4e091` en `ll-odoo`):** `GET /api/v1/images/<id>` ahora exige pertenencia a catálogo publicado (`_image_in_published_catalog`), imágenes privadas sirven por `GET /me/images/<id>` con verificación de dueño (ver ADR-014 en [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md), bloque "[CERRADO 2026-09-08]") |
| **`auth_signup.invitation_scope` en `b2b` en producción** ⇒ el registro por email falla (es config de la base, no del código) | Media | Bajo | `/auth/register` devuelve `403 FORBIDDEN` con mensaje explícito y el formulario se oculta por flag (ADR-015); confirmar con Chano antes del deploy |
| Plazo más corto que las 10 semanas del plan | — | Alto | Orden de recorte explícito: primero los ⚪ (3.11, 4.9, 4.10), después los 🟡 de S3b (3.10, 3.9), después S4 al mínimo (4.1 fuera + deploy + README). S1→S3b son el producto y no se tocan |
