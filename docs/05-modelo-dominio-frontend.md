# 05 — Modelo de Dominio del Frontend

> Tipos TypeScript canónicos (viven en `src/features/*/types/` y
> `src/types/`) + tabla de mapeo contra los modelos Odoo.
> Los payloads exactos de red están en el doc 04; estos son los tipos de
> dominio que usan componentes y hooks (en v1 coinciden casi 1:1 con la API).

## Tipos compartidos (`src/types/`)

```ts
// src/types/api.types.ts
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION"
      | "ALREADY_LINKED" | "INTERNAL";
  message: string;
}

// src/types/media.types.ts
export type ContentType = "G" | "V";           // Game | Video
export type VideoType = "C" | "M" | "OVA" | "ONA" | "S" | "TV";

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  C: "Compilation", M: "Movie", OVA: "OVA", ONA: "ONA", S: "Special", TV: "TV",
};
```

## Feature `catalog` (`src/features/catalog/types/`)

```ts
export interface Genre {
  id: number;
  name: string;
  colorIndex: number; // 1-11, paleta propia en design system
}

export interface PlatformRef { id: number; name: string; imageUrl: string | null; }
export interface CompanyRef  { id: number; name: string; typeName: string | null; }
export interface CountryRef  { id: number; name: string; imageUrl: string | null; languageCode: string | null; }
export interface AltName     { id: number; name: string; languageCode: string | null; }
export interface ImageRef    { id: number; name: string; url: string; }

export interface FranchiseSummary { /* ver doc 04 */ }
export interface FranchiseDetail  { /* ver doc 04 */ }
export interface ContentDetail    { /* ver doc 04 */ }
export interface VersionDetail    { /* ver doc 04 */ }
export interface SearchHit        { /* ver doc 04 */ }

export interface CatalogFilters {
  q?: string;
  contentType?: ContentType;
  videoType?: VideoType;
  genreIds?: number[];
  platformIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  sort?: "name" | "releaseDate" | "-releaseDate";
  page?: number;
}
```

## Feature `lists` (`src/features/lists/types/`)

```ts
export interface ChecklistNode { /* ver doc 04 */ }
export interface ListEntry     { /* ver doc 04 */ }
export interface CreateLinkRequest { /* ver doc 04 */ }

export interface UpdateLinkRequest {
  watchedEpisodes?: number;
  displayName?: string;
  abbreviation?: string | null;
  order?: number;
  notes?: string | null;
  showProgress?: boolean;
  rating?: number | null;      // [EXT] feature flag
  startedAt?: string | null;   // [EXT]
  finishedAt?: string | null;  // [EXT]
}

// Derivado en el cliente para UI de progreso
export interface Progress {
  watched: number;
  total: number | null;        // null cuando el backend manda 0 (en emisión)
  percent: number | null;      // null si total es null
}
```

## Feature `auth` / `profile`

```ts
export interface UserSession { /* ver doc 04 */ }
export interface PublicProfile { /* ver doc 04 */ }
```

## Tabla de mapeo Odoo → Frontend

| Odoo (modelo.campo) | Frontend | Transformación |
|---|---|---|
| `ll.checklist.franchise` | `Franchise*` | — |
| `franchise_main_name_id.db_name` | `name` | aplanado |
| `franchise_name_ids` | `alternativeNames` | `db_language_id` → `languageCode` |
| `franchise_image_id` | `imageUrl` | id → URL `/web/image?...` (la arma el backend/adaptador, ADR-006) |
| `franchise_published` | (filtrado server-side) | el frontend nunca ve no-publicados |
| `ll.checklist.content.content_type` | `type: "G" \| "V"` | igual |
| `content_video_type` | `videoType` | igual, `false` → `null` |
| `content_abbreviation` | `abbreviation` | `false` → `null` |
| `content_genre_ids` | `genres: Genre[]` | expandido |
| `ll.checklist.version.version_episodes` | `episodes` | `0` ⇒ UI muestra total desconocido |
| `version_date` | `releaseDate` | ISO string |
| `version_dubbing_studio_id` | `dubbingStudio` | M2O `[id, name]` → objeto ref |
| `ll.checklist.genre.genre_color` | `colorIndex` | int 1–11 → paleta CSS propia |
| `ll.checklist.checklist` (user, no-database) | `ChecklistNode` | solo nodos `checklist_database = false`; los `= true` se representan vía `ListEntry` |
| `checklist_type` `S`/`R` | (implícito) | carpetas vs records: el frontend no lo necesita, la API ya separa checklists de entries |
| `checklist_sorting_mode` | `sortingMode` | igual |
| `ll.checklist.link` tipo `F` | `ListEntry{kind:"franchise"}` | `lf_link_ids` → `childEntries` |
| `ll.checklist.link` tipo `V` | `ListEntry{kind:"version"}` | — |
| `link_name` | `displayName` | editable |
| `lv_episodes` | `version.watchedEpisodes` | **progreso del usuario** |
| `lv_abbreviation` | `version.abbreviation` | — |
| `link_description` | `notes` | (reuso como notas — ADR-004) |
| `lf_show_episodes` | `showProgress` | — |
| `lv_link_left/right_ids` | `version.isSynced` | booleano derivado |
| `link_show_name` (`"Name [03/12]"`) | NO se usa | el frontend formatea desde datos estructurados (`aggregatedProgress`) |
| `ll.checklist.user` | `UserSession.id` | — |
| `res.users` (name/email/avatar) | `UserSession` | avatar → URL |

### Reglas de oro del mapeo

1. **Nunca** exponer strings pre-formateados del backend como fuente de verdad
   (`link_show_name`, `checklist_fullname`): el frontend formatea desde datos
   estructurados. Motivo: i18n, estilos y control del render.
2. **Nunca** propagar los `false` de Odoo (Odoo devuelve `false` en vez de
   `null` para campos vacíos): el adaptador normaliza `false` → `null` en
   campos no booleanos. Esto se testea unitariamente.
3. Los IDs de Odoo son la identidad en cache de TanStack Query:
   `["franchise", id]`, `["checklist-entries", checklistId]`, etc.

## Validación con Zod

Cada respuesta de la API pasa por un schema Zod en la capa de servicios
(`parse` en dev, `safeParse` + log en prod). Beneficio doble: detecta drift del
contrato cuando el backend real reemplace a MSW, y los tipos TS se **infieren**
del schema (`z.infer`) — una sola fuente de verdad.

```ts
// ejemplo: src/features/catalog/services/schemas.ts
export const genreSchema = z.object({
  id: z.number(),
  name: z.string(),
  colorIndex: z.number().min(1).max(11),
});
export type Genre = z.infer<typeof genreSchema>;
```
