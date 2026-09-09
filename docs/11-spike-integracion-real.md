# 11 — Bitácora: Spike de integración real (tarea 2.8) y tooling de seed

> Cierra la tarea 2.8 del plan (doc 07): "Decisión documentada: adaptador
> necesario sí/no". No es un cierre de Sprint 2 — las tareas 2.4 a 2.7 (UI de
> detalle, SearchBar, galería) siguen pendientes. Fecha: 2026-08-30.

## Alcance completado

| # | Tarea | Estado |
|---|---|---|
| 2.8 | ⚠️ Spike integración real | ✅ **No hace falta adaptador** — decisión documentada abajo, con matiz |

## Qué se construyó

### 1. Script de seed del catálogo local (`scripts/seed-odoo.mjs`)

Node puro (sin dependencias, usa `fetch` contra el endpoint JSON-RPC
`/jsonrpc` de Odoo). Nuevo script de npm: `npm run seed:odoo` (documentado en
[`../README.md`](../README.md)). Replica en el Odoo local el **mismo**
dataset que sirve MSW (`src/mocks/seed/franchises.ts` + `masters.ts`): 10
franquicias, 14 contenidos, 19 versiones, 11 géneros, 5 plataformas, 6
compañías, 3 países, 11 imágenes. Los datos se declaran en plano dentro del
script (no se importan del seed TS: usa el alias `@/` de Vite que Node no
resuelve) y se traducen al vocabulario del ORM de Odoo (`franchise_name_ids`,
`content_type`, `version_episodes`).

Flags y config: sin flags es idempotente (busca antes de crear); `--reset`
borra primero las franquicias del seed. Env vars: `ODOO_URL`, `ODOO_DB`,
`ODOO_USER`, `ODOO_PASSWORD` (defaults `http://localhost:8069`, `anitrack`,
`admin`, `admin`). Verificado: primera corrida crea 54 registros; segunda
corrida crea 0 (79 ya existentes); `--reset` borra las 10 franquicias y
re-siembra, totales estables en 10/14/19.

**Tres bugs encontrados y corregidos durante la verificación** (quedan acá
porque son propiedades no obvias del modelo de Chano, no del script):

a. **Identidad por nombre principal.** La identidad de una franquicia/contenido
   en Odoo es `franchise_main_name_id` / `content_main_name_id`, que el
   `create()` del modelo fija con el PRIMERO de la lista de nombres. Buscar
   por el nombre de display duplicaba registros cuando ese nombre no era el
   primero de la lista (ej. "Cyberpunk: Edgerunners", cuyo único alternativo
   era "Edgerunners"). Además, dos contenidos de la misma franquicia podían
   compartir nombre principal ("Steins;Gate (VN)" y "Steins;Gate (Anime)",
   ambos con el alias "Steins;Gate") y pisarse. Solución: el script garantiza
   que el nombre de display sea siempre el principal.
b. **Fuga de imágenes en `--reset`.** Al borrar una franquicia, su
   `ll.checklist.image.group` se va en cascada, pero
   `ll.checklist.image.image_group_id` es `ondelete="set null"`, así que las
   imágenes sobrevivían huérfanas y cada reset acumulaba basura (llegaron a
   34 imágenes donde debían ser 11). Solución: el reset borra las imágenes
   del grupo antes de la franquicia, más un barrido de huérfanas.
c. `ll.checklist.company.type` **no tiene reglas** en
   `security/administrator.xml` (warning de instalación ya conocido), así que
   ni el admin puede escribirlo: da `AccessError`. El script lo tolera y crea
   las compañías sin tipo, en vez de abortar. Consecuencia real: `typeName`
   de las compañías viene `null` contra el backend real.

### 2. API REST del catálogo en el backend

Rama propia en `ll-odoo`: `anitrack/rest-catalog-api`, creada desde
`checklist_base`. **Nada commiteado ni pusheado** — queda para revisión del
dueño del proyecto y, eventualmente, un PR a Chano. Archivo nuevo
`odoo-modules/ll_webpage/controllers/api_catalog.py` (~535 líneas), más
registro en `controllers/__init__.py` y `ll_checklist` agregado a `depends`
en `__manifest__.py` (3 archivos de diff en total).

Rutas bajo `/api/v1`, todas GET, todas `auth="public"`: `/genres`,
`/platforms`, `/companies`, `/franchises` (con `q`, `contentType`,
`videoType`, `genreIds`, `platformIds`, `yearFrom`, `yearTo`, `sort`, `page`,
`pageSize`), `/franchises/<id>`, `/contents/<id>`, `/search`, `/images/<id>`,
`/platforms/<id>/image`, `/countries/<id>/image`. No incluye nada de sesión
ni de listas del usuario (Sprint 3).

Dos decisiones de diseño quedaron registradas como ADR-010 y ADR-011 en
[`03-decisiones-arquitectura.md`](./03-decisiones-arquitectura.md):
`sudo()` + filtro `published` en vez de abrir ACL, y `type="http"` en vez de
`type="json"` para tener códigos HTTP reales y el sobre de error propio.

### 3. Spike de integración real — decisión

Criterio de aceptación: "decisión documentada: adaptador necesario sí/no".
**Respuesta: NO hace falta adaptador.** Evidencia: un test temporal (ya
borrado) hizo `fetch` real contra `http://localhost:8069/api/v1` y pasó cada
respuesta por los esquemas Zod reales del frontend (`franchiseSummarySchema`,
`franchiseDetailSchema`, `contentDetailWithFranchiseSchema`,
`searchHitSchema`, `genreSchema`, `platformRefSchema`, `paginatedSchema`).
**7/7 tests en verde**: las respuestas del Odoo real validan contra el
contrato del frontend sin ninguna traducción.

**Matiz importante.** No hace falta adaptador **porque el controlador se
escribió para emitir el contrato del doc 04**. La traducción no desapareció,
se movió de TypeScript a Python, del lado del backend. El costo es que esa
traducción vive en el repo de Chano y depende de que él la acepte.

El proxy de Vite ya estaba configurado (`/api` → `VITE_ODOO_URL`), así que con
`VITE_API_MODE=real` el frontend apunta al Odoo local sin cambios de código.

**Pendiente explícito:** no se verificó en un navegador real (Playwright no
tiene Chromium instalado en esta máquina — ver nota de CLAUDE.md/AniTrack).
La validación es de contrato/esquemas, no visual.

### 4. Corrección sobre `/web/image` (doc 08)

Verificado con más precisión que en la ronda anterior: `GET
/web/image/ll.checklist.image/35/image_binary` sin sesión devuelve HTTP
**200**, pero el cuerpo son 6078 bytes del **placeholder gris genérico de
Odoo**, no la imagen real (la real es un SVG de 555 bytes, que sí devuelve
`/api/v1/images/35`; el id es el de esa corrida y cambia al re-sembrar).
El acceso sigue denegado en los hechos, pero Odoo
degrada en silencio a un placeholder en vez de dar un 403 — peor para
depurar que un error limpio. Detalle completo y el historial de la respuesta
anterior en
[`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md),
pregunta 7. La ruta propia `/api/v1/images/<id>` resuelve el problema:
`sudo()`, detección de mimetype, `Cache-Control: public, max-age=86400` +
`ETag`, con revalidación `If-None-Match` → 304 verificada.

### 5. Notas de entorno (fricción de Docker)

- Docker Desktop corriendo, pero la integración WSL para la distro Ubuntu
  estaba **desactivada**, así que el comando `docker` no existe dentro de
  WSL. Se trabajó invocando el CLI de Windows
  (`/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe`). Para
  volver al flujo normal (`docker compose --profile backend up`) hay que
  activarla en Docker Desktop → Settings → Resources → WSL Integration.
- La imagen de `odoo` **copia** `odoo-modules/` adentro (no hay bind mount
  para ese servicio en `docker-compose.yml`, a diferencia de `frontend`), así
  que editar `ll-odoo/` no se refleja en el contenedor sin rebuild. En esta
  sesión los archivos se inyectaron con `docker cp` + `odoo -u ll_webpage
  --stop-after-init` + restart, en vez de reconstruir la imagen.

## Decisiones tomadas sobre la marcha (no estaban en los ADRs)

Ver ADR-010 y ADR-011 en
[03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md): `sudo()` +
filtro `published` en el controlador (en vez de abrir ACL) y `type="http"`
(en vez de `type="json"`) para el controlador REST del catálogo.

## Verificación

Frontend, desde `anitrack-frontend/`:

```bash
npm run typecheck   # limpio
npm run lint        # 0 errores
npx vitest run       # 7 archivos, 43 tests, todos en verde
```

Backend (Odoo local): seed idempotente verificado (54 registros creados en
la primera corrida, 0 en la segunda con 79 ya existentes); `--reset` estable
en 10 franquicias / 14 contenidos / 19 versiones. Spike de integración: 7/7
tests de esquema Zod contra respuestas reales del Odoo local, en verde.

## Qué falta (siguiente paso)

- Revisar y decidir si se commitea/pushea la rama `anitrack/rest-catalog-api`
  de `ll-odoo` y, eventualmente, mandarla como PR a Chano.
- Verificación visual en navegador real (Playwright sin Chromium instalado
  en esta máquina — `npx playwright install chrome` sigue pendiente).
- Camino crítico de Sprint 2 (sin cambios por esta sesión): tareas 2.4
  (detalle franquicia), 2.5 (detalle contenido), 2.6 (SearchBar global) y 2.7
  (galería de imágenes).
- Reactivar la integración WSL de Docker Desktop para volver al flujo
  `docker compose --profile backend up` sin pasar por el CLI de Windows.
- Seguir la conversación con Chano en
  [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md):
  faltan las secciones de auth (OAuth Twitch en producción) y campos [EXT].
