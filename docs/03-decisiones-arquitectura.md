# 03 — Decisiones de Arquitectura (mini-ADRs)

> Formato: contexto → decisión → consecuencias. Son propuestas firmes pero
> revisables; si alguna te hace ruido, se discute antes del Sprint 1.

---

## ADR-001 — El frontend define su propio contrato de API (estilo BFF) y desarrolla contra MSW

**Contexto.** No existe API en el backend. El transporte final (REST custom vs
JSON-RPC de Odoo) está sin definir y depende de otra persona. No podemos
bloquearnos ni acoplarnos a la forma interna de los modelos Odoo (nombres tipo
`lv_episodes`, prefijos, Many2one como `[id, name]`...).

**Decisión.**
1. Diseñamos un contrato API REST/JSON limpio y orientado al frontend (doc 04).
2. MSW implementa ese contrato al 100% con datos seed realistas → se puede
   construir todo el frontend sin backend.
3. La capa `services/` es la única que conoce el contrato. Si el dev de Odoo
   implementa otra forma (JSON-RPC, otros nombres), se escribe un **adaptador**
   en `lib/api/` que traduce, sin tocar componentes ni hooks.
4. El contrato se le propone al dev de Odoo como spec a implementar (es lo más
   barato para él: controladores `http.route(type="json")` que devuelvan estos
   payloads).

**Consecuencias.** Desarrollo desbloqueado desde el día 1; riesgo de re-trabajo
limitado a la capa services/adapters; el contrato sirve como documento de
acuerdo entre los dos devs.

---

## ADR-002 — Stack y versiones concretas

**Contexto.** El brief fija el stack. Solo ajusto versiones a las estables
actuales cuando el modelo mental es el mismo.

**Decisión.**

| Herramienta | Versión | Nota vs brief |
|---|---|---|
| React | **19.x** | El brief dice 18; React 19 es la estable actual, API idéntica para nuestro uso, y shadcn/ui ya la soporta. Si algo rompe: bajar a 18.3 es trivial al inicio. |
| TypeScript | 5.x `strict: true` | Igual al brief |
| Vite | 7.x | Igual al brief (versión actual) |
| React Router | **v7 modo declarativo** | Es la continuación de v6 con la MISMA API (`createBrowserRouter`, loaders opcionales que NO usaremos). Los tutoriales de v6 aplican. |
| TanStack Query | v5 | Server state |
| Zustand | v5 | UI state (auth session, tema, filtros activos) |
| Tailwind CSS | **v4** | Config CSS-first (`@theme`), plugin `@tailwindcss/vite`. shadcn/ui la soporta oficialmente. Dark mode con `@custom-variant dark`. |
| shadcn/ui | actual | Design system base |
| Framer Motion | `motion` (nuevo nombre del paquete) | Misma librería |
| React Hook Form + Zod | actuales | Formularios |
| Axios | actual | Con interceptors (auth/errores) |
| MSW | 2.x | Mocks |
| Vitest + RTL | actuales | Tests |
| date-fns, clsx | actuales | Utilidades |

**Consecuencias.** Aprendés sobre las versiones que vas a encontrar en el
mercado; el delta de aprendizaje vs el brief es mínimo (Tailwind v4 config es lo
más distinto — se explica en Sprint 1).

---

## ADR-003 — El tracking se modela como el backend: checklists flexibles, con "listas sugeridas" para emular MAL

**Contexto.** El brief pide estados fijos tipo MAL. El backend implementa listas
arbitrarias anidables. Cambiar el backend no está en nuestras manos ni en el plazo.

**Decisión.**
1. El dominio del frontend refleja el real: `Checklist` (árbol) + `Link`
   (ítem con progreso). No inventamos un enum `WatchStatus` falso en el core.
2. Para la UX MAL-like: en el onboarding (primer login) ofrecemos crear un set
   de listas sugeridas ("Watching", "Completed", "On Hold", "Dropped",
   "Plan to Watch") — que son checklists normales. La UI de "quick add" ofrece
   esas listas primero.
3. `StatusBadge` del design system se generaliza: muestra el nombre de la
   checklist contenedora con un color derivado (hash del nombre → paleta), con
   colores fijos para los nombres canónicos (watching=verde, dropped=rojo...).

**Consecuencias.** Cero fricción con el backend; el producto queda MÁS flexible
que MAL (selling point de portafolio); la única pérdida es que "estado" no es
mutuamente excluyente (un ítem puede estar en dos listas — el backend lo
resuelve con links sincronizados, que es exactamente ese caso de uso).

---

## ADR-004 — Rating/notas/fechas: mockeados tras feature flag + propuesta de extensión al backend

**Contexto.** El brief los pide; el backend no los tiene; son valiosos para el
portafolio (RatingStars, distribución de scores).

**Decisión.**
1. El contrato API v1 (doc 04) incluye en `Link` los campos opcionales
   `rating?: number`, `notes?: string`, `startedAt?`, `finishedAt?` marcados
   como **extensión propuesta** (el doc 04 los marca `[EXT]`).
2. MSW los implementa; la UI los muestra solo si `features.ratings === true`
   (config central `lib/features.ts`). Default: `true` en dev/mocks, `false`
   contra backend real hasta que exista.
3. Se le propone al dev de Odoo agregar 4 campos al modelo `ll.checklist.link`
   (costo bajísimo — doc 08, pregunta 10). `link_description` ya existe y puede
   servir como `notes` desde el día 1.

**Consecuencias.** El portafolio muestra el feature completo; producción no
muestra controles muertos; hay un camino claro para activarlo.

---

## ADR-005 — Auth: sesión de Odoo con cookie + deploy same-origin detrás de proxy

**Contexto.** Odoo maneja sesiones con cookie (`session_id`). No emite CORS
headers por defecto. El OAuth de Twitch ya funciona server-side en Odoo (flujo
redirect). Una SPA en otro dominio complicaría cookies cross-site (SameSite).

**Decisión.**
1. **Same-origin en producción**: la SPA y la API se sirven bajo el mismo dominio
   vía reverse proxy (ej.: frontend estático en `/`, Odoo bajo `/api` y
   `/web/image`; o rewrites de Vercel/Netlify hacia el host de Odoo). Así la
   cookie de sesión funciona sin pelear con CORS/SameSite.
2. **Login email/password**: endpoint de sesión (nativo
   `/web/session/authenticate` o wrapper custom `/api/auth/login`) → cookie.
3. **Login Twitch**: link a la ruta OAuth de Odoo (`/auth_oauth/signin` flow) con
   `redirect` de vuelta a la SPA; al volver, la SPA llama `GET /api/auth/me`.
4. En dev: proxy de Vite (`server.proxy`) hacia el Odoo local/remoto, o MSW.
5. Axios con `withCredentials: true`; interceptor 401 → redirigir a login y
   limpiar store.

**Consecuencias.** Cero manejo de tokens en el frontend (más simple y más
seguro: cookie HttpOnly); requisito de deploy documentado para el dev backend
(doc 08, preguntas 3–6). Si el deploy same-origin resultara imposible, plan B:
CORS con `credentials` + `SameSite=None` (los controladores custom de Odoo
aceptan un parámetro `cors`).

---

## ADR-006 — Imágenes: URLs opacas provistas por la API

**Contexto.** Las imágenes son binarios en Postgres servidos por
`/web/image?model=ll.checklist.image&id=N&field=image_binary`.

**Decisión.** Todo objeto de la API expone `imageUrl: string | null` ya
construida (la construye el backend o el adaptador). El frontend nunca arma
URLs de Odoo a mano. MSW sirve imágenes de seed desde `/mock-images/*`.
Placeholder propio para `null`. `loading="lazy"` + `aspect-ratio` fijo en cards.

**Consecuencias.** Si el backend migra a S3/CDN (recomendable a futuro), el
frontend no cambia. Pendiente confirmar que `/web/image` sea accesible con
`auth="public"` para catálogo publicado (doc 08, pregunta 7).

---

## ADR-007 — Idioma: UI en inglés, código y docs según audiencia

**Contexto.** Es pieza de portafolio (audiencia internacional) y producto real
(audiencia hispana probable, por el dev y el cliente).

**Decisión.** UI en **inglés** v1, pero TODOS los strings visibles viven en
`src/i18n/en.ts` (objeto tipado, sin librería i18n todavía). Si el cliente pide
español, se agrega `es.ts` y un switcher con costo mínimo. Código/commits en
inglés; documentación de planificación en español.

**Consecuencias.** Portafolio presentable internacionalmente sin comprometerse
a i18n completo (librería, plurales, fechas) que no está en el plazo.

---

## ADR-008 — Datos seed de MSW: realistas y alineados 1:1 con el modelo real

**Contexto.** Los mocks son la "verdad" durante 1–2 meses. Si son simplistas
(sin franquicias multi-contenido, sin versiones múltiples, sin episodios
desconocidos), la UI real va a romper después.

**Decisión.** El seed (`src/mocks/seed/`) incluye como mínimo:
- 8–12 franquicias mixtas. Casos obligatorios:
  - Franquicia con contenido video Y juego (ej. una tipo "Pokémon").
  - Content con múltiples versiones (temporadas + doblajes en distinto país/plataforma).
  - Version con `episodes = 0` (en emisión) para probar el render `[03/-]`.
  - Franquicia con nombres alternativos en varios idiomas.
  - Película (`videoType: "M"`) con 1 sola versión (flujo wizard corto).
- 2 usuarios: uno con listas pobladas y anidadas (con franchise-links agrupados
  y un par de links sincronizados), otro vacío (empty states).
- Latencia simulada (200–600ms) y errores inyectables (query param o header)
  para probar skeletons y estados de error.

**Consecuencias.** Los edge cases del backend se descubren en desarrollo, no en
integración.

---

## ADR-009 — Estructura feature-based del brief, confirmada con ajustes de nombres

**Decisión.** Se mantiene la estructura del brief con estos features:
`auth`, `catalog` (franquicias/contenidos/versiones + filtros + búsqueda),
`lists` (checklists + links + progreso — en vez de "tracking"), `profile`.
`search` se integra dentro de `catalog` (comparten servicio y tipos; una
feature separada duplicaría). Reglas intactas: pages solo ensamblan; components
→ hooks → services → API; sin `any`; sin fetching en `useEffect`.
