# 10 — Bitácora: Avance Sprint 2 (catálogo)

> Registra el estado real del Sprint 2 (doc 07) a la fecha, más las tareas de
> infraestructura (repo remoto, CI) que se resolvieron en paralelo. No es un
> cierre de sprint — Sprint 2 sigue en curso. Fecha: 2026-07-23.

## Alcance completado

| # | Tarea | Estado |
|---|---|---|
| 2.1 | `catalog.service` + hooks (`useFranchiseList`, `useFranchiseDetail`, `useSearch`) | ✅ (ya cerrada desde Sprint 1, 2026-07-10) |
| 2.1b | `useGenres` / `usePlatforms` (hooks que faltaban para consumir `catalogService.getGenres/getPlatforms`) | ✅ |
| 2.2 | FilterBar + estado en URL (`useCatalogFilters()` sobre `searchParams`) | 🟡 parcial — hook terminado y testeado; falta el componente `FilterBar` |
| 2.3 | Página catálogo (grid + paginación + skeleton + empty) | ⬜ pendiente — `CatalogPage.tsx` sigue siendo el placeholder del Sprint 1 |
| 2.4 | Detalle franquicia | ⬜ pendiente |
| 2.5 | Detalle contenido | ⬜ pendiente |
| 2.6 | SearchBar global | ⬜ pendiente |
| 2.7 | Galería de imágenes | ⬜ pendiente |
| 2.8 | ⚠️ Spike integración real | ⬜ pendiente — ahora viable (hay Docker local con Odoo corriendo, ver doc 09), falta ejecutarlo |

**Corrección sobre la numeración:** la tarea 2.1 (`catalog.service` + hooks
`useFranchiseList`/`useFranchiseDetail`/`useSearch`) ya estaba cerrada desde el
Sprint 1 — los archivos tienen fecha 2026-07-10, aunque doc 09 no la listó
explícitamente. Lo nuevo de esta sesión (2026-07-23) son `useGenres` y
`usePlatforms` (hooks auxiliares que consumen funciones del service que
existían pero nadie usaba) y, sobre todo, `useCatalogFilters` — que
corresponde en realidad a la **tarea 2.2**, no a la 2.1. El camino crítico que
falta para demostrar el sprint sigue siendo la tarea 2.3 (página de catálogo).

## Qué se construyó

- **`useCatalogFilters`** (`src/features/catalog/hooks/useCatalogFilters.ts`):
  sincroniza los filtros del catálogo con `searchParams` de React Router — la
  URL es la única fuente de verdad (doc 06), sin duplicar este estado en
  Zustand. Formato de URL: `?type=V&genres=1,2&platforms=3&yearFrom=2010&yearTo=2020&sort=name&page=2&q=texto`
  (nombres cortos en la URL, distintos de los nombres largos del contrato de
  API — `contentType`/`genreIds`/`platformIds` — que usa el tipo
  `CatalogFilters`). Comportamiento clave:
  - Cambiar cualquier filtro que no sea `page` resetea la página a 1 (evita
    quedar en una página vacía tras filtrar).
  - Valores inválidos en la URL (editada a mano) se ignoran (`undefined`) en
    vez de romper el parseo.
  - Expone `{ filters, setFilters, clearFilters }`.
- **`useCatalogFilters.test.tsx`**: 5 tests (parseo desde URL, tolerancia a
  valores inválidos, reset de página al cambiar un filtro, no-reset cuando el
  único cambio es la página, `clearFilters`), con `renderHook` de
  `@testing-library/react` v16 y `MemoryRouter` como wrapper.
- **`useGenres.ts` / `usePlatforms.ts`**: hooks de TanStack Query sobre
  `catalogService.getGenres()` / `getPlatforms()` (el service y las
  `queryKeys` ya existían del Sprint 1, pero no tenían hook consumidor).
  `staleTime: Infinity` porque géneros y plataformas son casi estáticos.
- **Repo remoto en GitHub**: `basilycastampuero/anitrack-frontend` (cuenta
  **principal** del dueño, no la secundaria `github.com-segundo` prevista en
  la tarea 0.3 del plan — ver decisión abajo). Ramas `main` y
  `sprint-2-catalogo` pusheadas por SSH.
- **Docs actualizados y commiteados** (commit `5f72392`, previo a esta
  bitácora): primeras respuestas de Chano en
  `docs-backend/08-preguntas-backend.md` (hosting: Railway self-hosted, Odoo
  Community + Postgres en contenedores separados, sin Odoo.sh; sin staging
  remoto cómodo para iterar — reiniciar un servicio en Railway es lento, así
  que el frontend debe correr contra una instalación local de Odoo); y en
  `README.md`, documentación de por qué `docker-init/odoo-dev-entrypoint.sh`
  existe en vez de usar el `entrypoint.sh` de `ll-odoo/` tal cual (`--init=all`
  no instala módulos con `auto_install=False` como `ll_checklist`, `ll_oauth`,
  `ll_webpage`; el entrypoint propio los instala explícitamente con `-i`).

## Decisiones tomadas sobre la marcha (no estaban en los ADRs)

1. **Repo remoto en cuenta principal, no en `github.com-segundo`**: la tarea
   0.3 del plan (doc 07) preveía la cuenta secundaria (reservada para otros
   proyectos). Se decidió usar la cuenta **principal** del dueño porque este
   repo es exclusivamente el frontend de un proyecto de portafolio propio, sin
   relación con los proyectos que sí usan la cuenta secundaria. Push hecho por
   SSH con la key por defecto de la cuenta principal.
2. **Repo vacío duplicado en `Wo0Kat/anitrack-frontend`**: en el camino de
   decidir la cuenta se llegó a crear por error un repo vacío bajo la cuenta
   secundaria. Se decidió dejarlo existir sin usar (no se borró) en vez de
   gastar tiempo limpiándolo — no verificado de forma independiente en esta
   sesión (ver sección de pendientes).

## Verificación

Corrido en la raíz de `anitrack-frontend/`:

```bash
npm run typecheck   # limpio (tsc --noEmit, strict)
npm run lint        # 0 errores
npx vitest run       # 4 archivos, 21 tests, todos en verde (16 previos + 5 nuevos de useCatalogFilters)
```

Estado de Git al momento de escribir esta bitácora: rama `sprint-2-catalogo`,
1 commit por delante de `origin/sprint-2-catalogo` (el de docs, ya pusheado
según lo reportado — pendiente confirmar que el push efectivamente llegó, ver
abajo). Los 4 archivos nuevos de hooks (`useCatalogFilters.ts`,
`useCatalogFilters.test.tsx`, `useGenres.ts`, `usePlatforms.ts`) están sin
trackear (`??` en `git status`) — todavía no hay commit de código de esta
sesión.

CI: el workflow `.github/workflows/ci.yml` (lint + typecheck + test en push a
`main`/`develop` y en cualquier PR) figura como `active` en GitHub Actions del
repo (`basilycastampuero/anitrack-frontend`), con permisos habilitados
(`enabled: true`, `allowed_actions: all`), pero no registra ninguna ejecución
(`gh run list` devuelve vacío) pese a que ya hubo pushes a `main` y a
`sprint-2-catalogo` (esta última no dispara el workflow porque no está en la
lista `[main, develop]` ni es rama de un PR — eso también puede explicar, al
menos parcialmente, la ausencia de runs para el commit de docs). No se pudo
determinar la causa completa en esta sesión.

## Qué falta (siguiente paso)

- Commitear los 4 archivos de hooks de esta sesión (actualmente sin trackear).
- Confirmar que el push de la rama `sprint-2-catalogo` llegó a
  `origin` (el commit de docs aparece como "ahead by 1" localmente).
- **Camino crítico del sprint**: tarea 2.3 — reemplazar el placeholder de
  `src/pages/CatalogPage.tsx` por el grid real de `FranchiseCard` +
  paginación + los 4 estados (loading/data/empty/error), más el componente
  `FilterBar` que le falta a la tarea 2.2.
- Después: detalle de franquicia/contenido (2.4/2.5), SearchBar global (2.6),
  galería de imágenes (2.7), y el spike de integración real contra Odoo (2.8)
  — ahora viable porque ya hay un entorno Docker local con Odoo corriendo
  (doc 09).
- Confirmar por qué el CI no corrió ningún run (verificación de email o
  spending limit de cuenta nueva es la sospecha; también revisar si
  `sprint-2-catalogo` necesita agregarse a los `branches` del workflow o si
  conviene esperar al primer PR contra `main`).
- Seguir revisando `docs-backend/08-preguntas-backend.md` con Chano: solo
  respondió la sección de hosting; faltan las demás preguntas, algunas
  bloqueantes para el Sprint 3 (OAuth de Twitch).
- Verificar de forma independiente el estado del repo vacío
  `Wo0Kat/anitrack-frontend` (reportado, no confirmado con la cuenta
  `Wo0Kat` en esta sesión).

## Actualización (2026-08-31) — Tareas 2.4 y 2.5 completadas

> El spike 2.8 (doc 11, 2026-08-30) quedó cerrado entre esta bitácora y hoy.
> Esta actualización retoma el camino crítico del sprint: detalle de
> franquicia y detalle de contenido.

| # | Tarea | Estado |
|---|---|---|
| 2.4 | Detalle franquicia | ✅ |
| 2.5 | Detalle contenido | ✅ |

### Qué se construyó

- **`FranchiseHeader`** (`src/features/catalog/components/FranchiseHeader.tsx`):
  banner/poster, nombre principal + alternativos, géneros y descripción
  expandible. Los géneros se derivan **client-side** uniendo los
  `ContentDetail.genres` de todos los contents de la franquicia — el
  contrato (doc 04) no trae `genres` a nivel `FranchiseDetail`. Es la misma
  lógica que `src/mocks/seed/derive.ts` usa para el catálogo, reimplementada
  acá porque código de producción no puede importar de `src/mocks/`.
- **`ContentSection`** (`src/features/catalog/components/ContentSection.tsx`):
  bloque por content (imagen, videoType badge, descripción, `VersionsTable`),
  reutilizado entre `FranchiseDetailPage` (embebido, con link propio,
  `linkToDetail`) y `ContentDetailPage` (standalone, sin auto-enlazarse).
- **`VersionsTable`** (`src/features/catalog/components/VersionsTable.tsx`):
  un único markup responsive (no mobile-card + desktop-grid duplicados), para
  que el mismo valor de versión no aparezca dos veces en el DOM.
- **Tabs Videos/Games** en `FranchiseDetailPage`: se ocultan por completo si
  la franquicia tiene un solo tipo de contenido; si tiene ambos, default fijo
  "Videos" — ambigüedad del doc 06 resuelta en **ADR-012**
  ([03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md)).
- **`ExpandableText`** (`src/components/common/ExpandableText.tsx`) y
  **`CountryFlag`** (`src/components/common/CountryFlag.tsx`): agregados al
  design system (doc 06), reutilizables fuera de catalog.
- **`src/utils/episodes.ts` / `src/utils/date.ts`**: formatters puros.
  `formatEpisodeCount` muestra **"Unknown"** en vez de "0 episodes" cuando
  `episodes === 0` — cubre dos casos de dominio distintos con el mismo valor:
  anime en emisión (temporada final de AoT, Spy x Family S2, Pokémon
  Horizons) y "no aplica" en juegos (Scarlet, Witcher 3, Hollow Knight).
  `formatReleaseDate` fuerza `timeZone: 'UTC'`: sin eso, `new Date('2022-11-18')`
  (medianoche UTC) se corre un día atrás al formatear en timezones con offset
  negativo — bug real que habría sido invisible corriendo los tests en UTC.
- `src/utils/slug.ts` ganó `contentPath()` para el deep-link de contenido.
- `src/i18n/en.ts` ganó el namespace `detail`.

### Decisiones tomadas sobre la marcha (no estaban en los ADRs)

1. **Default de tabs Videos/Games → ADR-012** (ver arriba): el doc 06 no
   resolvía el caso de franquicia con ambos tipos poblados; se fijó "Videos"
   por ser dominio video-primero.
2. **Géneros del header derivados client-side**, no del contrato — ver "Qué
   se construyó" arriba.
3. **`ContentSection` reutilizado con flag `linkToDetail`** en vez de tener
   dos componentes casi idénticos para franquicia y contenido.

### Qué quedó fuera a propósito (no son pendientes olvidados)

- **`AddToListButton`**: el doc 06 lo pide en el detalle de franquicia, pero
  es el corazón del Sprint 3 (auth + optimistic updates) — fuera de scope de
  2.4/2.5 deliberadamente.
- **Galería de imágenes**: es la tarea **2.7**, fila propia del plan, sigue
  ⬜. `franchise.gallery` queda sin usar por ahora.
- **`content.companies`**: existe en el contrato pero el doc 06 no lo pide en
  `ContentSection`, así que no se muestra.

### Gotchas de testing (para no redescubrirlos a mano)

- **`ExpandableText`** mide overflow real con `scrollHeight`/`clientHeight`
  (no con un umbral de caracteres, que falla entre mobile y desktop). En
  jsdom ambas propiedades dan siempre `0`, así que sin mockearlas el botón
  "Read more" nunca aparece en los tests.
- **Radix `Tooltip`** exige un `TooltipProvider` ancestro. La app real lo
  tiene en `src/App.tsx`, pero un test que monte una página aislada (patrón
  de `CatalogPage.test.tsx`) y use `CountryFlag` revienta con un error
  engañoso ("Unable to find role=...") si el wrapper de test no lo incluye.

### Verificación

Corrido desde `anitrack-frontend/`:

```bash
npm run typecheck   # limpio
npm run lint        # 0 errores
npx vitest run       # 12 archivos, 60 tests, todos en verde (43 previos + 17 nuevos)
```

**No verificado**: navegador real (Playwright sigue sin Chromium instalado en
esta máquina — `npx playwright install chrome` pendiente). Dark mode y mobile
(360px) no se confirmaron visualmente; el diseño usa tokens semánticos
(`bg-muted`, `text-foreground`) y es mobile-first, consistente con el resto
del catálogo, pero eso es una promesa de diseño, no una verificación.

### Qué falta (siguiente paso)

- **Camino crítico del sprint**: tarea 2.6 (SearchBar global) y 2.7 (galería
  de imágenes de la franquicia).
- Verificación visual en navegador real (arrastrado desde doc 09/11).
- Seguir la conversación con Chano en
  [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md).

## Actualización (2026-08-31) — Tareas 2.6 y 2.7 + Cierre de Sprint 2

> Continúa la actualización anterior de esta misma fecha (2.4/2.5). Cierra el
> camino crítico que quedaba pendiente y, con él, **el Sprint 2 completo**:
> las ocho tareas (2.1–2.8) del plan (doc 07) quedan ✅.

### Alcance completado

| # | Tarea | Estado |
|---|---|---|
| 2.6 | SearchBar global | ✅ |
| 2.7 | Galería de imágenes | ✅ |

**Objetivo demo del sprint cumplido**: explorar el catálogo de punta a punta
(grid → franquicia → contenido → versiones), buscar y filtrar, todo contra
MSW.

### Qué se construyó

- **`SearchBar`** (`src/features/catalog/components/SearchBar.tsx`) +
  **`SearchResultsDropdown`**: combobox de autocompletado en el header,
  debounce de 300ms (`src/hooks/useDebouncedValue.ts` +
  `src/features/catalog/hooks/useSearchBar.ts`), dropdown accesible con
  navegación completa por teclado (patrón ARIA APG hecho a mano — ver
  ADR-013 en [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md)).
- **`src/pages/SearchPage.tsx`**: de placeholder a página real, reutiliza el
  grid y los filtros del catálogo con `q` fijo (usa la nueva opción `enabled`
  de `useFranchiseList`, agregada de forma retrocompatible).
- **`src/utils/slug.ts`** ganó `searchHitPath()` para armar la URL de cada
  hit del dropdown.
- **`FranchiseGallery`** (`src/features/catalog/components/FranchiseGallery.tsx`):
  bloque colapsable en `FranchiseDetailPage` sobre `franchise.gallery` — el
  campo ya llegaba del contrato (doc 04) pero nadie lo consumía. Lazy real:
  las `<img>` no se montan en el DOM mientras el bloque está colapsado.
- Tests nuevos: `SearchBar.test.tsx`, `FranchiseGallery.test.tsx`,
  `src/pages/SearchPage.test.tsx`.
- `src/i18n/en.ts` ganó los namespaces `search.*` y `detail.gallery.*`.

### Decisiones tomadas sobre la marcha (no estaban en los ADRs)

1. **Combobox escrito a mano (ARIA APG), sin sumar `cmdk`/`Popover`** —
   registrada como **ADR-013** por ser una decisión de peso (trade-off
   dependencia vs. mantenimiento propio), no solo una nota de bitácora.
2. **`FranchiseGallery` con estado propio, no `Collapsible` de Radix** —
   mismo criterio que `ExpandableText` (tarea 2.4): evita la animación de
   mount/unmount de Radix Presence, frágil de testear en jsdom.
3. **Hueco de contrato en `SearchHit`**: `GET /search` (doc 04) da
   `franchiseId` para hits `kind: "content"` pero no el nombre de la
   franquicia, necesario para armar el slug de esa URL. No rompe el
   routing (solo se parsea el id inicial de cada segmento) pero la URL
   queda sin slug en ese segmento (`/franchise/9/content/111-...`).
   Registrado en [04-contrato-api.md](./04-contrato-api.md) y como pregunta
   `[FE→BE]` 12.4 en
   [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md).
4. El "see all results" del dropdown se renderiza siempre, incluso durante
   loading o con 0 resultados — intencional, siempre da salida a la página
   completa.

### Qué quedó fuera a propósito (no son pendientes olvidados)

- **Buscador mobile no colapsable inline** como describe el doc 06: el
  ícono de búsqueda del header mobile sigue navegando a `/search`, tal como
  quedó en Sprint 1. El criterio de aceptación de 2.6 (debounce + teclado +
  página de resultados) no lo exigía, y sin verificación visual en
  navegador real sumaba riesgo implementarlo a ciegas. Queda pendiente de
  priorizar — brecha real contra el diseño, no un olvido.

### Gotchas de testing (para no redescubrirlos a mano)

- Los handlers de MSW del proyecto tienen un `delay()` artificial
  (200–600ms) sobre el mismo `setTimeout` global que usa
  `vi.useFakeTimers()`, así que mezclar fake timers con ese delay para
  testear el debounce es **flaky**. Solución: testear el debounce con
  timers reales — assert de "0 requests" inmediatamente después de tipear,
  y después esperar con `findByText` y un timeout generoso.

### Verificación

Corrido desde `anitrack-frontend/`:

```bash
npm run typecheck   # limpio
npm run lint        # 0 errores
npx vitest run       # 15 archivos, 75 tests, todos en verde (60 previos + 15 nuevos)
```

Suite de debounce corrida **3 veces** para descartar flakiness: estable en
las tres.

**No verificado**: navegador real (Playwright sigue sin Chromium instalado
en esta máquina). Dark mode, 360px y 1440px sin confirmar visualmente —
arrastrado desde doc 09/11 y ahora acumulado sobre varios componentes más
(`FilterBar`, detalle de franquicia/contenido, `SearchBar`, galería).

### Cierre de Sprint 2

Con 2.6 y 2.7 cerradas, las ocho tareas del sprint (doc 07) están ✅. El
objetivo demo (grid → franquicia → contenido → versiones, buscar, filtrar,
todo mockeado) está cumplido. Pendientes que **no** bloquean el cierre, ya
registrados arriba y en el resto de la documentación:

- Verificación visual en navegador real (Playwright sin Chromium).
- El hueco de `SearchHit` sin `franchiseName` (pregunta 12.4, doc 08).
- El buscador mobile no colapsable inline (brecha vs. doc 06).
- La conversación pendiente con Chano sobre auth/campos [EXT] (doc 08),
  bloqueante para la tarea 3.3 de Sprint 3a.

**Camino crítico a partir de ahora: Sprint 3a** (auth + estructura de
listas, doc 07) — ver [README.md](./README.md) para el estado general del
proyecto.
