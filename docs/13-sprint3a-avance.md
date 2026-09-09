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
| 3.5c | Onboarding "starter lists" | ✅ (commit `a43fc9a`) |
| 3.6 | Vista de entries | ✅ (commit `573d465`) |

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
| B4 | `/me/*` escritura | ✅ (commit `3c4e091`, `ll-odoo`) |
| B5 | Checkpoint de contrato (esquemas Zod contra respuestas reales) | ✅ (drift encontrado y corregido, `ll-odoo` commit `b5f30a3`) |

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

## Actualización (2026-09-08) — Carril B cierra completo (B4, B5) + 3.6

> Continúa esta misma bitácora, mismo día que la actualización anterior
> (Carril B: B2 y B3). Carril B pasa de 3/5 a **5/5 — cierra por completo**.
> Carril A pasa de 6/8 a **7/8** con 3.6 (vista de entries); solo queda
> **3.5c** (onboarding "starter lists") para cerrar el sprint entero. No hay
> ADR nuevo esta sesión: ninguna decisión cruza la vara de "nuevo trade-off
> arquitectónico" (B4 aplica directamente lo que ADR-014/019 ya previeron).

### 3.6 — Vista de entries (commit `573d465`)

`ListEntryRow` + `FranchiseEntryGroup` + `ProgressBar`, en modo lectura (el
stepper de progreso es 3.7, Sprint 3b). `progress.ts` formatea
`aggregatedProgress` como función pura — el frontend no recalcula la
agregación, la recibe pre-calculada del contrato (doc 04).

- **Se replicó desde el algoritmo real de `compute_show_name`, no desde una
  paráfrasis del contrato**, y ahí apareció un detalle de un carácter que el
  contrato no documentaba: el separador de "total desconocido" del progreso
  **agregado** es un guion simple (`-`, `[S2 03/-]`), distinto del em dash
  (`—`) que usa el progreso de un entry **individual** suelto. Confundirlos
  habría puesto en rojo el checkpoint de contrato (B5) sin que hubiera un bug
  real detrás — solo una paráfrasis imprecisa del formato.
- `ChecklistEntries` es nuevo: el panel deja de ser trivial (antes vivía
  como placeholder de 3.5a) y pasa a decidir el render por `entry.kind`, así
  que esa lógica sale de `pages/` (regla de convenciones del proyecto:
  nada de decisiones de dominio en `pages/`).
- Type guard `isVersionEntry` nuevo: `ListEntry` (doc 04) no es una unión
  discriminada limpia en TS sin él — sin el guard hubiera hecho falta `as` o
  `!` para acceder a `entry.version`, prohibido por la Definition of Done.
- Verificado: 161 tests en 33 archivos, `typecheck`/`lint` limpios, más
  verificación visual en Chromium (commit del propio cambio).

### B4 — Escritura en `/me/*`, fuga de imágenes y `ir.rule` de copias (commit `3c4e091`, `ll-odoo`)

CRUD de checklists en `/me/*` con el ORM del usuario, nunca `sudo()`, para
que la `ir.rule` de ADR-014 acote sola; `checklist_user_id` sale siempre del
perfil de la sesión (`_resolve_profile`, ADR-015) y nunca del body; una
checklist ajena da **404**, no 403 (mismo criterio que B3: un 403 confirmaría
que el id existe).

- **Protección de ciclos, no anticipada por el diseño de Chano.** El modelo
  no usa `_check_recursion` y `compute_fullname` recorre
  `checklist_parent_id` sin límite — mover un nodo bajo su propio
  descendiente habría causado recursión infinita y un dato corrupto
  persistente. Nuevo helper `_creates_cycle(checklist_id, new_parent_id)`;
  el `PATCH` con un `parentId` que crea ciclo ahora da **422**.
- **Cierra la deuda que ADR-014 dejó abierta explícitamente** ("Deuda que
  este ADR deja abierta", `docs/03-decisiones-arquitectura.md`): la ruta
  `/api/v1/images/<id>` servía cualquier `ll.checklist.image` por id, con
  `sudo()` y sin filtro. Ahora la ruta pública exige pertenencia a un
  registro de catálogo publicado (`api_catalog.py`), y las imágenes privadas
  van por `GET /me/images/<id>` (nueva, `api_lists.py`) con verificación de
  dueño. Hallazgo del camino: `link_image_id` es un *related* a la imagen de
  la checklist sombra del link, así que las imágenes de un `ListEntry` **son
  siempre de catálogo** y siguen por la ruta pública (consecuencia ya
  anotada en ADR-019); las portadas que un usuario suba a una carpeta propia
  son las que ahora van por la ruta privada.
- La `ir.rule` de `ll.checklist.link.copy` se amplió a **ambos lados** de la
  relación (`lc_left_id` y `lc_right_id` — antes solo miraba `lc_left_id`),
  lo que de paso arregla un falso negativo de `isSynced` en el contrato.
  Sigue acotada a `base.group_portal` con `global="False"` (mismo criterio de
  ADR-014); se verificó que el admin conserva read/write/unlink.
- Nota de escala, sin acción por ahora: cada respuesta de escritura
  reconstruye el árbol completo del usuario. Correcto para el volumen actual
  de datos (seed de B2), no escala a cientos de checklists por usuario.
- Verificado con `curl` y dos usuarios portal (mismo par de B3/ADR-014);
  las respuestas de escritura validan contra los esquemas Zod del frontend.

### B5 — Checkpoint de contrato (commit del fix: `b5f30a3`, `ll-odoo`)

Lo corrió el **agente de tests**, no el de ingeniería que escribió B3/B4 —
a propósito, porque B3 y B4 ya habían sido auto-validadas por quien las
escribió. Test temporal contra el Odoo real con los esquemas Zod reales del
frontend, 20 verificaciones; el archivo se borró al terminar (no queda un
script de checkpoint permanente en el repo, mismo criterio que el spike 2.8).

**Resultado: verde salvo un drift real** — exactamente el resultado que
contemplaba el CA de la tarea (doc 07): "todos los esquemas en verde, o el
drift documentado con su decisión".

**El drift.** `POST /auth/register` con un email ya registrado devolvía
`403 FORBIDDEN` con el **mensaje crudo de Postgres** (nombre de la
constraint, columna y valor duplicado), en vez del `422 VALIDATION` con
`field: "email"` que pide el contrato (doc 04). No era una limitación del
backend en general: `POST /me/checklists` ya emitía `field` correctamente
(B4); el hueco estaba acotado a la rama de error de `signup()`. Severidad
real doble: además del desalineamiento de contrato, había una filtración de
estructura interna de la base de datos al cliente.

Validado en verde: los cuatro métodos de auth, lectura y escritura completas
de `/me/checklists`, el árbol de cuatro niveles (seed de B2) contra el
esquema recursivo, `Watching.linkCount == 2` con cuatro filas físicas de
`ll.checklist.link`, el `aggregatedProgress` de Spy x Family, el entry
suelto, los envelopes 401/403/404/422, imágenes públicas y privadas, y el
aislamiento **con dos usuarios portal**.

**Paridad MSW ↔ real**: sin mentiras nuevas de mock (ver la lección de la
sección "Patrón recurrente del sprint" arriba). La única diferencia
encontrada es intencional — el backend **omite** las claves
`rating`/`startedAt`/`finishedAt` mientras MSW las puebla; ambos son válidos
porque son opcionales (`[EXT]`, ADR-004), y confirma que ADR-004 se respeta.

**No verificado empíricamente**: que `/api/v1/images/<id>` rechace la
imagen de una checklist privada, porque **no existe endpoint de upload en
el contrato** para armar ese escenario sin manipular datos por fuera de la
API. Se confirmó **leyendo** `_image_in_published_catalog` (`api_catalog.py`)
en su lugar — verificación de código, no empírica; queda dicho así para no
sobrestimar la cobertura real del checkpoint.

**Deuda de proceso detectada**: `libraryIndexSchema` y
`checklistResponseSchema` no están exportados (viven inline, sin `export`,
en `src/features/lists/services/lists.service.ts` — verificado leyendo el
archivo), así que hubo que reconstruirlos a mano para validarlos desde
afuera. Conviene exportarlos antes del próximo checkpoint de contrato.

### Fix posterior del registro (commit `b5f30a3`, `ll-odoo`, hecho después de cerrar B5)

El email ocupado se detecta ahora **antes** de llamar a `signup()`, con
`active_test=False` porque un usuario archivado sigue ocupando el login (la
constraint es de la tabla, no del recordset activo). El `except SignupError`
que queda (sobre todo `invitation_scope=b2b`, ADR-015) ya no propaga el
mensaje de la excepción al cliente: lo loguea del lado del servidor y
responde genérico.

Verificado con `curl` contra el Odoo local: email duplicado → `422` con
`field: "email"`; registro nuevo válido → `201`; campos faltantes → `422`
(sin regresión).

### Deuda abierta del sprint, numerada junto a la anterior

Continúa la numeración de la sección "Revisión pre-merge" de arriba (#1–#14).
Nada de lo de abajo es nuevo hallazgo de revisión formal; son huecos
detectados durante B4/B5 y quedan igual de trazables por número/nombre:

- **#6, #7, #8** — sin cambios (ver arriba).
- **#9 a #14** — hallazgos bajos de la revisión pre-merge de 3.5a/3.5b, sin
  detalle adicional registrado en esta sesión.
- **No hay punto de entrada de logout en la UI** — el hook está completo y
  testeado desde 3.1, ningún componente lo usa (sin cambios desde la sección
  anterior).
- **La `ir.rule` de ADR-014 está acotada a `base.group_portal`**, así que un
  admin llamando a `/me/*` no tendría restricción. Consecuencia de una
  decisión ya cerrada (ADR-014), no de una implementación a medias; el admin
  no consume esta API hoy. Apareció primero en B3, se reconfirmó en B4.
- **Sin verificación con lectores de pantalla reales** (arrastrada desde la
  sección de verificación original del sprint).
- **Nada pasó por CI**: la rama `sprint-2-catalogo` va muy por delante de
  `origin/main` con todo el Sprint 3a adentro pese al nombre, y la CI solo
  corre en `main`/`develop`.
- **`libraryIndexSchema`/`checklistResponseSchema` sin exportar** (nueva,
  detectada en B5 — ver arriba).

### Verificación de esta actualización

Frontend (commit `573d465`): `npm run typecheck` limpio, `npm run lint` sin
errores, `npx vitest run` — **161 tests en 33 archivos**, todos en verde
(recorrido de nuevo al escribir esta bitácora, mismo resultado). Más
verificación visual en Chromium.

Backend (`ll-odoo`, sin suite automatizada — verificación manual, mismo
estilo que B1/B2/B3): CRUD de `/me/*` con dos usuarios portal, protección de
ciclos, `ir.rule` de `link.copy` en ambos lados, checkpoint Zod de 20
verificaciones (19 en verde + 1 drift), y el fix del registro re-verificado
con `curl` (email duplicado, registro válido, campos faltantes).

### Qué falta (siguiente paso), actualizado

- **Carril A — última tarea del sprint**: **3.5c**, onboarding "starter
  lists" (ADR-003) — no hay evidencia de que esté implementada (sin commit
  en el repo, sin componente `EmptyState`/CTA de starter lists en
  `src/features/lists/` ni `src/pages/MyListsPage.tsx`, verificado en esta
  sesión). El sprint **no está cerrado** hasta que se resuelva; ver nota de
  consistencia más abajo.
- **Carril B: cerrado (5/5)**. No quedan tareas planificadas de backend en
  el Sprint 3a; lo que sigue (3.7 en adelante, tracking) es Sprint 3b.
- Exportar `libraryIndexSchema` y `checklistResponseSchema` antes del
  próximo checkpoint de contrato (deuda nueva de esta sesión).
- Decidir el punto de entrada de logout en la UI y el default de
  `VITE_API_MODE` (deuda #8) — sin cambios.
- Seguir la conversación con Chano sobre `invitation_scope` de producción y
  si acepta el trabajo de `ll-odoo` como PR — sin cambios.

> **Nota de consistencia (2026-09-08).** Esta actualización se escribió a
> partir de un encargo que describía el Sprint 3a como cerrado (carril A
> 8/8). Verificando el repo (`git log`, `git status`, y el código de
> `src/features/lists/` y `src/pages/MyListsPage.tsx`) no se encontró
> ningún rastro de 3.5c: ni commit, ni componente de onboarding, ni CTA de
> "starter lists". Esta bitácora refleja el estado verificado (carril A
> 7/8, carril B 5/5) en vez del estado declarado; `docs/README.md` y
> `docs-backend/README.md` se actualizaron con el mismo criterio. Si 3.5c
> ya está hecho en otro lado (otra rama, trabajo no commiteado que se haya
> perdido), esta nota queda para que quien lo sepa la corrija con el dato
> real.

> **Resolución de la nota anterior (2026-09-08, misma fecha).** 3.5c se
> implementó después de escribirse la nota de arriba: commit `a43fc9a`,
> verificado en el repo (`git log`, `StarterListsPrompt.tsx`,
> `useCreateStarterLists.ts`). El carril A cierra 8/8. Detalle completo en la
> sección siguiente.

## Actualización (2026-09-08) — 3.5c cierra el carril A + Cierre de Sprint 3a

> Continúa esta misma bitácora, mismo día que las dos actualizaciones
> anteriores. Con 3.5c, el **carril A cierra 8/8** y, junto con el carril B ya
> cerrado 5/5, **el Sprint 3a queda completo**. No hay ADR nuevo esta sesión:
> 3.5c aplica directamente ADR-003 (checklists normales, no un enum), sin
> trade-off nuevo que registrar.

### 3.5c — Onboarding de listas sugeridas (commit `a43fc9a`)

Con el árbol vacío, en vez del `EmptyState` genérico (`StarterListsPrompt.tsx`)
aparece un CTA que crea las cinco listas sugeridas: Watching, Completed, On
Hold, Dropped, Plan to Watch.

- **Siguiendo ADR-003, son checklists normales y no un enum de dominio**: el
  árbol de `Checklist` sigue siendo genérico, y por eso los nombres viven en
  `src/features/lists/constants.ts` (`STARTER_LIST_KEYS`) y sus etiquetas en
  `i18n/en.ts` (`t.lists.starterLists`), no incrustados en el componente — el
  usuario puede renombrarlas, borrarlas o ignorarlas después de creadas.
- **Se crean en secuencia (`for...of` + `await`), nunca con `Promise.all`**:
  el `order` lo asigna el backend (y el mock) según `siblings.length` en el
  momento en que llega cada `POST`, no un campo que el cliente envíe —
  crearlas en paralelo dejaría el orden final a merced de qué request
  resuelve primero, y "Watching" podría no terminar siendo la primera lista
  del árbol.
- **Una sola `useMutation` (no cinco)**, así `onSettled` invalida `tree()` UNA
  vez cuando termina el lote completo, no una vez por lista creada. Corre en
  éxito **y** en error (mismo criterio que `useUpdateChecklist`), así que si
  una creación falla a mitad de camino, **no se revierte lo ya creado**
  (decisión del plan, doc 12 §3.5c): el árbol siempre refleja lo que el
  servidor efectivamente llegó a crear, y deshacer listas que el usuario
  acaba de ver aparecer sería peor UX que dejarlas.
- **Séptimo falso verde del sprint, de una clase distinta a los seis mocks
  mentirosos de la sección "Patrón recurrente" de arriba**: el test del
  estado vacío de `ChecklistTree` tenía un `waitFor(() =>
  expect(screen.queryByRole('tree')).not.toBeInTheDocument())` que se
  resolvía **durante el skeleton** (donde tampoco hay `role="tree"` todavía),
  así que el test pasaba sin llegar a comprobar el estado real. En los seis
  mocks el problema era *contra qué* se testeaba (un stub que nadie
  ejercitaba); acá es *cuándo*: un `waitFor` que espera "algo distinto del
  estado anterior" se satisface con cualquier transición intermedia,
  incluido el loading. Reescrito con `findByRole` esperando la condición
  final (CTA visible → click → las cinco listas en orden → el CTA no
  reaparece).
- **Hallazgo de entorno**: en modo mock, `currentUserId` es una variable
  mutable a nivel de módulo en `src/mocks/handlers.ts` (`let currentUserId:
  number | null = 1`), así que un `page.reload()` de Playwright recarga el
  bundle entero y resetea la sesión al usuario 1 por defecto — el mismo tipo
  de estado mutable a nivel de módulo que la deuda **#7** (seed que no se
  resetea), aquí manifestado contra la sesión en vez del seed de datos. No se
  había notado en todo el sprint porque todas las verificaciones visuales
  anteriores usaban el usuario por defecto; apareció al verificar el CTA con
  el usuario vacío del seed (`sam@example.com`). No afecta al producto, sí a
  cómo se escriben los scripts de verificación en navegador real: hay que
  navegar con clicks, no recargar la página, para no perder la sesión del
  usuario que se está probando.

Verificado: `npm run typecheck` y `npm run lint` limpios, `npx vitest run` —
**166 tests en 35 archivos**, todos en verde. Flujo completo verificado en
navegador real (Chromium de Playwright) con el usuario vacío del seed.

### Deuda abierta del sprint, consolidada al cierre

Todo lo detectado durante el Sprint 3a completo (carriles A y B), junta y
visible en un solo lugar. Sigue la numeración de la sección "Revisión
pre-merge" de arriba (#1–#14):

- **#6** — `patchChecklistNode` (`src/features/lists/utils/checklistTree.ts`)
  acepta `parentId`/`order` en el body sin mover ni reordenar nada, y el mock
  (`src/mocks/handlers.ts`) tampoco. Se activa cuando alguien agregue mover
  carpetas entre padres.
- **#7** — el seed de MSW no se resetea entre tests. **Dejó de ser un flake
  latente y pasó a ser un costo recurrente**: afectó a tres tareas seguidas
  del sprint (3.5b, 3.6 y 3.5c), que tuvieron que esquivarlo a mano creando
  sus propios usuarios/datos en vez de depender del seed fijo. Emparentado
  con el hallazgo de entorno de 3.5c arriba (mismo patrón de estado mutable a
  nivel de módulo, ahora también en la sesión).
- **#8** — `VITE_API_MODE` tiene default `'mock'`: un build de producción sin
  esa variable de entorno serviría un login falso en vez de fallar.
- **#9 a #14** — hallazgos bajos de la revisión pre-merge de 3.5a/3.5b, sin
  detalle adicional registrado en ninguna sesión.
- **Sin punto de entrada de logout en la UI**: el hook `useLogout` existe y
  está testeado desde 3.1, pero ningún componente lo usa todavía.
- **La `ir.rule` de ADR-014 está acotada a `base.group_portal`**: un usuario
  admin (grupo Administrator, no Portal) que llamara a `/me/*` no tendría
  ninguna restricción y vería datos de todos los usuarios. Consecuencia de
  una decisión ya cerrada (ADR-014, para no romper el `unlink` del admin en
  el backoffice), no de una implementación a medias — el admin no consume
  esta API hoy.
- **`libraryIndexSchema` y `checklistResponseSchema` sin exportar**
  (`src/features/lists/services/lists.service.ts`): complicó reconstruirlos
  a mano para el checkpoint de contrato B5. Conviene exportarlos antes del
  próximo checkpoint.
- **Sin verificación con lectores de pantalla reales**, y **sin ningún seed
  (MSW ni Odoo) con un árbol de más de cuatro niveles** (el más profundo,
  agregado en B2.7, es el de cuatro niveles de Alex: Favorites > All-time >
  By decade > 2010s).
- **Nada del sprint pasó por CI**: la rama `sprint-2-catalogo` contiene el
  Sprint 3a entero pese al nombre, va muy por delante de `origin/main`, y la
  CI del proyecto solo corre en `main`/`develop`.

### Cierre de Sprint 3a

Con 3.5c cerrado, el carril A queda 8/8 y el carril B 5/5 — **Sprint 3a
completo**. Objetivo demo cumplido: iniciar sesión, crear y organizar listas
propias (incluido el onboarding de listas sugeridas), ver sus entries.

Lo que queda construido: auth completa (login/register/logout, OAuth
mockeado), CRUD de checklists con árbol accesible ARIA y navegación por
teclado, onboarding de starter lists, vista de entries en modo lectura, y del
lado del backend real (`ll-odoo`, sin pushear) los cinco endpoints de
`/me/*` (lectura y escritura) más el cierre de la fuga de imágenes de
ADR-014 — validado contra el contrato Zod del frontend con un drift real
encontrado y corregido.

La deuda abierta queda consolidada en la sección de arriba; ninguna bloquea
el cierre del sprint. **Camino crítico a partir de ahora: Sprint 3b**
(tracking y vinculación, doc 07) — ver [README.md](./README.md) para el
estado general del proyecto.
