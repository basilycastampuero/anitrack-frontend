# feature: catalog

Catálogo público: franquicias → contenidos (juego/video) → versiones, con
filtros, detalle anidado y búsqueda (la búsqueda vive aquí, ADR-009). Fuente de
verdad de los filtros: la URL (searchParams), no el store.

- `services/` — `catalog.service.ts` (+ `schemas.ts` Zod)
- `hooks/` — `useFranchiseList`, `useFranchiseDetail`, `useSearch`
- `components/` — `FranchiseCard`, `FranchiseCarousel`
- `types/` — inferidos de los schemas
