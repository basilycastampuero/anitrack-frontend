# 12 — Diseño técnico del Sprint 3a (auth + estructura de listas)

> El *qué* del Sprint 3a está en [07-plan-de-trabajo.md](./07-plan-de-trabajo.md).
> Este documento es el *cómo*: responsabilidades por capa, contratos entre
> ellas, archivos que toca cada tarea, orden y dependencias. Las decisiones de
> peso salieron de acá y quedaron como **ADR-014 a ADR-017** en
> [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md).
> Fecha: 2026-08-31.

## 1. Resumen

El Sprint 3a es el primero en el que la app deja de ser de solo lectura: hay
sesión, hay datos privados y hay mutaciones. Eso trae tres problemas que el
plan no resolvía y que no son de UI:

1. **Aislamiento** — el modelo de seguridad del catálogo (`sudo()` + filtro
   `published`, ADR-010) no sirve para datos privados.
2. **Identidad** — el backend tiene dos nociones de usuario (`res.users` y
   `ll.checklist.user`) y nadie había decidido cómo se relacionan.
3. **Transporte de sesión** — cookie, CSRF y el hecho de que el Sprint 3a
   introduce los primeros POST/PATCH/DELETE del proyecto.

Los tres se resolvieron del lado del backend (ADR-014/015/016) sin que el
frontend cambie una línea de lo ya escrito: `auth.service.ts`, `sessionStore`,
`RequireAuth` y el interceptor de `http.ts` ya hablan el contrato del doc 04.
El frontend del sprint sigue construyéndose contra MSW (ADR-017).

## 2. Estado actual verificado (2026-08-31)

Todo lo de esta sección se comprobó contra el Odoo local (`localhost:8069`, DB
`anitrack`, Odoo 17.0) o leyendo el código, no se asumió.

**Lo que ya existe en el frontend y no hay que volver a escribir:**

| Pieza | Archivo | Estado |
|---|---|---|
| Cliente HTTP + interceptor 401 | `src/lib/http.ts` | Completo. Falta agregarle el header de ADR-016 |
| `authService.login/logout/me` | `src/features/auth/services/auth.service.ts` | Completo contra el contrato |
| Esquemas de sesión | `src/features/auth/services/schemas.ts` | Completos |
| `useMe()` + bootstrap | `src/features/auth/hooks/useMe.ts`, llamado en `RootLayout` | Completo |
| `sessionStore` | `src/store/sessionStore.ts` | Completo (`idle`/`authenticated`/`unauthenticated`) |
| `<RequireAuth>` con `next=` | `src/components/layout/RequireAuth.tsx` | Completo |
| Rutas y páginas placeholder | `src/router/`, `src/pages/{Login,Register,AuthCallback,MyLists,Settings}Page.tsx` | Rutas listas, páginas son placeholders |
| `listsService` de lectura | `src/features/lists/services/lists.service.ts` | `getChecklists`/`getEntries`/`getLibraryIndex` |
| Esquemas de listas (recursivos) | `src/features/lists/services/schemas.ts` | Completos |
| MSW del bloque privado | `src/mocks/handlers.ts`, `src/mocks/seed/lists.ts` | **100% del contrato**, con 2 usuarios seed |

**Lo que se verificó del backend:**

- Los 16 modelos de `ll_checklist` tienen ACL solo para el grupo
  `LL Checklist / Administrator` y **cero `ir.rule`**. Un usuario portal o
  interno recién creado recibe `AccessError` en `ll.checklist.checklist`,
  `ll.checklist.link` y `ll.checklist.user` — no puede leer ni sus propias
  listas, y `extra_get_user()` tampoco funciona.
- `res.users.signup()` crea usuarios **Portal** (`share=true`) usando
  `base.template_portal_user_id`; `auth_signup` está instalado con
  `invitation_scope='b2c'`.
- `/web/session/authenticate` es `type="json"`: siempre HTTP 200, exige `db`
  en el body y devuelve 28 claves de estado interno.
- La cookie es `session_id=…; Max-Age=604800; HttpOnly; Path=/`, **sin
  `SameSite` ni `Secure`**.
- Odoo 17 valida CSRF en **todo** método que no sea GET/HEAD/OPTIONS/TRACE
  para rutas `type="http"`, leyendo el token de `request.params`.
- Una ruta `type="http"` con `auth="user"` sin sesión devuelve **303 a
  `/web/login`**, no 401.
- El Odoo local tiene el catálogo sembrado pero **ninguna lista del seed de
  MSW**: 7 checklists sueltas de pruebas viejas y un solo perfil
  `ll.checklist.user` (el del admin).
- Quedaron creados en la base local, a propósito, dos usuarios de prueba:
  `portaltest@anitrack.dev` (Portal) y `usertest@anitrack.dev` (Internal),
  ambos con contraseña `devlocal`, más `signuptest@anitrack.dev` creado por
  `signup()`. Sirven para las tareas B1/B4; no existen en el código, solo en
  esa base.

## 3. Responsabilidades por capa

La cadena obligatoria es **component → hook → service**, y el Sprint 3a suma
una regla nueva: **ninguna capa del frontend conoce la diferencia entre un
nodo del árbol y un "checklist database" de Odoo**. Esa distinción muere en el
controlador (tarea B3).

```
┌─ pages/            ensamblan; no llaman servicios directo
├─ features/<f>/components/   presentación + interacción; reciben datos por props
├─ features/<f>/hooks/        TanStack Query: queries, mutaciones, invalidación,
│                             optimistic. ÚNICO lugar donde vive queryKey
├─ features/<f>/services/     axios + parseo Zod. Devuelven tipos de dominio.
│                             NO conocen TanStack Query ni React
└─ lib/http.ts               instancia axios, interceptor 401, header CSRF
```

**Contrato entre hook y service:** el service recibe y devuelve tipos del
dominio (doc 05), lanza `ApiError` normalizado, y nunca decide nada de cache.
El hook decide `queryKey`, `staleTime`, invalidación y rollback. Si un
componente necesita saber si algo está cargando o falló, lo recibe del hook,
nunca del service.

### `queryKeys` centralizadas (tarea 3.4)

Hoy las claves están inline (`['auth','me']`, etc.). Con las mutaciones del
sprint eso se vuelve frágil: una invalidación que escribe la clave a mano y se
equivoca en una letra no falla, simplemente no refresca. Se centraliza en
`src/features/lists/hooks/queryKeys.ts` (y el equivalente en `auth`):

```ts
export const listKeys = {
  all: ['lists'] as const,
  tree: () => [...listKeys.all, 'tree'] as const,
  entries: (checklistId: number) => [...listKeys.all, 'entries', checklistId] as const,
  libraryIndex: () => [...listKeys.all, 'library-index'] as const,
}
```

Regla: **una mutación invalida por el prefijo más específico que sea correcto.**
Renombrar una carpeta invalida `tree()`; borrarla invalida `tree()` **y**
`entries(id)`; crear un link (3b) invalida `entries(id)` y `libraryIndex()`.

### Qué se invalida en el logout

`logout()` no alcanza con limpiar el `sessionStore`: el cache de TanStack Query
sigue teniendo las listas del usuario anterior en memoria, y si otro usuario
entra en la misma pestaña las ve por un instante antes del refetch. El hook
`useLogout` debe hacer `queryClient.removeQueries({ queryKey: listKeys.all })`
y lo mismo con las claves de `auth` y `profile`. Es un caso de test explícito.

## 4. Diseño del backend (carril B)

Archivos nuevos, todos en `ll_webpage` (módulo propio); **`ll_checklist` no se
toca**:

```
ll-odoo/odoo-modules/ll_webpage/
├── __manifest__.py                    (+ "data": ["security/portal_access.xml"])
├── security/portal_access.xml         NUEVO — ACL Portal + ir.rule (ADR-014)
└── controllers/
    ├── __init__.py                    (+ from . import api_auth, api_lists)
    ├── api_catalog.py                 existente; se le corrige /images/<id> (B4)
    ├── api_common.py                  NUEVO — helpers compartidos
    ├── api_auth.py                    NUEVO — /auth/* (ADR-015/016)
    └── api_lists.py                   NUEVO — /me/* (ADR-014)
```

`api_common.py` extrae de `api_catalog.py` lo que ahora comparten tres
archivos: `_json_response`, `_error`, `ApiError`, los parsers de query params,
y **dos decoradores nuevos**:

- `@require_session` — devuelve `401 UNAUTHORIZED` con el sobre del contrato si
  `request.env.user._is_public()`. Existe porque `auth="user"` redirige en vez
  de dar 401 (ADR-016).
- `@require_client_header` — devuelve `403 FORBIDDEN` si falta
  `X-Requested-With: anitrack` en un método que no sea GET/HEAD (ADR-016). El
  mensaje del error dice exactamente qué header falta, para que curl/Postman no
  sean un misterio.

Ambos se aplican en ese orden, y **todas** las rutas de `/me/*` los llevan.

**Regla de `sudo()` en `/me/*` (ADR-014).** Los modelos privados
(`checklist`, `link`, `link.copy`, `user`) se leen y escriben con
`request.env`, nunca con `sudo()`. Solo se usa `sudo()` para leer catálogo ya
público dentro de esos endpoints (por ejemplo el nombre de una versión para
armar un `ListEntry`). En el código eso se hace explícito con un helper
`_catalog(model)` distinto de `_private(model)`, para que un `sudo()` de más
sea visible en la revisión.

### Traducciones no obvias del modelo (para B3/B4)

| Contrato (doc 04) | Odoo | Nota |
|---|---|---|
| `ChecklistNode` = carpeta del usuario | `ll.checklist.checklist` con `checklist_database = False` | El wizard crea checklists "sombra" con `checklist_database = True` por cada link (ver `wizard/link.py`). **Hay que filtrar en todos los niveles del árbol**, no solo en la raíz |
| `children` | `checklist_sub_checklist_ids` | Filtrado igual |
| `linkCount` | `search_count` de `ll.checklist.link` con `link_checklist_id = node` **y** `lv_link_franchise_id = False` | Si no se excluyen los hijos de un franchise-link, el contador cuenta doble |
| `order` / `sortingMode` / `isPublished` | `checklist_order` / `checklist_sorting_mode` / `checklist_published` | Directo |
| `aggregatedProgress.groups` | lógica de `Link.compute_show_name` | Agrupa por `lv_abbreviation`, ordena por el `lv_record_order` **mínimo** del grupo, y si **alguna** versión del grupo tiene `version_episodes <= 0` el total del grupo entero pasa a desconocido (`-`). Hay que emitirlo como dato estructurado, no como el string ya formateado |
| `DELETE /me/checklists/:id` "cascada como en Odoo" | `checklist_parent_id` y `link_checklist_id` son `ondelete='cascade'` | La cascada la hace la base; el endpoint no tiene que iterar |
| `POST /me/checklists` | `checklist_type = "S"`, `checklist_database = False`, `checklist_user_id` **de la sesión** | El body nunca trae dueño (ADR-015) |

## 5. Plan por tarea

Cada tarea lista los archivos que toca. Los `NUEVO` son archivos a crear.

### 3.1 — `auth.service` + store de sesión (carril A)

`src/lib/http.ts` (agregar el header de ADR-016 a la instancia),
`src/features/auth/hooks/useLogin.ts` NUEVO, `useLogout.ts` NUEVO,
`useRegister.ts` NUEVO, `src/features/auth/hooks/queryKeys.ts` NUEVO,
`src/features/auth/services/auth.service.ts` (agregar `register`),
`src/features/auth/types/index.ts` (agregar `RegisterRequest`).

- `useLogin`: `mutationFn: authService.login`; en `onSuccess`, `setUser` y
  `queryClient.setQueryData(authKeys.me(), user)` (evita un refetch inmediato).
  La redirección a `next=` la decide la página, no el hook.
- `useLogout`: `onSuccess` → `clearSession()` + `removeQueries` de `lists`,
  `auth` y `profile` (sección 3).
- **No** se agrega persistencia de sesión en `localStorage`: la cookie
  HttpOnly es la verdad (ADR-005) y `useMe()` la resuelve en el arranque.

**CA:** login setea la sesión y redirige a `next=`; logout deja el cache sin
datos de `/me/*` (test que lo verifica leyendo el `queryClient`).

### 3.2 — Páginas login / register (carril A)

`src/pages/LoginPage.tsx`, `RegisterPage.tsx`,
`src/features/auth/components/LoginForm.tsx` NUEVO, `RegisterForm.tsx` NUEVO,
`src/i18n/en.ts` (bloque `t.auth`).

- RHF + Zod. El schema del form es **distinto** del schema del contrato: valida
  formato de email y largo de contraseña del lado cliente.
- Mapeo de errores de API al form: `UNAUTHORIZED` → error a nivel de
  formulario ("Invalid email or password", nunca "el email no existe" —
  no le regalamos enumeración de usuarios a nadie); `VALIDATION` → error de
  campo si el backend nombra el campo, si no a nivel formulario; el resto →
  `ErrorState`.
- La página lee `?next=` y redirige ahí tras el éxito, con fallback a `/`.

**CA:** los cuatro estados demostrables (éxito, credenciales malas, validación
de campo, server error) con MSW inyectando cada uno.

### 3.3a — Botón de login social, mockeado (carril A)

`src/features/auth/components/OAuthButtons.tsx` NUEVO,
`src/pages/AuthCallbackPage.tsx`, `src/i18n/en.ts`.

El botón es un `<a href>` a `/auth/oauth/twitch?redirect=<url>` (doc 04), no un
`fetch`: es una navegación del navegador, no una llamada de API. La página de
callback lee `?error=` y, si no hay error, invalida `authKeys.me()` y espera a
`useMe`. Con MSW no hay redirect real: el botón queda deshabilitado con un
tooltip cuando `VITE_API_MODE=mock`, y el flujo se prueba navegando a
`/auth/callback` a mano.

**CA:** `?error=access_denied` muestra un mensaje propio y un link para volver
al login; sin error, la página resuelve la sesión y redirige.

### 3.4 — `lists.service` + hooks (carril A)

`src/features/lists/services/lists.service.ts` (agregar `createChecklist`,
`updateChecklist`, `deleteChecklist`), `src/features/lists/hooks/queryKeys.ts`
NUEVO, `useChecklists.ts` NUEVO, `useChecklistEntries.ts` NUEVO,
`useCreateChecklist.ts` NUEVO, `useUpdateChecklist.ts` NUEVO,
`useDeleteChecklist.ts` NUEVO.

- Las mutaciones de **renombrar** y **publicar** usan `useUpdateChecklist` con
  optimistic: `onMutate` cancela `tree()`, guarda el snapshot, escribe el nodo
  nuevo recorriendo el árbol, y `onError` restaura el snapshot completo (más
  simple y más seguro que revertir el nodo).
- **Crear** y **borrar** invalidan `tree()` sin optimistic: ver la nota del
  plan (ids temporales y reconciliación no valen lo que cuestan acá).
- Ninguna mutación toca `sessionStore`.

**CA:** test por mutación con MSW, incluyendo un test de rollback de
`useUpdateChecklist` con error inyectado.

### 3.5a — `ChecklistTree` accesible, solo lectura (carril A)

`src/features/lists/components/ChecklistTree.tsx` NUEVO,
`ChecklistTreeItem.tsx` NUEVO, `src/features/lists/hooks/useTreeNavigation.ts`
NUEVO, `src/pages/MyListsPage.tsx`.

Patrón ARIA `tree` (mismo criterio que ADR-013: se hace a mano, sin sumar
dependencia). Contenedor `role="tree"`, ítems `role="treeitem"` con
`aria-expanded` (solo si tiene hijos), `aria-selected` y `aria-level`;
**roving tabindex** (un solo ítem con `tabIndex=0`). Teclado: ↑/↓ recorren los
nodos *visibles*, → expande o baja al primer hijo, ← colapsa o sube al padre,
Home/End al primero/último, Enter selecciona.

El nodo seleccionado es la URL (`/my-lists/:checklistId`), no estado local —
mismo criterio que `useCatalogFilters` en el Sprint 2: refresh y back/forward
funcionan gratis. El estado expandido/colapsado sí es local (Zustand o
`useState`), porque no vale la pena en la URL.

**CA:** navegación completa por teclado; refresh conserva la lista
seleccionada; test de RTL con `userEvent.keyboard`.

### 3.5b — CRUD de carpetas (carril A)

`src/features/lists/components/ChecklistNodeMenu.tsx` NUEVO,
`ChecklistFormDialog.tsx` NUEVO, `DeleteChecklistDialog.tsx` NUEVO,
`src/i18n/en.ts`.

Menú contextual por nodo: rename, delete, publish toggle, new sub-list. El
diálogo de borrado dice cuántas sub-listas y cuántos entries se van con él
(sale de `linkCount` y de los hijos) — es una cascada real, no puede ser un
"¿seguro?" genérico.

**CA:** las 4 operaciones funcionan; rename y publish son optimistic con
rollback visible ante error inyectado; create y delete refrescan el árbol.

### 3.5c — Onboarding "starter lists" (carril A)

`src/features/lists/components/StarterListsPrompt.tsx` NUEVO,
`src/features/lists/hooks/useCreateStarterLists.ts` NUEVO, `src/i18n/en.ts`.

ADR-003: las listas sugeridas son checklists normales, no un enum. Los cinco
nombres (Watching, Completed, On Hold, Dropped, Plan to Watch) viven en
`src/features/lists/constants.ts` NUEVO, no hardcodeados en el componente, y
sus etiquetas visibles en `i18n/en.ts`.

El hook crea las cinco en secuencia (no en paralelo: `checklist_order` depende
del orden de creación) y invalida `tree()` una sola vez al final. Si una falla
a mitad, no se revierte lo creado: se muestra el error y el árbol queda con lo
que se pudo crear — revertir parcialmente sería peor UX que dejar tres listas
hechas.

**CA:** usuario sin listas (el usuario 2 del seed) ve el CTA; al aceptar
quedan las 5 y el árbol se puebla; el CTA no vuelve a aparecer.

### 3.6 — Vista de entries, modo lectura (carril A)

`src/features/lists/components/ListEntryRow.tsx` NUEVO,
`FranchiseEntryGroup.tsx` NUEVO, `src/components/ui/ProgressBar.tsx` NUEVO,
`src/features/lists/utils/progress.ts` NUEVO, `src/pages/MyListsPage.tsx`.

`progress.ts` formatea `aggregatedProgress` a `[S1 12/12] - [S2 03/-]`. Es una
función pura, sin React, y es la que se testea — no el componente. El
frontend **no** recalcula la agregación: llega pre-calculada del contrato.

El stepper de episodios **no** es de este sprint (es 3.7): la fila muestra el
progreso, no lo edita.

**CA:** dado un `aggregatedProgress` del contrato, el grupo renderiza el
string esperado; hay test del caso "total desconocido" (`total: 0` → `-`) y del
entry de versión suelto sin franchise-link.

### B1 — Spike de sesión (carril B, va primero)

`ll_webpage/security/portal_access.xml` NUEVO, `__manifest__.py`,
`controllers/api_common.py` NUEVO, `controllers/api_auth.py` NUEVO,
`controllers/__init__.py`.

Solo `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/register` y las reglas
de ADR-014. Se verifica con `curl` contra el Odoo local usando
`portaltest@anitrack.dev` / `devlocal`. **No toca el frontend.**

Nota de entorno (heredada del spike 2.8): la imagen de Odoo **copia**
`odoo-modules/` adentro, no hay bind mount, así que editar `ll-odoo/` no se
refleja sin rebuild o `docker cp` + `odoo -u ll_webpage --stop-after-init`.
Cambiar `security/*.xml` **exige** actualizar el módulo (`-u ll_webpage`), no
alcanza con reiniciar.

> **Actualización (2026-09-08, B2/B3):** `docker-compose.yml` ahora monta
> `./ll-odoo/odoo-modules:/app/odoo-modules` como bind mount rw — editar
> `ll-odoo/` se refleja en el contenedor sin `docker cp` ni rebuild. Sigue
> haciendo falta `docker compose --profile backend restart odoo` tras tocar
> Python/rutas (la routing map de Odoo se arma al arrancar); cambiar
> `security/*.xml` sigue exigiendo `-u <módulo>` (mecánica de Odoo para datos
> XML, independiente del mount).

**CA:** login de un usuario portal devuelve `UserSession` y cookie con
`SameSite=Lax`; `me` sin cookie da `401` con el sobre del contrato; un POST sin
`X-Requested-With` da `403`; el admin sigue pudiendo borrar checklists desde el
backoffice (regresión de ADR-014, alternativa 2).

### B2 — Seed de listas en el Odoo local

`anitrack-frontend/scripts/seed-odoo.mjs`.

Crea el usuario portal del seed de MSW y replica sus checklists anidadas y sus
links, igual que ya hace con el catálogo. Idempotente y con `--reset` como el
resto del script. Sin esto, B3/B4/B5 no se pueden verificar contra datos
reales.

### B3 / B4 / B5 — `/me/*` y checkpoint

`controllers/api_lists.py` NUEVO (B3 lectura, B4 escritura),
`controllers/api_catalog.py` (B4: acotar `/images/<id>`), más un test de
contrato temporal en el frontend para B5 (mismo patrón del spike 2.8: se
escribe, se corre, se borra, y la conclusión queda en la bitácora).

## 6. Riesgos

| Riesgo | Mitigación concreta |
|---|---|
| Una `ir.rule` mal acotada rompe el backoffice de Chano (ya pasó en la prueba con `global=True`: el admin perdió `unlink`) | Las reglas van con `groups=[base.group_portal]`, nunca `global`; viven en `ll_webpage`; B1 incluye un CA de regresión que verifica que el admin conserva read/write/unlink |
| MSW y el backend divergen en silencio durante el sprint | B5 es obligatorio para cerrar el sprint: los mismos esquemas Zod del frontend contra las respuestas reales |
| `/api/v1/images/<id>` filtra imágenes privadas en cuanto una checklist tenga imagen | Tarea B4; hoy el riesgo es latente, no activo, pero se cierra dentro del mismo sprint que lo activa |
| El `409 ALREADY_LINKED` del contrato filtra listas de otros usuarios si se implementa con `sudo()` (la lógica de Chano busca links sin filtrar por dueño) | ADR-014: `/me/*` corre con el ORM del usuario, así que la `ir.rule` acota esa búsqueda sola. Es el motivo principal de elegir ORM sobre `sudo()`, y hay que testearlo con **dos** usuarios portal, no uno |
| 3.5 (árbol + CRUD + onboarding) se desborda y se come el sprint | Está partida en 3.5a/b/c; si aprieta, 3.5c es lo primero que se recorta (el usuario puede crear listas a mano) |
| El optimistic de 3.5b se filtra a crear/borrar y arrastra el riesgo de 3b a 3a | Regla explícita: optimistic solo en mutaciones idempotentes sobre un nodo existente. Está en el CA de la tarea |
| `invitation_scope` en `b2b` en producción rompe el registro | `/auth/register` devuelve `403` con mensaje explícito; el formulario se oculta por flag (ADR-015) |
| Sigue sin verificación visual en navegador real (Playwright sin Chromium, arrastrado desde el doc 09) | El sprint suma el árbol accesible, que es justo lo que peor se testea sin navegador. Instalar Chromium (`npx playwright install chrome`) deja de ser opcional y es prerrequisito del CA de 3.5a |

## 7. Qué le toca a cada agente

- **`anitrack-senior-software-engineer`** — ejecuta el carril A en el orden de
  la sección 5 y el carril B según el mismo detalle. No re-decide lo que
  fijaron ADR-014 a ADR-017; si algo no cierra al implementarlo, lo levanta en
  vez de improvisar una variante.
- **`anitrack-test-quality-engineer`** — escenarios críticos del sprint:
  rollback de `useUpdateChecklist`; el logout que debe vaciar el cache privado;
  navegación por teclado del árbol; `progress.ts` con total desconocido; y el
  test de aislamiento con **dos** usuarios portal en B4.
- **`anitrack-production-code-reviewer`** — invariantes a mirar: ningún
  `sudo()` sobre modelos privados; ninguna `queryKey` escrita a mano fuera de
  `queryKeys.ts`; ningún string de UI fuera de `i18n/en.ts`; ninguna llamada a
  API fuera de `services/`; y que `checklist_user_id` nunca venga del body.
- **`docs-manager`** — al cerrar el sprint: bitácora `13-sprint3a-avance.md`,
  fila nueva en `docs/README.md`, y actualizar en
  `docs-backend/08-preguntas-backend.md` la pregunta 8 (cerrada por ADR-015) y
  la 6 (3.3 replanteada).
