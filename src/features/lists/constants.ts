/**
 * Identificadores de las cinco listas sugeridas del onboarding (doc 12
 * §3.5c, ADR-003): son checklists normales que emulan los estados fijos de
 * MAL como capa de UX, nunca un enum de dominio — el árbol de `Checklist`
 * sigue siendo genérico.
 *
 * El orden de este array importa dos veces: es el orden en que
 * `useCreateStarterLists` las crea, y por lo tanto el `order` que les asigna
 * el backend (depende de cuándo llega cada `POST`, no de un campo explícito).
 *
 * Estos strings son claves internas, no lo que ve el usuario — el nombre
 * visible (y el nombre real que recibe la checklist, ADR-003 punto 2) vive en
 * `i18n/en.ts` (`t.lists.starterLists`). Mantenerlos separados evita
 * hardcodear "Watching"/"Completed"/etc. en el componente o el hook.
 */
export const STARTER_LIST_KEYS = [
  'watching',
  'completed',
  'onHold',
  'dropped',
  'planToWatch',
] as const

export type StarterListKey = (typeof STARTER_LIST_KEYS)[number]
