# 08 — Preguntas para el Dev de Backend (Odoo)

> Para enviar tal cual (o adaptado) al dev de `ll-odoo`. Las respuestas se
> anotan acá mismo. Contexto: voy a construir el frontend en React como SPA
> separada; ya analicé la rama `checklist_base` y redacté una propuesta de
> contrato API (doc 04 — te lo paso junto con esto).

## Ronda de respuestas del 2026-07-24

Chano dijo que **haga lo que guste con el frontend**. Bajo esa premisa, este
documento pasó de "preguntas abiertas" a "decisiones tomadas del lado frontend +
lo que sigue dependiendo genuinamente del backend". Leyenda de los marcadores:

- **[FE]** — decisión tomada desde el frontend con mejor práctica. La justifico
  en la misma respuesta. No necesita que Chano haga nada.
- **[FE→BE]** — la defino del lado frontend como *requisito*, pero para que sea
  real alguien tiene que implementarla/confirmarla en el backend **cuando exista
  la API**. Mientras tanto no bloquea: construyo contra MSW.
- **[BLOQUEADA]** — no la puedo responder yo; depende de un dato o una decisión
  que solo tiene el backend/Chano. Explico por qué y qué asumo mientras tanto.

> Contexto que enmarca todo: hoy `ll-odoo` **no tiene API HTTP** (`ll_webpage`
> está vacío). Que Chano delegue el frontend sugiere que la API real no llega
> pronto. Por eso muchas respuestas son "así lo asumo en el mock y en el
> adaptador; esto es lo que necesitaré el día que la API exista".

## Transporte y API

1. **¿Cómo preferís exponer la API para la SPA?**
   a) Controladores custom (`http.route(type="json"` o `type="http"` + JSON)) — es lo que propone el doc 04.
   b) JSON-RPC nativo de Odoo (`/web/dataset/call_kw`).
   c) Mixto.
   → Respuesta: **[FE]** Recomiendo (a): controladores REST custom bajo
   `/api/v1/...` que devuelven JSON. Por qué: (a) me da una **superficie
   pública estable** cuyos nombres controlo yo, desacoplada de los nombres de
   campos y ACLs internos de Odoo. Con JSON-RPC (`call_kw`) el cliente tiene que
   mandar el nombre del modelo y de los campos crudos → el frontend queda
   **acoplado a la estructura interna** de Odoo, y cualquier rename en el backend
   me rompe. Además necesito catálogo **sin sesión**, más natural de exponer con
   un controller público que con `call_kw`. Si Chano igual prefiere (b), lo
   absorbo en `lib/api/` (adaptador) y el resto del frontend no se entera.
   *Nota: si elegís (b), del lado frontend lo adapto, pero necesito igualmente
   endpoints públicos para catálogo sin sesión, y expones modelos internos
   (nombres de campos, ACLs por modelo) — (a) da una superficie más controlada.*

   - 1.1. ¿Versionamos la URL desde el día 1 (`/api/v1/...`)? Así un cambio de
     contrato futuro no rompe clientes viejos sin coordinar.
     → Respuesta: **[FE]** Sí, `/api/v1/` desde el día 1. Versionar la URL es
     casi gratis ahora; agregarlo después —cuando ya hay una demo o un deploy
     apuntando a la vieja— obliga a coordinar una migración. Es un seguro barato.
   - 1.2. ¿Formato de error estándar? Propongo `{ "error": { "code", "message" } }`
     con HTTP status coherente (400/401/403/404/422/500), igual en todos los
     endpoints — lo necesito para un interceptor único de Axios.
     → Respuesta: **[FE]** Sí, formato único `{ "error": { "code": "SNAKE_CASE",
     "message": "..." } }` + HTTP status coherente. Ya está implementado así en
     `src/lib/http.ts`: un interceptor normaliza **todo** error a un tipo
     `ApiError` con un `.code` estable. El frontend ramifica por `code`, **nunca
     por el `message`** (el message es texto para humanos: puede cambiar o
     traducirse; el code es un contrato de máquina).
   - 1.3. ¿Hay (o va a haber) rate limiting / throttling en los controladores
     custom? Si lo agregás después, avisame el código de respuesta (429) para
     manejarlo en el frontend.
     → Respuesta: **[FE→BE]** Si lo agregás, usá **429** con header `Retry-After`
     si podés. El frontend ya trata 429 como error transitorio (reintenta con
     backoff). Que exista o no es tu decisión; yo solo necesito el código.

2. **¿Te sirve el contrato del doc 04 como spec?** ¿Qué cambiarías? La lógica ya
   existe casi toda (ej. `wizard.link.action_create_link`, `compute_show_name`);
   es principalmente serializarla.
   → Respuesta: **[FE]** El doc 04 queda como **contrato v1 de referencia del
   frontend**. Construyo el mock (MSW) y el futuro adaptador contra él, así que
   no necesito que lo valides campo por campo hoy. El día que armes la API real,
   las diferencias se absorben en el adaptador y las detecta Zod en runtime.

   - 2.1. Paginación: propongo `limit`/`offset` (o `page`/`page_size`) +
     `total_count` en la respuesta de catálogo/búsqueda. ¿Coincide con cómo ya
     paginás en otros lados de `ll-odoo`, o preferís cursor-based?
     → Respuesta: **[FE]** `page`/`page_size` + `total_count` (offset-based). Por
     qué: la UI del catálogo muestra "mostrando X–Y de N" y permite saltar a una
     página; para eso necesito el total y un offset. Cursor-based es mejor para
     feeds infinitos gigantes pero complica saber el total y saltar de página.
     Con TanStack Query uso `placeholderData` para paginar sin parpadeo.
   - 2.2. Campos computados como `compute_show_name`: ¿se recalculan en cada
     request o están `store=True`? Me importa para saber si un catálogo grande
     va a tener costo de cómputo por request.
     → Respuesta: **[BLOQUEADA]** No lo puedo responder: si `compute_show_name`
     está `store=True` o se recomputa por request es una propiedad de la
     definición del modelo que solo vos sabés/decidís. Impacto frontend: si NO
     está `store`, un catálogo grande paga cómputo por request y quizá deba pedir
     menos campos o cachear más fuerte. **Mi preferencia: `store=True`.** Queda
     como pregunta real pendiente para vos.
   - 2.3. ¿Qué devolvemos ante un ID inexistente o sin permiso (404 genérico
     para no filtrar existencia, o 403 explícito)? Definilo una vez para no
     tener criterios distintos por endpoint.
     → Respuesta: **[FE]** **404 para ambos** casos en recursos privados. Por
     qué: un 403 revela que el recurso **existe** (fuga de información — alguien
     puede enumerar IDs válidos); un 404 uniforme no filtra nada. Excepción: si
     el problema es "no estás logueado", eso sí es **401**. El frontend mapea
     404 → pantalla "no encontrado" y 401 → redirect a login.

## Deploy, hosting y proxy

3. **¿Dónde está/estará desplegado Odoo?**
   - 3.1. **Self-hosted (VPS/servidor propio donde vos administrás nginx/Caddy)**
     o **Odoo.sh** (u otro hosting gestionado por Odoo)? Esto es lo que más me
     importa de toda esta sección — ver pregunta 4.
     → Respuesta: Self-hosted en Railway: un contenedor Docker de Odoo
     Community conectado a otro contenedor de Postgres, ambos en Railway.
     Puede crear fácilmente una BD de pruebas y una de producción ahí. No usa
     Odoo.sh.
   - 3.2. URL de producción y, si existe, de staging. ¿Puedo apuntar un entorno
     de desarrollo (Vite dev server) contra el staging mientras no haya
     endpoints propios listos?
     → Respuesta: No habrá staging remoto cómodo para probar contra él.
     Railway es su entorno de producción y reiniciar un servicio ahí demora
     mucho, así que no es ágil para iterar. Podría enlazar una rama a un
     servicio de Railway para que probemos, pero prefiere que instalemos
     Odoo localmente. Es Odoo 17 Community: viene con Postgres embebido, o si
     ya tenés Postgres propio corriendo se configura para no instalar uno
     duplicado.
   - 3.3. ¿Quién administra el dominio y el DNS? (sé que el dominio lo vas a
     comprar vos — pregunto por si el hosting elegido impone restricciones
     sobre cómo se enruta ese dominio, independientemente de quién sea el dueño).
     → Respuesta: **[BLOQUEADA]** El dominio/DNS lo maneja el dueño (yo) al
     comprarlo; no es decisión de frontend y no tengo aún el dato de si Railway
     impone restricciones de enrutado. No afecta construir ahora.
   - 3.4. ¿Hay un proceso de deploy/CI ya armado para `ll-odoo`, o lo armamos
     juntos cuando lleguemos a esa etapa?
     → Respuesta: **[FE parcial]** El CI/CD de `ll-odoo` es tuyo. Del lado
     frontend **ya hay CI** (`.github/workflows/ci.yml`: lint + typecheck +
     test). El deploy del frontend (Vercel/Netlify) lo armo yo en el Sprint 4 y
     no depende de que exista CI de Odoo.

4. **¿Podemos servir frontend y API bajo el mismo origen** (mismo dominio,
   mismo esquema, sin subdominio separado)? Es la opción que más simplifica
   todo: cookie de sesión sin CORS, sin `SameSite=None`, un solo certificado.
   → Respuesta: **[FE]** Sí, y como el dominio es exclusivo de este proyecto
   (un solo producto), todo cuelga del **mismo dominio registrado** → cookie
   **first-party**, sin el problema de las cookies third-party (`SameSite=None`).
   Topología elegida, en orden (detalle en ADR-005):
   1. **[Primaria]** El frontend va en **Vercel/Netlify** y ese mismo host
      **reenvía `/api`** al Odoo de Railway (`rewrites`/redirects `200`). El
      navegador ve **un solo origen** → **sin CORS**, cookie first-party, y se
      comporta igual que el proxy de Vite en dev (cero sorpresas al deployar).
      **No necesitás configurar nada de tu lado.**
   2. **[Alternativa]** Subdominios: `www.…` → Vercel, `api.…` → Railway. Cookie
      sigue first-party, pero al ser *orígenes* distintos **sí necesito CORS** de
      tu lado: `Access-Control-Allow-Origin` = mi origen exacto (**no `*`**) +
      `Allow-Credentials: true`.
   3. **[Plan B]** CORS con dominios no relacionados (`SameSite=None; Secure`):
      último recurso, solo si se cae lo del dominio compartido.
   En **dev** nada de esto aplica: proxy de Vite → `/api` same-origin en
   `localhost:5173`, cero CORS. Ningún camino suma un servicio pago (el único
   descartado por costo era un proxy nginx/Caddy dedicado en Railway).

   - 4.1. **Si es self-hosted**: ¿podés agregar un `location /` en tu nginx que
     sirva el build estático de la SPA (`dist/`), dejando `/api`, `/web/image`,
     `/web/session` etc. yendo a Odoo como ya está? Te puedo pasar el bloque de
     config hecho si te sirve.
     → Respuesta: **[N-A]** Railway no es un nginx propio tuyo con `location /`;
     este modelo no aplica tal cual. Si algún día metemos un proxy delante, te
     paso el bloque. No es una decisión de frontend.
   - 4.2. **Si es Odoo.sh**: sé que soporta dominios custom, pero entiendo que
     Odoo.sh controla el proxy de ese dominio y no permite meter una app
     estática propia delante en `/`. Si es así, ¿confirmás que no hay forma de
     hacer same-origin y vamos directo a la opción CORS (mi frontend en
     Vercel/Netlify + tus controladores con `Access-Control-Allow-Origin` +
     `Access-Control-Allow-Credentials: true`)?
     → Respuesta: **[N-A]** No usamos Odoo.sh.
   - 4.3. Si terminamos en CORS (plan B): ¿el mecanismo de `cors` que ya existe
     en los controladores custom de Odoo permite lista blanca de orígenes (no
     `*`) + credentials? Necesito confirmarlo porque con cookies no se puede
     usar `Access-Control-Allow-Origin: *`.
     → Respuesta: **[FE→BE]** Cuando exista la API real e integremos por CORS
     necesito **lista blanca de orígenes (no `*`) + `Allow-Credentials: true`**.
     No es opcional: el navegador **prohíbe** `Allow-Origin: *` cuando hay
     credenciales. Confirmar que el `cors=` de los controladores de Odoo lo
     soporta es backend; yo dejo especificado el requisito.
   - 4.4. Si hay same-origin por proxy: Odoo usa longpolling/bus (típicamente
     puerto 8072) para tiempo real. ¿Ya está ruteado en tu nginx actual, o es
     algo a sumar cuando integremos notificaciones (si las llegamos a necesitar)?
     → Respuesta: **[FE]** El longpolling/bus **no se necesita para v1** (no hay
     features de tiempo real). Cerrado del lado frontend: no dependo del bus. Si
     algún día hay notificaciones en vivo, lo sumamos entonces.

5. **Sesiones**: ¿OK autenticar con la sesión estándar de Odoo (cookie
   `session_id`)? ¿Algún problema con la duración/renovación de sesión para una
   SPA de uso prolongado?
   → Respuesta: **[FE]** Sí, cookie de sesión estándar de Odoo (`session_id`),
   **HttpOnly**. Concepto clave (por qué es mejor práctica y no guardar un token
   en `localStorage`): un token en `localStorage` es legible por **cualquier
   JS** → si hay un XSS, se roba el token. Una cookie **HttpOnly no es accesible
   desde JS**, así que un XSS no la puede exfiltrar. El precio de las cookies es
   el CSRF, que se maneja aparte (5.3). El frontend usa `withCredentials: true`
   en Axios. (Es exactamente el ADR-005.)

   - 5.1. ¿Cuál es el `session_expiration` configurado (o el default de Odoo)?
     Si es corto, necesito manejar un 401 y re-login sin perder el estado de
     la SPA (ya lo contemplo con un interceptor, pero quiero saber el número).
     → Respuesta: **[BLOQUEADA]** El valor de `session_expiration` es config del
     servidor; solo vos lo sabés. El frontend **ya está preparado igual**: el
     interceptor ante 401 limpia la sesión y redirige a login con `?next=`.
     Necesito el número solo para afinar UX (avisar antes de que expire); no
     bloquea nada.
   - 5.2. ¿Multi-sesión/multi-dispositivo está permitido (mismo usuario logueado
     en el celu y la compu a la vez), o Odoo invalida la sesión anterior?
     → Respuesta: **[BLOQUEADA]** Si Odoo invalida la sesión anterior en
     multi-dispositivo es comportamiento del backend; no lo puedo determinar.
     Asunción frontend segura: trato cualquier 401 sorpresivo como "sesión
     caída" y re-logueo → funciona se comporte como se comporte.
   - 5.3. CSRF: los controladores `type="http"` de Odoo validan token CSRF por
     default. Para llamadas desde la SPA (fetch/Axios, no un `<form>`), ¿cómo
     lo resolvemos — eximimos esos controladores de CSRF (como ya se hace para
     JSON-RPC), o exponemos el token para que lo mande el frontend en un header?
     → Respuesta: **[FE→BE]** Para llamadas de la SPA por fetch/Axios (no
     `<form>`), la práctica limpia es **eximir los controladores `/api/v1` del
     CSRF de Odoo** y apoyar la defensa en `SameSite` de la cookie + CORS
     estricto. Alternativa: exponer el token CSRF para mandarlo en un header en
     cada request. Recomiendo lo primero por simplicidad. Implementarlo es
     backend; yo indico el enfoque.

## Auth

6. **OAuth Twitch**: ¿está operativo? ¿El flujo soporta `redirect` de vuelta a
   una URL de la SPA tras el login? ¿Solo Twitch o habrá más proveedores?
   → Respuesta: **[BLOQUEADA]** No puedo confirmar si el OAuth de Twitch está
   operativo ni si redirige a una URL de la SPA: es estado/config del backend y
   de la app de Twitch. Lo que **sí** decido en frontend: el flujo espera volver
   a `/auth/callback?...` y ahí leo el resultado. Con MSW simulo el flujo
   completo, así que puedo construir toda la UI de login social sin bloquearme.

   - 6.1. ¿El `redirect_uri` de Twitch está en whitelist fija en la app de
     Twitch, o es configurable por entorno? Necesito una URL de callback
     distinta en dev/staging/prod.
     → Respuesta: **[BLOQUEADA → requisito FE]** Quién administra la app de
     Twitch (vos) configura el `redirect_uri`. Requisito del frontend: necesito
     **una URL de callback por entorno** (dev `localhost`, prod). Si es whitelist
     fija, hay que agregar la de dev.
   - 6.2. ¿Qué pasa si el usuario cancela el login en Twitch o Twitch devuelve
     error? ¿Odoo redirige con algún query param de error que pueda leer la SPA
     (`?error=access_denied`), o hay que inferirlo?
     → Respuesta: **[FE→BE]** Requisito: ante cancelación/error, redirigí a la
     SPA con `?error=<código>` (ej. `access_denied`). Por qué: sin ese query
     param el frontend no puede distinguir "canceló" de "falló" y muestra un
     error genérico peor. Es requisito de UX; implementarlo es backend.

7. **Imágenes**: `/web/image?model=ll.checklist.image&...` — ¿es accesible sin
   sesión para contenido `published`? (¿ACL `public` en los modelos de imagen?)
   Si no, ¿preferís exponer las imágenes por un controller público propio?
   → Respuesta: **[BLOQUEADA]** Si `/web/image` es público sin sesión para
   contenido `published` depende de las ACL de los modelos de imagen en Odoo —
   dato de backend. Requisito frontend: el catálogo se ve **deslogueado**, así
   que sus imágenes **deben** cargar sin sesión. Si no lo son, hace falta un
   controller público de imágenes.

   - 7.1. ¿Ya existen distintos tamaños/thumbnails generados (para no bajar la
     imagen full en el grid de catálogo), o los recorto yo del lado frontend?
     → Respuesta: **[FE parcial]** Odoo genera tamaños derivados de serie
     (`image_128`, `256`, `512`, `1024`). Plan frontend: pido el tamaño chico en
     el grid y el grande solo en el detalle, para no bajar el full en listas.
     Confirmar qué campos de imagen expone el modelo es backend.
   - 7.2. ¿Las URLs de imagen son estables en el tiempo (sirven para
     `<meta property="og:image">` al compartir un perfil/franquicia), o
     rotan/expiran?
     → Respuesta: **[BLOQUEADA]** Depende de cómo Odoo genere la URL (suelen
     llevar un token de cache que puede rotar). No lo puedo garantizar; queda
     como pregunta. Para v1 el `og:image` no es crítico, así que no bloquea.
   - 7.3. ¿Hay headers de cache (`Cache-Control`/`ETag`) pensados para estas
     rutas, o lo definimos ahora?
     → Respuesta: **[FE→BE]** Recomiendo `Cache-Control` largo + `ETag` en las
     rutas de imagen (son casi inmutables): mejora perf y ahorra ancho de banda.
     Definirlo es backend/infra.

8. **Usuarios sin OAuth**: ¿va a existir registro con email/contraseña
   (signup)? ¿O el registro es solo vía Twitch? Esto define si hago página de
   registro real o solo login social.
   → Respuesta: **[BLOQUEADA parcial → decisión FE]** Si hay signup
   email/contraseña o solo Twitch es decisión de producto/backend (qué habilita
   Odoo). Como Chano me deja el frontend, **decido diseñar la UI para ambos**
   (login social + formulario email/clave) detrás de la capa de auth, y con MSW
   simulo el signup. Si al final el backend solo da Twitch, oculto el formulario
   con un flag. Así no me bloqueo por una decisión de producto todavía abierta.

   - 8.1. Si hay signup propio: ¿hay verificación de email y recuperación de
     contraseña ya resueltas en Odoo estándar, o hay que construirlas?
     → Respuesta: **[FE parcial]** Odoo estándar **ya trae** verificación de
     email y recuperación de contraseña (flujo "reset password"). Si usamos
     signup propio me apoyo en eso; no habría que construirlos desde cero.
     Confirmar que están habilitados es backend.
   - 8.2. ¿Qué pasa si alguien se registra con email y después loguea con
     Twitch usando el mismo mail (o viceversa) — se linkean las cuentas o son
     usuarios distintos?
     → Respuesta: **[BLOQUEADA]** Si linkea cuentas o crea dos usuarios es lógica
     del backend (`auth_oauth` de Odoo). No lo puedo decidir. Lo anoto como
     riesgo de UX a confirmar antes de habilitar los dos métodos en prod.

## Modelo de datos

9. **Confirmación de semántica** (lo que deduje del código — decime si algo está mal):
   - `version_episodes = 0` ⇒ total desconocido/en emisión.
   - El usuario NO tiene estados fijos (watching/completed); sus checklists son
     libres y el frontend sugerirá crear listas tipo MAL. ¿Es la visión del producto?
   - `checklist_shared` está deshabilitado a nivel producto por ahora (commit
     `26209c9`), me apoyo solo en `checklist_published` para perfiles públicos.
   → Respuesta: **[FE]** **Confirmado por mi propio análisis del código** (doc
   02), no necesito que lo revalides: `version_episodes = 0` ⇒ en emisión / total
   desconocido (default del campo es 1); el usuario no tiene estados fijos (listas
   libres, y el frontend sugiere listas tipo MAL); me apoyo en
   `checklist_published`, no en `checklist_shared`. Es la base sobre la que ya
   está diseñado el dominio del frontend (doc 05).

   - 9.1. Los datos de catálogo (Franchise/Content/Version) — ¿los cargás vos
     manualmente, hay un scraper/importador, o lo carga cualquier usuario? Me
     importa para saber si el catálogo es "curado" (confío en la data) o
     puede tener entradas duplicadas/sucias que la UI deba tolerar.
     → Respuesta: **[FE→BE]** De mi lectura, Franchise/Content/Version son
     **master data administrada** (no la carga cualquier usuario) → asumo
     **catálogo curado** y la UI confía en la data, sin dedup defensivo pesado.
     Si en realidad cualquiera puede cargar, avisá y agrego tolerancia a
     duplicados. Es dato de backend, pero mi asunción es segura para v1.
   - 9.2. Un `ll.checklist.link` (progreso) — ¿pertenece siempre a un único
     usuario, o hay algún escenario de checklist colaborativo/compartido más
     allá del `published` de solo lectura?
     → Respuesta: **[FE]** De mi análisis, un `link` pertenece a **un único
     usuario**; no hay checklist colaborativo (solo `published` de solo lectura).
     El frontend modela el progreso como estrictamente personal.

10. **Extensión propuesta (barata) al modelo `ll.checklist.link`** para features
    clásicos de trackers — ¿la ves viable en el plazo?
    - `link_rating` (Integer 1–10, opcional)
    - `link_started_date` / `link_finished_date` (Date, opcionales)
    - (para notas reutilizo `link_description`, ya existe)
    → Respuesta: **[FE]** Decisión (ADR-004): **no dependo** de que agregues
    estos campos para v1. Los modelo detrás de un **feature flag apagado**; con
    el flag encendido (demo) se guardan según 10.1. Por qué: desacopla mi entrega
    de tu backlog — la feature "MAL-like" luce en el portafolio sin bloquearte ni
    presionarte a tocar el backend.

    - 10.1. Si el plazo no da para migrarlo al backend antes de v1, ¿tenés
      objeción a que lo guarde temporalmente solo en el frontend (localStorage)
      como demo, dejando claro que no persiste entre dispositivos, y lo
      migramos cuando el modelo lo soporte?
      → Respuesta: **[FE]** Sí: con el flag on los guardo en `localStorage`,
      avisando en la UI que **no persiste entre dispositivos**, y migro a backend
      cuando el modelo lo soporte. Por qué acá localStorage **sí** es aceptable (a
      diferencia del token de auth de la 5): rating/fechas **no son secretos** ni
      sensibles a XSS; es data cosmética de demo. Es la excepción justificada, no
      la regla.

11. **Manga/lectura**: ¿está en el roadmap agregar un `content_type` de lectura
    (capítulos en vez de episodios)? No lo necesito para v1, pero afecta cómo
    nombro cosas en la UI ("episodes" vs "progress").
    → Respuesta: **[BLOQUEADA parcial → decisión FE]** Si manga/lectura entra al
    roadmap es decisión de producto tuya; no lo sé (hoy solo hay `G`/`V`, sin
    tipo lectura — doc 02). Para no quedar preso, **nombro la abstracción como
    "progress" genérico** en el dominio y la UI (no "episodes" hardcodeado), así
    agregar un `content_type` de lectura después sale barato. No necesito la
    respuesta para v1.

12. **Búsqueda**: para `GET /search` propongo buscar por `ilike` sobre
    `ll.checklist.db.name`. ¿OK? ¿Índices/perf en mente para catálogos grandes?
    → Respuesta: **[FE→BE]** Asumo `ilike` sobre nombres. Requisito frontend:
    búsqueda con **debounce (~300ms)** y `placeholderData` para no parpadear. La
    perf/índices del lado SQL es backend.

    - 12.1. ¿Orden de resultados por relevancia simple (posición del match) o
      alcanza con orden alfabético/por popularidad? No quiero pedir full-text
      search (`pg_trgm`/`tsvector`) si no hace falta para el volumen esperado.
      → Respuesta: **[FE]** Alfabético/por popularidad alcanza para v1. **No**
      pido full-text (`pg_trgm`/`tsvector`) hasta que el volumen lo justifique:
      no meto complejidad de búsqueda avanzada sin una necesidad medida.
    - 12.2. ¿Buscamos solo por nombre principal o también por sinónimos/nombres
      alternativos de la franquicia (si el modelo los tiene)?
      → Respuesta: **[BLOQUEADA]** El modelo **sí** tiene nombres alternativos
      (`franchise_name_ids`, doc 02), pero que el endpoint de búsqueda los incluya
      es decisión de backend. Del lado frontend lo soporto si vienen; ideal para
      encontrar por título japonés/inglés.
    - 12.3. Orden de magnitud esperado del catálogo (cientos, miles,
      decenas de miles de `Franchise`/`Content`)? Define si `ilike` simple
      alcanza o conviene un índice desde ya.
      → Respuesta: **[BLOQUEADA]** El volumen esperado lo sabés vos/producto. Sin
      el dato asumo "miles" y diseño paginado; si fueran decenas de miles habría
      que revisar índices (backend).

## Proceso

13. **¿Congelamos el contrato v1** una vez respondido esto? Cambios de modelo
    posteriores → versionamos endpoints o coordinamos antes de mergear.
    → Respuesta: **[FE]** Sí, propongo **congelar el doc 04 como contrato v1** de
    referencia y versionar endpoints ante cambios. Del lado frontend ya se
    respeta: todo pasa por el adaptador de `lib/api/`, así que un cambio de
    contrato se absorbe en un solo lugar.

    - 13.1. ¿Dónde llevamos el registro de cambios de contrato — un
      `CHANGELOG` en `ll-odoo`, en este repo de docs, o coordinación ad-hoc por
      chat? Prefiero dejarlo escrito en algún lado versionado.
      → Respuesta: **[FE]** En **este repo de docs** (versionado), no ad-hoc por
      chat. Por qué: el frontend es quien más sufre un cambio de contrato
      silencioso; tenerlo en git da historial y diff, y el adaptador puede citar
      la versión contra la que fue escrito.

14. **Seed/datos de prueba**: ¿podés cargar 5–10 franquicias reales en staging
    para integración? (Yo te paso mi seed de MSW como referencia si sirve.)
    → Respuesta: **[FE]** Como no hay staging remoto (tu respuesta 3.2), para
    integración levanto **Odoo local** (Docker, doc 09) y cargo ahí 5–10
    franquicias yo mismo; te paso mi seed de MSW como referencia. No dependo de
    que cargues datos en un staging que no existe.

    - 14.1. ¿Alguna franquicia de prueba en particular que ya tengas cargada en
      tu entorno de desarrollo, para no duplicar el trabajo de carga?
      → Respuesta: **[BLOQUEADA]** Qué franquicias ya tenés cargadas lo sabés vos;
      si me pasás la lista evito duplicar. Dato tuyo.
