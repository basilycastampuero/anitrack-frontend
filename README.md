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
| `npm run seed:odoo` | Carga el catálogo de prueba en un Odoo local (ver [abajo](#seed-del-catálogo-en-odoo-local)). Necesita el backend levantado. |

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

Odoo queda accesible en [http://localhost:8069](http://localhost:8069), DB
`anitrack`, login `admin` / password `admin` (credenciales por defecto que
genera Odoo al crear la base por línea de comandos — cambiarlas no es
necesario para un entorno local).

**Nota sobre `docker-init/odoo-dev-entrypoint.sh`:** el `entrypoint.sh`
original de `ll-odoo/` usa `--init=all`, que en Odoo **no** instala todos los
módulos disponibles — solo `base` y los módulos con `auto_install=True`
(`web`, `bus`, etc.). Los módulos propios del proyecto (`ll_checklist`,
`ll_oauth`, `ll_webpage`) tienen `auto_install=False`, así que con el
entrypoint original nunca quedaban instalados. Por eso el servicio `odoo` en
`docker-compose.yml` monta un entrypoint propio
(`docker-init/odoo-dev-entrypoint.sh`, fuera de `ll-odoo/`) que instala esos
tres módulos explícitamente con `-i`; es idempotente, así que reiniciar el
contenedor es rápido (~2s) una vez que la base ya existe — nada que ver con
la lentitud que reporta Chano en Railway, que usa el `entrypoint.sh` original
tal cual.

**Nota sobre bind mount vs. copy:** a diferencia de `frontend` (bind mount,
cambios instantáneos), el servicio `odoo` **copia** `odoo-modules/` dentro de
la imagen — no hay bind mount para ese código en `docker-compose.yml`. Editar
algo dentro de `ll-odoo/odoo-modules/` no se refleja en el contenedor sin
reconstruir la imagen (`docker compose build odoo` o `docker compose up
--build odoo`); una alternativa más rápida para iterar puntualmente es
inyectar el archivo cambiado con `docker cp` seguido de `odoo -u <módulo>
--stop-after-init` y reiniciar el contenedor.

**Nota sobre WSL:** si Docker Desktop corre en Windows y la integración WSL
para tu distro está desactivada (Docker Desktop → Settings → Resources → WSL
Integration), el comando `docker` no existe dentro de WSL — hay que invocar
el CLI de Windows directamente
(`/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe`) o activar la
integración para volver al flujo normal de `docker compose`.

### Seed del catálogo en Odoo local

`npm run seed:odoo` (`scripts/seed-odoo.mjs`, Node puro, sin dependencias)
carga en un Odoo local el mismo dataset que sirve MSW: 10 franquicias, 14
contenidos, 19 versiones, 11 géneros, 5 plataformas, 6 compañías, 3 países,
11 imágenes. Requiere el backend levantado (`docker compose --profile
backend up`, o una instalación local equivalente).

Sin flags es **idempotente** (busca antes de crear, no duplica en corridas
sucesivas). `--reset` borra primero las franquicias del seed y las vuelve a
crear.

Config por variables de entorno (todas opcionales, con default apuntando al
Odoo local de este `docker-compose.yml`):

| Variable | Default |
|---|---|
| `ODOO_URL` | `http://localhost:8069` |
| `ODOO_DB` | `anitrack` |
| `ODOO_USER` | `admin` |
| `ODOO_PASSWORD` | `admin` |

```bash
npm run seed:odoo            # idempotente
npm run seed:odoo -- --reset # borra y re-siembra las franquicias del seed
```

Sirve como insumo para probar contra el backend real (ver
[docs/11-spike-integracion-real.md](./docs/11-spike-integracion-real.md)):
sin datos cargados, los endpoints de catálogo responden vacío y no prueban
nada.

### Build de producción (nginx)

```bash
docker build --target production -t anitrack-frontend .
docker run -p 8080:80 anitrack-frontend
```

Sirve el bundle estático con `nginx` y fallback de rutas para React Router
(`docker/nginx.conf`). Este stage es el que se usaría en el deploy real
(Sprint 4, doc 07).
