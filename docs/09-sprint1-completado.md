# 09 — Bitácora: Setup / Sprint 1 completado

> Registra qué se construyó realmente en el setup inicial (Fase 0 + Sprint 1 del
> doc 07), las decisiones tomadas sobre la marcha que no estaban en los ADRs
> originales, y cómo se verificó. Fecha: 2026-07-10.

## Alcance completado

Tareas 1.1–1.12 del plan de trabajo (doc 07) más CI, decidido como el primer
entregable: **fundaciones + design system tanda 1 + Home v1**, corriendo 100%
contra MSW (sin backend). Repo local, sin remoto todavía (Fase 0.3 pendiente).

| # | Tarea | Estado |
|---|---|---|
| 1.1 | Scaffold Vite + React 19 + TS strict | ✅ |
| 1.2 | Tooling (ESLint/Prettier/Vitest) | ✅ |
| 1.3 | Tailwind v4 + shadcn/ui | ✅ |
| 1.4 | Estructura de carpetas | ✅ |
| 1.5 | Router + páginas placeholder | ✅ |
| 1.6 | Layout responsive + dark mode | ✅ |
| 1.7 | Tipos + schemas Zod del dominio | ✅ |
| 1.8 | Axios instance + interceptors | ✅ |
| 1.9 | MSW + seed realista | ✅ |
| 1.10 | QueryClient config | ✅ |
| 1.11 | Design system tanda 1 + `/dev/ui` | ✅ |
| 1.12 | Home v1 | ✅ |
| — | CI (GitHub Actions) | ✅ |

## Qué se construyó

- **Scaffold**: Vite + React 19 + TypeScript `strict`, alias `@/` → `src/`.
- **Tooling**: ESLint flat config, Prettier, Vitest + Testing Library + jsdom.
  Scripts `dev/build/preview/lint/typecheck/test/format`.
- **Tailwind v4 + shadcn/ui**: tokens semánticos light/dark en `@theme` (CSS-first,
  sin `tailwind.config.js`), paleta propia para estados de listas (ADR-003) y
  géneros 1–11 (`genre_color` de Odoo). 19 componentes base de shadcn.
- **Estructura feature-based** (ADR-009): `auth`, `catalog`, `lists`, `profile`,
  cada uno con `components/hooks/services/types` y su propio README corto.
- **Router**: las 14 rutas del doc 06, todas lazy-loaded, con `<RequireAuth>`
  como layout-route guardando `/my-lists` y `/settings`.
- **Layout**: header sticky desktop + bottom tab bar mobile (decisión responsive
  clave del doc 06), toggle de tema con Zustand `persist`.
- **Dominio**: tipos + schemas Zod del contrato completo (doc 04/05), con
  `z.infer` como única fuente de verdad, incluyendo schemas recursivos para el
  árbol de checklists.
- **HTTP**: instancia de Axios (`withCredentials: true`), normalización de
  cualquier fallo a `ApiError` tipado, interceptor 401 que limpia la sesión.
- **QueryClient**: `staleTime` 60s, sin retry en errores 4xx.
- **MSW**: contrato completo implementado (catálogo, auth, checklists, links,
  library-index, perfiles), seed alineado con ADR-008 (franquicia mixta
  video+juego, multi-versión con doblajes en distinto país/plataforma, versión
  `episodes=0` en emisión, película de una sola versión, usuario poblado +
  usuario vacío), latencia simulada 200–600ms y errores inyectables vía
  `?mockError=CODE`.
- **Design system tanda 1**: `FranchiseCard`, `FranchiseCarousel`, `GenreBadge`,
  `LoadingSkeleton` (4 variantes), `EmptyState`, `ErrorState`, `UserAvatar`,
  visibles en `/dev/ui` (solo en dev).
- **Home v1**: hero, carrusel "Recently added" + filas por género, los 4 estados
  (loading/data/empty/error) resueltos.
- **CI**: `.github/workflows/ci.yml` corriendo lint + typecheck + test en cada
  push/PR.

## Decisiones tomadas sobre la marcha (no estaban en los ADRs)

Estas son ajustes que surgieron al ejecutar, no cambios de rumbo:

1. **Versiones más nuevas que el ADR-002**: el scaffold de Vite trajo **Vite 8**
   y **TypeScript ~6.0** (las estables actuales al momento de instalar), en vez
   de Vite 7/TS 5 mencionados en el ADR. El ADR-002 ya contemplaba ajustar
   versiones a las estables vigentes cuando el modelo mental es el mismo — es
   el caso aquí. `tsconfig.app.json` tuvo que quitar `baseUrl` (deprecado en
   TS 6) y dejar solo `paths` relativos.
2. **shadcn CLI escribe fuera de `src/`**: al no encontrar `paths` en
   `tsconfig.json` (solo estaban en `tsconfig.app.json`), el CLI de shadcn creó
   los componentes en una carpeta litera `@/` en la raíz. Se movieron a
   `src/components/ui/` y se agregaron los `paths` también a `tsconfig.json`
   para que un futuro `shadcn add` no repita el problema.
3. **`eslint-plugin-react-refresh` 0.5.3 no expone `configs` en formato flat**
   (solo `eslint-plugin-react-hooks` sí). Se registró `react-hooks` manualmente
   en `eslint.config.js` con sus dos reglas (`rules-of-hooks`,
   `exhaustive-deps`) y se dejó `react-refresh` fuera del lint (solo avisa
   límites de Fast Refresh, no bloquea nada esencial).
4. **`public/mockServiceWorker.js`** (generado por `msw init`) se excluyó del
   lint explícitamente: es código vendorizado, no nuestro.

## Reorganización de directorios (2026-07-10)

Después de terminar el Sprint 1, se reorganizó el workspace para que cada mitad
del proyecto viva en su propio directorio, igual que `ll-odoo/` para el
backend:

- Todo el código de frontend (antes en la raíz) se movió a `anitrack-frontend/`.
- La documentación se separó en tres carpetas por audiencia: `docs/` (raíz,
  general — visión + contrato de API), `docs-backend/` (análisis del backend y
  preguntas a Chano, sin tocar `ll-odoo/`), y `anitrack-frontend/docs/` (esta
  carpeta — ADRs, dominio, UI, plan de sprints, esta bitácora).
- Los nombres de archivo de los docs (`01-...` a `08-...`) se conservaron tal
  cual para que las menciones cruzadas informales ("doc 04", "doc 08") en el
  resto de los documentos sigan siendo válidas sin importar la carpeta.

## Entorno Docker (añadido 2026-07-10, post reorganización)

Se agregó un flujo de desarrollo containerizado, en paralelo al Sprint 1
(no era parte del plan original, pero era necesario para no depender de tener
Node instalado en el host y para dejar preparado el camino a probar contra el
backend real de Chano):

- `anitrack-frontend/Dockerfile`: multi-stage (`base` → `dev` con hot-reload,
  `build` → `production` con nginx sirviendo el bundle estático).
- `docker-compose.yml` en la raíz del workspace: servicio `frontend` (dev por
  defecto, contra MSW), `frontend-test` (Vitest en watch mode), y un perfil
  opcional `backend` que levanta `odoo` + `db` (Postgres) usando
  `ll-odoo/Dockerfile` tal cual, sin tocar ese repo.
- `vite.config.ts` ganó `server.host: true` para que el dev server sea
  alcanzable desde fuera del contenedor.

Instrucciones completas en `anitrack-frontend/README.md#docker`.

## Verificación

Todo corrido dentro de `anitrack-frontend/` tras la reorganización:

```bash
npm run lint       # 0 errores
npm run typecheck  # limpio (tsc --noEmit, strict)
npm run test       # 16 tests, 3 archivos, todos en verde
npm run build      # OK, code-splitting por ruta
npm run dev        # levanta en :5173; sirve /, mockServiceWorker.js
                    # y /mock-images/* con HTTP 200
```

Pendiente de verificación manual en navegador (no hecho en esta sesión): probar
Home con latencia visible, forzar `?mockError=INTERNAL` para ver `ErrorState`,
y revisar `/dev/ui` en ambos temas a 360px y 1440px.

## Qué falta (siguiente paso)

- Repo remoto en GitHub para `anitrack-frontend/` (Fase 0.3, cuenta secundaria
  `github.com-segundo`) — ver actualización abajo, falta solo el push inicial.
- Enviar `docs-backend/08-preguntas-backend.md` a Chano (bloqueo #1).
- Sprint 2 — catálogo completo (doc 07): `catalog.service` + hooks completos,
  FilterBar con estado en URL, página de catálogo con paginación, detalle de
  franquicia/contenido, SearchBar global.

## Actualización (2026-07-10, más tarde) — `docs/` y `docs-backend/` pasan a vivir dentro de este repo

La raíz del workspace (`chambaChambure/`) nunca llegó a tener su propio repo
Git formal (solo agrupaba carpetas). Para evitar tener documentación viva
fuera de cualquier repo, `docs/` (visión, contrato de API, brief original) y
`docs-backend/` (análisis del backend, preguntas a Chano) se movieron dentro
de `anitrack-frontend/`, como carpetas hermanas de este mismo `docs/`. La
distinción semántica se conserva: `docs-backend/` sigue siendo análisis de un
sistema externo (`ll-odoo/`), no decisiones propias del frontend.

De paso se inicializó el repo Git de `anitrack-frontend/` (Fase 0.3, parte 1):
rama `main` con el estado completo del Sprint 1 + docs unificados, y rama
`sprint-2-catalogo` creada desde `main` para el trabajo del próximo sprint.
Falta crear el repo remoto en GitHub (cuenta secundaria) y hacer el push
inicial.
