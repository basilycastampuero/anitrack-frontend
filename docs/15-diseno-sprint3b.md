# 15 — Diseño técnico del Sprint 3b (tracking y vinculación)

> El *qué* del Sprint 3b está en [07-plan-de-trabajo.md](./07-plan-de-trabajo.md).
> Este documento es el *cómo*: responsabilidades por capa, contratos entre
> ellas, archivos que toca cada tarea, orden y dependencias. Mismo formato que
> [12-diseno-sprint3a.md](./12-diseno-sprint3a.md), que fue el diseño del
> sprint anterior. Las decisiones de peso salieron de acá y quedaron como
> **ADR-020 a ADR-022** en
> [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md).
> Fecha: 2026-09-10.

## 1. Resumen

El Sprint 3a dejó la app con sesión, listas y lectura de entries. El 3b es
donde la app **escribe sobre el catálogo del usuario**: vincular una versión a
una lista y mover el progreso. Eso trae cuatro problemas que el plan no
resuelve y que no son de UI:

1. **El agregado del padre llega pre-calculado del backend (ADR-018) y el
   optimistic tiene que moverlo igual.** Subir un episodio en un hijo cambia el
   `aggregatedProgress` del franchise-link padre; ese número no se puede pedir
   de vuelta dentro de la ventana optimista, y recalcular la agregación en el
   frontend sería una segunda implementación de `compute_show_name`.
2. **Una mutación puede afectar carpetas que no están en pantalla.** Un link
   sincronizado propaga `lv_episodes` a sus copias, que viven en **otras**
   checklists del usuario (verificado en `Link.write`). El cache de esas
   carpetas queda mintiendo sin que nada lo delate.
3. **El backend del sprint no existe.** `POST/PATCH/DELETE /me/links` y los dos
   endpoints de perfil público **no tienen ninguna ruta escrita**
   (verificado por `grep` de `@http.route`, coincide con
   [`../docs-backend/14-resumen-implementacion-api.md`](../docs-backend/14-resumen-implementacion-api.md)).
   Tres de las seis tareas del carril A los necesitan.
4. **El mock de `/me/links` es un stub, no una implementación.** Los tres
   handlers (`POST`/`PATCH`/`DELETE`) no mantienen ningún invariante del
   modelo. Es el mismo patrón que ya hizo pasar cinco tests en falso durante el
   Sprint 3a ("Patrón recurrente del sprint" en
   [13-sprint3a-avance.md](./13-sprint3a-avance.md)), y las cuatro tareas
   nucleares del 3b se apoyan encima.

La estrategia del sprint es la del 3a (ADR-017): **dos carriles**. El carril A
(frontend contra MSW) sigue siendo el camino crítico y no depende del carril B
(backend en `ll-odoo`), que va en paralelo y cierra con un checkpoint de
contrato. La diferencia con el 3a es que ahora el carril A **arranca
arreglando su propio mock**, porque sin eso ninguna de sus CA es demostrable.

## 2. Estado actual verificado (2026-09-10)

Separado a propósito en lo que se **comprobó** contra el código y lo que se
**infirió**. El Odoo local **no** se pudo levantar en esta sesión (Docker
Desktop no estaba corriendo), así que a diferencia del doc 12 **nada de acá es
verificación empírica contra la base**: todo lo del backend sale de leer el
código de `ll-odoo` en la rama `anitrack/rest-catalog-api`.

### 2.1 Verificado leyendo el código

**Frontend — lo que ya existe y no hay que volver a escribir:**

| Pieza | Archivo | Estado |
|---|---|---|
| `listEntrySchema` / `checklistNodeSchema` | `src/features/lists/services/schemas.ts` | Completos, recursivos |
| `ListEntry`, `CreateLinkRequest`, `UpdateLinkRequest`, `LibraryIndex` | `src/features/lists/types/index.ts` | Completos (`CreateLinkRequest` ya tiene `force?`) |
| `isVersionEntry` (type guard) | `src/features/lists/types/index.ts` | Completo |
| `ListEntryRow` / `FranchiseEntryGroup` / `ProgressBar` | `src/features/lists/components/` | Modo lectura, listos para recibir el stepper |
| `formatAggregatedProgress` | `src/features/lists/utils/progress.ts` | Completo y testeado |
| `useLibraryIndex` + `listKeys.libraryIndex()` | `src/features/lists/hooks/` | Completo |
| `FranchiseCard` con prop `inLibrary` | `src/features/catalog/components/FranchiseCard.tsx` | Completo; ya cableado en Catalog/Home/Search |
| `ApiError` con `detail` (payload de `ALREADY_LINKED`) y `field` | `src/types/api.types.ts`, `src/lib/http.ts` | Completo: `409` ya mapea a `ALREADY_LINKED` |
| `features.ratings` / `features.watchDates` | `src/lib/features.ts` | Existen; hoy atados a `isMockMode` |
| `resetMockDb()` en el `afterEach` global | `src/mocks/reset.ts`, `src/test/setup.ts` | Completo (deuda #7 cerrada) |
| Patrón optimistic de referencia | `src/features/lists/hooks/useUpdateChecklist.ts` | `cancelQueries` + snapshot + rollback + `onSettled` |

**Frontend — lo que falta o miente:**

- `POST /me/links` (`src/mocks/handlers.ts:335`) **no inserta el entry en
  `entriesByChecklist`**, **ignora `checklistId`**, no toca `linkCount`, no
  agrupa bajo franchise-link, devuelve `franchiseId: 0` / `contentId: 0` /
  `displayName: 'New link'`, y responde el `409` con `existing: []` — el
  campo que la UI necesita para ofrecer las tres salidas. (Es el hallazgo V17
  del doc 12; sigue igual.)
- `PATCH /me/links/:id` devuelve `{ entry: { ...patch } }`: el eco del body,
  **no un `ListEntry`**. Cualquier `listEntrySchema.parse()` sobre esa
  respuesta explota. Es una mentira nueva, la **octava** del proyecto.
- `DELETE /me/links/:id` devuelve `204` **sin borrar nada**: ni el entry, ni el
  `linkCount`, ni la entrada del `libraryIndex`, ni el franchise-link padre que
  queda huérfano.
- `linkCount` en el seed (`src/mocks/seed/lists.ts`) es una constante escrita a
  mano por nodo, igual que `profilesByUser[1].stats` (`totalEntries: 5`,
  `totalEpisodesWatched: 128`). Ninguno se deriva de `entriesByChecklist`.
- `GET /users/:id/checklists/:checklistId/entries` busca la checklist con
  `owner.find(...)` — **solo en el nivel raíz**. Una lista **privada anidada**
  (p. ej. la id 6, "2010s", bajo "By decade") no matchea, así que el chequeo de
  `isPublished` se saltea y el handler **devuelve sus entries igual**. Es una
  fuga de datos privados en el mock, y 3.10 la va a ejercitar de entrada.
- `profilesByUser[1].publishedChecklists` es un `filter` sobre el **nivel
  raíz** de `checklistsByUser[1]`: ninguna sub-carpeta publicada aparecería.
- `ProfilePage` y `PublicListPage` son `PlaceholderPage`.
- `libraryIndexSchema` y `checklistResponseSchema` siguen sin exportar
  (deuda abierta de B5).

**Backend (`ll-odoo`, rama `anitrack/rest-catalog-api`, commit `b5f30a3`):**

- No existe **ninguna** ruta de `/me/links` ni de `/users/<id>/...`
  (`grep '@http.route'` sobre los cuatro controladores de
  `ll_webpage/controllers/`).
- No existe ninguna ruta de OAuth: `/auth/oauth/twitch` (doc 04) no está
  escrita. `api_auth.py` tiene exactamente cuatro rutas (`login`, `logout`,
  `me`, `register`).
- `ll.checklist.wizard.link.action_create_link()`
  (`ll_checklist/models/wizard/link.py`) es la lógica que B6 tiene que
  reimplementar como endpoint. Crea **dos** registros por link: el
  `ll.checklist.link` y una checklist "sombra" (`checklist_database = True`)
  colgada del padre correcto, y usa `db_name` como **string copiado** a
  `link_name` (no una FK): el `displayNameId` del contrato es un id de
  `ll.checklist.db.name`, y `alternativeNames[].id` del catálogo ya es ese
  mismo id (`api_catalog.py`, `_serialize_alt_name`).
- `Link.write()` (`ll_checklist/models/database/link.py`) propaga
  `lv_episodes`/`lv_abbreviation` a **todas** las copias sincronizadas de un
  link, en ambos sentidos de la relación, con `super().write()`. La malla que
  arma el wizard es completa (al copiar el link X se crean filas contra todas
  las copias previas de X **y** contra X), así que la propagación de un salto
  alcanza a todo el grupo.
- `Link.unlink()` está sobrescrito: borra primero `link_record_id` (la
  checklist sombra), que a su vez tiene `ondelete="cascade"` **hacia el
  link**. Ese override **todavía no lo ejerció ningún endpoint nuestro**: B4
  borra carpetas y la cascada la hace la base, no el ORM.
- La `ir.rule` de `ll.checklist.link.copy`
  (`ll_webpage/security/portal_access.xml`) quedó en B4 con un `'|'` entre
  ambos lados de la relación.
- `ll_oauth/models/res_users.py` usa `AccessDenied` en su `except` **sin
  importarlo**: si esa rama corre, es un `NameError`, no el `AccessDenied` que
  pretende re-lanzar. Es código de Chano y está exactamente en el camino que
  3.3b ejercita.
- `lv_episodes` es un `fields.Integer` sin `@api.constrains` ni límites: el
  modelo acepta negativos y valores por encima de `version_episodes`.

### 2.2 Inferido (no comprobado empíricamente)

Marcado como tal para que quien ejecute no lo tome por verificado:

- **La `ir.rule` de `link.copy` con `'|'` no cierra el agujero de escritura que
  B4 dice cerrar, y abre uno nuevo.** Razonamiento: con OR, una fila
  `(lc_left = mi link, lc_right = link ajeno)` satisface la primera cláusula,
  así que se puede **crear** igual que antes de B4. Lo que cambió es que ahora
  esa fila también es **visible desde el otro lado**: cuando el otro usuario
  escriba `lv_episodes` en su link, `Link.write` va a intentar propagar a mi
  link y recibir `AccessError` — un usuario puede dejar el link de otro
  permanentemente inescribible. Con la regla anterior (solo `lc_left_id`) esa
  fila era invisible para la víctima y no le rompía nada. La corrección es
  cambiar el `'|'` por el AND implícito (ambos lados del mismo dueño): las
  filas legítimas tienen siempre los dos lados del mismo usuario, así que el
  falso-negativo de `isSynced` que motivó B4 se arregla igual. → **ADR-020**,
  y su verificación empírica con dos usuarios portal es CA de B6.
- Que `Link.unlink()` funcione tal como está escrito. Borrar
  `link_record_id` primero cascadea a la fila del link, y después
  `super().unlink()` corre sobre un registro que ya no existe. Puede ser
  inocuo o un `MissingError`; **no se probó**. Es CA de B7.
- Que `_auth_oauth_signin` deje al usuario en el grupo Portal (lo que espera
  ADR-015). Es la CA de 3.3b y sigue sin verificarse.

## 3. Responsabilidades por capa y contratos nuevos

La cadena obligatoria sigue siendo **component → hook → service**, y el
Sprint 3b suma tres reglas.

### 3.1 Regla nueva 1 — el frontend no re-agrega, aplica deltas

`aggregatedProgress` llega pre-calculado (ADR-018). Dentro de la ventana
optimista no hay forma de pedirlo, y reimplementar `compute_show_name` en TS
sería una segunda fuente de verdad de la lógica más sutil del modelo (el total
desconocido, el orden por `lv_record_order` mínimo). La salida es que el
optimistic **no recalcula nada**: aplica el único cambio que la mutación puede
producir en el agregado —sumar `delta` al `watched` del grupo cuya
`abbreviation` coincide con la del hijo tocado— y deja que `onSettled`
reconcilie con el valor autoritativo. `total` y el orden de los grupos no se
tocan nunca, porque no dependen de `lv_episodes`. → **ADR-021**.

### 3.2 Regla nueva 2 — el fan-out de invalidación se declara por mutación

Con listas anidadas, agregados pre-calculados y copias sincronizadas, "invalidar
lo que corresponda" dejó de ser obvio. Cada hook de mutación del sprint declara
en su docstring, y verifica con un test, **qué invalida y qué no**:

| Mutación | Invalida | **No** invalida, y por qué |
|---|---|---|
| `useUpdateEntryProgress` (3.7) | `entries(checklistId)`; si `entry.version.isSynced` → **`listKeys.all`** | `tree()`: `linkCount` no cambia al mover episodios. `libraryIndex()`: el conjunto de versiones vinculadas no cambia |
| `useCreateLink` (3.8) | `entries(checklistId)`, `tree()`, `libraryIndex()` | — |
| `useDeleteLink` (3.8, undo) | `entries(checklistId)`, `tree()`, `libraryIndex()`; si era sincronizado → `listKeys.all` | — |
| `useUpdateEntryMeta` (3.11: notas, rating) | `entries(checklistId)` | `tree()` / `libraryIndex()`: nada estructural cambió |

Dos notas que no son obvias:

- **`tree()` se invalida siempre al crear/borrar un link, aunque `linkCount`
  quizá no cambie.** Un version-link agrupado bajo un franchise-link que ya
  existía **no** mueve el contador (el backend excluye los hijos con
  `lv_link_franchise_id != False`). Predecir eso desde el cliente es replicar
  una regla del backend para ahorrar un GET liviano: no se predice, se
  invalida.
- **El caso sincronizado invalida el prefijo entero `['lists']`.** El contrato
  expone `isSynced: boolean`, no los ids de las copias, así que el cliente no
  sabe qué otras carpetas quedaron sucias. La alternativa (agregar
  `syncedWithLinkIds: number[]` al contrato) se descarta: agrega superficie de
  contrato y trabajo de backend para optimizar un caso raro, y el costo real
  del martillo es un refetch por query activa. Queda anotada como escape si
  alguna vez pesa.

### 3.3 Regla nueva 3 — el 409 se parsea en el service, no en el componente

`ApiError.detail` es `unknown` a propósito. El `409 ALREADY_LINKED` es el único
error del contrato con payload estructurado, y ese payload alimenta una
decisión del usuario, así que se valida donde se valida todo lo demás: en el
service, con Zod. `listsService.createLink` traduce el `ApiError` crudo a un
`AlreadyLinkedError` tipado (subclase de `ApiError`) con
`existing: ExistingLink[]` ya parseado; si el parseo falla, degrada a un
`ApiError` genérico en vez de romper el wizard. El componente nunca hace
`as` sobre `detail`.

### 3.4 Propiedad cruzada de features: el wizard es de `lists`, no de `catalog`

`AddToListButton` se dispara desde el detalle de franquicia (feature
`catalog`) pero crea un link (feature `lists`). Para no abrir un import
`catalog → lists` en un componente de presentación —el camino por el que se
pudre una arquitectura feature-based— el botón y el wizard viven en
`features/lists/components/`, y `VersionsTable` recibe una prop opcional
`renderAction?: (version: VersionDetail) => ReactNode`. Quien cablea las dos
piezas es la página (`FranchiseDetailPage`, `ContentDetailPage`), que es lo
único que tiene permiso de ensamblar. Costo: dos props de plomería. Beneficio:
`catalog` sigue sin saber que existe `lists`.

### 3.5 `queryKeys` del sprint

`listKeys` no cambia (las entries ya están cubiertas por
`entries(checklistId)`; **no** se agrega una clave por entry: el cache es la
lista, no la fila). Se agrega el feature `profile`:

```ts
// src/features/profile/hooks/queryKeys.ts (NUEVO)
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: number) => [...profileKeys.all, 'detail', userId] as const,
  entries: (userId: number, checklistId: number) =>
    [...profileKeys.all, 'entries', userId, checklistId] as const,
}
```

**`useLogout` no limpia `profileKeys`**, a diferencia de `listKeys`: un perfil
público es dato público, no privado, y removerlo solo costaría un refetch. Esto
cierra explícitamente la nota pendiente que hoy tiene `useLogout` en su
docstring ("cuando agregue queries de sesión, sumar su `queryKeys.ts` acá"):
la respuesta es que estas no son queries de sesión.

## 4. Decisiones de peso, con sus alternativas

### 4.1 Deuda #6 (`patchChecklistNode` acepta `parentId`/`order` sin mover nada)

**Verificado primero: ninguna tarea del Sprint 3b la activa.** Se revisaron las
seis CA. 3.8 crea listas nuevas (`POST /me/checklists`, no un move); el
agrupado bajo franquicia ocurre en el árbol **sombra** del backend
(`checklist_database = true`), que `patchChecklistNode` no ve nunca; el "mover"
que menciona doc 06 en el menú de un entry es mover un **link** entre
carpetas, y ni siquiera está en el contrato (`UpdateLinkRequest` no tiene
`checklistId`). Mover/reordenar carpetas es **4.10** (drag & drop, stretch de
Sprint 4).

Aun así la deuda no se deja dormida: es un falso verde armado, y la única razón
por la que no explotó es que nadie llamó la función con esos campos.

| Alternativa | Costo | Riesgo residual |
|---|---|---|
| A. No hacer nada (nada del 3b la activa) | 0 | El falso verde sigue armado y ahora hay dos sprints más de distancia con la sesión que lo detectó |
| B. Implementar mover/reordenar de verdad en `patchChecklistNode` **y** en el mock | ~1 día, y hay que decidir semántica de reordenamiento entre hermanos que ninguna CA pide | Se construye una feature especulativa para 4.10, que además es *stretch* |
| C. **[Elegida]** Acotar el camino optimista por tipo + enseñarle al mock a mover/reordenar | ~medio día | Ninguno relevante: el backend real ya soporta ambos campos (B4, con detección de ciclos) |

**Decisión: C, en dos mitades con prioridad distinta.**

1. **No negociable** — `useUpdateChecklist` deja de aceptar
   `UpdateChecklistRequest` completo y pasa a aceptar
   `CosmeticChecklistPatch = Pick<UpdateChecklistRequest, 'name' | 'description' | 'isPublished' | 'sortingMode'>`.
   `patchChecklistNode` recibe ese mismo tipo. Así el falso verde deja de ser
   una convención y pasa a ser un error de compilación: quien construya 4.10
   **no puede** llamar al camino optimista con `parentId`/`order`, tiene que
   escribir el hook estructural (sin optimistic, por la misma regla del 3a) o
   ampliar el helper a conciencia.
2. **Recortable** — el handler `PATCH /me/checklists/:id` del mock honra
   `parentId` (re-parenta el nodo con los helpers `findChecklistNode` /
   `removeChecklistNode` que ya existen) y `order` (escribe el campo y
   reordena hermanos). Son ~20 líneas y dejan al mock alineado con el backend
   real, que ya lo implementa.

Lo que **no** se hace es que el mock rechace `parentId`/`order` con un `422`:
sería inventar una divergencia con el backend real, que sí los acepta — peor
que la deuda actual.

### 4.2 Cómo se mueve el agregado del padre dentro de la ventana optimista

| Alternativa | Tradeoff |
|---|---|
| A. Optimistic solo en la fila hija; el header del grupo se actualiza cuando llega el refetch | Barato, pero la demo muestra la barra del hijo moviéndose y el `[S1 03/12]` del padre congelado ~300 ms. Es justo el pixel que mira quien evalúa el portafolio |
| B. Reimplementar la agregación en TS y recalcular el grupo entero en `onMutate` | Segunda implementación de `compute_show_name` (total desconocido, orden por `lv_record_order` mínimo). Contradice el espíritu de ADR-018 y es exactamente la clase de drift que este proyecto ya paga caro |
| C. **[Elegida]** Delta sobre un solo campo de un solo grupo | El único cambio que `watchedEpisodes` puede producir en el agregado es `watched += delta` en el grupo de esa `abbreviation`: `total` sale de `version_episodes` (catálogo, no cambia) y el orden sale de `lv_record_order` (tampoco). Es demostrablemente equivalente al resultado del backend para *esta* mutación, y no reimplementa nada |

**Decisión: C** → ADR-021. Regla asociada: si aparece una mutación futura que sí
puede cambiar `total` o el orden de los grupos (mover un link entre grupos,
cambiar su abreviación), esa mutación **no lleva optimistic sobre el agregado**
— invalida y espera.

### 4.3 Ráfaga del stepper: long-press, orden y coalescing

Doc 06 pide `– valor +` con **long-press repeat**. Con optimistic, una pulsación
larga de dos segundos son ~20 `PATCH` en vuelo sobre el mismo link, con dos
problemas reales: respuestas fuera de orden (la #7 llega después de la #12 y
pisa el valor bueno) y un rollback ambiguo si falla la #9 (¿a qué snapshot se
vuelve?).

**Decisión:** las dos defensas, ambas baratas.

- **Orden garantizado** — la mutación declara
  `scope: { id: `entry-${linkId}` }` (TanStack Query v5 serializa las
  mutaciones que comparten `scope.id`: nunca hay dos en vuelo sobre el mismo
  entry). Como el contrato manda el valor **absoluto** (`watchedEpisodes`), no
  un delta, dos envíos seguidos son idempotentes en cualquier orden de llegada.
- **Volumen** — el hook escribe el cache en cada click (feedback inmediato) y
  **debouncea el commit** 400 ms: la ráfaga entera termina siendo un `PATCH`
  con el valor final. El snapshot de rollback se toma en el **primer** click de
  la ráfaga, no en cada uno.

Si el sprint aprieta, lo que se recorta es el long-press (queda el stepper de
un click), **no** el `scope`: el `scope` cuesta una línea y es lo que evita la
clase de bug difícil.

### 4.4 El mock de `/me/links` deja de ser un stub

Es la octava vez que un handler de MSW hace pasar un test en falso en este
proyecto. La causa es siempre la misma: el handler devuelve una **forma**
plausible sin mantener el **invariante** del modelo. Con `POST /me/links` el
costo ya no es un test verde de más — es que **ninguna** de las CA de 3.7, 3.8,
3.9 y 3.10 es demostrable ("se actualiza al agregar/quitar" sobre un índice que
nunca cambia; "los 3 caminos" con un `existing: []`).

**Decisión:** el seed de MSW **deriva** todo contador en vez de escribirlo
(`linkCount`, `stats` del perfil), y los tres handlers de `/me/links` mantienen
los invariantes del modelo real: insertar en la carpeta correcta, agrupar bajo
franchise-link, propagar a copias sincronizadas, borrar el padre huérfano.
→ **ADR-022**.

Tensión que hay que decir en voz alta: eso convierte al mock en una segunda
implementación de reglas del backend, que es justo lo que ADR-018 evita en el
código de producción. La diferencia es que MSW **ya es** una implementación
completa del contrato por definición (ADR-001) — la elección real no es "una o
dos implementaciones", es "la segunda implementación es fiel o mentirosa". La
mitigación del drift es la misma que en el 3a: el checkpoint de contrato (B10).

### 4.5 Las stats del perfil las calcula el backend, no el cliente

El plan (doc 07, 3.10) dice "StatsGrid **client-side v1**". Esa redacción es de
cuando no había backend propio; hoy sí lo hay.

| Alternativa | Tradeoff |
|---|---|
| A. Client-side: pedir los entries de cada lista publicada y agregar en el navegador | N+1 requests para pintar tres números arriba de la página, y cada card del grid esperando su propia query |
| B. **[Elegida]** El endpoint las devuelve, como ya dice el contrato (`PublicProfile.stats`) | El endpoint hay que escribirlo igual (B8); las stats son un `read_group` de ~10 líneas. MSW las deriva del seed (§4.4) para que el carril A no dependa del B |

**Decisión: B**, y con ella una decisión de privacidad que el contrato no
resolvía: **las stats cuentan únicamente los links que viven en checklists
publicadas**. Contar todo filtraría el tamaño de las listas privadas del
usuario en un endpoint público. Va explícito en doc 04.

### 4.6 Las notas salen de atrás del feature flag

La tarea 3.11 del plan es "RatingStars + **notas** [flag]". Verificado: `notes`
mapea a `link_description`, que **existe en el modelo de Chano**, es escribible
(`readonly=False`, related a `link_record_id.checklist_description`) y ya lo
emite `GET /me/checklists/:id/entries` (`api_lists.py`). No es un campo `[EXT]`
de ADR-004: los `[EXT]` son `rating`, `startedAt` y `finishedAt`.

**Decisión:** editar notas es una feature real y **no** va detrás del flag;
`features.ratings` sigue gateando estrellas y fechas. Consecuencia práctica: si
3.11 se recorta por plazo (es ⚪), las notas **igual** deberían entrar, porque
son la única de las tres que funciona contra el backend real.

Además, para que la CA "flag off ⇒ ni rastro en la UI" sea testeable: hoy
`features` es un objeto `const` derivado de `isMockMode`, imposible de variar
en un test sin `vi.mock`. Se agrega `isFeatureEnabled(name: keyof FeatureFlags)`
en `src/lib/features.ts` y los componentes consultan por ahí.

## 5. Cambios de contrato que introduce este sprint

Van todos a [04-contrato-api.md](./04-contrato-api.md) **antes** de
implementarse, igual que se hizo con `field?: string` en el 3a. Son cuatro y
ninguno rompe lo ya construido:

1. **`CreateLinkRequest.force?: boolean`.** El texto del doc 04 ya lo menciona
   ("reintentando con `force: true`") pero la interfaz no lo declara; el tipo de
   TypeScript sí lo tiene. Se alinea la interfaz.
2. **El payload del `409` gana el contexto de la lista.** Hoy es
   `existing: ListEntry[]`, y un `ListEntry` no dice **en qué checklist** está.
   Sin eso, la elección "agregar igual / crear copia sincronizada / cancelar" es
   a ciegas: el usuario necesita leer "ya está en *Watching*" para decidir. Pasa
   a `existing: { entry: ListEntry; checklistId: number; checklistName: string }[]`.
   Costo backend ~0 (el endpoint no existe todavía).
3. **`PublicProfile.stats` se calcula sobre listas publicadas** (§4.5), y lo
   dice el contrato en vez de dejarlo a interpretación.
4. **`GET /users/:id/checklists/:checklistId/entries` devuelve `404`, no `403`,
   cuando la lista no está publicada.** El resto de la API privada ya sigue esa
   regla (B3.7: un `403` confirma que el id existe); acá es más importante,
   porque un id de checklist privada es adivinable a partir de los ids públicos
   vecinos. Es el único de los cuatro que **cambia** algo ya escrito en doc 04.

## 6. Diseño del backend (carril B)

Archivos, todos en `ll_webpage` (a `ll_checklist` se le sigue sin tocar una
línea):

```
ll-odoo/odoo-modules/ll_webpage/
├── security/portal_access.xml         MODIFICADO — ir.rule de link.copy: OR -> AND (ADR-020)
└── controllers/
    ├── api_lists.py                   + POST/PATCH/DELETE /me/links (B6, B7)
    ├── api_public.py                  NUEVO — /users/<id>/* (B8)
    └── api_auth.py                    + /auth/oauth/twitch (B9, solo si va 3.3b)
```

### 6.1 Traducciones no obvias para B6 (`POST /me/links`)

Continúa la tabla del doc 12 §4, con lo que hace falta para el wizard:

| Contrato (doc 04) | Odoo | Nota |
|---|---|---|
| `displayNameId` | `ll.checklist.db.name` id | Se copia el **string** `db_name` a `link_name`; no es una FK en el link. Hay que validar que ese nombre pertenezca al content de `versionId` (y `franchiseDisplayNameId`, a su franquicia): si no, el usuario puede bautizar su link con cualquier nombre de la base |
| `groupUnderFranchise` | `wl_create_a_franchise_link` | Si ya existe un franchise-link para `(checklist, franchise, content_type)` **se reutiliza**; el `onchange` del wizard lo busca con esas tres claves más `link_version_id = False` |
| El franchise-link | Un `ll.checklist.link` **más** una checklist sombra (`checklist_database=True`) colgada de la carpeta destino | El árbol de `GET /me/checklists` ya filtra sombras en todos los niveles (B3), así que no aparecen |
| El version-link | Ídem: link + sombra, con `checklist_parent_id` = la sombra del franchise-link si está agrupado, si no la carpeta destino | `checklist_order` = cantidad de hermanos + 1, igual que el wizard |
| `lv_abbreviation` | `content.content_abbreviation` | Sale del content, no del body |
| `syncWithLinkId` | `wl_copy_of_link_id` + `wl_create_as_a_copy` | Copia `link_name`, `lv_abbreviation` y `lv_episodes` del original, y arma la malla completa de `ll.checklist.link.copy` (contra todas las copias previas **y** contra el original) |
| `409 ALREADY_LINKED` | `search([('link_version_id','=',version_id)])` | **Con el ORM del usuario, nunca `sudo()`** (ADR-014): la `ir.rule` acota la búsqueda sola. Es el motivo original de ADR-014 y sigue siendo el riesgo de fuga más caro del sprint |
| `force: true` | — | Salta la detección y crea igual. No es un campo de Odoo: es una decisión de la API |

Todo lo que sea catálogo (`version → content → franchise`, `db.name`, imágenes)
se lee por el helper `_catalog()` que ya existe, con la regla de ADR-019: un
solo punto de `sudo()`, y solo con ids que ya salieron de un registro validado
por la `ir.rule` o de una validación de pertenencia explícita.

### 6.2 B8 es el primer endpoint que expone datos de **otro** usuario

`/users/<id>/profile` es público (sin sesión), así que **no hay ORM de usuario
que aplique la `ir.rule`**: cae bajo la regla de ADR-010 (público y de solo
lectura ⇒ `sudo()` + filtro). El filtro acá no es `published` del catálogo sino
`checklist_published = True` **y** `checklist_database = False`, y se aplica en
los tres lugares: el árbol de `publishedChecklists`, el `read_group` de las
stats, y el endpoint de entries.

Regla de forma para `publishedChecklists`: `checklist_published` es un campo
**por registro**, no heredado. Una sub-carpeta publicada bajo una carpeta
privada es pública por sí misma. Se emite entonces como **bosque de subárboles
publicados**: cada nodo publicado cuyo ancestro más cercano publicado no exista
va como raíz, y `children` se poda a los publicados. MSW tiene que hacer lo
mismo (hoy hace un `filter` de nivel raíz).

### 6.3 Tareas del carril B

| # | Tarea | Detalle | CA |
|---|---|---|---|
| B6 | `POST /me/links` + `ir.rule` de copias | La lógica de `action_create_link` como endpoint (§6.1); `security/portal_access.xml`: el `'|'` de `link.copy` pasa a AND (ADR-020) | Con **dos usuarios portal**: (a) A vincula una versión que B ya tiene → `409` **sin** ningún dato de B adentro; (b) A manda `syncWithLinkId` de un link de B → `404`, y no queda ninguna fila de `ll.checklist.link.copy` creada; (c) B sigue pudiendo escribir `lv_episodes` en su link después del intento de A (regresión del DoS de §2.2); (d) el admin conserva read/write/unlink sobre `link.copy` (misma regresión que ADR-014); (e) `groupUnderFranchise: true` dos veces sobre la misma franquicia crea **un** franchise-link, no dos |
| B7 | `PATCH` + `DELETE /me/links/:id` | Body parcial con la misma técnica de `"clave" in body` de B4; `watchedEpisodes < 0` → `422`; los `[EXT]` (`rating`/`startedAt`/`finishedAt`) se ignoran en silencio (ADR-004: son opcionales y el frontend no los manda contra el backend real); `DELETE` espeja `action_remove` incluyendo el borrado del franchise-link que queda sin hijos | `PATCH` de `watchedEpisodes` sobre un link sincronizado mueve **todas** sus copias (verificar contando filas, no leyendo una); `DELETE` del último hijo deja `0` franchise-links huérfanos; `DELETE` devuelve `204` y **no** tira `MissingError` (el override `Link.unlink` no lo ejerció nunca nadie, §2.2) |
| B8 | `/users/<id>/profile` + `/users/<id>/checklists/<cid>/entries` | `api_public.py` NUEVO, `sudo()` + filtro `checklist_published` (§6.2); stats por `read_group` solo sobre links en listas publicadas | Una lista privada **anidada** da `404` (no `403`, no sus entries); las stats de un usuario con listas privadas **no** cambian al agregar entries a una privada; perfil de un usuario sin listas publicadas devuelve `200` con `stats` en cero y `publishedChecklists: []` |
| B9 | `GET /auth/oauth/twitch?redirect=` + proveedor | Solo si va 3.3b. Ruta en `api_auth.py` que arma el `auth_link` del proveedor (reutilizando `ll_oauth_extra_params`) y lleva el `redirect` de la SPA en el `state`; el `auth.oauth.provider` de Twitch es **config de la base**, no código | Login por Twitch de punta a punta contra el Odoo local; el usuario creado por `_auth_oauth_signin` cae en el grupo **Portal** (o queda documentado en qué grupo cae y qué implica para ADR-014); cancelar en Twitch vuelve a `/auth/callback?error=access_denied` |
| B10 | Checkpoint de contrato | Mismo método que B5: los esquemas Zod **del frontend** contra las respuestas reales, corrido por el **agente de tests**, no por quien escribió B6–B8. Prerrequisito: exportar `libraryIndexSchema` y `checklistResponseSchema` (deuda abierta de B5) más los esquemas nuevos del sprint | Todos los esquemas en verde, o el drift documentado con su decisión. Incluye explícitamente la paridad MSW ↔ real de los cuatro invariantes de §4.4 (`linkCount`, agrupado, propagación a copias, padre huérfano) |

## 7. Plan por tarea (carril A)

Cada tarea lista los archivos que toca; `NUEVO` = archivo a crear. Las dos
primeras **no están en el doc 07 todavía**: son adiciones al plan que hay que
registrar ahí antes de ejecutarlas (regla del proyecto: no se inventan tareas
fuera del plan; si hace falta una, se agrega primero).

### 3.12 — El mock de `/me/links` ejecuta el modelo · 🔴 núcleo · **NUEVA, agregar al doc 07**

`src/mocks/handlers.ts`, `src/mocks/seed/lists.ts`, `src/mocks/derive/lists.ts`
NUEVO.

Es prerrequisito de 3.7, 3.8, 3.9 y 3.10: sin esto ninguna de sus CA es
demostrable (§4.4). Lo que tiene que quedar cierto en el mock:

- **`POST /me/links`** respeta `checklistId`, inserta el `ListEntry` en
  `entriesByChecklist[checklistId]`, y si `groupUnderFranchise` es `true`
  reutiliza el franchise-link de esa franquicia en esa carpeta o crea uno
  nuevo con su `aggregatedProgress`. Resuelve `displayName`, `franchiseId`,
  `contentId`, `abbreviation`, `totalEpisodes` e `imageUrl` **desde el seed de
  catálogo** (`mocks/seed/franchises.ts`), no con constantes.
- El **`409`** devuelve `existing` poblado con la forma nueva del contrato
  (§5.2): entry + `checklistId` + `checklistName`, buscando en **todas** las
  carpetas del usuario, incluidas las anidadas.
- **`PATCH /me/links/:id`** devuelve un `ListEntry` completo (hoy devuelve el
  eco del body), recalcula el `aggregatedProgress` del padre y, si el link es
  sincronizado, **escribe también sus copias**. El seed necesita al menos un
  par sincronizado real (dos entries del mismo `versionId` en dos carpetas
  distintas, ambos con `isSynced: true`) — hoy no hay ninguno.
- **`DELETE /me/links/:id`** borra el entry de su carpeta, lo saca del
  `libraryIndex` si era la última aparición de ese `versionId`, y borra el
  franchise-link padre si se queda sin hijos.
- **`linkCount` y `stats` se derivan**, no se escriben: dos funciones puras en
  `mocks/derive/lists.ts` que recorren `entriesByChecklist` /
  `checklistsByUser`. El seed deja de declararlos a mano.
- **`GET /users/:id/checklists/:cid/entries`** busca la checklist con el
  finder **recursivo** y devuelve `404` si no está publicada (§5.4). Hoy una
  lista privada anidada devuelve sus entries.
- `resetMockDb()` sigue restaurando todo (los derivados no necesitan snapshot,
  se recalculan).

**CA:** un test por invariante que **fuerce al mock a trabajar**, no que
verifique que se llamó: crear un link en una sub-carpeta anidada y ver el
`linkCount` de esa carpeta subir en `GET /me/checklists`; crear dos links de la
misma franquicia con `groupUnderFranchise` y ver **un** franchise-link con dos
hijos; patchear un link sincronizado y ver moverse el otro; borrar el último
hijo y ver desaparecer el padre; pedir los entries de una lista privada anidada
por la ruta pública y recibir `404`.

### 3.13 — Cierre de la deuda #6 · 🟡 importante · **NUEVA, agregar al doc 07**

`src/features/lists/types/index.ts`, `src/features/lists/utils/checklistTree.ts`,
`src/features/lists/hooks/useUpdateChecklist.ts`, `src/mocks/handlers.ts`.

Las dos mitades de §4.1: el tipo `CosmeticChecklistPatch` cerrando el camino
optimista (no negociable), y el mock honrando `parentId`/`order` (recortable).

**CA:** llamar a `useUpdateChecklist` con `parentId` **no compila**; el mock
mueve un nodo entre padres y `GET /me/checklists` lo devuelve en su lugar
nuevo, con los hermanos reordenados.

### 3.7 — `EpisodeStepper` optimistic · 🔴 núcleo

`src/components/ui/EpisodeStepper.tsx` NUEVO,
`src/features/lists/hooks/useUpdateEntryProgress.ts` NUEVO,
`src/features/lists/utils/entryTree.ts` NUEVO,
`src/features/lists/services/lists.service.ts` (agregar `updateLink`),
`src/features/lists/components/ListEntryRow.tsx`, `src/i18n/en.ts`.

`entryTree.ts` es el equivalente de `checklistTree.ts` para la lista de
entries, y es donde vive toda la lógica pura y testeable de la tarea:

```ts
// Escribe watchedEpisodes en el entry `linkId` (suelto o hijo de un grupo) y,
// si es hijo, aplica el delta al grupo del padre cuya abbreviation coincide.
// No recalcula la agregación (ADR-021). Structural sharing como patchChecklistNode.
export function patchEntryProgress(
  entries: ListEntry[], linkId: number, watchedEpisodes: number,
): ListEntry[]
```

El hook, con el patrón completo que `useUpdateChecklist` terminó necesitando
—incluido el `onSettled`, que en el 3a no estaba en el diseño y se agregó al
revisarlo—:

- `scope: { id: 'entry-' + linkId }` (§4.3) y commit debounced 400 ms.
- `onMutate`: `cancelQueries(entries(checklistId))` → snapshot del array
  completo (el de la **primera** pulsación de la ráfaga) →
  `setQueryData(patchEntryProgress(...))`.
- `onError`: restaura el snapshot entero (mismo criterio que 3a: más simple y
  más seguro que revertir la fila) **y muestra un toast** — está en la CA del
  plan, no es decoración.
- `onSettled`: invalida `entries(checklistId)`; **si `entry.version.isSynced`,
  invalida `listKeys.all`** (§3.2). Nunca invalida `tree()` ni
  `libraryIndex()`.

`EpisodeStepper` es de presentación pura (valor, `onChange`, `disabled`,
`max`): `– N +`, `aria-label` en ambos botones, `+` deshabilitado cuando
`totalEpisodes > 0 && watched >= total` (con `total === 0` no hay tope: es
"desconocido/en emisión", no cero). El clamp del cliente es **UX, no
validación**: el modelo de Chano no acota `lv_episodes` (§2.1), y B7 solo
rechaza negativos.

Fuera de alcance: el toggle filas/cards de doc 06 (ninguna CA lo pide) y el
stepper en la vista pública (`/profile/:id/list/:cid` es read-only por
contrato).

**CA (del plan):** corte de red simulado → rollback + toast. Se agregan dos que
el plan no pide y que son donde vive el riesgo: subir un episodio de un hijo
mueve el `[S1 …]` del padre **en el mismo frame**; y patchear un entry
sincronizado deja `entries()` de la **otra** carpeta invalidada (verificable
leyendo el `queryClient`).

### 3.8 — `LinkWizard` · 🔴 núcleo

`src/features/lists/components/LinkWizard.tsx` NUEVO,
`WizardVersionStep.tsx` NUEVO, `WizardTargetStep.tsx` NUEVO,
`WizardConflictStep.tsx` NUEVO, `AddToListButton.tsx` NUEVO,
`src/features/lists/hooks/useLinkWizard.ts` NUEVO, `useCreateLink.ts` NUEVO,
`useDeleteLink.ts` NUEVO,
`src/features/lists/services/lists.service.ts` (agregar `createLink`,
`deleteLink` + `AlreadyLinkedError`), `src/features/lists/types/index.ts`,
`src/features/catalog/components/VersionsTable.tsx` (prop `renderAction`),
`src/pages/FranchiseDetailPage.tsx`, `src/pages/ContentDetailPage.tsx`,
`src/i18n/en.ts`.

**Máquina de estados** en `useLinkWizard`, como unión discriminada (no cuatro
booleanos sueltos):

```
{ step: 'version' }   // se saltea si el content tiene una sola versión
  → { step: 'target', versionId }
  → submit → 201 → { step: 'done', entry }        → toast con undo
           → 409 → { step: 'conflict', existing }
                     ├─ "add anyway"    → submit con force: true
                     ├─ "synced copy"   → submit con syncWithLinkId: <elegido>
                     └─ "cancel"        → cierra sin crear nada
```

Los **tres caminos** de la CA son las tres salidas del paso `conflict`. El paso
`target` tiene: árbol compacto de carpetas (reusa el árbol de
`useChecklists`, en modo selección — **no** se duplica `ChecklistTree`), "crear
lista nueva inline" (`useCreateChecklist`, que ya existe), select de
`alternativeNames` para el `displayNameId` con el principal por default, y el
toggle "group under franchise" en `true` por default con su propio select de
nombre de franquicia (§6.1: `franchiseDisplayNameId` solo es obligatorio si el
franchise-link **se crea**).

Detalles que no son obvios:

- **El `undo` del toast es fiel.** `DELETE /me/links/:id` sobre el link recién
  creado borra también el franchise-link padre si se queda sin hijos (regla de
  `action_remove`), así que deshacer no deja un grupo vacío colgado.
- **Sin optimistic**, por la misma regla del 3a: el id lo asigna el servidor.
  Se invalida (§3.2) y se espera.
- **`existing` se parsea en el service** (§3.3). Si el backend manda algo que
  no valida, el wizard cae al paso `conflict` sin lista y solo ofrece "add
  anyway / cancel" — degrada, no rompe.
- Accesibilidad: el diálogo atrapa el foco y devuelve el foco al
  `AddToListButton` al cerrar; los pasos anuncian el cambio con
  `aria-live="polite"` (doc 06, regla 6: teclado en SearchBar/árbol/**wizard**).

**CA (del plan):** los 3 caminos demostrables. Se explicita: cada uno con MSW
devolviendo el `409` real (no un `server.use` que devuelva `existing: []`), y
un test de que "crear copia sincronizada" manda `syncWithLinkId` con el id de
la existente elegida por el usuario, no con el primero de la lista.

### 3.9 — `library-index` en catálogo · 🟡 importante

`src/features/lists/hooks/useInLibrary.ts` NUEVO,
`src/features/catalog/components/VersionsTable.tsx`,
`src/pages/FranchiseDetailPage.tsx`, `src/pages/ContentDetailPage.tsx`,
`src/i18n/en.ts`.

**Está a medias sin que el plan lo diga**: `FranchiseCard` ya tiene `inLibrary`
y `CatalogPage`/`HomePage`/`SearchPage` ya le pasan el índice (verificado).
Lo que falta es la mitad de **versión** y la mitad de **"se actualiza"**:

- `useInLibrary()` envuelve `useLibraryIndex` y devuelve
  `{ hasFranchise(id), hasVersion(id) }` sobre dos `Set` memoizados — evita
  desparramar `.includes()` O(n) por fila de la tabla de versiones.
- Cada fila de `VersionsTable` pasa a mostrar `AddToListButton` en estado
  "Add to list" o "In your list ✓" según `hasVersion(version.id)` (doc 06).
- La actualización la garantizan las invalidaciones de 3.8 (§3.2); acá solo hay
  que **testearla de punta a punta**, que es literalmente la CA del plan.

**CA (del plan):** las cards muestran "in your list" y se actualiza al
agregar/quitar. Test de integración: catálogo → wizard → 201 → el badge
aparece sin recargar; undo → desaparece.

### 3.10 — Perfil público + stats · 🟡 importante

`src/features/profile/services/profile.service.ts` NUEVO, `schemas.ts` NUEVO,
`src/features/profile/hooks/queryKeys.ts` NUEVO, `useProfile.ts` NUEVO,
`usePublicEntries.ts` NUEVO,
`src/features/profile/components/ProfileHeader.tsx` NUEVO,
`StatsGrid.tsx` NUEVO, `ChecklistCard.tsx` NUEVO,
`src/pages/ProfilePage.tsx`, `src/pages/PublicListPage.tsx`,
`src/features/auth/hooks/useLogout.ts` (cerrar la nota del docstring, §3.5),
`src/i18n/en.ts`.

- Primer feature nuevo desde el Sprint 2: se crea `features/profile/` completo
  (hoy solo tiene `types/`), con la misma estructura que `lists`.
- Las stats llegan del contrato (§4.5); `StatsGrid` **no** las calcula. La
  dona de distribución games/videos se dibuja con SVG a mano sobre
  `byContentType` (dos valores, un `stroke-dasharray`): sumar una librería de
  charts por un gráfico de dos sectores no se paga.
- `PublicListPage` reusa `ListEntryRow` y `FranchiseEntryGroup` **tal cual**,
  en modo lectura: es exactamente para lo que quedaron separados del stepper en
  3.6. No se les pasa el stepper.
- Estados: perfil vacío (usuario 2 del seed) → `EmptyState`; lista privada o
  inexistente → `404` de la API → `ErrorState` con mensaje propio, sin decir si
  existe (§5.4).
- Perfil propio: banner "estas listas son públicas" + link a settings (doc 06).
  Se decide comparando `useMe()` con el `:userId` de la ruta, no con una query
  aparte.

**CA (del plan):** perfil vacío (EmptyState) y poblado. Se agrega: entrar por
deep-link a `/profile/1/list/<id-de-una-lista-privada>` da el estado de error,
nunca los entries.

### 3.11 — `RatingStars` + notas · ⚪ recortable (las notas, no)

`src/components/ui/RatingStars.tsx` NUEVO, `ScoreDisplay.tsx` NUEVO,
`src/features/lists/components/EntryNotesDialog.tsx` NUEVO,
`src/features/lists/hooks/useUpdateEntryMeta.ts` NUEVO,
`src/lib/features.ts` (agregar `isFeatureEnabled`), `src/i18n/en.ts`.

- Notas **fuera del flag** (§4.6): `link_description` existe de verdad. Si la
  tarea se recorta, esta mitad igual entra.
- `RatingStars`/`ScoreDisplay` detrás de `isFeatureEnabled('ratings')`, y las
  fechas detrás de `watchDates`.
- `useUpdateEntryMeta` no reutiliza `patchEntryProgress` sino el mismo
  **patrón** (snapshot + rollback + `onSettled`), con un helper hermano
  `patchEntryFields` en `entryTree.ts`. Rating y notas no tocan el agregado del
  padre, así que no hay delta que aplicar.

**CA (del plan):** flag off ⇒ ni rastro en la UI. Se explicita: el test corre
con `isFeatureEnabled` devolviendo `false` y verifica (a) que no hay ningún
control de estrellas en el DOM, (b) que el body del `PATCH` **nunca** lleva
`rating` ni fechas.

### 3.3b — OAuth Twitch end-to-end · ⚪ recortable

`src/features/auth/components/OAuthButtons.tsx` (quitar el `disabled` de modo
mock cuando `VITE_API_MODE=real`), `src/pages/RegisterPage.tsx` (el botón hoy
quedó solo en `LoginPage` — hueco detectado en el 3a), y del lado backend la
tarea **B9**.

El grueso es carril B y config de base, no frontend: la parte de UI ya se hizo
en 3.3a. **Regla de corte:** si registrar la app de Twitch se traba, 3.3a
(flujo mockeado completo) es el entregable de portafolio y 3.3b se mueve a
Sprint 4 — no bloquea nada del sprint.

## 8. Orden y dependencias

```
3.12 (mock) ──┬─→ 3.7 ──┐
              ├─→ 3.8 ──┼─→ 3.9
              └─→ 3.10  │
3.13 (deuda #6, independiente) │
                               └─→ 3.11 (reusa el patrón de 3.7)
3.3b ── depende de B9, no del carril A

Carril B (en paralelo, no bloquea el A):  B6 → B7 → B8 → [B9] → B10
```

- **3.12 va primero y no es negociable.** Es medio día que desbloquea cuatro
  tareas y evita que se construyan cuatro CA sobre un mock que miente. Si se
  saltea, el sprint entero queda verificado en falso.
- **3.7 antes que 3.8**: el patrón optimista y `entryTree.ts` los usa 3.11
  después, y 3.7 es la tarea con el riesgo técnico concentrado (es el motivo
  por el que existe el corte 3a/3b).
- **3.9 después de 3.8**: su CA ("se actualiza al agregar/quitar") *es* la
  invalidación de 3.8.
- **3.10 no depende de 3.7 ni de 3.8** — se puede hacer en paralelo apenas
  esté 3.12, igual que 3.4/3.6 iban en paralelo a 3.1/3.2 en el 3a.
- **Orden de recorte** si aprieta el plazo, coherente con doc 07: primero
  3.3b, después 3.11 (menos las notas), después 3.10, después la mitad
  recortable de 3.13 y el long-press de 3.7. **3.12, 3.7 y 3.8 no se tocan.**

## 9. Riesgos

| Riesgo | Mitigación concreta |
|---|---|
| **El `409 ALREADY_LINKED` filtra listas de otros usuarios.** La lógica de Chano (`action_link_to_checklist`) busca links sin filtrar por dueño; bajo `sudo()` devolvería nombres de listas ajenas — y ahora el payload del `409` **lleva el nombre de la lista** (§5.2), así que la fuga sería literal, no potencial | ADR-014: `/me/*` corre con el ORM del usuario y la `ir.rule` acota la búsqueda sola. CA de B6 (a): dos usuarios portal, A vincula lo que B ya tiene y el `409` no trae ni un dato de B. Es el mismo riesgo que el doc 12 dejó anotado y sigue siendo el más caro del sprint |
| **La `ir.rule` de `link.copy` con `'|'` (OR) permite crear una fila cruzada y, peor, la hace visible desde el otro lado**: la víctima queda con su propio `PATCH` de episodios rompiendo con `AccessError` (§2.2, inferido, no probado) | ADR-020: la regla pasa al AND implícito (ambos lados del mismo dueño), y B6 valida `syncWithLinkId` con el ORM del usuario antes de crear nada (defensa en profundidad). CA de B6 (b) y (c), **con dos usuarios portal**. Es lo primero que hay que probar empíricamente cuando el Odoo local vuelva a estar arriba |
| **Un `PATCH` de progreso deja mintiendo el cache de otras carpetas** (copias sincronizadas, verificado en `Link.write`) | §3.2: si `isSynced`, `onSettled` invalida el prefijo `['lists']` entero. Test explícito leyendo el `queryClient`, no la pantalla |
| **El agregado del padre no se mueve durante la ventana optimista** y la demo muestra la barra del hijo subiendo con el `[S1 …]` congelado | ADR-021: delta sobre el grupo del padre. Se testea la función pura `patchEntryProgress`, no el componente |
| **Una ráfaga de long-press produce respuestas fuera de orden y un rollback ambiguo** | §4.3: `scope` de TanStack Query v5 (serializa por entry) + valor absoluto en el body + commit debounced. Si hay que recortar, se recorta el long-press, no el `scope` |
| **El mock de `/me/links` hace pasar en verde cuatro tareas que no funcionan** (es la octava mentira de MSW del proyecto) | 3.12 es prerrequisito bloqueante y su CA exige tests que **fuercen al mock a trabajar** (crear anidado, agrupar, propagar, borrar el padre huérfano), no tests de "se llamó la mutación". Es la lección literal del Sprint 3a |
| **MSW y el backend real divergen en silencio** (ADR-017: dos implementaciones del mismo contrato, y ahora el mock tiene reglas de negocio) | B10 obligatorio para cerrar el sprint, corrido por el agente de tests y no por quien escribió los endpoints (como en B5, que así encontró un drift real). Incluye la paridad de los cuatro invariantes de §4.4 |
| **`Link.unlink()` nunca se ejerció**: el override borra `link_record_id`, que cascadea hacia el propio link, y después llama a `super().unlink()` sobre una fila que ya no existe | CA de B7: el `DELETE` devuelve `204` sin `MissingError`. Si explota, la salida es borrar en el orden inverso desde el controlador, no parchear `ll_checklist` |
| **3.10 expone datos privados por un `403` que confirma existencia, o por un filtro de publicación que solo mira la raíz** (el mock ya tiene exactamente ese bug) | §5.4 (`404` en vez de `403`) + §6.2 (bosque de subárboles publicados) + CA de 3.12 y de B8, ambas con una lista privada **anidada** |
| **Las stats filtran el tamaño de las listas privadas** de un usuario en un endpoint público | §4.5: se calculan solo sobre links en checklists publicadas. CA de B8: agregar entries a una lista privada no mueve las stats |
| **3.3b se traba en la app de Twitch** (depende de registrar una app y de config de base, no de código) | Es ⚪ y va última; regla de corte explícita en su ficha: 3.3a es el entregable de portafolio y 3.3b se mueve a Sprint 4. Además `ll_oauth` tiene un `except AccessDenied` sin importar `AccessDenied` (§2.1): si esa rama corre es un `NameError`, así que conviene mirarlo antes de perder una tarde |
| **El Odoo local no se pudo levantar en esta sesión**, así que todo el diseño del carril B sale de leer código, no de probarlo (a diferencia del doc 12) | Está marcado en §2.2 qué es inferido. B6 arranca levantando el Odoo local y **reverificando** los dos supuestos que sostienen su diseño (la `ir.rule` de copias y `Link.unlink`) antes de escribir el endpoint |
| **El plazo**: el 3b suma dos tareas al plan (3.12 y 3.13) sobre un sprint que ya tenía seis | 3.13 es 🟡 y su mitad cara es recortable; 3.12 no agrega alcance, paga una deuda que ya estaba consumiendo tiempo de otras tareas (el mismo patrón del #7 en el 3a, que se cobró tres tareas seguidas antes de cerrarse) |

## 10. Qué le toca a cada agente

- **`anitrack-software-architect`** (este documento) — pendiente suyo: nada
  bloqueante, salvo revisar ADR-020 cuando B6 lo verifique empíricamente. Si
  la prueba con dos usuarios portal contradice el razonamiento de §2.2, el ADR
  se corrige ahí mismo en vez de dejarlo afirmando algo falso.
- **`anitrack-senior-software-engineer`** — ejecuta el carril A en el orden de
  §8 (3.12 **primero**) y el carril B con el detalle de §6. No re-decide lo que
  fijan ADR-020 a ADR-022; si algo no cierra al implementarlo, lo levanta en
  vez de improvisar una variante. Dos invariantes que este sprint estresa más
  que el anterior: ninguna `queryKey` fuera de `queryKeys.ts`, y ningún
  `sudo()` sobre modelos privados en `api_lists.py`.
- **`anitrack-test-quality-engineer`** — escenarios críticos, por orden de
  riesgo: (1) rollback de `useUpdateEntryProgress` con corte de red **y** con
  ráfaga de long-press; (2) el fan-out de invalidación leído del
  `queryClient`, incluido el caso sincronizado que invalida `['lists']`;
  (3) los tres caminos del `409` con `existing` real; (4) los cinco
  invariantes del mock de 3.12, cada uno forzando al mock a trabajar; (5) la
  lista privada **anidada** por la ruta pública; (6) el flag de 3.11 apagado,
  verificando también el body del `PATCH`; (7) **B10**, el checkpoint de
  contrato, que corre este agente y no quien escribió los endpoints.
- **`anitrack-production-code-reviewer`** — invariantes a mirar en este
  sprint: ningún `sudo()` sobre `ll.checklist.link`/`checklist`/`link.copy`;
  ninguna re-agregación de `aggregatedProgress` en el frontend (ADR-021);
  ninguna mutación optimista sobre create/delete; ningún `as` sobre
  `ApiError.detail`; ningún import de `features/lists` dentro de
  `features/catalog` (§3.4); ningún contador escrito a mano en el seed de MSW
  (ADR-022); y que `checklist_user_id` siga sin venir nunca del body.
- **`docs-manager`** — antes de ejecutar: agregar **3.12 y 3.13** a la tabla
  del Sprint 3b en `docs/07-plan-de-trabajo.md` (§7) y aplicar los **cuatro
  cambios de contrato** de §5 en `docs/04-contrato-api.md`. Al cerrar el
  sprint: bitácora `docs/16-sprint3b-avance.md`, fila nueva en
  `docs/README.md` para este documento y para la bitácora, actualizar el
  estado de `/me/links` y `/users/:id/*` en
  `docs-backend/14-resumen-implementacion-api.md`, y cerrar en
  `docs-backend/08-preguntas-backend.md` la pregunta 6.1 (Twitch) si 3.3b
  llega a hacerse.
