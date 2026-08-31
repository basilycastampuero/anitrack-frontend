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
redirect). Odoo está self-hosted en Railway (contenedor + Postgres); el frontend
estático irá en Vercel/Netlify. **Dato que define la topología (2026-07-24):** el
dominio es pagado exclusivamente para este proyecto y AniTrack es un solo
producto, así que backend y frontend cuelgan del **mismo dominio registrado** →
la cookie de sesión es *first-party* y evitamos por completo el escenario frágil
de dos dominios sin relación (`*.vercel.app` + `*.railway.app`), que obligaría a
`SameSite=None` (cookie third-party, cada vez más bloqueada por los navegadores).

**Decisión — topología de deploy, en orden de preferencia.**
1. **[Primaria] Vercel sirve el frontend y hace de proxy de `/api`** (`rewrites`
   de `vercel.json` / redirects `200` de Netlify hacia el host de Odoo en
   Railway). El navegador ve **un solo origen** → sin CORS y con cookie
   first-party. Ventaja extra: se comporta **igual que el proxy de Vite en dev**,
   así no hay sorpresas "anda en local, falla en prod". Chano no configura nada.
2. **[Alternativa] Subdominios del mismo dominio**: `www.…` → Vercel,
   `api.…` → Railway. Cookie sigue first-party (mismo *site*), pero como son
   *orígenes* distintos **sí hace falta CORS** (`Allow-Origin` = origen exacto +
   `Allow-Credentials: true`) — eso lo configura Chano en los controladores.
3. **[Plan B] CORS puro con dominios no relacionados**: solo si se cae la idea
   del dominio compartido. Implica `SameSite=None; Secure` (cookie third-party,
   frágil). Es el último recurso.

Concepto a no confundir: **same-site** (mismo dominio registrado → importa a las
*cookies*) ≠ **same-origin** (mismo esquema+host+puerto → importa a *CORS*).

**Decisión — auth (independiente de la topología).**
4. **Login email/password**: endpoint de sesión (nativo
   `/web/session/authenticate` o wrapper custom `/api/auth/login`) → cookie.
5. **Login Twitch**: link a la ruta OAuth de Odoo (`/auth_oauth/signin` flow) con
   `redirect` de vuelta a la SPA; al volver, la SPA llama `GET /api/auth/me`.
6. En dev: proxy de Vite (`server.proxy`) hacia el Odoo local/remoto, o MSW.
7. Axios con `withCredentials: true`; interceptor 401 → redirigir a login y
   limpiar store.

**Consecuencias.** Cero manejo de tokens en el frontend (más simple y más
seguro: cookie HttpOnly). La topología es una decisión **de producción**: en dev
está insulada por el proxy de Vite + MSW, así que no bloquea construir. La
opción 1 no requiere nada de Chano; la 2 sí (CORS). Ninguna suma un servicio
pago — el único descartado por costo era un contenedor proxy (nginx/Caddy)
dedicado en Railway. Ver doc 08, pregunta 4.

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

> **Actualización (2026-08-30):** confirmado que `/web/image` **no** es
> accesible sin sesión (deniega por ACL) y, peor, degrada en silencio a un
> placeholder gris de Odoo en vez de dar 403 (doc 08, pregunta 7). Se resolvió
> con la ruta propia `/api/v1/images/<id>` del controlador de ADR-010, que sí
> sirve el binario real sin sesión, con `Cache-Control`/`ETag`. Ver detalle en
> [11-spike-integracion-real.md](./11-spike-integracion-real.md).

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

---

## ADR-010 — El controlador REST del catálogo lee con `sudo()` y filtra por `published`, en vez de abrir las ACL de los modelos

**Contexto.** Verificado en doc 08 (pregunta 7) que **ningún** modelo de
`ll_checklist` tiene ACL para usuario público o portal: todo está atado al
grupo `LL Checklist / Administrator` (`ll-odoo/odoo-modules/ll_checklist/security/administrator.xml`).
El catálogo, sin embargo, tiene que verse deslogueado. Abrir las ACL de
lectura del modelo al grupo público resolvería el catálogo, pero esos mismos
modelos conviven con `ll.checklist.checklist` y `ll.checklist.link` (listas y
progreso privados del usuario) en el mismo módulo de seguridad — el riesgo de
exponer de más por una regla ACL mal acotada es real y difícil de auditar con
el tiempo.

**Alternativas consideradas.**
1. Reglas `ir.model.access` de solo lectura para un grupo público/portal
   nuevo, acotadas a los modelos de catálogo. Descartada: multiplica
   superficie de configuración de seguridad (un registro XML por modelo,
   fácil de romper en un futuro modelo nuevo) y sigue sin filtrar por
   `published` a nivel de fila (ACL es por modelo, no por registro).
2. **[Elegida]** El controlador (`auth="public"`) lee con `sudo()` (bypassa
   ACL) pero filtra él mismo: solo devuelve registros con
   `franchise_published/content_published/version_published = True`, y nunca
   toca `ll.checklist.checklist` ni `ll.checklist.link`. La responsabilidad de
   no filtrar datos privados queda centralizada en un único archivo Python
   (`odoo-modules/ll_webpage/controllers/api_catalog.py`) fácil de auditar.

**Decisión.** Opción 2. El `sudo()` es explícito y acotado a las rutas de
catálogo; ninguna ruta del controlador toca modelos de listas/links de
usuario.

**Consecuencias.** Positiva: no se tocan las ACL existentes ni el grupo
`Administrator`, cero riesgo de regresión sobre lo que ya funciona en el
backoffice. Negativa: la seguridad del catálogo público depende de que cada
endpoint nuevo del controlador recuerde filtrar por `published` — no hay una
red de seguridad a nivel de ACL que lo haga por él. Mitigación: el filtro se
concentra en un helper común dentro del mismo archivo, no se repite ad-hoc por
ruta.

---

## ADR-011 — Controlador de catálogo con `type="http"`, no `type="json"`

**Contexto.** Odoo permite declarar rutas `http.route` con `type="json"` o
`type="http"`. El contrato del doc 04 (congelado, ADR-001) define códigos de
estado HTTP reales (404, 422, etc.) y un sobre de error propio
`{"error": {"code", "message"}}` para que el interceptor único de Axios
(`src/lib/http.ts`) ramifique por código.

**Alternativas consideradas.**
1. `type="json"`: es el default más común en controladores Odoo internos,
   pero **siempre** responde HTTP 200 y envuelve la respuesta (o el error) en
   el sobre JSON-RPC de Odoo — el status HTTP deja de ser información útil y
   el interceptor de Axios tendría que inspeccionar el cuerpo para saber si
   hubo error, contradiciendo el contrato ya firmado en doc 04.
2. **[Elegida]** `type="http"`: el controlador arma la respuesta JSON a mano
   (`request.make_response` / `werkzeug.Response`) con el status code y el
   cuerpo exactos del contrato.

**Decisión.** Todas las rutas de `/api/v1` (`api_catalog.py`) son
`type="http"`.

**Consecuencias.** Positiva: contrato cumplido al pie de la letra, sin
adaptador para traducir el sobre JSON-RPC. Negativa: hay que armar a mano lo
que `type="json"` da gratis (serialización, manejo de excepciones a JSON) —
costo aceptado una sola vez en el controlador.

---

## ADR-012 — Tabs Videos/Games del detalle de franquicia: default fijo "Videos" cuando ambas tienen contenido

**Contexto.** El doc 06 pedía "si ambas [tabs] tienen contenido, default la
que tenga contenido" — frase que no resuelve el caso real (una franquicia con
anime Y juegos, ambos con contenido, ej. tipo "Pokémon"). Surgió al
implementar la tarea 2.4 (detalle de franquicia).

**Alternativas consideradas.**
1. Default dinámico según qué tipo tiene más contenido/versiones. Descartada:
   métrica arbitraria y resultado impredecible para el usuario — una
   franquicia con 1 anime y 5 juegos abriría en "Games" sin que eso sea
   obvio ni comunicado.
2. Recordar la última tab vista por franquicia (estado persistido). Descartada
   por complejidad no justificada para el alcance de la tarea 2.4; queda como
   posible mejora futura si hay señal real de que hace falta.
3. **[Elegida]** Default fijo **"Videos"** siempre que ambos tipos tengan
   contenido. AniTrack es un dominio video-primero (anime/series es el caso
   de uso principal del brief; juegos es soporte secundario del modelo de
   franquicia real del backend).

**Decisión.** Si la franquicia tiene un solo tipo de contenido, la tab se
oculta por completo (no hay selector). Si tiene ambos, `Tabs` monta con
`defaultValue="video"` siempre.

**Consecuencias.** Positiva: comportamiento consistente y predecible, sin
estado adicional que persistir ni heurística ambigua. Negativa: en una
franquicia donde lo relevante para el usuario sea mayormente juegos, cuesta
un clic extra llegar a esa tab — no hay evidencia hoy de que esto sea un
problema real, dado que el seed y el dominio actual siguen siendo
video-primero.

---

## ADR-013 — `SearchBar` (combobox de autocompletado) escrito a mano siguiendo ARIA APG, sin sumar dependencia

**Contexto.** La tarea 2.6 pide un combobox de autocompletado contra el
backend (`GET /search`): input + dropdown de resultados navegable por
teclado, con `aria-activedescendant`. Radix (ya instalado, base de shadcn/ui)
no tiene un primitivo para este caso: su `Select` es para listas cerradas
conocidas de antemano, no para opciones que llegan async mientras el usuario
tipea. El proyecto tampoco tiene `cmdk` (lo que usa shadcn para su patrón
"Command"/`Popover` de búsqueda) instalado.

**Alternativas consideradas.**
1. Sumar `cmdk` + `Popover` de shadcn (patrón "Command palette") y adaptarlo
   a autocompletado remoto. Descartada: es una dependencia nueva completa
   para un único componente, cuando el proyecto ya tiene precedente de
   resolver interacción a mano en vez de sumar un primitivo de Radix cuando
   eso evita complejidad de testing (`ExpandableText`, tarea 2.4).
2. **[Elegida]** Implementar el combobox a mano siguiendo el patrón
   [ARIA APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):
   `role="combobox"` en el input + `role="listbox"`/`role="option"` en el
   dropdown + `aria-activedescendant` sincronizado con la navegación por
   flechas, sin ninguna librería nueva.

**Decisión.** `SearchBar` + `SearchResultsDropdown`
(`src/features/catalog/components/`) implementan el patrón ARIA a mano,
sobre `useSearchBar` (debounce 300ms vía `useDebouncedValue`) y
`useSearch(q)` (ya existente desde Sprint 1).

**Consecuencias.** Positiva: cero dependencias nuevas; el componente queda
100% bajo control del proyecto para casos de test y accesibilidad. Negativa:
responsabilidad propia de mantener el manejo de teclado (flechas, Enter,
Escape, `aria-activedescendant`) correcto — un primitivo de terceros
absorbería ese mantenimiento. Aceptado porque el alcance es un único
componente, no un patrón que se repita varias veces en la app.
