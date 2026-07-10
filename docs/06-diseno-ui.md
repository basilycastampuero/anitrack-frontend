# 06 — Diseño de UI: rutas, páginas, componentes y flujos

## Mapa de rutas

> Ajustado al dominio real (franquicia/contenido, no "anime/manga" — ADR-003).
> Slugs con id (`/franchise/42-fullmetal-alchemist`) para URLs legibles; el id
> manda, el slug es cosmético.

| Ruta | Página | Auth | Notas |
|---|---|---|---|
| `/` | Home | — | Hero + carruseles (recién agregado, por género destacado) |
| `/catalog` | Catálogo | — | Grid + filtros en URL (`?type=V&genres=1,2&page=2`) |
| `/franchise/:id` | Detalle franquicia | — | Tabs Videos / Games |
| `/franchise/:id/content/:contentId` | Detalle contenido | — | Puede ser modal-route sobre la franquicia en desktop |
| `/search?q=` | Resultados búsqueda | — | Página completa (la SearchBar tiene dropdown rápido) |
| `/login`, `/register` | Auth | — | Register condicionado a backend (doc 04) |
| `/auth/callback` | Retorno OAuth | — | Lee sesión (`me`) y redirige |
| `/my-lists` | Mis listas | ✅ | Árbol de checklists + contenido de la seleccionada |
| `/my-lists/:checklistId` | Lista específica | ✅ | Misma página, selección por URL |
| `/profile/:userId` | Perfil público | — | Stats + listas publicadas |
| `/profile/:userId/list/:checklistId` | Lista pública | — | Read-only |
| `/settings` | Configuración | ✅ | Tema, idioma de títulos (futuro), cuenta |
| `*` | 404 | — | EmptyState con búsqueda |

**Guards**: `<RequireAuth>` layout-route que consulta el store de sesión;
mientras `me` está en vuelo muestra skeleton de página, si 401 redirige a
`/login?next=...`.

## Layout global

- **Desktop**: header sticky (logo, SearchBar central, nav Catalog/My Lists,
  avatar-menu, toggle dark mode). Contenido max-w-7xl. Footer mínimo.
- **Mobile**: header compacto (logo + búsqueda colapsable) + **bottom tab bar**
  (Home, Catalog, Search, My Lists, Profile). Es la decisión responsive más
  importante: la app se usa "tipo app" en el celular.
- Transiciones de ruta con `motion` (fade/slide sutil, 150–200ms).

## Páginas en detalle

### Home `/`
- Hero con búsqueda prominente (CTA principal: "encuentra y trackea").
- Secciones: "Recently added" (sort -releaseDate), 2–3 filas por género/tipo
  (`FranchiseCarousel` horizontal con scroll-snap).
- Si hay sesión: fila "Continue watching" (entries con progreso incompleto,
  derivado de `me/checklists` + entries de la primera lista — v1 simple).
- Estados: skeleton de carruseles; si el catálogo está vacío, EmptyState.

### Catálogo `/catalog`
- `FilterBar` sticky: chips de tipo (All/Videos/Games), select múltiple de
  géneros, plataforma, rango de años (slider), sort. **Todo en la URL** →
  compartible, back/forward funciona, y es el estado que Zustand NO duplica
  (fuente de verdad: searchParams).
- Grid responsive de `FranchiseCard` (2 col mobile → 6 col xl).
- Paginación clásica v1 (más simple de razonar con filtros); infinite scroll
  como mejora de Sprint 4 si sobra tiempo.
- Skeleton: grid de cards fantasma con el mismo aspect-ratio.
- EmptyState con botón "clear filters".

### Detalle de franquicia `/franchise/:id`
- Header: banner/poster, nombre principal + alternativos (tooltip/expandible),
  géneros (badges), descripción expandible ("read more").
- Tabs: **Videos** / **Games** (ocultar tab vacía; si ambas, default la que
  tenga contenido).
- Lista de `ContentSection`: cada content con su imagen, videoType badge,
  descripción corta y su **tabla/cards de versiones** (nombre, episodios,
  fecha, país con banderita, plataforma, estudio de doblaje).
- **Cada version tiene el botón `AddToListButton`** (el corazón del producto).
  Si ya está en alguna lista (via `library-index`): botón en estado "In your
  list ✓" → abre gestión rápida (editar progreso / quitar / agregar a otra).
- Galería de imágenes de la franquicia (colapsada por defecto).

### Búsqueda
- `SearchBar` (header): debounce 300ms → `GET /search` → dropdown con hits
  (imagen, nombre matcheado, tipo). Enter → `/search?q=`.
- Página de resultados: reusa el grid del catálogo con `q` fijo + filtros.

### Mis listas `/my-lists`
Layout de dos paneles (desktop) / drill-down (mobile):
- **Panel izquierdo — `ChecklistTree`**: árbol de carpetas con contadores,
  drag-and-drop para reordenar (Sprint 4; v1 botones subir/bajar), menú
  contextual (rename, delete, publish toggle, new sub-list).
- **Panel derecho — entries de la lista seleccionada**:
  - `ListEntryRow` para version-links: imagen, displayName, abreviación,
    `ProgressBar` + **stepper de episodios (– / +)** con optimistic update,
    badge "synced" si aplica, menú (editar nombre/notas, mover, quitar).
  - `FranchiseEntryGroup` para franchise-links: header colapsable con progreso
    agregado (`[S1 12/12] - [S2 03/24]`) y sus version-links adentro.
  - Toggle de vista: filas (denso) / cards (visual).
- Onboarding: si el usuario no tiene listas → EmptyState con CTA
  "Create starter lists" (crea Watching/Completed/etc. — ADR-003) o "Create
  custom list".

### Flujo "Add to list" — `LinkWizard` (modal, 2 pasos máx.)
Réplica UX del wizard de Odoo (doc 02), simplificada:
1. **Paso 1** (se salta si el content tiene 1 versión): elegir versión.
2. **Paso 2**: elegir lista destino (árbol compacto + "crear nueva inline"),
   elegir nombre a mostrar (select de alternativeNames, default el principal),
   toggle "group under franchise" (default ON, con nombre de franquicia elegible
   la primera vez).
3. Si la API responde `ALREADY_LINKED`: paso extra con opciones "add anyway" /
   "create synced copy" / "cancel".
4. Éxito: toast con undo (DELETE del link creado) + actualización del
   `library-index` en cache.

### Perfil `/profile/:userId`
- `ProfileHeader`: avatar, nombre, stats (`StatsGrid`: total entries, episodios
  vistos, distribución games/videos — gráfico de dona simple).
- Grid de listas publicadas (`ChecklistCard` con imagen y contador) → vista
  read-only de entries.
- Perfil propio: banner "estas listas son públicas" + acceso a settings.

### Settings
- Tema (light/dark/system — persistido en localStorage vía Zustand).
- Cuenta: datos de sesión, logout. (Cambio de password/email depende de backend
  — probablemente delegue al backoffice de Odoo en v1.)

## Design system (`src/components/ui/`)

Base shadcn/ui: `button, card, dialog, dropdown-menu, input, select, tabs,
badge, skeleton, toast(sonner), tooltip, sheet, collapsible, slider, avatar,
breadcrumb, form`.

Componentes propios (sobre shadcn):

| Componente | Reemplaza/ajusta el brief | Notas |
|---|---|---|
| `FranchiseCard` | `MediaCard` | Poster ratio 2/3, nombre, géneros (máx 2 + n), badge tipo (V/G/both), indicador "in your list", hover con `motion` |
| `ListBadge` | `StatusBadge` | Nombre de checklist + color (canónicos fijos, resto hash→paleta) — ADR-003 |
| `ProgressBar` | `ProgressTracker` | `watched/total`, maneja `total=null` (`03/—`, barra indeterminada) |
| `EpisodeStepper` | — (nuevo, core) | – valor + con long-press repeat; optimistic |
| `RatingStars` | igual | Tras feature flag (ADR-004); input 1–10 con medias estrellas visuales |
| `ScoreDisplay` | igual | Solo bajo flag |
| `GenreBadge` | — | Paleta indexada 1–11 (mapea `colorIndex` de Odoo) |
| `SearchBar` | igual | Debounce + dropdown + navegación teclado |
| `FilterBar` | igual | Chips + selects, estado en URL |
| `UserAvatar` | igual | Imagen o iniciales |
| `LoadingSkeleton` | igual | Variantes: card-grid, detail-header, list-rows, tree |
| `EmptyState` | igual | Ilustración SVG propia + título + CTA |
| `ErrorBoundary` + `ErrorState` | igual | Boundary por página + estado de error de query con retry |
| `ChecklistTree` | — (nuevo, core) | Árbol accesible (roles treeview, teclado) |
| `CountryFlag` | — | Imagen de country con tooltip |

## Reglas transversales (del brief, confirmadas)

1. **Skeletons con la forma exacta** del contenido en TODA carga (TanStack
   `isPending`). Nunca spinner de página completa.
2. **Dark mode día 1**: tokens semánticos (`bg-background`, `text-muted-foreground`)
   — nunca colores crudos en componentes. Default: system.
3. **Mobile-first**: cada componente se escribe primero sin prefijos de
   breakpoint; `md:`/`lg:` agregan, no corrigen.
4. **Optimistic updates** en: stepper de episodios, rename de entry, crear/borrar
   checklist, quitar entry, rating (flag). Patrón TanStack: `onMutate` snapshot →
   `onError` rollback → `onSettled` invalidate.
5. **Animaciones**: transición de ruta, stagger de grids (`motion` variants,
   50ms), hover de cards (scale 1.02 + shadow), layout animations en el árbol.
   Respetar `prefers-reduced-motion`.
6. **Accesibilidad mínima**: navegación por teclado en SearchBar/árbol/wizard,
   `aria-label` en steppers e iconos, focus visible, contraste AA en badges.
