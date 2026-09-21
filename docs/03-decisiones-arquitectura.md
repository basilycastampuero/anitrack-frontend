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

---

## ADR-014 — Aislamiento de datos privados: ACL para el grupo Portal + `ir.rule` por dueño acotada a ese grupo, y endpoints `/me/*` sin `sudo()`

**Contexto.** ADR-010 resolvió el catálogo público con `auth="public"` +
`sudo()` + filtro `published`. Ese modelo **no se puede extender** a
`/api/v1/me/*` (Sprint 3a): checklists y links son datos privados, y `sudo()`
bypassa toda ACL, así que el aislamiento entre usuarios pasaría a depender
enteramente de que cada endpoint recuerde filtrar por dueño.

Verificado contra el Odoo local (2026-08-31, DB `anitrack`, Odoo 17.0):

- Los 16 modelos de `ll_checklist` tienen su `ir.model.access` atada
  exclusivamente al grupo `LL Checklist / Administrator`, y **no existe ni una
  sola `ir.rule`** en el módulo (consulta directa a `ir.model.access` e
  `ir.rule`).
- Se crearon dos usuarios de prueba en la base local
  (`portaltest@anitrack.dev`, grupo Portal; `usertest@anitrack.dev`, Internal
  User). Ambos reciben `AccessError` en `ll.checklist.checklist`,
  `ll.checklist.link` y `ll.checklist.user`. Es decir: **hoy un usuario
  logueado no puede leer ni sus propias listas**, y
  `ll.checklist.user.extra_get_user()` —que `Checklist.default_get` usa para
  resolver el perfil— también falla.

Hay un dato del modelo de Chano que inclina la decisión: la lógica que el
Sprint 3b va a reutilizar hace `search()` **sin filtro de dueño**.
`ll.checklist.wizard.link.action_link_to_checklist()` busca
`[("link_version_id", "=", version.id)]` sobre **todos** los links de la base
para detectar el caso "ya está vinculado". Bajo ACL del ORM esa búsqueda la
acota la `ir.rule` automáticamente; bajo `sudo()` devuelve los links de todos
los usuarios — exactamente la fuga que el `409 ALREADY_LINKED` del contrato
(doc 04) le expondría al frontend, con nombres de listas ajenas adentro.

**Alternativas consideradas.**

1. `sudo()` + filtro de propiedad escrito a mano en el controlador (extender
   ADR-010 tal cual). Descartada por tres motivos: el aislamiento pasa a
   depender de recordar el filtro en cada ruta nueva; no protege los `search()`
   internos del código de Chano que se va a reutilizar; y un bug de omisión no
   falla ruidosamente — devuelve datos de más, en silencio.
2. ACL para el grupo Portal + `ir.rule` por dueño **global**. Descartada
   **tras probarla**: una `ir.rule` con `global=True` aplica a *todos* los
   usuarios, incluido el grupo Administrator. Con la regla global activa, el
   propio `admin` (uid 2, miembro de `LL Checklist / Administrator`) perdió el
   `unlink` sobre `ll.checklist.checklist` — habría roto el backoffice de
   Chano sin que nadie lo notara hasta usarlo.
3. **[Elegida]** `ir.model.access` para `base.group_portal` + `ir.rule` por
   dueño **acotada a ese grupo** (`groups = [base.group_portal]`,
   `global = False`), y los endpoints `/api/v1/me/*` operando con
   `request.env` (el usuario real de la sesión), reservando `sudo()`
   únicamente para leer datos de catálogo ya públicos dentro de esos endpoints
   (nombres alternativos, versiones, imágenes del catálogo).

**Decisión.** Opción 3. Los registros viven en **`ll_webpage`**
(`security/portal_access.xml`), **no** en `ll_checklist`: `ll_webpage` ya es
el módulo donde vive todo el trabajo propio y ya depende de `ll_checklist`,
así que el diff sobre el módulo de Chano sigue siendo cero y los
`ir.model.access` pueden referenciar sus modelos por xmlid
(`ll_checklist.model_ll_checklist_checklist`).

Alcance concreto:

- ACL **read/write/create/unlink** para `base.group_portal` sobre
  `ll.checklist.checklist`, `ll.checklist.link`, `ll.checklist.link.copy` y
  `ll.checklist.user`.
- `ir.rule` por dueño, `global=False`, `groups=[base.group_portal]`, sobre esos
  cuatro modelos:

  | Modelo | `domain_force` |
  |---|---|
  | `ll.checklist.checklist` | `[('checklist_user_id.user_res_user_id','=',user.id)]` |
  | `ll.checklist.link` | `[('link_checklist_id.checklist_user_id.user_res_user_id','=',user.id)]` |
  | `ll.checklist.link.copy` | `[('lc_left_id.link_checklist_id.checklist_user_id.user_res_user_id','=',user.id)]` |
  | `ll.checklist.user` | `[('user_res_user_id','=',user.id)]` |

- **Ninguna ACL de catálogo para Portal.** El catálogo lo sigue sirviendo el
  controlador público de ADR-010 con `sudo()`; el usuario portal no necesita
  leerlo por ORM.

Verificado empíricamente con esas reglas puestas —y borradas al terminar, base
restaurada—: el usuario portal crea y lee **solo** sus propias checklists;
leer o escribir la de otro dueño da `AccessError`; crear una checklist a
nombre de otro perfil (`checklist_user_id` ajeno) **también** da `AccessError`,
o sea la regla cubre el `create` y no solo el `read`; `extra_get_user()`
funciona y crea el perfil del usuario portal; y el `admin` conserva
read/write/unlink sobre todo.

**Consecuencias.** Positiva: el aislamiento lo garantiza el ORM, no la
disciplina del programador, y aplica también a los `search()` internos de la
lógica de Chano que el Sprint 3b va a reutilizar; el backoffice no cambia de
comportamiento. Negativa: la superficie de seguridad queda configurada en dos
lugares con reglas distintas — la regla mnemotécnica es **"público y de solo
lectura ⇒ `sudo()` + filtro `published` (ADR-010); privado ⇒ ORM del usuario,
nunca `sudo()`"**. Segunda negativa: todo modelo privado nuevo necesita su par
ACL + rule o queda inaccesible; falla con `AccessError`, que es el modo de
falla correcto (ruidoso), a diferencia del de la opción 1.

**Deuda que este ADR deja abierta.** La ruta `/api/v1/images/<id>` de ADR-010
sirve **cualquier** `ll.checklist.image` por id, con `sudo()` y sin filtro de
`published` ni de dueño. Hoy es inocuo (todas las imágenes son de catálogo),
pero `ll.checklist.checklist` tiene `checklist_image_id`: en cuanto un usuario
adjunte una imagen a una lista propia, queda enumerable públicamente por id.
Se corrige en el Sprint 3a (tarea B4 del doc 07): la ruta pública filtra por
pertenencia a un registro de catálogo publicado, y las imágenes privadas se
sirven por una ruta autenticada aparte.

> **[CERRADO 2026-09-08 — tarea B4, `ll-odoo` commit `3c4e091`]** `GET
> /api/v1/images/<id>` (`api_catalog.py`) ahora exige pertenencia a un
> registro de catálogo publicado; las imágenes privadas se sirven por `GET
> /me/images/<id>` (`api_lists.py`, nueva) con verificación de dueño. Detalle
> en [13-sprint3a-avance.md](./13-sprint3a-avance.md).

---

## ADR-015 — Identidad: el perfil `ll.checklist.user` se resuelve perezosamente desde la sesión; el alta de cuenta usa `res.users.signup()`

**Contexto.** El contrato (doc 04) define `UserSession` con dos ids: `id`
(perfil `ll.checklist.user`) y `odooUserId` (`res.users`). Falta decidir cómo
se relacionan, qué pasa en un alta y qué pasa si hay sesión sin perfil.

Verificado en el Odoo local (2026-08-31):

- Hay **un solo** registro de `ll.checklist.user` (el del admin).
- `ll.checklist.user.extra_get_user(uid)` ya es un *get-or-create* completo, y
  el modelo tiene `_sql_constraints` `unique_res_user` sobre
  `user_res_user_id`, así que no puede haber perfiles duplicados.
- `auth_signup` está **instalado**, con `auth_signup.invitation_scope = 'b2c'`
  (registro libre habilitado) y `auth_signup.reset_password = True`.
- `res.users.signup()` crea el usuario a partir de
  `base.template_portal_user_id`: el usuario resultante es **Portal**
  (`share = true`, grupos `[Portal]`) — comprobado creando
  `signuptest@anitrack.dev`. Eso cierra la pregunta 8 del doc 08, que estaba
  `[BLOQUEADA parcial]`.

**Alternativas consideradas.**

1. Crear el perfil `ll.checklist.user` explícitamente en el alta
   (`POST /auth/register`) y tratar "sesión sin perfil" como un error.
   Descartada: deja un estado inconsistente posible y permanente para todo
   usuario creado por cualquier otra vía (OAuth, backoffice, un `res.users`
   que Chano cree a mano).
2. **[Elegida]** El perfil se resuelve **perezosamente** en cada punto de
   entrada autenticado, reutilizando `extra_get_user()` tal cual está en el
   módulo de Chano.

**Decisión.** Opción 2.

1. `GET /api/v1/auth/me` resuelve
   `profile = request.env["ll.checklist.user"].extra_get_user(request.env.uid)`
   y devuelve `{ id: profile.id, odooUserId: request.env.uid, name, email,
   avatarUrl }`. "Sesión sin perfil" deja de ser un estado alcanzable: la
   primera petición autenticada lo crea.
2. Todos los endpoints `/me/*` obtienen el perfil por esa misma vía y **nunca**
   aceptan un id de dueño en el body. `checklist_user_id` se fija desde la
   sesión (defensa en profundidad: ADR-014 ya lo impediría a nivel ORM, pero
   el controlador devuelve un `403` limpio en vez de un `AccessError`).
3. `POST /api/v1/auth/register` envuelve
   `request.env["res.users"].sudo().signup({login, name, password})` y después
   autentica igual que `/auth/login`. Es la **única** llamada con `sudo()` del
   bloque de auth, y está acotada al alta.
4. `avatarUrl` sale de `res.users.image_128` por una ruta autenticada propia
   (`GET /api/v1/me/avatar`), no de `/web/image` (inaccesible sin sesión, ver
   ADR-006) ni de `/api/v1/images/<id>` (que es del catálogo, ADR-014).

**Consecuencias.** Positiva: un usuario creado por cualquier vía —email/clave,
OAuth Twitch a futuro, backoffice— obtiene su perfil sin trabajo extra; y el
alta produce usuarios **Portal**, que es exactamente el grupo al que ADR-014 le
da acceso y que no puede entrar al backoffice de Odoo. Negativa:
`auth_signup.invitation_scope` es un parámetro **de la base**, no del código;
si en producción está en `b2b`, el registro falla. Mitigación:
`/auth/register` traduce ese caso a `403 { code: "FORBIDDEN" }` con mensaje
explícito, y el frontend puede ocultar el formulario con un flag de
`lib/features.ts` (patrón ya establecido en ADR-004). Queda `[FE→BE]`:
confirmar con Chano el `invitation_scope` de producción y qué pasa si alguien
se registra por email y después entra por Twitch con el mismo mail (pregunta
8.2 del doc 08, todavía abierta).

---

## ADR-016 — La sesión viaja por un wrapper propio `/api/v1/auth/*`, no por `/web/session/authenticate`; CSRF por header obligatorio en vez del token de Odoo

**Contexto.** El doc 04 define `POST /auth/login`, `POST /auth/logout` y
`GET /auth/me`; Odoo ya trae `/web/session/authenticate`. Y el Sprint 3a
introduce los primeros POST/PATCH/DELETE del proyecto, que es un asunto
distinto del catálogo (todo GET).

Verificado contra el Odoo local (2026-08-31, Odoo 17.0):

- `/web/session/authenticate` es `type="json"`: responde **HTTP 200 siempre**
  (el error viaja dentro del sobre JSON-RPC), exige `db` en el body —o sea le
  filtra el nombre de la base al cliente— y devuelve un blob de 28 claves de
  estado interno del webclient. Contradice el contrato del doc 04 y la razón
  de ser de ADR-011.
- La cookie que emite es `session_id=…; Max-Age=604800; HttpOnly; Path=/`,
  **sin `SameSite` y sin `Secure`**.
- En `odoo/http.py`, `CSRF_FREE_METHODS = ('GET','HEAD','OPTIONS','TRACE')`:
  para rutas `type="http"`, el CSRF se valida en **POST, PATCH, PUT y DELETE**,
  y el token se lee de `request.params` (form-data o query string), **no** de
  un header. Comprobado en vivo: `POST /web/login` sin token →
  `400 Session expired (invalid CSRF token)`. Un API con body JSON no puede
  alimentar ese mecanismo sin ensuciar la URL o el body con `csrf_token`.
- Una ruta `type="http"` con `auth="user"` sin sesión **no** devuelve 401:
  redirige. Comprobado: `GET /web` sin cookie → `303` hacia `/web/login`.

**Decisión.**

1. `POST /api/v1/auth/login` propio (`type="http"`, `auth="public"`,
   `csrf=False`) llama `request.session.authenticate(request.db, login,
   password)` y devuelve `200 {user: UserSession}` o
   `401 {error:{code:"UNAUTHORIZED"}}`, exactamente el contrato del doc 04.
   `POST /api/v1/auth/logout` → `request.session.logout(keep_db=True)` +
   `204`. El frontend nunca ve el nombre de la base ni el sobre JSON-RPC.
2. La respuesta de login **re-emite la cookie de sesión explícitamente** con
   `SameSite=Lax`, `HttpOnly`, `Path=/` y `Secure` cuando el request llega por
   https. Odoo no lo hace por su cuenta y no tiene un setting para eso.
3. **Todas** las rutas de `/api/v1`, incluidas las de `/me/*`, se declaran
   `auth="public"` y comprueban la sesión ellas mismas
   (`request.env.user._is_public()`), devolviendo `401` con el sobre propio.
   Usar `auth="user"` daría un `303` al login de Odoo, que axios sigue en
   silencio y termina entregándole HTML al interceptor de `src/lib/http.ts`.
4. CSRF: `csrf=False` en las rutas propias + **header obligatorio
   `X-Requested-With: anitrack` en todo método que no sea GET/HEAD**; sin él,
   `403 FORBIDDEN`. Un atacante cross-site no puede fijar un header propio sin
   un preflight CORS, y no emitimos cabeceras CORS (ADR-005, topología 1:
   mismo origen por proxy), así que el preflight falla. Es la defensa "custom
   request header" de OWASP, con `SameSite=Lax` como segunda capa.

**Alternativa considerada y descartada por ahora.** Reutilizar el HMAC de Odoo
(`request.csrf_token()` / `request.validate_csrf()`) transportado en un header
`X-CSRF-Token`, sembrado por `/auth/login` y `/auth/me`. Es criptográficamente
más fuerte, pero suma ciclo de vida del token en el frontend (refresco,
reintento ante un 403 por token vencido) para un beneficio que hoy no se
cobra. **Disparador explícito para adoptarla:** si alguna vez se habilita CORS
—topologías 2 o 3 de ADR-005, subdominios o dominios sin relación— la defensa
por header pierde fuerza, porque habría un preflight permitido; ahí el token
pasa a ser obligatorio y este ADR se revisa.

**Consecuencias.** Positiva: el contrato del doc 04 se cumple al pie de la
letra con códigos HTTP reales, y el frontend ya escrito no cambia nada
(`src/features/auth/services/auth.service.ts` y `src/lib/http.ts` ya hablan
ese contrato); la cookie queda con atributos explícitos y auditables en un
archivo propio. Negativa: el bloque de auth queda acoplado a APIs internas de
Odoo (`request.session.authenticate`, `session.logout`) que pueden cambiar
entre versiones mayores — acotado a un archivo y cubierto por un test de humo.
Segunda negativa: el header obligatorio hay que agregarlo a la instancia de
axios (una línea en `createHttpClient`) y recordarlo al llamar la API desde
fuera del frontend (curl, Postman) — por eso el mensaje del `403` dice
exactamente qué header falta.

---

## ADR-017 — El Sprint 3a se construye contra MSW; el backend de auth y listas va en un carril paralelo, con spike al inicio y checkpoint de contrato al cierre

**Contexto.** ADR-001 fijó "MSW hasta que el backend real esté confirmado". El
Sprint 2 cambió el terreno: existe un controlador REST propio en `ll-odoo`
(ADR-010/011) y la política sobre ese repo pasó a permitir modificarlo en
local. Corresponde decidir explícitamente qué hace el Sprint 3a.

Verificado: `src/mocks/handlers.ts` ya implementa el **100%** del bloque de
auth y listas del doc 04 —login, logout, me, register, CRUD de checklists,
entries, links, library-index— con seed de dos usuarios (uno poblado y anidado,
uno vacío). El frontend del Sprint 3a **no está bloqueado ni un día**.

Pero hay una asimetría con el Sprint 2 que no conviene ignorar: el catálogo era
público y de solo lectura, así que MSW y el backend real solo podían diferir en
la forma del payload, y los esquemas Zod lo detectaban. Auth y listas agregan
riesgo que MSW **no puede** simular: la cookie, el CSRF, las ACL y la propiedad
de los datos. Ese riesgo no se abarata por esperar.

**Alternativas consideradas.**

1. 3a 100% contra MSW y backend entero en el Sprint 4 (tarea 4.1). Descartada:
   concentra el riesgo de cookie/CSRF/ACL justo cuando ya no hay margen, y el
   Sprint 3b construye el wizard sobre `POST /me/links`, cuyo caso
   `ALREADY_LINKED` depende de la decisión de aislamiento de ADR-014 — cara de
   descubrir tarde.
2. Escribir el backend primero y construir 3a contra Odoo real. Descartada:
   rompe ADR-001 sin necesidad, hace que un bug de Python bloquee la UI, y
   regala el mejor activo del proyecto (poder construir la UI sin backend).
3. **[Elegida]** Dos carriles. **Carril A (camino crítico): el frontend del
   Sprint 3a se construye íntegramente contra MSW**, como hasta ahora.
   **Carril B (backend):** un spike corto **al principio** del sprint que
   implementa solo `/auth/login`, `/auth/logout`, `/auth/me` y las reglas de
   ADR-014, verificado con `curl` y sin tocar el frontend; el resto de
   endpoints (`/me/*`) al final; y un **checkpoint de contrato** de cierre que
   corre los mismos esquemas Zod del frontend contra las respuestas reales,
   igual que el spike 2.8.

**Decisión.** Opción 3. `VITE_API_MODE` sigue en `mock` por default y ninguna
tarea del carril A depende del carril B.

**Consecuencias.** Positiva: el riesgo de sesión/ACL se descubre en la primera
semana del sprint, con margen para reaccionar, sin que el frontend dependa de
eso; y la tarea 4.1 pasa de "escribir toda la integración" a "encender el flag
y arreglar el drift". Negativa: hay que sostener dos implementaciones del mismo
contrato (MSW y Python) durante el sprint, y pueden divergir en silencio —
mitigado por el checkpoint de contrato con esquemas Zod, que es **obligatorio**
para dar el sprint por cerrado. Tercera consecuencia: el Odoo local tiene
catálogo sembrado pero **cero listas de usuario**, así que extender
`scripts/seed-odoo.mjs` con un usuario portal y sus listas deja de ser
opcional y entra al plan como tarea del carril B.

---

## ADR-018 — `aggregatedProgress` se recalcula como dato estructurado en el controlador, y la equivalencia con `link_show_name` se testea

**Contexto.** El contrato (doc 04) define
`aggregatedProgress: { groups: { abbreviation, watched, total }[] }` y dice
explícitamente que llega **pre-calculado**: el frontend no recalcula la
agregación, solo la formatea (`progress.ts`, tarea 3.6). Del lado de Odoo esa
lógica ya existe, pero como **string formateado**:
`ll.checklist.link.compute_show_name` (`ll_checklist/models/database/link.py`)
produce `"Spy x Family [S1 25/25] - [S2 03/-]"` y, de paso, escribe ese texto
en `link_record_id.checklist_name`.

Verificado contra el Odoo local (2026-09-08, DB `anitrack`) creando a mano un
franchise-link con dos version-links: `link_show_name` quedó exactamente
`"Spy x Family [S1 25/25] - [S2 03/-]"`, con el mismo formato que espera
`progress.ts`. La lógica real, leída del código, es: agrupar por
`lv_abbreviation` (clave `""` si está vacía), sumar `lv_episodes` por grupo,
sumar `version_episodes` **salvo** que alguna versión del grupo tenga
`version_episodes <= 0`, en cuyo caso el total del grupo entero pasa a
desconocido (`-1`, que se imprime `-`), y ordenar los grupos por el
`lv_record_order` **mínimo** del grupo.

**Alternativas consideradas.**

1. **Devolver el string de `link_show_name` y parsearlo en el frontend.**
   Descartada: contradice el contrato (el frontend dejaría de recibir dato y
   pasaría a recibir presentación), obliga a un parser de un formato que
   nadie versiona, y rompe en cuanto un `link_name` contenga un `[` o un
   ` - `. Además el string mezcla el nombre del entry con su progreso.
2. **Llamar a `compute_show_name` desde el controlador y derivar los grupos
   de su resultado.** Descartada por dos motivos: el método no devuelve
   nada estructurado (asigna a `link_show_name`), y **tiene un efecto
   secundario**: reescribe `link_record_id.checklist_name`. Un endpoint de
   lectura no puede permitirse escribir en la base.
3. **[Elegida]** Replicar la agregación en `api_lists.py` como función pura
   sobre los campos del link (`lv_abbreviation`, `lv_episodes`,
   `lv_version_episodes`, `lv_record_order`), emitiendo los grupos como dato,
   y **testear la equivalencia**: formatear los grupos con el mismo formato
   de Chano y comparar contra `link_show_name` del mismo registro.

**Decisión.** Opción 3. La función vive en `api_lists.py`, documenta en su
docstring de qué método es espejo, y el mapeo al contrato es:
`total = 0` cuando el grupo quedó en desconocido (el contrato ya define
`0 => desconocido`, igual que `version_episodes`), y `abbreviation = ""`
cuando el link no tiene abreviatura (el contrato la tipa `string`, no
`string | null`).

**Consecuencias.** Positiva: el contrato se cumple sin adaptador y sin
efectos secundarios en una ruta GET; el frontend recibe dato, no
presentación. Negativa: hay **dos** implementaciones de la misma regla de
negocio (la de Chano y la nuestra) y pueden divergir en silencio si él cambia
la suya — es el mismo riesgo de drift que ADR-017 mitiga para el contrato,
aplicado acá a una regla de dominio. Mitigación concreta y barata: el test de
equivalencia contra `link_show_name` es el detector; si Chano cambia su
lógica, ese test se pone rojo y el drift se ve, en vez de aparecer como un
progreso mal sumado en la UI.

---

## ADR-019 — En `/me/*`, el catálogo se lee por campos *related* del link; el `sudo()` explícito queda para el único dato que no tiene related

**Contexto.** ADR-014 fijó la regla "privado ⇒ ORM del usuario, nunca
`sudo()`", con una excepción declarada: leer catálogo ya público dentro de
esos endpoints. Faltaba saber **qué** exactamente hace falta leer del
catálogo para armar un `ListEntry` (doc 04) y cuánto `sudo()` cuesta.

Verificado contra el Odoo local (2026-09-08) con el usuario portal
`portaltest@anitrack.dev` y las reglas de `ll_webpage/security/portal_access.xml`
ya instaladas:

- Acceso **directo** a `ll.checklist.version`, `content`, `franchise`,
  `db.name` e `image` ⇒ `AccessError`, como esperaba ADR-014.
- Un `search` sobre `ll.checklist.link` cuyo **dominio atraviesa** al
  catálogo (`[('link_version_id.version_episodes','>',0)]`) ⇒ también
  `AccessError`: Odoo aplica las ACL del modelo atravesado.
- Pero los campos **related** del propio link **sí** se leen sin error:
  `lv_version_episodes` (related a `version_episodes`), `link_image_binary`
  (related a la imagen), `link_description`, `lv_record_order`. Es el
  comportamiento por defecto de los campos related en Odoo, que se computan
  con `sudo()` salvo que se declare lo contrario.
- Y un `read()` de un Many2one a catálogo (`link_version_id`,
  `link_franchise_id`) devuelve `[id, display_name]` sin `AccessError`.

O sea: **el modelo de Chano ya expone, por diseño, el subconjunto de catálogo
que un link necesita**, y lo hace saltando la ACL sin que el controlador pida
nada. Eso no es un agujero (son datos de catálogo, públicos por ADR-010) pero
sí es un supuesto que conviene dejar escrito, porque no es evidente leyendo
`portal_access.xml`.

**Alternativas consideradas.**

1. Dar ACL de lectura de catálogo al grupo Portal. Descartada: ADR-014 ya la
   descartó ("Ninguna ACL de catálogo para Portal") y no hace falta — el
   catálogo se sirve por el controlador público de ADR-010.
2. `sudo()` sobre el link entero dentro de `/me/*` para no pensar en qué se
   puede leer y qué no. Descartada: es exactamente lo que ADR-014 prohíbe, y
   apagaría la `ir.rule` que garantiza el aislamiento entre usuarios.
3. **[Elegida]** Leer todo lo que se pueda por campos del propio link
   (related incluidos) con `request.env`, y usar `sudo()` explícito
   **solo** para `version.version_content_id` (el `contentId` del contrato),
   que es el único dato que el link no expone por related.

**Decisión.** Opción 3, con tres reglas para `api_lists.py`:

1. Ningún dominio de `search` en `/me/*` atraviesa a un modelo de catálogo —
   filtra siempre por campos propios del link o de la checklist. (No es una
   preferencia de estilo: falla con `AccessError`.)
2. El único `sudo()` del archivo es una lectura en lote de
   `ll.checklist.version` → `version_content_id`, hecha por el helper
   `_catalog(model)` que doc 12 ya prevé, sobre los ids que salieron de links
   que la `ir.rule` ya validó como del usuario. Nunca se usa un id que venga
   del request.
3. Si un endpoint futuro necesita más catálogo (nombres alternativos,
   plataformas), se agrega a ese mismo helper y se justifica ahí, no se
   dispersa un `.sudo()` por el archivo.

**Consecuencias.** Positiva: el aislamiento entre usuarios lo sigue haciendo
el ORM, hay un solo `sudo()` auditable, y no se toca `ll_checklist` para
agregar related nuevos. Negativa: la superficie del `/me/*` depende de qué
campos related tenga hoy el modelo de Chano; si él borra o cambia
`lv_version_episodes` a `related_sudo=False`, el endpoint pasa de funcionar a
tirar `AccessError` — falla ruidosa, que es el modo correcto, y queda cubierta
por el checkpoint B5. Segunda consecuencia: `/api/v1/images/<id>` sigue siendo
la URL que emiten los entries, porque las imágenes de un link son siempre
imágenes de catálogo (la del franchise o la del content); la ruta privada que
introduce B4 es solo para imágenes que el usuario suba a una checklist propia.

---

## ADR-020 — La `ir.rule` de `ll.checklist.link.copy` exige que **ambos** lados sean del mismo dueño, no cualquiera de los dos

**Contexto.** El Sprint 3b introduce las copias sincronizadas
(`syncWithLinkId` en `POST /me/links`, doc 04): una versión vinculada en dos
listas distintas cuyo progreso se mantiene sincronizado. En Odoo eso es una
fila de `ll.checklist.link.copy` con dos Many2one a `ll.checklist.link`
(`lc_left_id`, `lc_right_id`), y `Link.write()`
(`ll_checklist/models/database/link.py`) propaga `lv_episodes`/`lv_abbreviation`
a través de esas filas, **en ambos sentidos**, con `super().write()`.

La regla de aislamiento de ese modelo se escribió en B1 mirando solo
`lc_left_id`, y en B4 se amplió a los dos lados con un `'|'` (OR) para arreglar
un falso-negativo de lectura: una copia propia cuyo link estuviera del lado
derecho no era visible, así que `isSynced` podía dar `false` de más.

Al diseñar el Sprint 3b (doc 15, §2.2) se revisó qué garantiza realmente ese
OR, y la conclusión es que **no cierra el agujero de escritura que la propia
nota de B4 dice cerrar, y abre uno peor**:

- Una fila `(lc_left = mi link, lc_right = link ajeno)` satisface la primera
  cláusula, así que el `check_access_rule('create')` la deja pasar — igual que
  antes de B4. Escribir un Many2one no exige permiso de lectura sobre el
  registro apuntado, así que basta con conocer (o adivinar) un id.
- Lo que el OR **sí** cambió es que esa fila ahora es visible **desde el otro
  lado**. Cuando la víctima escriba `lv_episodes` en su propio link,
  `Link.write` va a recorrer sus `lv_link_right_ids`, encontrar esa fila e
  intentar escribir en el link ajeno: `AccessError`. Es decir, cualquier
  usuario puede dejar el link de otro **permanentemente inescribible**. Con la
  regla anterior (solo `lc_left_id`) la fila era invisible para la víctima y no
  le rompía nada.

> **Estado de verificación — VERIFICADO Y APLICADO (2026-09-21).** Los dos
> párrafos de arriba se escribieron como razonamiento sobre el código y sobre
> la semántica de `ir.rule` en Odoo 17, sin prueba empírica: el Odoo local no
> estaba disponible en la sesión de diseño. **Ya se probó, y el razonamiento
> era correcto en los dos puntos, DoS incluido.**
>
> Cómo: Odoo local en Docker, dos usuarios portal reales con su
> `ll.checklist.user`, una checklist y un link cada uno, el mismo script
> corrido **antes y después** del cambio, con `ll_webpage` actualizado en
> medio para que la `ir.rule` recargara.
>
> Con el `'|'` (OR):
>
> - El portal A creó **sin error** una fila de `ll.checklist.link.copy` con
>   `lc_left_id` propio y `lc_right_id` apuntando al link de B — el
>   `check_access_rule('create')` la dejó pasar, como preveía el ADR.
> - Acto seguido, B **no pudo** escribir `lv_episodes` en su propio link:
>   `AccessError`. El vector de denegación de servicio cruzado no era una
>   posibilidad teórica; ocurre.
>
> Con el AND (ya aplicado en `ll-odoo`,
> `ll_webpage/security/portal_access.xml`, rama `anitrack/rest-catalog-api`,
> **sin pushear** al remoto de Chano):
>
> - A recibe `AccessError` al intentar crear la fila cruzada.
> - B vuelve a escribir `lv_episodes` en su link sin problema.
> - El admin conserva lectura y borrado sobre `link.copy` — la regresión que
>   ADR-014 obliga a mirar cada vez que se toca una regla, sin novedad.
> - Y lo que había que comprobar para no cambiar un agujero de seguridad por
>   una feature rota: las **copias legítimas** (ambos lados del mismo dueño,
>   que es exactamente lo que creará `syncWithLinkId` en B6) se crean y son
>   visibles con el ORM del propio usuario. El AND no pierde ninguna fila real.
>
> Efecto sobre la tarea B6: la regla se aplicó primero y sus CA (b), (c) y (d)
> quedaron cubiertas a nivel ORM ahí mismo; el endpoint vino después y **B6
> está completa**, con 8 de 8 escenarios verificados contra el Odoo local
> (doc 15 §6.3). Entre ellos, el `404` por `syncWithLinkId` de otro usuario:
> la validación con el ORM del usuario que esta decisión exige como defensa en
> profundidad (ver **Decisión**) está implementada y probada, no solo prevista.
> El otro supuesto inferido en la misma sesión (`Link.unlink()`) corrió peor
> suerte y quedó anotado en doc 15 §2.2: no se refuta ni se confirma entero,
> el `MissingError` existe pero solo aparece si el recordset trae el
> franchise-link padre y sus hijos juntos. Nada de eso toca a este ADR, pero
> sí deja una advertencia que le aplica: la primera prueba de ese supuesto
> cubrió un solo escenario, no vio el error y estuvo a punto de cerrarlo en
> falso. Cuando esta regla se re-verifique (por ejemplo si aparece otro modelo
> con copias en Sprint 4), vale la pena enumerar **qué** escenarios se
> probaron, como hace la lista de arriba, y no solo el veredicto.

**Alternativas consideradas.**

1. Dejar el OR y confiar en la validación del controlador. Descartada: el
   modelo de seguridad del proyecto (ADR-014) eligió a propósito que el
   aislamiento lo haga el ORM y no la memoria de quien escribe cada endpoint.
   Dejar la única defensa en el controlador repite el error que ADR-014
   descartó.
2. Volver a la regla original (solo `lc_left_id`). Descartada: reintroduce el
   falso-negativo de `isSynced` que B4 arregló, y sigue permitiendo crear la
   fila cruzada.
3. **[Elegida]** Cambiar el `'|'` por el AND implícito: la fila es accesible
   solo si **los dos** lados pertenecen al usuario. Las filas legítimas
   siempre lo cumplen (una copia sincronizada vive entre dos listas del mismo
   usuario), así que el falso-negativo de lectura queda arreglado igual; y una
   fila cruzada pasa a ser, a la vez, **increable e invisible**.

**Decisión.** Opción 3, más la validación en el controlador como defensa en
profundidad: `POST /me/links` resuelve `syncWithLinkId` con el ORM del usuario
(la `ir.rule` de `ll.checklist.link` lo convierte en un `404` si es ajeno)
**antes** de crear ninguna fila de copia. La regla sigue con
`groups=[base.group_portal]` y `global="False"`, por el mismo motivo de
ADR-014 (una regla global le quitó el `unlink` al admin en el spike original).

**Consecuencias.** Positiva: desaparece el vector de denegación de servicio
cruzado y la fila cruzada deja de poder crearse; el aislamiento sigue siendo
responsabilidad del ORM. Negativa: una copia cruzada creada desde el backoffice
por un admin queda invisible para los usuarios portal involucrados, y su
`isSynced` daría `false` — se acepta, porque esa fila no debería existir y
crearla es una acción deliberada de administración. Segunda consecuencia: hay
que probar explícitamente, con **dos** usuarios portal, que la víctima
conserva la escritura sobre su link después de un intento cruzado; es CA de B6
y no se puede dar por cerrada la tarea sin ella — **hecho el 2026-09-21**, ver
el estado de verificación de arriba. Tercera consecuencia, que la prueba
agregó: el AND es también la última línea de defensa si el controlador de B6
se escribe mal, así que el orden en que se hicieron las cosas (regla primero,
endpoint después) es el correcto y conviene mantenerlo si aparece otra regla
de aislamiento en Sprint 4.

---

## ADR-021 — El optimistic de progreso aplica un **delta** al agregado del padre; el frontend nunca recalcula la agregación

**Contexto.** ADR-018 fijó que `aggregatedProgress` llega **pre-calculado** del
backend como dato estructurado, y que el frontend solo lo formatea
(`progress.ts`). El Sprint 3b introduce la primera mutación que lo mueve: subir
o bajar episodios de un version-link (`PATCH /me/links/:id`, tarea 3.7) cambia
el `watched` del grupo correspondiente del franchise-link padre.

Durante la ventana optimista (entre el click y la respuesta) no hay valor del
servidor que usar, y el contrato devuelve el `ListEntry` del link **patcheado**,
no el del padre. Si el frontend no hace nada, la barra del hijo se mueve al
instante y el `[S1 03/12]` del encabezado del grupo queda congelado hasta que
llegue el refetch — visiblemente roto justo en la interacción central del
producto.

**Alternativas consideradas.**

1. No tocar el agregado en `onMutate` y esperar la reconciliación. Descartada
   por lo de arriba: es la interacción que se demuestra.
2. Reimplementar la agregación en TypeScript y recalcular el grupo entero.
   Descartada: sería una segunda implementación de `compute_show_name`,
   incluyendo sus dos reglas sutiles (si **alguna** versión del grupo tiene
   total desconocido, el total del grupo entero pasa a desconocido; los grupos
   se ordenan por el `lv_record_order` **mínimo**). Es exactamente el drift que
   ADR-018 evita, y el precedente del proyecto es que ese tipo de duplicación
   se paga.
3. **[Elegida]** Aplicar el único cambio que esta mutación puede producir en
   el agregado: `watched += delta` en el grupo cuya `abbreviation` coincide con
   la del hijo tocado.

**Decisión.** Opción 3, con su justificación explícita: `total` sale de
`version_episodes` (catálogo, no lo toca esta mutación) y el orden de los
grupos sale de `lv_record_order` (tampoco), así que el delta es
**demostrablemente equivalente** al resultado del backend para *esta*
mutación — no es una aproximación, y no reimplementa nada. Vive en una función
pura, `patchEntryProgress` (`src/features/lists/utils/entryTree.ts`), que es lo
que se testea. `onSettled` invalida siempre, en éxito y en error, igual que
`useUpdateChecklist`.

Regla asociada, para que esto no se estire: una mutación que **sí** pueda
cambiar `total` o el orden de los grupos (mover un link entre grupos, cambiar
su abreviación, borrar un hijo) **no lleva optimistic sobre el agregado** —
invalida y espera.

Se fija además el fan-out de invalidación de esta mutación, porque con copias
sincronizadas deja de ser obvio: invalida `entries(checklistId)` y, **solo si
`entry.version.isSynced`**, el prefijo entero `['lists']` — el backend propaga
`lv_episodes` a copias que viven en otras carpetas del usuario y el contrato no
expone sus ids. **No** invalida `tree()` (el `linkCount` no cambia al mover
episodios) ni `libraryIndex()` (el conjunto de versiones vinculadas tampoco).

**Consecuencias.** Positiva: el encabezado del grupo se mueve en el mismo frame
que la barra del hijo, sin duplicar la lógica de agregación y sin ampliar el
contrato. Negativa: el frontend queda con **una** regla del backend codificada
(cuál es el grupo afectado: el de la misma `abbreviation`), que hay que revisar
si alguna vez cambia el criterio de agrupación de `compute_show_name`; queda
cubierta por el checkpoint de contrato del sprint. Segunda consecuencia: si
`isSynced` es `true`, una pulsación del stepper invalida todas las queries de
listas activas — aceptable porque el caso es raro y el refetch es liviano; la
salida si alguna vez pesa es exponer los ids de las copias en el contrato, y
queda anotada como tal.

---

## ADR-022 — Los contadores derivados del seed de MSW se calculan, no se escriben a mano

**Contexto.** Durante el Sprint 3a aparecieron **cinco** handlers de MSW que
mentían y hacían pasar tests en falso (bitácora doc 13, "Patrón recurrente del
sprint"). Al diseñar el 3b aparecieron tres más: `POST /me/links` no inserta el
entry ni respeta `checklistId`, `PATCH /me/links/:id` devuelve el eco del body
en vez de un `ListEntry`, y `DELETE /me/links/:id` no borra nada. Y hay una
categoría relacionada: `linkCount` en `mocks/seed/lists.ts` y las `stats` de
`profilesByUser` son **constantes escritas a mano**, sin relación causal con
`entriesByChecklist`.

Mientras la app solo leía, una constante desactualizada era cosmética. Con las
mutaciones del 3b deja de serlo: la CA de 3.9 es literalmente "se actualiza al
agregar/quitar", y un contador que nunca cambia la vuelve inverificable.

**Alternativas consideradas.**

1. Seguir a mano y actualizar las constantes cuando haga falta. Descartada: es
   el statu quo, y es el que produjo ocho falsos verdes.
2. Que el handler de la mutación actualice el contador junto con el dato
   (`linkCount++` al crear). Descartada a medias: funciona, pero deja dos
   fuentes de verdad para el mismo hecho y falla en cuanto una operación
   cascadea (borrar una carpeta con sub-carpetas y links).
3. **[Elegida]** Los contadores y agregados del mock se **derivan** de los
   datos que los producen, con funciones puras, cada vez que un handler los
   emite: `linkCount` desde `entriesByChecklist`, las `stats` del perfil desde
   los entries de las listas publicadas, `libraryIndex` desde los entries.

**Decisión.** Opción 3, en `src/mocks/derive/lists.ts`, y la regla general
que la acompaña: **un handler de mutación de MSW tiene que mantener los
invariantes del modelo real, no solo devolver una forma plausible**; y cada
mutación nueva necesita al menos un test que **fuerce al mock a trabajar**
(crear anidado, agrupar bajo franquicia, propagar a una copia sincronizada,
borrar el padre huérfano), no un test de "la mutación se llamó".

**Consecuencias.** Positiva: desaparece la clase entera de falso verde que
viene costando tiempo desde el Sprint 3a, y las CA de 3.9/3.10 pasan a ser
verificables. Negativa —y hay que decirla— esto convierte al mock en una
**segunda implementación de reglas de negocio del backend**, que es justo lo
que ADR-018 evita en el código de producción. La diferencia es que MSW ya es
una implementación completa del contrato por definición (ADR-001): la elección
real no es "una o dos implementaciones" sino "la segunda es fiel o mentirosa".
El drift entre ambas se mitiga con la misma herramienta que en el 3a, el
checkpoint de contrato al cierre del sprint, que ahora incluye explícitamente
la paridad de estos invariantes.
