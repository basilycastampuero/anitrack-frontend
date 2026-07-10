# AniTrack — Frontend

Frontend en React para AniTrack: un catálogo de juegos/anime con checklists
personales y seguimiento de progreso de episodios. Backend en Odoo (proyecto de
Chano / `chanochambure`, repo Git propio en `../ll-odoo/`, intocable); este
repositorio es el proyecto frontend completo, incluida su documentación.

> Toda la documentación vive en este repo: visión general, contrato de API y
> decisiones del frontend en [`docs/`](./docs/README.md); análisis del backend
> de Chano y preguntas pendientes en [`docs-backend/`](./docs-backend/README.md).

## Stack

React 19 · TypeScript strict · Vite · React Router 7 · TanStack Query 5 ·
Zustand · Tailwind CSS 4 · shadcn/ui · Zod · Axios · MSW · Vitest + RTL.

## Requisitos

- Node.js 20+ (probado con Node 24)
- npm 10+

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta la app con MSW (datos mock). |
| `npm run build` | Type-check + build de producción. |
| `npm run preview` | Sirve el build. |
| `npm run lint` | ESLint (flat config). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | Vitest (una pasada). |
| `npm run format` | Prettier sobre `src/`. |

## Modo de datos

Durante el desarrollo la app corre 100% contra **MSW** (mocks), sin backend
(ADR-001). Variables de entorno:

| Variable | Default | Uso |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` usa MSW; `real` pega al backend por proxy. |
| `VITE_API_BASE_URL` | `/api/v1` | Prefijo del contrato. |
| `VITE_ODOO_URL` | `http://localhost:8069` | Destino del proxy de Vite en modo `real`. |

## Arquitectura

Estructura **feature-based** (`src/features/*`) con separación
components → hooks → services → API. Ver [`src/README.md`](./src/README.md).

## Docker

No hace falta tener Node instalado en el host; todo corre en contenedores.
Los comandos se ejecutan desde la **raíz del workspace** (donde vive
`docker-compose.yml`), no desde esta carpeta.

```bash
# Dev server con hot-reload en :5173 (contra MSW, por defecto)
docker compose up frontend

# Tests en watch mode, en un contenedor aparte
docker compose --profile test up frontend-test

# Un comando suelto dentro del contenedor (lint, build, etc.)
docker compose run --rm frontend npm run lint
```

El código fuente se monta como bind mount (`./anitrack-frontend:/app`), así que
los cambios se reflejan al instante sin reconstruir la imagen; `node_modules`
vive en un volumen nombrado aparte para no mezclarlo con el del host.

### Probar contra el backend real

```bash
docker compose --profile backend up
```

Esto además levanta `odoo` (usando `../ll-odoo/Dockerfile` tal cual, sin
modificarlo) y una `db` de Postgres. Para que el frontend le pegue a ese Odoo en
vez de a MSW, exportar antes de levantar `frontend`:

```bash
VITE_API_MODE=real VITE_ODOO_URL=http://odoo:8069 docker compose up frontend
```

(`odoo` es el nombre del servicio en la red interna de Compose — no
`localhost`, porque el proxy corre dentro del contenedor del frontend.)

### Build de producción (nginx)

```bash
docker build --target production -t anitrack-frontend .
docker run -p 8080:80 anitrack-frontend
```

Sirve el bundle estático con `nginx` y fallback de rutas para React Router
(`docker/nginx.conf`). Este stage es el que se usaría en el deploy real
(Sprint 4, doc 07).
