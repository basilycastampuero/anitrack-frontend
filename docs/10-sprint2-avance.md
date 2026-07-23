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
