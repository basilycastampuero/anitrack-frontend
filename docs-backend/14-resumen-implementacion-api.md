# 14 — Resumen de implementación de la API real, para Chano

> Contraparte de [`../docs/04-contrato-api.md`](../docs/04-contrato-api.md)
> orientada a Chano: ese documento especifica la **forma** de cada request y
> respuesta (audiencia frontend); este resume **qué de ese contrato ya está
> construido, dónde vive y qué falta** (audiencia backend). Antes eran la
> misma tabla, al final del doc 04 — se separó el 2026-09-08 porque mezclaba
> dos audiencias en un solo documento: el frontend la leía como parte del
> contrato vivo, Chano la leería como una propuesta con "dificultad
> estimada" para código que, para esa fecha, ya estaba escrito y probado.
> Mantener ambas cosas juntas hacía que una quedara desactualizada apenas la
> otra avanzaba.

## Dónde vive el código y por qué no llegó a Chano todavía

Todo lo marcado como implementado abajo vive en la rama local
**`anitrack/rest-catalog-api`** de `ll-odoo` (creada desde `checklist_base`).
**Nunca se pusheó** al remoto de Chano (`chanochambure/ll-odoo`) — sigue la
disciplina del proyecto (rama propia, nunca push directo, ver
[`../CLAUDE.md`](../../CLAUDE.md) del workspace). Sigue pendiente la
conversación de si esto se le manda como PR real, como propuesta, o no va
(pregunta 1 de [08-preguntas-backend.md](./08-preguntas-backend.md)).

Marcadores (mismos que doc 08): **[FE]** decisión tomada del lado frontend,
sin acción de Chano necesaria; **[FE→BE]** requisito del frontend para
cuando esta API llegue a producción; **[BLOQUEADA]** solo Chano lo sabe.

## Por qué no hay columna de "dificultad estimada"

La tabla original (escrita antes de implementar nada) estimaba dificultad
por endpoint ("Baja", "Media", "Trivial"). Se retira en vez de actualizarla:
para lo ya implementado, la dificultad real quedó documentada con precisión
mayor en las bitácoras citadas abajo (incluyendo bugs no anticipados del
modelo de Chano — ver "Hallazgos no anticipados"), y repetir una estimación
ahora sería o bien redundante (endpoints ya resueltos) o bien una
adivinanza sin más base que antes (los dos que siguen pendientes). Mejor no
inventar un número.

## Estado por endpoint

| Endpoint(s) del contrato (doc 04) | Estado | Dónde (`ll-odoo`, rama `anitrack/rest-catalog-api`) | Verificación |
|---|---|---|---|
| `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/register` | ✅ Implementado | `controllers/api_auth.py`, `security/portal_access.xml` — commit `d17d00a` (tarea B1); fix del envelope de `register` en commit `b5f30a3` (tarea B5) | `curl` contra Odoo local: login/logout/me/register en verde; email duplicado → `422` + `field: "email"`; alta deshabilitada → `403` genérico (ya no filtra el error crudo de Postgres) |
| `GET /genres`, `GET /platforms`, `GET /companies` | ✅ Implementado | `controllers/api_catalog.py` (spike 2.8) | Respuestas reales validadas contra los esquemas Zod del frontend, sin adaptador (ver [`../docs/11-spike-integracion-real.md`](../docs/11-spike-integracion-real.md)) |
| `GET /franchises` (filtros/paginación/orden), `GET /franchises/:id`, `GET /contents/:id`, `GET /search` | ✅ Implementado | `controllers/api_catalog.py` | Ídem — 7/7 respuestas del spike 2.8 en verde |
| `GET /images/:id` (público), `GET /me/images/:id` (privado) | ✅ Implementado | `controllers/api_catalog.py` (`_image_in_published_catalog`) + `controllers/api_lists.py` (`_owned_image_or_none`) — commit `3c4e091` (tarea B4) | Cierra la fuga que ADR-014 dejaba documentada como deuda abierta (servía cualquier imagen por id, con `sudo()` y sin filtro) |
| `GET /me/checklists`, `GET /me/checklists/:id/entries`, `GET /me/library-index` | ✅ Implementado | `controllers/api_lists.py` — commit `b708bcb` (tarea B3) | Checkpoint de contrato completo (tarea B5): árbol de 4 niveles, `linkCount`/`aggregatedProgress` verificados contra `link_show_name` real, aislamiento con dos usuarios portal |
| `POST /me/checklists`, `PATCH /me/checklists/:id`, `DELETE /me/checklists/:id` | ✅ Implementado | `controllers/api_lists.py` — commit `3c4e091` (tarea B4) | Ídem, más detección de ciclos (`_creates_cycle` → `422`, ver "Hallazgos no anticipados") |
| `POST /me/links` | ✅ Implementado | `controllers/api_lists.py` (más la clave `existing` en el envelope de error, `controllers/api_common.py`) — commit `11883fe` (tarea B6) | Verificado de punta a punta contra el Odoo local como usuario portal real, ocho escenarios: `201` con los datos resueltos del catálogo y no del body; `409 ALREADY_LINKED` con `checklistId`/`checklistName` reales, buscados con el ORM del usuario (nunca `sudo()`, ADR-014); `force: true`; reuso del franchise-link por `(carpeta, franquicia, contentType)`; `422` con `field` cuando `displayNameId` no pertenece al content; copia sincronizada con `isSynced: true`; `404` cuando `syncWithLinkId` es de otro usuario |
| `PATCH /me/links/:id`, `DELETE /me/links/:id` | 🟡 Implementado y verificado, **sin commitear** | `controllers/api_lists.py` — código en el working tree de `ll-odoo` (tarea B7), todavía no forma parte de ningún commit de `anitrack/rest-catalog-api` | Verificado de punta a punta contra el Odoo local como usuario portal real, ocho escenarios: `PATCH` devuelve el `ListEntry` completo (lo que consume el optimistic update del frontend); los campos `[EXT]` de ADR-004 (`rating`, `startedAt`, `finishedAt`) se ignoran en silencio, sin `422`; `watchedEpisodes` negativo → `422` con `field`; `PATCH` sobre un link sincronizado mueve **todas** sus copias (contando filas, no leyendo una); `DELETE` del último hijo → `204` y cero franchise-links huérfanos; `DELETE` de un franchise-link se lleva a sus hijos por cascada; `PATCH` sobre un franchise-link (renombrar, apagar el progreso) funciona; `PATCH`/`DELETE` de un link de otro usuario → `404` en los dos. No lo des por cerrado hasta que el commit exista |
| `GET /users/:id/profile`, `GET /users/:id/checklists/:checklistId/entries` | ⬜ Pendiente | — | No hay ninguna ruta escrita todavía. **[FE→BE]** Corresponde a la tarea 3.10 (Perfil público + stats, Sprint 3b), todavía no arrancada |
| `GET /auth/oauth/twitch` | ⬜ Pendiente | — | No hay ninguna ruta escrita todavía. Corresponde a la tarea B9 / 3.3b (Sprint 3b), todavía no arrancada |

Verificado leyendo el código directamente el 2026-09-22 (`git -C ../ll-odoo
show 11883fe`, `git -C ../ll-odoo diff` para lo sin commitear, y `grep` de
`@http.route` en los cuatro controladores de
`odoo-modules/ll_webpage/controllers/`): `POST /me/links` está en el commit
`11883fe`; `PATCH`/`DELETE /me/links/:id` existen solo en el working tree, sin
commit; no existe ninguna ruta de `/users/:id/...` ni de `/auth/oauth/twitch`.

## Hallazgos no anticipados durante la implementación (relevantes para Chano)

Trabajo que no estaba en el alcance original de "serializar lo que ya
existe" y que Chano probablemente quiera conocer si esto llega a fusionarse
algún día:

- **El modelo de checklists no tenía protección contra ciclos.**
  `compute_fullname` recorre `checklist_parent_id` sin límite y el modelo no
  usa `_check_recursion`; mover una carpeta bajo su propio descendiente vía
  `PATCH` habría causado recursión infinita y datos corruptos persistentes.
  Se agregó `_creates_cycle()` en `api_lists.py` (tarea B4) — no existe
  ninguna protección equivalente todavía si se edita el árbol desde el
  backoffice de Odoo directamente.
- **`Checklist.extra_order()` está roto**
  (`ll_checklist/models/checklist.py:120`): calcula bien el nombre del campo
  de orden en una variable local pero devuelve `custom_order` (el modo
  `"C"`/`"N"`) en su lugar. No se usa en la API nueva; `api_lists.py` ordena
  cada nivel del árbol por su cuenta.
- **`ll.checklist.user.extra_get_user(self, uid)` no lleva `@api.model`**
  (`ll_checklist/models/user.py:72`): por RPC, el primer elemento de `args`
  se ata a `self` en vez de a `uid`. Hay que pasar una lista de ids vacía
  adelante para que funcione por fuera del controlador real (que lo hace
  implícito vía `request.env[...]`). Detectado al escribir el script de seed
  (`scripts/seed-odoo.mjs`, tarea B2).
- **`link_franchise_id` es `ondelete="restrict"`**
  (`ll_checklist/models/database/link.py:96`): borrar catálogo con links de
  usuario vivos falla con un error de integridad que no dice qué registro lo
  bloquea. Y borrar `res.users` antes que su perfil `ll.checklist.user` deja
  el perfil huérfano (`user_res_user_id` es `ondelete="set null"`, no
  cascade) con checklists y links todavía vivos — invisibles para cualquier
  portal. Ninguno de los dos es un bug de la API en sí (son del modelo), pero
  cualquier script de mantenimiento/migración que borre estos modelos en el
  orden equivocado los va a pisar.
- **La `ir.rule` de aislamiento por dueño (`security/portal_access.xml`) está
  acotada a `groups="[(4, ref('base.group_portal'))]"` a propósito**, para no
  romper el `unlink` del admin en el backoffice. Consecuencia: un usuario
  del grupo Administrator que llamara a `/me/*` no tendría ninguna
  restricción y vería datos de todos los usuarios. Hoy el admin no es
  cliente de esta API, así que es inocuo, pero si algún día lo es, esta regla
  necesita revisarse.
- **La `ir.rule` de `ll.checklist.link.copy` tenía un agujero de escritura
  explotable (ADR-020, commit `d3be430`), y esto sí es un cambio de
  seguridad, no solo un hallazgo de lectura.** La regla original (B4) usaba
  un OR entre los dos lados de la copia (`lc_left_id` / `lc_right_id`) para
  cubrir un falso-negativo de `isSynced` en lectura. En escritura ese OR no
  protegía nada: una fila con `lc_left_id` propio y `lc_right_id` apuntando
  al link de OTRO usuario portal satisfacía igual la primera cláusula. Se
  reprodujo empíricamente con dos usuarios portal reales contra el Odoo
  local: el portal A creaba la fila cruzada hacia el link de B, y a partir de
  ahí B **no podía volver a escribir `lv_episodes` en su propio link**
  (`Link.write` intenta propagar al link del atacante, recibe `AccessError`,
  y el link de la víctima queda inutilizado) — un usuario cualquiera podía
  romperle el progreso a otro. El fix cambia el OR por un AND: las filas
  legítimas siempre tienen los dos lados del mismo dueño, así que no se
  pierde ninguna, y la fila cruzada ahora da `AccessError` al crearse. El
  admin conserva lectura y borrado. No era explotable hasta que existiera un
  endpoint que creara copias — `POST /me/links` (B6) es el primero, así que
  el fix entró antes de exponerlo.
- **`Link.unlink()` tira un `MissingError` espurio con el ORM de un usuario
  portal** (defecto de `ll_checklist`, no de esta API): el override del
  modelo borra primero `link_record_id` (la checklist sombra), cuya FK hacia
  el link es `ondelete="cascade"`, así que la fila del link se va con la
  sombra: el `super().unlink()` de la línea siguiente corre sobre una fila
  que ya no existe. Con el ORM de admin (superusuario) no pasa; con el ORM de
  un portal, siempre que el link tenga sombra. El borrado ocurre igual — el
  error es un efecto del orden interno del override, no una falla real. `DELETE
  /me/links/:id` (B7) lo absorbe dentro de la transacción del request y
  verifica después que la fila no exista, en vez de tocar `ll_checklist`.

- **`ll_oauth` tiene un `except AccessDenied` sin importar `AccessDenied`**
  (defecto de `ll_oauth`, no de esta API). En
  `ll_oauth/models/res_users.py:27` hay un `except AccessDenied as
  access_denied_exception:`, pero el archivo solo importa `ValidationError`
  de `odoo.exceptions` (líneas 3–4: `from odoo import models, fields, api` y
  `from odoo.exceptions import ValidationError`). El nombre `AccessDenied` no
  está definido en ese scope, así que **si esa rama llega a ejecutarse
  levanta un `NameError` en vez de rechazar el login**, y el usuario recibe un
  500 en lugar del error de credenciales.

  Cómo se llega ahí: es el camino de un login por OAuth que el proveedor
  rechaza. Hoy nadie lo pisa porque no hay ningún `auth.oauth.provider`
  configurado en la base local, así que el flujo real de OAuth nunca corre —
  por eso el defecto sigue latente y no lo destapó ninguna de las pruebas de
  los Sprints 3a y 3b.

  El arreglo es una línea: agregar `AccessDenied` al import de
  `odoo.exceptions`. **No se aplicó a propósito.** Todo el trabajo propio de
  estos sprints vive en `ll_webpage`, que es un módulo nuevo; `ll_checklist` y
  `ll_oauth` no se tocaron nunca — cuando `Link.unlink()` dio problemas se lo
  rodeó desde el controlador en vez de parchear el modelo (ver el hallazgo
  anterior). Corregir esto sería la primera modificación a un módulo original,
  y se prefiere reportarlo antes que cambiarlo en una rama que su autor no ve.
  Es de los hallazgos más fáciles de arreglar y de los más molestos de
  diagnosticar en producción, así que conviene que lo sepa.

- **El grupo del usuario que crea el alta por OAuth es CONFIGURACIÓN de la
  base, no código.** ADR-015 asumía que `_auth_oauth_signin` deja al usuario
  nuevo en el grupo Portal, y eso importa porque la `ir.rule` que aísla
  `/me/*` está acotada a `base.group_portal` (ADR-014): un usuario que cayera
  en otro grupo no tendría restricción y vería datos de todos.

  Verificado en la base local sin necesidad de ninguna app de Twitch, porque
  el grupo no lo decide el código sino el "template user" del alta: Odoo copia
  sus grupos al crear el usuario. En esta base,
  `base.template_portal_user_id = 5` → usuario `portaltemplate`, con
  `share = true` y un solo grupo, **User types / Portal**. Y
  `auth_signup.invitation_scope = b2c`, o sea alta libre. El supuesto se
  sostiene acá.

  Lo que **no** se puede verificar desde acá es la instancia de Chano: los dos
  valores son parámetros de sistema y pueden diferir. Si en producción el
  template user no fuera Portal, el aislamiento de `/me/*` dejaría de aplicar
  para los usuarios creados por OAuth, sin ningún cambio de código y sin
  ningún error visible. Vale la pena que lo confirme antes de habilitar el
  alta social.

Detalle completo de cada uno, con más contexto, en
[`../docs/13-sprint3a-avance.md`](../docs/13-sprint3a-avance.md) (tareas B2,
B3, B4) y en [02-analisis-backend-odoo.md](./02-analisis-backend-odoo.md).

## Qué falta para que esto sea real en producción

Aparte de commitear `PATCH`/`DELETE /me/links/:id` (B7, ya verificado) y de
escribir `/users/:id/...` (B8) y `GET /auth/oauth/twitch` (B9) — arriba —, lo
que ya está implementado sigue sin poder usarse contra la instancia real de
Chano porque:

- Nunca se pusheó ni se propuso como PR (ver arriba).
- Depende de que el `invitation_scope` de esa instancia permita alta
  email/contraseña, o de decidir habilitarlo — pregunta 8 (nota final) de
  [08-preguntas-backend.md](./08-preguntas-backend.md), sigue abierta.
- La app de Twitch de producción y su `redirect_uri` — pregunta 6.1, sigue
  abierta.
