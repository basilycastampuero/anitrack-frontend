# feature: lists

Checklists del usuario (árbol) + links con progreso de episodios (el "tracking"
del brief, ADR-003/009). El estado tipo MyAnimeList se emula con listas
sugeridas. El grueso (ChecklistTree, wizard, stepper optimista) llega en Sprint 3.

- `services/` — `lists.service.ts` (+ `schemas.ts` recursivos)
- `hooks/` — `useLibraryIndex` (indicador "in your list")
- `types/` — `ChecklistNode`, `ListEntry`, `Progress`, requests
