# 08 — Preguntas para el Dev de Backend (Odoo)

> Para enviar tal cual (o adaptado) al dev de `ll-odoo`. Las respuestas se
> anotan acá mismo. Contexto: voy a construir el frontend en React como SPA
> separada; ya analicé la rama `checklist_base` y redacté una propuesta de
> contrato API (doc 04 — te lo paso junto con esto).

## Transporte y API

1. **¿Cómo preferís exponer la API para la SPA?**
   a) Controladores custom (`http.route(type="json"` o `type="http"` + JSON)) — es lo que propone el doc 04.
   b) JSON-RPC nativo de Odoo (`/web/dataset/call_kw`).
   c) Mixto.
   → Respuesta: ___
   *Nota: si elegís (b), del lado frontend lo adapto, pero necesito igualmente
   endpoints públicos para catálogo sin sesión, y expones modelos internos
   (nombres de campos, ACLs por modelo) — (a) da una superficie más controlada.*

   - 1.1. ¿Versionamos la URL desde el día 1 (`/api/v1/...`)? Así un cambio de
     contrato futuro no rompe clientes viejos sin coordinar.
     → Respuesta: ___
   - 1.2. ¿Formato de error estándar? Propongo `{ "error": { "code", "message" } }`
     con HTTP status coherente (400/401/403/404/422/500), igual en todos los
     endpoints — lo necesito para un interceptor único de Axios.
     → Respuesta: ___
   - 1.3. ¿Hay (o va a haber) rate limiting / throttling en los controladores
     custom? Si lo agregás después, avisame el código de respuesta (429) para
     manejarlo en el frontend.
     → Respuesta: ___

2. **¿Te sirve el contrato del doc 04 como spec?** ¿Qué cambiarías? La lógica ya
   existe casi toda (ej. `wizard.link.action_create_link`, `compute_show_name`);
   es principalmente serializarla.
   → Respuesta: ___

   - 2.1. Paginación: propongo `limit`/`offset` (o `page`/`page_size`) +
     `total_count` en la respuesta de catálogo/búsqueda. ¿Coincide con cómo ya
     paginás en otros lados de `ll-odoo`, o preferís cursor-based?
     → Respuesta: ___
   - 2.2. Campos computados como `compute_show_name`: ¿se recalculan en cada
     request o están `store=True`? Me importa para saber si un catálogo grande
     va a tener costo de cómputo por request.
     → Respuesta: ___
   - 2.3. ¿Qué devolvemos ante un ID inexistente o sin permiso (404 genérico
     para no filtrar existencia, o 403 explícito)? Definilo una vez para no
     tener criterios distintos por endpoint.
     → Respuesta: ___

## Deploy, hosting y proxy

3. **¿Dónde está/estará desplegado Odoo?**
   - 3.1. **Self-hosted (VPS/servidor propio donde vos administrás nginx/Caddy)**
     o **Odoo.sh** (u otro hosting gestionado por Odoo)? Esto es lo que más me
     importa de toda esta sección — ver pregunta 4.
     → Respuesta: ___
   - 3.2. URL de producción y, si existe, de staging. ¿Puedo apuntar un entorno
     de desarrollo (Vite dev server) contra el staging mientras no haya
     endpoints propios listos?
     → Respuesta: ___
   - 3.3. ¿Quién administra el dominio y el DNS? (sé que el dominio lo vas a
     comprar vos — pregunto por si el hosting elegido impone restricciones
     sobre cómo se enruta ese dominio, independientemente de quién sea el dueño).
     → Respuesta: ___
   - 3.4. ¿Hay un proceso de deploy/CI ya armado para `ll-odoo`, o lo armamos
     juntos cuando lleguemos a esa etapa?
     → Respuesta: ___

4. **¿Podemos servir frontend y API bajo el mismo origen** (mismo dominio,
   mismo esquema, sin subdominio separado)? Es la opción que más simplifica
   todo: cookie de sesión sin CORS, sin `SameSite=None`, un solo certificado.
   → Respuesta: ___

   - 4.1. **Si es self-hosted**: ¿podés agregar un `location /` en tu nginx que
     sirva el build estático de la SPA (`dist/`), dejando `/api`, `/web/image`,
     `/web/session` etc. yendo a Odoo como ya está? Te puedo pasar el bloque de
     config hecho si te sirve.
     → Respuesta: ___
   - 4.2. **Si es Odoo.sh**: sé que soporta dominios custom, pero entiendo que
     Odoo.sh controla el proxy de ese dominio y no permite meter una app
     estática propia delante en `/`. Si es así, ¿confirmás que no hay forma de
     hacer same-origin y vamos directo a la opción CORS (mi frontend en
     Vercel/Netlify + tus controladores con `Access-Control-Allow-Origin` +
     `Access-Control-Allow-Credentials: true`)?
     → Respuesta: ___
   - 4.3. Si terminamos en CORS (plan B): ¿el mecanismo de `cors` que ya existe
     en los controladores custom de Odoo permite lista blanca de orígenes (no
     `*`) + credentials? Necesito confirmarlo porque con cookies no se puede
     usar `Access-Control-Allow-Origin: *`.
     → Respuesta: ___
   - 4.4. Si hay same-origin por proxy: Odoo usa longpolling/bus (típicamente
     puerto 8072) para tiempo real. ¿Ya está ruteado en tu nginx actual, o es
     algo a sumar cuando integremos notificaciones (si las llegamos a necesitar)?
     → Respuesta: ___

5. **Sesiones**: ¿OK autenticar con la sesión estándar de Odoo (cookie
   `session_id`)? ¿Algún problema con la duración/renovación de sesión para una
   SPA de uso prolongado?
   → Respuesta: ___

   - 5.1. ¿Cuál es el `session_expiration` configurado (o el default de Odoo)?
     Si es corto, necesito manejar un 401 y re-login sin perder el estado de
     la SPA (ya lo contemplo con un interceptor, pero quiero saber el número).
     → Respuesta: ___
   - 5.2. ¿Multi-sesión/multi-dispositivo está permitido (mismo usuario logueado
     en el celu y la compu a la vez), o Odoo invalida la sesión anterior?
     → Respuesta: ___
   - 5.3. CSRF: los controladores `type="http"` de Odoo validan token CSRF por
     default. Para llamadas desde la SPA (fetch/Axios, no un `<form>`), ¿cómo
     lo resolvemos — eximimos esos controladores de CSRF (como ya se hace para
     JSON-RPC), o exponemos el token para que lo mande el frontend en un header?
     → Respuesta: ___

## Auth

6. **OAuth Twitch**: ¿está operativo? ¿El flujo soporta `redirect` de vuelta a
   una URL de la SPA tras el login? ¿Solo Twitch o habrá más proveedores?
   → Respuesta: ___

   - 6.1. ¿El `redirect_uri` de Twitch está en whitelist fija en la app de
     Twitch, o es configurable por entorno? Necesito una URL de callback
     distinta en dev/staging/prod.
     → Respuesta: ___
   - 6.2. ¿Qué pasa si el usuario cancela el login en Twitch o Twitch devuelve
     error? ¿Odoo redirige con algún query param de error que pueda leer la SPA
     (`?error=access_denied`), o hay que inferirlo?
     → Respuesta: ___

7. **Imágenes**: `/web/image?model=ll.checklist.image&...` — ¿es accesible sin
   sesión para contenido `published`? (¿ACL `public` en los modelos de imagen?)
   Si no, ¿preferís exponer las imágenes por un controller público propio?
   → Respuesta: ___

   - 7.1. ¿Ya existen distintos tamaños/thumbnails generados (para no bajar la
     imagen full en el grid de catálogo), o los recorto yo del lado frontend?
     → Respuesta: ___
   - 7.2. ¿Las URLs de imagen son estables en el tiempo (sirven para
     `<meta property="og:image">` al compartir un perfil/franquicia), o
     rotan/expiran?
     → Respuesta: ___
   - 7.3. ¿Hay headers de cache (`Cache-Control`/`ETag`) pensados para estas
     rutas, o lo definimos ahora?
     → Respuesta: ___

8. **Usuarios sin OAuth**: ¿va a existir registro con email/contraseña
   (signup)? ¿O el registro es solo vía Twitch? Esto define si hago página de
   registro real o solo login social.
   → Respuesta: ___

   - 8.1. Si hay signup propio: ¿hay verificación de email y recuperación de
     contraseña ya resueltas en Odoo estándar, o hay que construirlas?
     → Respuesta: ___
   - 8.2. ¿Qué pasa si alguien se registra con email y después loguea con
     Twitch usando el mismo mail (o viceversa) — se linkean las cuentas o son
     usuarios distintos?
     → Respuesta: ___

## Modelo de datos

9. **Confirmación de semántica** (lo que deduje del código — decime si algo está mal):
   - `version_episodes = 0` ⇒ total desconocido/en emisión.
   - El usuario NO tiene estados fijos (watching/completed); sus checklists son
     libres y el frontend sugerirá crear listas tipo MAL. ¿Es la visión del producto?
   - `checklist_shared` está deshabilitado a nivel producto por ahora (commit
     `26209c9`), me apoyo solo en `checklist_published` para perfiles públicos.
   → Respuesta: ___

   - 9.1. Los datos de catálogo (Franchise/Content/Version) — ¿los cargás vos
     manualmente, hay un scraper/importador, o lo carga cualquier usuario? Me
     importa para saber si el catálogo es "curado" (confío en la data) o
     puede tener entradas duplicadas/sucias que la UI deba tolerar.
     → Respuesta: ___
   - 9.2. Un `ll.checklist.link` (progreso) — ¿pertenece siempre a un único
     usuario, o hay algún escenario de checklist colaborativo/compartido más
     allá del `published` de solo lectura?
     → Respuesta: ___

10. **Extensión propuesta (barata) al modelo `ll.checklist.link`** para features
    clásicos de trackers — ¿la ves viable en el plazo?
    - `link_rating` (Integer 1–10, opcional)
    - `link_started_date` / `link_finished_date` (Date, opcionales)
    - (para notas reutilizo `link_description`, ya existe)
    → Respuesta: ___

    - 10.1. Si el plazo no da para migrarlo al backend antes de v1, ¿tenés
      objeción a que lo guarde temporalmente solo en el frontend (localStorage)
      como demo, dejando claro que no persiste entre dispositivos, y lo
      migramos cuando el modelo lo soporte?
      → Respuesta: ___

11. **Manga/lectura**: ¿está en el roadmap agregar un `content_type` de lectura
    (capítulos en vez de episodios)? No lo necesito para v1, pero afecta cómo
    nombro cosas en la UI ("episodes" vs "progress").
    → Respuesta: ___

12. **Búsqueda**: para `GET /search` propongo buscar por `ilike` sobre
    `ll.checklist.db.name`. ¿OK? ¿Índices/perf en mente para catálogos grandes?
    → Respuesta: ___

    - 12.1. ¿Orden de resultados por relevancia simple (posición del match) o
      alcanza con orden alfabético/por popularidad? No quiero pedir full-text
      search (`pg_trgm`/`tsvector`) si no hace falta para el volumen esperado.
      → Respuesta: ___
    - 12.2. ¿Buscamos solo por nombre principal o también por sinónimos/nombres
      alternativos de la franquicia (si el modelo los tiene)?
      → Respuesta: ___
    - 12.3. Orden de magnitud esperado del catálogo (cientos, miles,
      decenas de miles de `Franchise`/`Content`)? Define si `ilike` simple
      alcanza o conviene un índice desde ya.
      → Respuesta: ___

## Proceso

13. **¿Congelamos el contrato v1** una vez respondido esto? Cambios de modelo
    posteriores → versionamos endpoints o coordinamos antes de mergear.
    → Respuesta: ___

    - 13.1. ¿Dónde llevamos el registro de cambios de contrato — un
      `CHANGELOG` en `ll-odoo`, en este repo de docs, o coordinación ad-hoc por
      chat? Prefiero dejarlo escrito en algún lado versionado.
      → Respuesta: ___

14. **Seed/datos de prueba**: ¿podés cargar 5–10 franquicias reales en staging
    para integración? (Yo te paso mi seed de MSW como referencia si sirve.)
    → Respuesta: ___

    - 14.1. ¿Alguna franquicia de prueba en particular que ya tengas cargada en
      tu entorno de desarrollo, para no duplicar el trabajo de carga?
      → Respuesta: ___
