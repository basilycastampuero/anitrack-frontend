# 16 — Bitácora: Avance Sprint 3b (tracking y vinculación)

> Registra el estado real del Sprint 3b (doc 07, diseñado en
> [15-diseno-sprint3b.md](./15-diseno-sprint3b.md)) a la fecha. No es un cierre
> de sprint: el carril A queda en 7/8 (falta 3.3b) y el carril B todavía no
> arrancó. Fecha: 2026-09-21.

## Alcance completado

### Carril A — frontend (contra MSW)

| # | Tarea | Estado |
|---|---|---|
| 3.12 | El mock de `/me/links` ejecuta el modelo | ✅ (commit `b66925b`) |
| 3.7 | `EpisodeStepper` con optimistic update | ✅ (commit `a0ae9b3`) |
| 3.8 | `LinkWizard` con los tres caminos del 409 | ✅ (commit `5a3e5a9`) |
| 3.9 | `library-index` en catálogo (indicador por versión) | ✅ (commit `59ec2ce`) |
| 3.10 | Perfil público + stats | ✅ (commit `e971eaf`) |
| 3.13 | Cierre de la deuda #6 | ✅ (commit `dc138a0`) |
| 3.11 | RatingStars [flag] + notas | ✅ (commit `4cd9391`) |
| 3.3b | OAuth Twitch end-to-end | ⬜ **diferido al Sprint 4** por su propia regla de corte (⚪ recortable): depende de registrar una app de Twitch, que es trabajo del dueño y no de código. La mitad que no dependía de Twitch se hizo — ver el cierre abajo |

> Carril A cierra **7/8**. Fuera de la tabla del plan hay un noveno commit,
> `1059c51` (fix de CI: apagar la latencia simulada de MSW bajo Vitest — ver
> "Hallazgos" abajo), que no corresponde a ninguna tarea numerada.

### Carril B — backend en `ll-odoo` (rama `anitrack/rest-catalog-api`, nunca se pushea)

| # | Tarea | Estado |
|---|---|---|
| B6 | `POST /me/links` + `ir.rule` de copias (ADR-020, OR→AND) | ✅ (commits `d3be430` y `11883fe`) |
| B7 | `PATCH`/`DELETE /me/links/:id` | ✅ (commit `4deada8`) |
| B8 | `/users/:id/profile` + `/users/:id/checklists/:id/entries` | ✅ (commit `6e104f2`) |
| B9 | `GET /auth/oauth/twitch` (solo si va 3.3b) | ⬜ diferido al Sprint 4, junto con 3.3b |
| B10 | Checkpoint de contrato | ✅ (2026-09-22, sin drift) |

> Carril B en **4/5**, y el quinto (B9) se difiere junto con 3.3b. Arrancó
> el 2026-09-21, cuando pudo levantarse el Odoo
> local (faltaba activar la integración WSL de Docker Desktop para la distro).
> Antes de escribir una línea se reverificaron empíricamente los dos supuestos
> que el diseño había marcado como inferidos — ver "Verificación empírica del
> carril B" más abajo. B6 quedó probada de punta a punta contra el backend
> real; sigue B7.

## Qué se construyó

- **3.12 — el mock de `/me/links` deja de ser un stub** (`src/mocks/handlers.ts`,
  `src/mocks/derive/lists.ts` NUEVO, `src/mocks/seed/lists.ts`): el `POST`
  agrupa por franquicia, resuelve nombre/imagen/episodios desde el seed de
  catálogo (nunca del body), valida que `displayNameId` pertenezca al content,
  y busca el `409` en todas las carpetas del usuario, incluidas las anidadas.
  El `PATCH` devuelve el `ListEntry` completo, recalcula el agregado del padre
  y propaga a las copias sincronizadas. El `DELETE` borra el franchise-link
  huérfano. Aplica ADR-022: `linkCount`, stats del perfil y `libraryIndex`
  pasan a derivarse de los entries reales en vez de estar escritos a mano.
  Arregla además la ruta pública de entries, que solo buscaba la checklist en
  el nivel raíz.
- **3.7 — `EpisodeStepper` optimistic** (`src/features/lists/utils/entryTree.ts`
  NUEVO, `useUpdateEntryProgress.ts` NUEVO, `EpisodeStepper.tsx` NUEVO): aplica
  ADR-021 (delta sobre el agregado del padre, sin recalcular
  `compute_show_name`); `scope: { id: 'entry-<linkId>' }` serializa la ráfaga
  del long-press, con commit debounced 400 ms y snapshot tomado en el primer
  click. El fan-out de invalidación queda declarado en el docstring: invalida
  `entries(checklistId)` y, si el link es sincronizado, `listKeys.all`; nunca
  `tree()` ni `libraryIndex()`.
- **3.8 — `LinkWizard`** (`useLinkWizard.ts`, `LinkWizard.tsx`,
  `WizardVersionStep.tsx`, `WizardTargetStep.tsx`, `WizardConflictStep.tsx`,
  `AddToListButton.tsx`, todos NUEVO): máquina de estados como unión
  discriminada con los tres caminos del `409` (agregar igual, copia
  sincronizada, cancelar). `AlreadyLinkedError` se parsea con Zod en el
  service (§3.3 del diseño), nunca con `as` en el componente.
  `VersionsTable` gana `renderAction` para que `catalog` no importe `lists`
  (§3.4). `ChecklistTree` suma el modo `compact` en vez de duplicarse.
- **fix de CI (`1059c51`)** — la latencia simulada de MSW (ADR-008) hacía
  fallar la suite ~2 de cada 10 corridas con `ReferenceError: ProgressEvent is
  not defined` cuando una request quedaba en vuelo al desmontarse el entorno
  jsdom del archivo. La latencia pasa a cero bajo Vitest
  (`import.meta.env.MODE`); el único test que necesitaba una ventana
  optimista observable (`useUpdateChecklist`) pasa a poner su propio delay con
  `server.use`. La suite baja de ~95 s a ~51 s.
- **3.9 — indicador "in your list" por versión** (`useInLibrary.ts` NUEVO):
  envuelve `useLibraryIndex` con dos `Set` memoizados (`hasVersion`,
  `hasFranchise`); absorbe el `useMemo` que estaba triplicado en
  Home/Catalog/Search. El botón dice "In your list ✓" pero sigue abriendo el
  wizard (vincular a una segunda lista sigue siendo válido).
- **3.10 — perfil público + stats** (`src/features/profile/` completo:
  services, hooks, components, NUEVO): `StatsGrid` no calcula nada, muestra lo
  que ya llega agregado del contrato (§4.5 del diseño); la dona
  games/videos es SVG a mano. `PublicListPage` reusa `ListEntryRow` /
  `FranchiseEntryGroup` sin pasarles `checklistId` (sin stepper, de solo
  lectura). Cierra la nota pendiente del docstring de `useLogout` (§3.5 del
  diseño): las queries de perfil no se limpian en logout porque un perfil
  público no es dato de sesión.
- **3.13 — cierre de la deuda #6** (`src/features/lists/types/index.ts`,
  `useUpdateChecklist.ts`, `checklistTree.ts`, `src/mocks/handlers.ts`):
  `CosmeticChecklistPatch` (`Pick<UpdateChecklistRequest, 'name' |
  'description' | 'isPublished' | 'sortingMode'>`) convierte el falso verde
  en error de compilación — verificado ensanchando el tipo a propósito y
  contando tres `TS2578`. El mock aprende a mover/reordenar de verdad, con
  detección de ciclos.
- **3.11 — notas siempre, puntaje y fechas detrás del flag**
  (`RatingStars.tsx` NUEVO, `ScoreDisplay.tsx` NUEVO,
  `EntryNotesDialog.tsx` NUEVO, `useUpdateEntryMeta.ts` NUEVO): `notes` mapea a
  `link_description`, que existe y es escribible en el backend real, así que
  queda **fuera** del flag (§4.6 del diseño); solo `rating`/`startedAt`/
  `finishedAt` (los `[EXT]` reales de ADR-004) van detrás de
  `isFeatureEnabled`. El filtrado vive en el hook, no en el componente, para
  que un `PATCH` no mande campos que el backend real no tiene.

## Decisiones tomadas sobre la marcha (no estaban en los ADRs ni en el diseño)

Ninguna cruza la vara de ADR nuevo — ADR-020 a ADR-022 ya estaban escritos en
el diseño (doc 15) antes de que arrancara este trabajo, y nada de lo de abajo
es un trade-off arquitectónico nuevo:

1. **`RatingStars` es un radiogroup de diez radios visualmente ocultos**, uno
   por media estrella, y no un puñado de `div` con `onClick`: así el teclado
   funciona sin código adicional y el lector de pantalla anuncia "7 de 10" en
   vez de leer diez iconos sueltos. Las estrellas visibles quedan
   `aria-hidden`.
2. **La latencia simulada de MSW se apaga solo bajo Vitest**, nunca en
   navegador (decisión del fix de CI): la latencia sigue existiendo para ver
   los skeletons en desarrollo (ADR-008 no se toca), pero deja de ser una
   fuente de flake en la suite automatizada.
3. **Los tests del wizard usan el `409` real que emite MSW**, no un
   `server.use` que devuelva `existing: []`: fuerza a que el payload real
   (con `checklistId`/`checklistName`) sea lo que se verifica, no una forma
   inventada por el test. El caso de "copia sincronizada" elige a propósito
   la **segunda** aparición del link existente, para confirmar que se manda
   el elegido por el usuario y no el primero de la lista.
4. **El seed ganó su primer par sincronizado real** (Steins;Gate en
   "Completed" y en "2010s"): sin él, la propagación entre copias de 3.12/3.7
   no se podía ejercer con datos reales del seed.

## Hallazgos verificados durante la implementación

Cuatro hallazgos concretos, con número o cita exacta, más allá de lo que el
diseño (doc 15 §2.1) ya anticipaba en términos generales:

- **Flake de CI por la latencia simulada de MSW — no estaba anticipado en el
  diseño.** La suite fallaba ~2 de cada 10 corridas con
  `ReferenceError: ProgressEvent is not defined`, siempre atribuido a un
  archivo distinto del que lo causaba (una request en vuelo cuando Vitest ya
  desmontó el entorno jsdom de ese archivo). Confirmado con diez corridas
  limpias tras el fix (commit `1059c51`); la suite además bajó de ~95 s a
  ~51 s de tiempo de tests.
- **Las stats del seed eran directamente falsas, no solo "a mano".** El
  diseño ya señalaba que `stats` era una constante sin relación con
  `entriesByChecklist` (§2.1, §4.4); lo que se confirmó al derivarlas de
  verdad (ADR-022) es que los valores viejos no correspondían a ningún
  cálculo real: decían 128 episodios y 5 entries donde el número correcto,
  contando solo listas publicadas, es 41 y 4.
- **`libraryIndex` era peor que impreciso: crecía y nunca se achicaba.** El
  `POST /me/links` lo agrandaba pero el `DELETE` nunca sacaba nada, así que
  desvincular una versión la dejaba mostrándose igual como "in your list" —
  el bug concreto que hacía inverificable la mitad "se actualiza al
  agregar/quitar" de la CA de 3.9.
- **El agujero de la lista privada anidada, confirmado y cerrado.** El diseño
  ya lo señalaba como hueco conocido del mock (§2.1: `owner.find(...)` solo
  mira el nivel raíz); en 3.12 se confirmó que efectivamente devolvía las
  entries de una lista privada anidada a cualquiera, y se cerró buscando la
  checklist de forma recursiva con `404` (no `403`) para las no publicadas —
  mismo criterio que ya regía el resto de la API privada.

## Revisión pre-merge (`anitrack-production-code-reviewer`)

Con el carril A cerrado se corrió la revisión que el doc 15 §10 pone en este
punto, sobre `0273f26..HEAD` acotado a `src/`. Veredicto: **0 críticos, 1
alto, 5 medios, 6 bajos**; los siete invariantes de §10 se cumplen, sin
hallazgos de seguridad ni violaciones de ADR-001 a ADR-022.

Seis se arreglaron antes de seguir:

| # | Hallazgo | Qué se hizo |
|---|---|---|
| 1 | Con dos commits en vuelo para el mismo entry, el snapshot de rollback se desalineaba: podía retroceder de más, o una mutación quedarse sin snapshot y dejar en pantalla un valor que el servidor nunca aceptó | `useUpdateEntryProgress` pasa a garantizar **un solo commit en vuelo**: si el debounce vence con uno andando, el valor queda pendiente y lo manda `onSettled`. El snapshot ya no se consume en `onMutate`, se limpia cuando la cadena queda ociosa, y un error aborta la cadena entera |
| 2 | El `onError` del "deshacer" del toast nunca corría: el wizard ya está desmontado y TanStack v5 gatea los callbacks pasados a `mutate` por `hasListeners()` del observer | El aviso se movió a las opciones de `useDeleteLink`, que las invoca la mutación misma |
| 3 | El flush de desmontaje no avisaba si fallaba, y su invalidación no refetcheaba la carpeta ya inactiva (default `refetchType: 'active'`) | Toast en el `catch` y `refetchType: 'all'` |
| 4 | `shiftGroup` matcheaba el grupo del padre **por abreviación**, y la agregación emite un grupo por hijo: dos versiones del mismo content en la misma carpeta comparten `content_abbreviation`, así que el agregado se movía el doble | Se identifica el grupo por posición. Test de regresión con dos hijos homónimos |
| 5 | Un visitante anónimo que tocaba "Add to list" en el catálogo público quedaba con un skeleton infinito: `useChecklists` está deshabilitado sin sesión y `ChecklistTree` evalúa `isPending` primero | `AddToListButton` ofrece entrar y volver (`/login?next=`) en vez de abrir un wizard que no puede funcionar |
| 6 | `RatingStars`: los radios son `sr-only` y no había foco visible, así que un usuario de teclado vidente no veía dónde estaba parado | Anillo de foco sobre la estrella vía `has-[:focus-visible]:`, y `name` derivado de `useId()` |

Una corrección al informe, verificada: el hallazgo #1 no se alcanza contra
MSW. El reviewer lo atribuyó a la latencia normal del mock (200–600 ms), pero
ese rango es el de los `GET` vía `simulate()`; el `PATCH /me/links/:id` usa
150 ms, por debajo del debounce de 400. Se reproduce contra un backend real
con RTT mayor a 400 ms, y el test de regresión inyecta esa lentitud a mano.

### Deuda abierta que dejó la revisión

Numerada acá para que no se pierda; nada de esto bloquea el merge. **Esta
numeración (1–7) es local a esta sección**, no continúa la secuencia global
de hallazgos de [13-sprint3a-avance.md](./13-sprint3a-avance.md) (#1 en
adelante) — no confundirla con los #15–#20 de esa bitácora, que vienen de
una revisión distinta y posterior.

1. **El botón "Back" del paso `target` del wizard cancela el wizard entero**:
   la máquina de estados no tiene transición `target → version`. Hoy es
   inofensivo porque ningún caller omite `versionId`, así que ni ese botón ni
   `WizardVersionStep` se renderizan en la app real — solo en los tests.
   Decidir si `WizardVersionStep` tiene un punto de entrada propio o se
   declara preparación para 4.x.
2. **`PublicListPage` presenta cualquier error como "lista privada"**: un
   corte de red o un `500` se leen como decisión de privacidad del dueño, y no
   hay botón de reintento. Ramificar por `NOT_FOUND` como ya hace
   `ProfilePage`.
3. **`EntryNotesDialog` repone el formulario ante cualquier cambio de
   identidad del entry** (`useEffect` con `[open, entry]`): si el entry cambia
   en el cache mientras el diálogo está abierto, pisa lo que el usuario está
   tipeando. Depender de `[open, entry.linkId]`.
4. **El mock marca `isSynced` en el link origen antes de poder fallar**
   (`handlers.ts`): un `422` posterior o un "deshacer" dejan el original
   marcado como sincronizado sin ninguna copia. En Odoo la fila de
   `ll.checklist.link.copy` se borraría con el link.
5. **`useInLibrary` no entrega el ahorro que documenta cuando se usa por
   fila**: cada `AddToListButton` construye sus propios `Set`. Con los tamaños
   actuales es irrelevante, pero el comentario afirma algo que el uso
   contradice. O se levanta el hook a la página, o se ajusta el comentario.
6. **Tests faltantes**: `patchEntryFields` no tiene test propio, y el fan-out
   de `useDeleteLink` solo se ejercita indirecto desde
   `AddToListButton.test.tsx`.
7. **Fuera del diff del sprint**: `GET /me/checklists/:id/entries` en el mock
   devuelve los entries sin verificar que la carpeta sea del usuario logueado
   — `requireUser()` solo comprueba que haya sesión. Es la misma clase de fuga
   que 3.12 cerró en la ruta pública y, ahora que existe `findChecklist`, son
   dos líneas. **[CERRADO 2026-09-22]** — reutiliza `findChecklist` como acá
   se anticipaba; queda con el número global **#17** en la revisión nueva de
   [13-sprint3a-avance.md](./13-sprint3a-avance.md#actualización-2026-09-22--cierre-de-9-a-14-perdidos-y-revisión-nueva-15-a-20).

## Verificación empírica del carril B (2026-09-21)

El doc 15 §2.2 marcaba dos supuestos como "inferidos, no comprobados": el
Odoo local no había podido levantarse durante el diseño. Se levantó, y se
probaron los dos con **dos usuarios portal reales**, corriendo el mismo script
antes y después de cada cambio.

**ADR-020, la `ir.rule` de `link.copy` con OR — confirmado, y el DoS también.**
Con el OR, el portal A creó una fila de `ll.checklist.link.copy` apuntando al
link de B, y a partir de ahí B **no pudo escribir `lv_episodes` en su propio
link** (`AccessError`): `Link.write` intenta propagar al link del atacante y
se lo niega. Un usuario cualquiera podía inutilizarle el progreso a otro.
Aplicado el AND (commit `d3be430` en `ll-odoo`), el mismo script da: A recibe
`AccessError`, B recupera la escritura, el admin conserva lectura y borrado
(regresión de ADR-014), y —la comprobación que evitaba el falso positivo— las
**copias legítimas** siguen creándose y viéndose.

**`Link.unlink()` y el `MissingError` — confirmado parcialmente, y el matiz
importa.** La primera prueba borró un link suelto y no falló, así que se
registró como refutado. Al implementar B6 el error apareció, y una sonda de
cuatro casos lo acotó:

| Caso | Resultado |
|---|---|
| `unlink` de un version-link suelto | sin error |
| `unlink` del franchise-link padre **y sus hijos en la misma llamada** | **`MissingError`** |
| `unlink` del padre solo | sin error, y se lleva a los hijos por cascada |
| hijos primero y el padre después, en llamadas separadas | las dos sin error |

O sea: la premisa del diseño (la cascada de `link_record_id`) y su conclusión
eran correctas; lo que faltaba era *cuándo* se pisa la condición. Un
`DELETE /me/links/:id` de a un link nunca la toca. La regla para B7 no es la
salida que preveía el diseño (borrar en orden inverso desde el controlador)
sino más simple: **un `unlink` por link, y el padre después de los hijos**.

La lección que quedó anotada en el doc 15: una prueba que no cubre el espacio
de casos da más confianza que la inferencia y puede errar igual. Al verificar
un supuesto conviene decir qué escenarios se probaron.

## B6 — `POST /me/links`, probada contra el backend real

Replica `action_create_link` del wizard de Odoo —incluida la checklist sombra
que el wizard crea y `Link.create` no— con las validaciones que un endpoint
necesita y el wizard no tiene. Ocho escenarios verificados de punta a punta,
como usuario portal por la API REST:

1. `201` con el entry resuelto **desde el catálogo**, no del body: la
   abreviación sale de `content_abbreviation` y el total de episodios de la
   versión.
2. La misma versión otra vez → `409 ALREADY_LINKED` con `checklistName` real,
   buscado con el ORM del usuario (ADR-014), así que no puede filtrar la lista
   de otro.
3. `force: true` vincula igual.
4. Una segunda versión de la misma franquicia y el mismo `contentType` reusa
   el franchise-link: un solo grupo con dos hijos y su agregado.
5. Un `displayNameId` que no pertenece al content → `422` con `field`.
6. `syncWithLinkId` crea la copia con `isSynced: true`.
7. Un `syncWithLinkId` de **otro usuario** → `404`, sin confirmar si existe.
8. Login por `/auth/login` con cookie de sesión.

Dos cosas que el test destapó: el `409` tiraba `500` porque
`link_checklist_id` no está en `_LINK_FIELDS` y se leía igual; y un "dos
franchise-links en vez de uno" que **no era un bug** — el fixture había
elegido un juego y un anime de la misma saga, y la clave de reuso incluye el
`contentType`, así que dos grupos es lo correcto.

## Cierre: B8, B10 y la decisión sobre 3.3b

### B8 — perfiles públicos

Primer endpoint del módulo que expone datos de **otro** usuario y el primero
que atiende sin sesión, lo que invierte la regla de `api_lists.py`: allá el
aislamiento lo hace la `ir.rule` porque todo corre con el ORM del usuario;
acá no hay usuario a quien aplicarle una regla, así que cae en ADR-010
—`sudo()` con filtro explícito— y **el filtro pasa a ser lo único que separa
lo público de lo privado**. Por eso va en los tres dominios y está comentado
como tal: olvidarlo en cualquiera de los tres publica las listas privadas.

Ocho escenarios verificados sin cookie de sesión, con un fixture donde una
carpeta privada contiene a una publicada. Los dos que más importan: la
sub-carpeta publicada **sube como raíz** del bosque y la privada no aparece; y
las stats reportan 12 episodios mientras la lista privada tiene 100 cargados
—si el filtro faltara en el `read_group`, ese número se filtraría—.

Dos decisiones de implementación: `imageUrl` de las checklists va en `null`,
porque las portadas se sirven por `GET /me/images/<id>`, que exige sesión a
propósito (pueden ser imágenes que el usuario subió, ADR-019) y un visitante
anónimo recibiría 401; y no hace falta el finder recursivo que sí necesita el
mock, porque `checklist_published` es por registro y un solo `search` con el
filtro resuelve los cuatro casos de rechazo con el mismo `404`.

### B10 — checkpoint de contrato, sin drift

Corrido por el agente de tests y **no** por quien escribió B6–B8, que es la
condición que le pone el diseño (§10) y la razón por la que B5 encontró un
drift real en el 3a. Catorce verificaciones de los esquemas Zod del frontend
contra las respuestas reales del Odoo local, más la paridad MSW ↔ real de los
cuatro invariantes de §4.4 (`linkCount`, agrupado, propagación a copias, padre
huérfano): **los cuatro se comportan igual en los dos lados**.

**Sin drift.** A diferencia de B5, no apareció ningún desalineamiento entre el
doc 04, los esquemas del frontend y el backend. Se validó en particular el
payload nuevo del `409` (§5.2) con dos usuarios en carpetas distintas, y que
una lista privada **anidada** dé `404` por la ruta pública.

Cerró de paso la deuda de B5: `libraryIndexSchema` y `checklistResponseSchema`
pasaron a estar exportados en `lists.service.ts`.

**Lo que el checkpoint NO dejó**: nada reproducible. El test se escribió, se
corrió y se borró, con una razón válida —un `*.test.ts` que pega a
`localhost:8069` rompería `npm run test` y la CI en cualquier entorno sin Odoo
local— y descartando bien la variante de script suelto, porque importar los
esquemas reales necesita resolución del alias `@/` y reimplementarlos anularía
el sentido del checkpoint. Queda como deuda una tercera vía que no se exploró:
un archivo que **no matchee el patrón de test** (`src/mocks/checkpoint-b10.ts`)
invocado explícitamente. B5 y B10 ya se escribieron de cero dos veces.

### 3.3b se difiere, y la mitad que no dependía de Twitch se hizo

Por su propia regla de corte: registrar una app de Twitch es trabajo del dueño
del proyecto, no de código, y 3.3a —el flujo completo mockeado— ya es el
entregable de portafolio. B9 se va con ella al Sprint 4.

Lo que sí se hizo, porque no dependía de Twitch: **`OAuthButtons` ahora está
también en `RegisterPage`**. Estaba solo en `LoginPage`, así que quien llegaba
a registrarse no veía la opción social que sí veía al iniciar sesión. Era
deuda del Sprint 3a mal clasificada como parte de 3.3b. Su test necesitó el
`TooltipProvider` que `LoginPage.test` ya tenía, porque el botón muestra un
tooltip en modo mock.

**Y se verificó el tercer supuesto de §2.2 sin necesidad de Twitch.** ADR-015
asumía que `_auth_oauth_signin` deja al usuario nuevo en el grupo Portal, y eso
sostiene el aislamiento de ADR-014: un usuario en otro grupo no tendría
`ir.rule` y vería datos de todos. El grupo no lo decide el código sino el
"template user" del alta, que es **configuración de la base**: acá
`base.template_portal_user_id = 5` → usuario `portaltemplate`, `share = true`,
un solo grupo, **User types / Portal**, con
`auth_signup.invitation_scope = b2c`. El supuesto se sostiene en esta base.

Lo que queda abierto es la instancia de Chano, donde esos dos parámetros pueden
diferir sin ningún cambio de código y sin error visible. Está anotado en
`docs-backend/14` junto al defecto de `ll_oauth` (`except AccessDenied` sin
importar `AccessDenied`, `res_users.py:27`), que **no se arregló a propósito**:
sería la primera modificación a un módulo original de Chano, y reportárselo
vale más que cambiárselo en una rama que no ve.

## Verificación

Corrido en esta sesión desde `anitrack-frontend/` (rama `sprint-3b-tracking`):

```bash
npm run typecheck   # limpio
npm run lint        # 0 errores
npx vitest run      # 46 archivos, 250 tests, todos en verde
```

**Verificación visual**, según lo registrado en cada commit (Chromium propio
de Playwright vía CDP, no re-verificado en esta sesión de documentación):
dark mode y 1280px/390px para 3.7 (tope superior deshabilitado en versión
terminada), 3.8 (paso de destino, conflicto con nombre real de la lista, tres
botones de salida) y 3.10 (stats, listas publicadas, vista pública sin
stepper); 3.11 además corrigió un problema de mobile encontrado en esa misma
verificación (las dos fechas no entraban en dos columnas bajo `sm`, ahora se
apilan).

**No verificado**: nada del carril B contra el Odoo local (no arrancó); los
escenarios de accesibilidad con lector de pantalla real siguen sin probarse
(arrastrado desde el Sprint 3a).

## Qué falta (siguiente paso)

- **Carril A**: solo **3.3b** (OAuth Twitch end-to-end), ⚪ recortable y
  depende de B9. No bloquea el cierre del sprint si se recorta (regla de
  corte del diseño, doc 15 §7).
- **Carril B completo, 0/5**: B6 (`POST /me/links` + `ir.rule` de copias,
  ADR-020), B7 (`PATCH`/`DELETE /me/links/:id`), B8 (perfil público en el
  backend real), B9 (OAuth Twitch, solo si va 3.3b), B10 (checkpoint de
  contrato, corrido por el agente de tests, no por quien escriba B6–B8).
- Antes de B10: seguir pendiente **exportar `libraryIndexSchema` y
  `checklistResponseSchema`** (`src/features/lists/services/lists.service.ts`)
  — deuda de B5 (Sprint 3a), verificado en esta sesión que sigue sin
  exportarse.
- Deuda heredada del Sprint 3a: el punto de entrada de logout en la UI
  (verificado en esta sesión: sigue sin ningún componente usando
  `useLogout`), el alcance de la `ir.rule` de ADR-014 a `base.group_portal`,
  y la falta de verificación con lectores de pantalla reales. **#9 a #14 se
  cerraron como perdidos el 2026-09-22** (irreconstruibles, sin
  archivo/línea/escenario) y una revisión nueva sobre el árbol de listas los
  reemplazó por los hallazgos #15–#20 — ver la actualización del
  2026-09-22 en [13-sprint3a-avance.md](./13-sprint3a-avance.md).
- Seguir la conversación con Chano en
  [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md):
  el `invitation_scope` de producción y si acepta el trabajo de `ll-odoo`
  como PR — sin cambios.
