# 13 — Bitácora: Avance Sprint 3a (auth + estructura de listas)

> Registra el estado real del Sprint 3a (doc 07) a la fecha, en los dos
> carriles definidos por ADR-017. No es un cierre de sprint — quedan tareas
> abiertas en ambos carriles. Fecha: 2026-09-03.

## Alcance completado

### Carril A — frontend (contra MSW)

| # | Tarea | Estado |
|---|---|---|
| 3.1 | `auth.service` + hooks de sesión + `queryKeys` centralizadas | ✅ |
| 3.2 | Páginas login/register | ✅ |
| 3.3a | Botón OAuth mockeado + `/auth/callback` | ✅ |
| 3.4 | `lists.service` + hooks de mutación | ✅ |
| 3.5a | `ChecklistTree` accesible (solo lectura) | ✅ |
| 3.5b | CRUD de carpetas | ✅ (commit `1a9f324`) |
| 3.5c | Onboarding "starter lists" | ⬜ pendiente |
| 3.6 | Vista de entries | ⬜ pendiente |

> 3.5b se cerró en paralelo a B2/B3 (carril A no es el foco de esta
> actualización de bitácora); detalle de lo construido en el mensaje del
> commit `1a9f324` — menú contextual por nodo (renombrar/borrar/publicar/
> nueva sub-lista) + botón "New list" en el header para carpetas raíz,
> rename/publish optimistic, un bug de propagación de eventos sintéticos de
> React cortado en `ChecklistNodeActions`.

### Carril B — backend en `ll-odoo` (rama `anitrack/rest-catalog-api`, nunca se pushea)

| # | Tarea | Estado |
|---|---|---|
| B1 | Spike de sesión (`security/portal_access.xml`, `controllers/api_auth.py`: login/logout/me/register) | ✅ (commit `d17d00a`) |
| B2 | Seed de listas en el Odoo local | ✅ (commit `cae4792`, paridad MSW en `178f64a`) |
| B3 | `/me/*` lectura | ✅ (commit `b708bcb`) |
| B4 | `/me/*` escritura | ⬜ pendiente |
| B5 | Checkpoint de contrato (esquemas Zod contra respuestas reales) | ⬜ pendiente |

## Qué se construyó

- **`useLogin` / `useLogout` / `useRegister`** (`src/features/auth/hooks/`) +
  `authKeys` en `src/features/auth/hooks/queryKeys.ts`: hooks de mutación de
  TanStack Query sobre `auth.service`, con invalidación de `['auth','me']` en
  login/register.
- **`LoginPage`/`RegisterPage`** con `LoginForm.tsx`/`RegisterForm.tsx` nuevos
  (RHF + Zod), mapeo de errores de API al form, y `next=` para redirigir tras
  el éxito.
- **`OAuthButtons.tsx`** + `useAuthCallback.ts`: botón "Continue with Twitch"
  mockeado y `/auth/callback` que lee `?error=` y llama `me`.
- **`lists.service` + hooks de mutación** (`src/features/lists/hooks/`):
  `useChecklists`, `useCreateChecklist`, `useUpdateChecklist`,
  `useDeleteChecklist`, `useChecklistEntries`, `useLibraryIndex`, con
  `listKeys` centralizadas en `queryKeys.ts`.
- **`ChecklistTree`/`ChecklistTreeItem`** (`src/features/lists/components/`)
  + `useTreeNavigation.ts`: patrón ARIA `tree`/`treeitem` con roving
  tabindex, navegación completa por teclado (flechas, Home/End, Enter),
  selección sincronizada con `/my-lists/:checklistId`.
- **Backend, carril B**: `security/portal_access.xml` + `controllers/api_auth.py`
  en `ll-odoo` (rama `anitrack/rest-catalog-api`, commit `d17d00a`, sin
  pushear) — `/api/v1/auth/login`, `/logout`, `/me`, `/register`, con las
  reglas de ADR-014.

## Cambio de contrato: `field?: string` en el envelope de error

El envelope de error (doc 04) se extiende con un campo opcional `field` para
que un `VALIDATION` pueda nombrar el campo del formulario que falló (p. ej.
"email ya registrado" → `field: "email"`). `RegisterForm` lo consume: si
`error.field` es uno de los campos reales del form, el error se pinta en ese
campo (`form.setError`); si no, cae a error de nivel formulario. Implementado
en `src/types/api.types.ts` (`ApiError.field`, `errorEnvelopeSchema`) y
`src/lib/http.ts` (interceptor). **Hoy solo lo emite MSW** — el helper
`_error(code, message, status)` del backend real (`api_common.py`, `ll-odoo`)
no tiene parámetro `field` todavía, y el `register` real (`api_auth.py`)
devuelve `FORBIDDEN` tanto para invitación deshabilitada como para email
duplicado, sin distinguir el motivo (`auth_signup.SignupError` no expone una
excepción distinta por caso). Detalle completo y marcado `[FE→BE]` en
[04-contrato-api.md](./04-contrato-api.md) y
[`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md).

## Decisiones tomadas sobre la marcha (no estaban en los ADRs)

Ninguna de estas cruza la vara de ADR (nuevo trade-off arquitectónico) — son
aplicación de precedentes ya establecidos o detalle de implementación, así
que quedan solo acá:

1. **`useLogout` limpia sesión y cache en `onSettled`, no en `onSuccess`**: un
   `POST /auth/logout` fallido (red caída, sesión ya vencida en el servidor)
   igual debe dejar al usuario deslogueado y sin datos privados en el
   cliente — dejarlo "logueado" localmente tras pedir salir explícitamente es
   peor que limpiar de más. Usa `removeQueries`, no `invalidateQueries`, para
   no disparar un refetch con la sesión ya cerrada.
2. **Optimistic solo en mutaciones idempotentes sobre un nodo existente**
   (renombrar/publicar en `useUpdateChecklist`); crear y borrar van por
   invalidación porque el id lo asigna el servidor. Esto ya estaba decidido
   en el replanteo de doc 07 (nota bajo el título de Sprint 3a) — la
   implementación solo lo aplicó, sin decisión nueva.
3. **`useUpdateChecklist` reconcilia con `invalidateQueries` en `onSettled`**
   en ambos caminos (éxito y error), además del patch optimista: el patch es
   una suposición sobre cómo queda el árbol, y hay que confirmarla contra el
   servidor en cualquier desenlace, no solo revertirla si falla.
4. **El nodo seleccionado del árbol vive en la URL** (`/my-lists/:checklistId`,
   recibido como prop por `useTreeNavigation`); expandido/colapsado y el foco
   roving-tabindex son estado local del hook — mismo criterio que
   `useCatalogFilters` (Sprint 2, doc 10): la URL es la única fuente de
   verdad para lo que el usuario puede querer compartir/recargar.

## Bug de accesibilidad encontrado en 3.5a

En un árbol ARIA recursivo, cada `<li role="treeitem">` hijo queda anidado
dentro del `<li>` de su padre (estructura estándar del patrón ARIA Tree), así
que un `keydown` en un nodo hijo burbujea de forma nativa hasta el
`onKeyDown` del padre: una sola tecla disparaba dos handlers, uno por nivel.
Ejemplo real: `ArrowLeft` en una hoja subía el foco al padre y de paso lo
colapsaba, dos efectos en un solo keypress. Corregido con
`event.stopPropagation()` al inicio de `handleKeyDown`
(`src/features/lists/hooks/useTreeNavigation.ts`).

## Revisión pre-merge

0 críticos, 2 altos, 6 medios, 6 bajos. Los cinco primeros (#1 a #5)
corregidos, cada uno con su test de regresión. Los dos altos eran el mismo
patrón — **estados de error que se pierden en el camino**:

- `useMe` gateaba por presencia de `data` en vez de por estado: en TanStack
  Query v5 `data` sobrevive a la transición a error (retiene el último valor
  bueno), así que un `401` reautenticaba con el usuario vencido. Corregido
  chequeando `query.isError` antes que `query.isSuccess`
  (`src/features/auth/hooks/useMe.ts`).
- Los formularios (`LoginForm`, `RegisterForm`) trataban un error no-`ApiError`
  (un `ZodError` por un `200` con forma inesperada) como "sin error", dejando
  el submit mudo. Corregido: solo los casos de `ApiError` reconocidos se
  resuelven como error de formulario, todo lo demás cae a un `fatalError`
  explícito (#2 de la revisión).

**Deuda abierta, con su número de hallazgo para no perderla:**

- **#6** — `patchChecklistNode` (`src/features/lists/utils/checklistTree.ts`)
  no soporta `parentId`/`order`, y el mock (`src/mocks/handlers.ts`) tampoco:
  el `PATCH` real acepta esos campos en el body pero no mueve ni reordena
  nada. Falso verde latente cuando 3.5b agregue mover/reordenar carpetas.
- **#7** — el estado del seed de MSW no se resetea entre tests: flake latente
  por orden de ejecución.
- **#8** — `VITE_API_MODE` tiene default `'mock'`: un build de producción sin
  esa variable de entorno serviría un login falso en vez de fallar.
- **#9 a #14** — hallazgos bajos de la misma revisión, sin detalle adicional
  registrado en esta sesión.

## Patrón recurrente del sprint (lección para registrar)

Aparecieron **cinco** mocks de MSW que mentían y hacían pasar tests en falso:

1. El de login aceptaba cualquier contraseña y devolvía `users[0]` para
   emails desconocidos.
2. `PATCH`/`DELETE` de checklists ignoraban nodos anidados.
3. `DELETE` no borraba nada.
4. La cascada de borrado no limpiaba los entries de los descendientes.
5. El `PATCH` acepta `parentId`/`order` sin mover ni reordenar (mismo hueco
   que #6 arriba, del lado del mock).

Lección: un mock que nadie ejercitó todavía no es cobertura, es un stub. Cada
mutación nueva necesita al menos un test que fuerce al mock a hacer el
trabajo real (crear anidado, borrar con hijos, mover de padre), no solo un
test de "la mutación se llamó".

## Verificación

Corrido desde `anitrack-frontend/` en esta sesión:

```bash
npm run typecheck   # limpio
npm run lint        # 0 errores
npx vitest run       # 27 archivos, 126 tests, todos en verde
```

**Verificación visual (primera del proyecto en navegador real).** La
herramienta MCP de Playwright no funciona en esta máquina (fijada al canal
`chrome` de Google, ausente); el Chromium propio de Playwright sí, tras
instalar `libasound2t64`. Se verificó `ChecklistTree`: foco real de DOM al
navegar con teclado, reload conservando URL + `aria-selected` + expansión,
request a `/me/checklists/4/entries` (nunca `NaN`), cero errores de consola,
dark mode y mobile 360px.

**No verificado**: viewport 1440px exacto, lectores de pantalla reales,
árboles de más de dos niveles (el seed de MSW solo tiene dos niveles).

## Huecos de plan detectados

- No hay punto de entrada de logout en la UI: el hook `useLogout` existe y
  está testeado, pero ningún componente lo usa todavía, y no hay ninguna
  tarea del plan (doc 07) que lo pida explícitamente.
- El botón de OAuth (3.3a) quedó solo en `LoginPage`, aunque doc 07 lo
  menciona también para registro.
- No hay drill-down mobile en `/my-lists` que sugiere doc 06 — el CA de 3.5a
  no lo pedía.

## Qué falta (siguiente paso)

- **Camino crítico, carril A**: 3.5b (CRUD de carpetas), 3.5c (starter
  lists), 3.6 (vista de entries).
- **Carril B**: B2 (seed de listas en el Odoo local), B3/B4 (`/me/*`
  lectura/escritura), B5 (checkpoint de contrato con esquemas Zod).
- Resolver la deuda **#6** antes de construir 3.5b (mover/reordenar
  depende de que `patchChecklistNode` y el mock soporten `parentId`/`order`).
- Decidir dónde entra el punto de logout en la UI (hueco de plan detectado
  arriba) y si el flag `VITE_API_MODE` necesita un default más seguro para
  build de producción (#8).
- Seguir la conversación con Chano en
  [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md):
  el `invitation_scope` de producción (pregunta 8.2, todavía abierta) y si
  acepta el trabajo de `ll-odoo` como PR.

## Actualización (2026-09-08) — Carril B: B2 y B3

> Continúa esta misma bitácora. Carril B pasa de 1/5 a **3/5** (B1 ya
> cerrado; B2 y B3 completados en esta sesión, mismo nivel de detalle que el
> carril A arriba). No es cierre de sprint — siguen abiertos 3.5c/3.6 en el
> carril A y B4/B5 en el carril B. Decisiones de peso de esta sesión
> (ADR-018, aggregatedProgress recalculado en vez de reusar
> `compute_show_name`; ADR-019, sudo() único para `contentId`) ya están en
> [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md).

### B2 — Seed de listas en el Odoo local

Extiende `scripts/seed-odoo.mjs` (commit `cae4792`) con dos usuarios portal
—`alex@example.com` con listas, `sam@example.com` vacío, mismas credenciales
(`password123`)— y sus checklists anidadas y links, espejo del seed de MSW
(`src/mocks/seed/lists.ts`).

- **La identidad de los registros va por ids estructurales, nunca por
  nombre.** `Link.compute_show_name` reescribe `link_record_id.checklist_name`
  como efecto secundario apenas se crea el link (le agrega el progreso: una
  checklist sombra llamada "Season 1" pasa a llamarse "Season 1 [25/25]"), así
  que una segunda corrida que buscara por el nombre original no la encontraría
  y duplicaría todo. Las sombras (`checklist_database = true`) no se buscan
  nunca de forma independiente: se llega a ellas leyendo `link.link_record_id`
  desde el link que ya se identificó.
- **Orden obligatorio dentro de cada link: primero la sombra, después el
  link**, porque el `create()` del link dispara el compute que escribe en la
  sombra — mismo orden que sigue `wizard/link.py` (`ll_checklist/models/wizard/link.py`)
  con su `create()` anidado.
- **`--reset` estaba roto y se arregló.** `link_franchise_id` es
  `ondelete="restrict"` (`ll_checklist/models/database/link.py:96`), así que
  borrar el catálogo del seed con links de usuario todavía vivos fallaba con
  un error de integridad que no dice cuál registro lo bloquea. Ahora
  `resetLists()` corre antes que `resetCatalog()`.
- **Fuga que se auto-perpetuaba.** Borrar `res.users` antes que su perfil
  `ll.checklist.user` deja el perfil huérfano —`user_res_user_id` es
  `ondelete="set null"`, no cascade (`ll_checklist/models/user.py:37-40`)—
  con todas sus checklists y links todavía vivos: invisibles para cualquier
  portal y bloqueando el reset del catálogo para siempre (el mismo problema
  de `--reset` de arriba, pero autoinfligido en cada corrida rota). Se
  resolvió con el orden perfil → `res.users` → barrido de huérfanos
  (`ll.checklist.user` con `user_res_user_id = false`), mismo criterio que el
  barrido de imágenes huérfanas de `resetCatalog()` (ADR-010).
- **Bug encontrado en el código de Chano:**
  `ll.checklist.user.extra_get_user(self, uid)` (`ll_checklist/models/user.py:72`)
  no lleva `@api.model`, así que por RPC el primer elemento de `args` se ata a
  `self` en vez de a `uid` — hay que pasar una lista de ids vacía adelante
  (`execKw('ll.checklist.user', 'extra_get_user', [[], resUserId])`), igual
  que `request.env["ll.checklist.user"]` hace implícitamente en el
  controlador real.
- **Idempotencia verificada, no asumida:** dos corridas limpias consecutivas
  del script dan `creados: 0` en la segunda.
- **Cierra dos límites de verificación que esta bitácora dejaba abiertos**
  (sección "Verificación" arriba, 2026-09-03: *"árboles de más de dos
  niveles (el seed de MSW solo tiene dos niveles)"*): el árbol de Alex tiene
  una rama de **cuatro niveles** (Favorites > All-time > By decade > 2010s) y
  el caso "Watching" —un version-link suelto + un franchise-link agrupado con
  2 hijos, 4 filas de `ll.checklist.link` en total— que `linkCount` debe
  contar como **2**, no 4 (detecta un doble conteo si el filtro
  `lv_link_franchise_id = false` de B3 está mal). El commit `178f64a`
  (tarea **B2.7**) espejó la misma rama de 4 niveles en el seed de MSW
  (`src/mocks/seed/lists.ts`) para que el checkpoint de contrato de B5 no
  compare "dos mundos distintos" — hasta ese commit, ningún seed (ni MSW ni
  Odoo) había tenido un árbol de más de dos niveles.

### B3 — Endpoints `/me/*` de lectura

`ll_webpage/controllers/api_lists.py` (NUEVO, commit `b708bcb`): `GET
/me/checklists`, `GET /me/checklists/:id/entries`, `GET /me/library-index`.

- El árbol se arma con **lectura plana + reconstrucción en Python**
  (`_build_tree`), no recorriendo `checklist_sub_checklist_ids`: ese campo
  también cuelga las checklists "sombra" que crea el wizard de link como
  hijas de las carpetas del usuario, así que filtrar solo en la raíz dejaría
  colar una sombra en cualquier nivel más profundo. Se trae en una sola query
  todo lo que NO es sombra (`checklist_database = False`) y se arma el árbol
  a mano por `checklist_parent_id`.
- `kind` se deriva de `link_version_id`, **nunca** de `link_type`: este vale
  `"F"` también para los version-links hijos de un franchise-link agrupado,
  así que no distingue lo que el contrato necesita. `displayName` sale de
  `link_name`, **nunca** de `link_show_name` (que ya trae el progreso
  formateado adentro — justo lo que el endpoint tiene que emitir aparte, no
  mezclado con el nombre).
- `linkCount` excluye los links con `lv_link_franchise_id` seteado (los
  hijos agrupados), o el caso "Watching" de B2 daría 4 en vez de 2.
- **`Checklist.extra_order()` está roto**
  (`ll_checklist/models/checklist.py:120`): calcula correctamente el nombre
  del campo de orden en la variable local `order` pero la función devuelve
  `custom_order` — el modo `"C"`/`"N"`, no un nombre de campo. No se reutiliza;
  `_build_tree` ordena cada nivel según su propio `checklist_sorting_mode`.
- **`exists()` no aplica `ir.rule`** — solo comprueba existencia física en la
  tabla, no el aislamiento por dueño de ADR-014. La pertenencia se verifica
  leyendo un campo del recordset `browse()`-ado a mano (`checklist_database`)
  y capturando el `AccessError` que la `ir.rule` sí dispara ahí. El resultado
  se traduce a **404, nunca a 403**: un 403 le confirmaría a quien pregunta
  que el id existe, aunque no sea suyo.
- Un solo `sudo()` en todo el archivo, en `_catalog()`, usado solo para
  `contentId` (`version_content_id`, el único dato de catálogo que un link no
  expone por *related*) — ADR-019.
- **El test de equivalencia de `aggregatedProgress` (ADR-018) se cumplió**:
  se corrió `_aggregated_progress()` contra la base real, se reconstruyó el
  string con el mismo template que usa `compute_show_name` de Chano, y se
  comparó contra `link_show_name` del mismo registro real. Coincide.
- **Checkpoint Zod parcial: 3/3 en verde.** Las tres respuestas (`/me/checklists`,
  `/me/checklists/:id/entries`, `/me/library-index`) validaron contra los
  esquemas Zod del frontend. Es un anticipo del bloque de listas del
  checkpoint completo de **B5** (que sigue pendiente para auth + listas
  juntos), no B5 en sí. Misma conclusión que el spike 2.8: **no hace falta
  adaptador**.
- **Hueco conocido, consecuencia de ADR-014**: la `ir.rule` de
  `security/portal_access.xml` está acotada a `groups="[(4,
  ref('base.group_portal'))]"` a propósito (para no romper el `unlink` del
  admin en el backoffice — ver el comentario del propio XML). Un usuario
  admin (grupo Administrator, no Portal) que llamara a `/me/*` no tendría
  ninguna restricción y vería datos de todos los usuarios. Hoy el admin no es
  cliente de esta API, así que es inocuo, pero queda escrito para no
  redescubrirlo.
- El **bind mount** de `odoo-modules/` (agregado a `docker-compose.yml` en
  esta sesión) funciona: editar `ll-odoo/` se refleja en el contenedor sin
  `docker cp`. Sigue haciendo falta reiniciar Odoo (`docker compose
  --profile backend restart odoo`) porque la routing map se arma al
  arrancar. Esto dejaba desactualizada la nota de entorno de
  [12-diseno-sprint3a.md](./12-diseno-sprint3a.md) (heredada del spike 2.8,
  "no hay bind mount") — corregida en ese documento.

### Verificación de esta actualización

Backend (`ll-odoo`, sin suite automatizada — verificación manual, mismo
estilo que el spike de B1): idempotencia del seed (dos corridas limpias
consecutivas, `creados: 0` en la segunda), equivalencia de
`aggregatedProgress` contra `link_show_name` real, y checkpoint Zod parcial
3/3 en verde, todos descritos arriba.

Frontend: sin cambios de código en esta actualización más allá del seed de
MSW (`178f64a`, tarea B2.7); el estado ya reportado sigue siendo el vigente
— `npm run typecheck` limpio, `npm run lint` sin errores, `npx vitest run`
143 tests en 29 archivos, todos en verde.

### Qué falta (siguiente paso), actualizado

- **Carril A**: 3.5c (onboarding "starter lists"), 3.6 (vista de entries).
- **Carril B**: B4 (`/me/*` escritura + cerrar la fuga de imágenes de
  ADR-014), B5 (checkpoint de contrato completo, auth + listas).
- El hueco de ADR-014 sobre el admin sin restricción en `/me/*` (arriba) no
  bloquea nada hoy, pero conviene revisarlo si alguna vez el admin necesita
  consumir esta API.
- Sigue pendiente decidir el punto de entrada de logout en la UI y el
  default de `VITE_API_MODE` (deuda #8), y seguir la conversación con Chano
  sobre `invitation_scope` y si acepta el trabajo de `ll-odoo` como PR (sin
  cambios desde la sección anterior).
