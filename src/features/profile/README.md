# feature: profile

Perfiles públicos con stats y listas publicadas (tarea 3.10). Rutas públicas:
se ven sin sesión, y sus queries **no** se limpian en logout (doc 15 §3.5).

- `services/` — `profile.service.ts` (+ `schemas.ts`, que reusa
  `checklistNodeSchema`/`listEntrySchema` de `lists` en vez de redeclararlos)
- `hooks/` — `useProfile`, `usePublicEntries`, `queryKeys.ts`
- `components/` — `ProfileHeader`, `StatsGrid` (dona en SVG a mano),
  `ChecklistCard`
- `types/` — `PublicProfile`

Las stats llegan calculadas por el backend y acotadas a listas publicadas
(doc 04): `StatsGrid` no agrega nada, solo da forma.
