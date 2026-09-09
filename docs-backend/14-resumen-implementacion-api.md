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
| `POST /me/links`, `PATCH /me/links/:id`, `DELETE /me/links/:id` | ⬜ Pendiente | — | No hay ninguna ruta escrita todavía. **[FE→BE]** Requiere extraer a un endpoint HTTP la lógica que hoy solo existe como wizard de Odoo (`wizard.link.action_create_link`, `odoo-modules/ll_checklist/models/wizard/link.py`). Del lado frontend corresponde a la tarea 3.8 (`LinkWizard`, Sprint 3b de `../docs/07-plan-de-trabajo.md`), todavía no arrancada — hoy no bloquea nada porque el frontend sigue construyendo contra MSW |
| `GET /users/:id/profile`, `GET /users/:id/checklists/:checklistId/entries` | ⬜ Pendiente | — | No hay ninguna ruta escrita todavía. **[FE→BE]** Corresponde a la tarea 3.10 (Perfil público + stats, Sprint 3b), todavía no arrancada |

Verificado leyendo el código directamente (`grep` de `@http.route` en los
cuatro controladores de `odoo-modules/ll_webpage/controllers/`) el
2026-09-08: no existe ninguna ruta de `/me/links` ni de `/users/:id/...`
además de las listadas arriba como implementadas.

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

Detalle completo de cada uno, con más contexto, en
[`../docs/13-sprint3a-avance.md`](../docs/13-sprint3a-avance.md) (tareas B2,
B3, B4) y en [02-analisis-backend-odoo.md](./02-analisis-backend-odoo.md).

## Qué falta para que esto sea real en producción

Aparte de completar `/me/links` y `/users/:id/...` (arriba), lo que ya está
implementado sigue sin poder usarse contra la instancia real de Chano
porque:

- Nunca se pusheó ni se propuso como PR (ver arriba).
- Depende de que el `invitation_scope` de esa instancia permita alta
  email/contraseña, o de decidir habilitarlo — pregunta 8 (nota final) de
  [08-preguntas-backend.md](./08-preguntas-backend.md), sigue abierta.
- La app de Twitch de producción y su `redirect_uri` — pregunta 6.1, sigue
  abierta.
