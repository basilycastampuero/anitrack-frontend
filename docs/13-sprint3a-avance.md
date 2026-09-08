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
| 3.5b | CRUD de carpetas | ⬜ pendiente |
| 3.5c | Onboarding "starter lists" | ⬜ pendiente |
| 3.6 | Vista de entries | ⬜ pendiente |

### Carril B — backend en `ll-odoo` (rama `anitrack/rest-catalog-api`, nunca se pushea)

| # | Tarea | Estado |
|---|---|---|
| B1 | Spike de sesión (`security/portal_access.xml`, `controllers/api_auth.py`: login/logout/me/register) | ✅ (commit `d17d00a`) |
| B2 | Seed de listas en el Odoo local | ⬜ pendiente |
| B3 | `/me/*` lectura | ⬜ pendiente |
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
