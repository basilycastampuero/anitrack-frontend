# feature: catalog

Catálogo público: franquicias → contenidos (juego/video) → versiones, con
filtros, detalle anidado y búsqueda (la búsqueda vive aquí, ADR-009). Fuente de
verdad de los filtros: la URL (searchParams), no el store.

- `services/` — `catalog.service.ts` (+ `schemas.ts` Zod)
- `hooks/` — `useFranchiseList`, `useFranchiseDetail`, `useContentDetail`, `useSearch`
- `components/` — `FranchiseCard`, `FranchiseCarousel`, `FranchiseHeader`,
  `ContentSection` (+ `VersionsTable`) — estos tres son el detalle de
  franquicia/content (2.4/2.5); `ContentSection` se reutiliza tal cual en
  `ContentDetailPage` para el deep-link a un content puntual
- `types/` — inferidos de los schemas
