# 04 — Contrato de API v1

> Este contrato es lo que MSW mockea y lo que se le propone al dev de Odoo.
> Prefijo: `/api/v1`. Formato: JSON. Auth: cookie de sesión Odoo (ADR-005).
> Los campos marcados `[EXT]` son extensiones propuestas que HOY no existen en
> el modelo Odoo (ADR-004) — el backend puede omitirlos y el frontend los
> oculta por feature flag.

## Convenciones

- IDs numéricos (son IDs de Odoo).
- Fechas ISO 8601 (`"2009-04-05"` para date, con hora para datetime).
- Camel case en JSON (el adaptador traduce si el backend prefiere snake_case).
- Paginación por página:

```jsonc
// Respuesta paginada
{
  "items": [ ... ],
  "page": 1,
  "pageSize": 24,
  "total": 137
}
```

- Errores:

```jsonc
// HTTP 4xx/5xx
{ "error": { "code": "NOT_FOUND", "message": "Franchise 42 not found" } }
```

Códigos: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`VALIDATION` (422), `INTERNAL` (500).

`field?: string` — extensión opcional del envelope (Sprint 3a, ver
[13-sprint3a-avance.md](./13-sprint3a-avance.md)): en un `VALIDATION`, nombra
el campo del formulario al que refiere el error (p. ej.
`{ "error": { "code": "VALIDATION", "message": "Email already registered", "field": "email" } }`).
El frontend lo consume en `RegisterForm` (`error.field` → `form.setError`) si
está ausente, el error se muestra a nivel de formulario. **Implementado en el
backend real** (tarea B4, `ll-odoo` commit `3c4e091`): `_error(code, message,
status, field=None)` en
`ll-odoo/odoo-modules/ll_webpage/controllers/api_common.py` ya acepta el
parámetro. Lo emiten `POST /me/checklists` (validaciones de `name`/`parentId`/
`order`/`sortingMode`, y el 422 de ciclo) y `POST /auth/register` (ver más
abajo, cerrado con el fix de la tarea B5).

---

## Auth

### `POST /api/v1/auth/login`
Body: `{ "login": string, "password": string }`
→ `200 { "user": UserSession }` + cookie de sesión. `401` si falla.

### `POST /api/v1/auth/logout`
→ `204`. Invalida la sesión.

### `GET /api/v1/auth/me`
→ `200 { "user": UserSession }` o `401`.

```ts
interface UserSession {
  id: number;            // ll.checklist.user id
  odooUserId: number;    // res.users id
  name: string;
  email: string;
  avatarUrl: string | null;
}
```

### OAuth Twitch
No es endpoint JSON: la SPA navega a
`GET /auth/oauth/twitch?redirect=<url-spa>` (el backend resuelve el flujo
existente de `auth_oauth` y redirige de vuelta con la cookie puesta).
Al volver, la SPA llama `me`.

### `POST /api/v1/auth/register`
Body: `{ "name": string, "email": string, "password": string }`
→ `200 { "user": UserSession }` + cookie de sesión (el alta autentica de una,
ADR-015). `422 VALIDATION` si falta algún campo. **`422 VALIDATION` con
`field: "email"`** si el email ya está registrado (activo o archivado —
verificado antes de llamar a `signup()`, con `active_test=False`, porque un
usuario archivado sigue ocupando el login). `403 FORBIDDEN` (sin `field`) si
el alta está deshabilitada (`auth_signup.invitation_scope = "b2b"` en esa
base). Implementado y verificado con `curl` contra el Odoo local (tarea B5 +
su fix, `ll-odoo` commit `b5f30a3`): antes de este fix, el email duplicado
devolvía `403 FORBIDDEN` con el **mensaje crudo de Postgres** (constraint,
columna y valor duplicado) en vez de distinguirse del caso "alta
deshabilitada" — filtración de estructura interna además de desalineamiento
de contrato. Detalle del hallazgo y del fix en
[13-sprint3a-avance.md](./13-sprint3a-avance.md) (sección "Actualización
2026-09-08 — Carril B cierra completo (B4, B5) + 3.6").
Ver pregunta 8 del doc 08 (cerrada) y 8.2 (todavía abierta: qué pasa si el
mismo email se usa por email/clave y por Twitch).

---

## Master data

### `GET /api/v1/genres` → `{ items: Genre[] }`
### `GET /api/v1/platforms` → `{ items: Platform[] }`
### `GET /api/v1/companies?type=<id>` → `{ items: Company[] }`

Sin paginar (son catálogos chicos). Cachear agresivo en TanStack Query
(`staleTime: Infinity`).

---

## Catálogo (público, solo ítems `published`)

### `GET /api/v1/franchises`
Query params:

| Param | Tipo | Descripción |
|---|---|---|
| `q` | string | Busca en TODOS los nombres alternativos (franchise y content) |
| `contentType` | `"G" \| "V"` | Franquicias que tengan contenido de ese tipo |
| `videoType` | `"C","M","OVA","ONA","S","TV"` | Ídem por tipo de video |
| `genreIds` | `number[]` (csv) | Franquicias con contenido en esos géneros |
| `platformIds` | `number[]` (csv) | Con versiones en esas plataformas |
| `yearFrom`, `yearTo` | number | Sobre `version_date` de sus versiones |
| `sort` | `"name" \| "-releaseDate" \| "releaseDate"` | Default `name`. `[EXT]` futuro: `-popularity` cuando exista |
| `page`, `pageSize` | number | Default 1 / 24 |

→ `Paginated<FranchiseSummary>`

```ts
interface FranchiseSummary {
  id: number;
  name: string;              // nombre principal
  imageUrl: string | null;
  genres: Genre[];           // unión de géneros de sus contents (para la card)
  contentCounts: { games: number; videos: number };
  yearRange: { from: number | null; to: number | null };
}
```

### `GET /api/v1/franchises/:id`
→ `200 { franchise: FranchiseDetail }` — detalle completo con contents y versions
anidados (evita N+1 de requests; el detalle se navega client-side).

```ts
interface FranchiseDetail {
  id: number;
  name: string;
  alternativeNames: AltName[];   // { id, name, languageCode | null }
  description: string;
  imageUrl: string | null;
  gallery: ImageRef[];           // grupo de imágenes de la franquicia
  gameContents: ContentDetail[];
  videoContents: ContentDetail[];
}

interface ContentDetail {
  id: number;
  name: string;
  alternativeNames: AltName[];
  abbreviation: string | null;
  description: string;
  imageUrl: string | null;
  type: "G" | "V";
  videoType: "C" | "M" | "OVA" | "ONA" | "S" | "TV" | null;
  order: number;
  genres: Genre[];
  companies: CompanyRef[];       // { id, name, typeName }
  versions: VersionDetail[];
}

interface VersionDetail {
  id: number;
  name: string;
  order: number;
  episodes: number;              // 0 => desconocido/en emisión
  releaseDate: string;           // ISO date
  country: CountryRef | null;    // { id, name, imageUrl, languageCode }
  dubbingStudio: CompanyRef | null;
  platform: PlatformRef | null;  // { id, name, imageUrl }
}
```

### `GET /api/v1/contents/:id`
→ `{ content: ContentDetail & { franchise: { id, name, imageUrl } } }`
(para deep-links a un contenido).

### `GET /api/v1/search?q=...&limit=8`
Autocompletado liviano para la SearchBar:
→ `{ items: SearchHit[] }`

```ts
interface SearchHit {
  kind: "franchise" | "content";
  id: number;
  name: string;                 // el nombre alternativo que matcheó
  mainName: string;             // por si matcheó un alias
  imageUrl: string | null;
  franchiseId: number;          // para navegar
  contentType: "G" | "V" | null;
}
```

> **Hueco detectado en implementación (2026-08-31, tarea 2.6).**
> `SearchHit` da `franchiseId` para navegar, pero no el nombre de la
> franquicia. Para un hit `kind: "content"`, la URL con slug
> (`/franchise/:id-:slug/content/:id-:slug`, ver `slug.ts`) necesita ese
> nombre y no lo tiene: el frontend arma la ruta sin slug en el segmento de
> franquicia (`/franchise/9/content/111-steins-gate-vn`). No rompe el
> routing (solo se parsea el id inicial de cada segmento) pero la URL queda
> menos prolija. Pendiente `[FE→BE]`, ver pregunta 12.4 en
> [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md).

---

## Mis listas (auth requerida)

### `GET /api/v1/me/checklists`
→ `{ items: ChecklistNode[] }` — SOLO carpetas creadas por el usuario
(`checklist_database = false`), como árbol, con contadores.

```ts
interface ChecklistNode {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  sortingMode: "C" | "N";
  isPublished: boolean;
  children: ChecklistNode[];   // sub-carpetas
  linkCount: number;           // links directos (para badges en el árbol)
}
```

### `POST /api/v1/me/checklists`
Body: `{ name, description?, parentId?, isPublished? }` → `201 { checklist }`

### `PATCH /api/v1/me/checklists/:id`
Body parcial: `{ name?, description?, parentId?, order?, sortingMode?, isPublished? }`

### `DELETE /api/v1/me/checklists/:id` → `204` (cascada como en Odoo)

### `GET /api/v1/me/checklists/:id/entries`
El contenido de una lista para renderizar "Mi Lista":
→ `{ items: ListEntry[] }`

```ts
// Un entry es un franchise-link (con hijos) o un version-link suelto
interface ListEntry {
  linkId: number;
  kind: "franchise" | "version";
  displayName: string;           // link_name elegido por el usuario
  imageUrl: string | null;
  order: number;
  contentType: "G" | "V";
  franchiseId: number;
  notes: string | null;          // mapea a link_description
  // kind === "version":
  version?: {
    versionId: number;
    contentId: number;
    abbreviation: string | null;
    watchedEpisodes: number;     // lv_episodes
    totalEpisodes: number;       // 0 => desconocido
    isSynced: boolean;           // tiene link copies
  };
  // kind === "franchise":
  showProgress?: boolean;        // lf_show_episodes
  childEntries?: ListEntry[];    // los version-links agrupados
  aggregatedProgress?: {         // pre-calculado por backend (misma lógica que compute_show_name)
    groups: { abbreviation: string; watched: number; total: number }[];
  };
  // [EXT] — pendientes de backend (ADR-004):
  rating?: number | null;        // 1-10
  startedAt?: string | null;
  finishedAt?: string | null;
}
```

### `POST /api/v1/me/links`
Replica el wizard de Odoo:

```ts
interface CreateLinkRequest {
  checklistId: number;
  versionId: number;
  displayNameId: number;          // id del AltName elegido para el content
  groupUnderFranchise: boolean;   // crear/agregar a franchise-link
  franchiseDisplayNameId?: number; // requerido si se crea el franchise-link
  syncWithLinkId?: number;        // modo "copia sincronizada"
}
```
→ `201 { entry: ListEntry }`.
`409 { error: { code: "ALREADY_LINKED", existing: ListEntry[] } }` si la versión
ya está vinculada (la UI ofrece "agregar de todas formas" reintentando con
`force: true`, o "crear copia sincronizada").

### `PATCH /api/v1/me/links/:id`
Body parcial: `{ watchedEpisodes?, displayName?, abbreviation?, order?, notes?, showProgress?, rating? [EXT], startedAt? [EXT], finishedAt? [EXT] }`
→ `200 { entry: ListEntry }` (con agregados recalculados).
**Este es el endpoint del optimistic update del "+1 episodio".**

### `DELETE /api/v1/me/links/:id` → `204`
(si era el último hijo de un franchise-link, el backend elimina también el
padre — misma regla que `action_remove`).

### `GET /api/v1/me/library-index`
→ `{ versionIds: number[], franchiseIds: number[] }` — índice liviano de todo
lo que el usuario ya tiene vinculado, para pintar el estado "ya en tu lista"
sobre las cards del catálogo sin pedir N listas.

---

## Perfiles públicos

### `GET /api/v1/users/:id/profile`
→ `200 { profile }` — solo datos públicos:

```ts
interface PublicProfile {
  id: number;
  name: string;
  avatarUrl: string | null;
  stats: {                        // calculados por backend (o client-side v1)
    totalEntries: number;
    totalEpisodesWatched: number;
    byContentType: { games: number; videos: number };
  };
  publishedChecklists: ChecklistNode[];
}
```

### `GET /api/v1/users/:id/checklists/:checklistId/entries`
Igual que `me/.../entries` pero solo si `isPublished`. `403` si no.

---

## Resumen de implementación para el dev de Odoo

| Endpoint | Modelo(s) Odoo | Dificultad |
|---|---|---|
| auth/* | `res.users` + sesión nativa | Baja (wrapper) |
| genres/platforms/companies | masters | Trivial |
| franchises (+detail) | franchise/content/version/name | Media (filtros) |
| search | `db.name` | Baja |
| me/checklists CRUD | checklist | Baja |
| me/.../entries | link (+ agregación) | Media (reusar `compute_show_name` como dato estructurado) |
| me/links POST | lógica de `wizard.link.action_create_link` | Media (ya está escrita, extraerla) |
| me/links PATCH/DELETE | link (`write`/`action_remove`) | Baja |
| library-index | link search | Trivial |
| profiles | checklist published + agregados | Media |
