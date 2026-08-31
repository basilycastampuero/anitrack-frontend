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
- **[VERIFICADO 2026-08-27]** — lo que en la ronda anterior estaba
  `[BLOQUEADA]` se resolvió **leyendo el código real** de `ll-odoo` (rama
  `checklist_base`, commit `9ba6b0e`) o probándolo contra el Odoo local de
  Docker, sin necesidad de preguntarle a Chano. Cito archivo:línea. No borro
  la respuesta anterior: la dejo arriba, para que se vea qué se asumía antes
  de poder verificarlo.

> Contexto que enmarca todo: hoy `ll-odoo` **no tiene API HTTP** (`ll_webpage`
> está vacío). Que Chano delegue el frontend sugiere que la API real no llega
> pronto. Por eso muchas respuestas son "así lo asumo en el mock y en el
> adaptador; esto es lo que necesitaré el día que la API exista".

## Ronda de verificación contra el código del backend (2026-08-27)

Varias preguntas quedaron `[BLOQUEADA]` en la ronda anterior porque en ese
momento no se había leído el código fuente de `ll-odoo` a fondo para
responderlas — se asumió que hacía falta preguntarle a Chano. Al retomar el
trabajo, se aplicó un criterio distinto: **antes de preguntarle algo a Chano,
agotar lo que se puede verificar leyendo el código de `ll-odoo/` (rama
`checklist_base`, commit `9ba6b0e`, sin cambios desde el análisis original del
doc 02) y probando contra el Odoo local levantado con Docker**. Solo se le
pregunta a Chano lo que genuinamente no se puede observar de ninguna de esas
dos formas (config de infraestructura, credenciales, decisiones de producto
que no dejan rastro en el código).

Con ese criterio se revisaron todas las preguntas `[BLOQUEADA]`. El resultado:

- **2.2** (¿`compute_show_name` es `store=True`?) → se podía leer directo en
  el modelo. **Resuelta**, ya no es pregunta.
- **7** (¿`/web/image` es público para contenido `published`?) → se podía
  leer directo en las reglas de acceso (`ir.model.access`) y en los grupos
  definidos. **Resuelta, y con un alcance más grave que la pregunta
  original**: no es solo la imagen, es *todo* el catálogo. Pasa a ser un
  requisito `[FE→BE]` concreto, no una pregunta abierta.
- **1** y **5.3** (transporte REST/JSON-RPC y CSRF) → no se podían verificar
  leyendo código (son decisiones a tomar, no hechos a observar), pero sí se
  pudo verificar un hecho relevante que cambia el planteo: **no existe
  ninguna API HTTP propia hoy**, ni siquiera embrionaria. El plan deja de ser
  "preguntarle a Chano qué prefiere" y pasa a ser "escribir el controlador y
  mandárselo como PR concreto para que lo revise" (ver detalle en la pregunta
  1).
- **6** y **6.1** (OAuth Twitch) → se pudo verificar que el módulo `ll_oauth`
  no trae ningún proveedor de Twitch precargado en el código (se configura a
  mano en el admin de Odoo, con datos que viven solo en la base de esa
  instalación) — por lo tanto **no bloquea seguir construyendo**: se puede
  armar y probar el flujo completo con una app de Twitch de prueba propia
  contra el Odoo local. Sigue habiendo una parte de esta pregunta que de
  verdad depende de Chano (su app de producción), pero deja de frenar el
  desarrollo.
- El resto de las `[BLOQUEADA]` (dominio/DNS, `session_expiration`,
  multi-sesión, volumen del catálogo, nombres alternativos en la búsqueda,
  franquicias ya cargadas) se revisaron y **siguen siendo genuinamente
  bloqueadas**: son config de infraestructura, decisiones de producto o datos
  operativos que no dejan ningún rastro en el código fuente. No se tocaron.

Con esto, de las preguntas que quedaban `[BLOQUEADA]` en la ronda anterior,
**4 se resolvieron o dejaron de bloquear el desarrollo** (2.2, 7, 6, 6.1) y
**2 cambiaron de planteo sin resolverse** (1, 5.3, que ahora dependen de un PR
propio más que de una respuesta de Chano). El resto sigue abierto tal cual.

### Actualización (2026-08-27) — verificación empírica contra el Odoo local

Lo de arriba se verificó leyendo código. Después, se levantó el Odoo local
(`docker compose --profile backend up -d odoo db`; Odoo en `localhost:8069`,
DB `anitrack` en el contenedor `chambachambure-db-1`) y se consultó la base
viva por `psql`, lo que permitió **confirmar empíricamente** (no solo por
lectura de código) dos de los hallazgos anteriores y sumar dos datos nuevos:

- **OAuth Twitch (pregunta 6)**: la tabla `auth_oauth_provider` solo tiene los
  3 proveedores de fábrica de Odoo (`Odoo.com Accounts`, `Facebook Graph`,
  `Google OAuth2`) y ninguno es Twitch; `/web/login` solo renderiza el botón
  de Odoo.com. Esto **cierra la nota sin verificar** que había quedado sobre
  el recuerdo del usuario de haber visto andar el auth de Twitch — ver el
  detalle completo y la hipótesis (no confirmada) de a qué se debe ese
  recuerdo en la pregunta 6, más abajo.
- **ACL del catálogo (pregunta 7)**: la misma restricción que se leyó en
  `administrator.xml` (16 modelos, todos atados solo a
  `LL Checklist / Administrator`) se confirmó con una query contra
  `ir_model_access`/`ir_model`/`res_groups` en la base viva. Detalle completo
  en la pregunta 7, más abajo.
- **Estado de los datos del entorno local (dato nuevo, relevante para el
  spike 2.8 del plan de trabajo)**: conteos reales en la base —
  `ll_checklist_franchise`, `ll_checklist_content`, `ll_checklist_version` y
  `ll_checklist_link` están en **0** filas; `ll_checklist_checklist` tiene
  **7** y `ll_checklist_user` tiene **1** (el perfil del usuario, de una
  sesión anterior). Es decir: hay usuario y checklists, pero **cero datos de
  catálogo**. Para el spike de integración real (tarea 2.8 de
  `docs/07-plan-de-trabajo.md`: probar el endpoint de franchises contra este
  mismo Odoo local) hace falta cargar manualmente al menos una franquicia con
  su contenido y versión — si no, el endpoint devolvería una lista vacía y no
  probaría nada. Esto también responde, parcialmente, la pregunta 9.1
  (¿el catálogo está cargado/curado?) pero **solo para este entorno local**:
  acá no hay nada cargado; cómo está la instancia de producción de Chano
  sigue sin saberse — ver nota cruzada en 9.1 y 14.1, más abajo.
- **Nota operativa sobre el usuario `admin`**: se verificó por query contra
  `res_groups_users_rel` que el usuario `admin` de este Odoo local **conserva**
  el grupo `LL Checklist / Administrator` — el menú "LL Checklist" ya es
  visible y **no hace falta repetir** el fix manual que documenta
  `docs/09-sprint1-completado.md`. Si algún día se recrea la base de datos
  desde cero (el volumen `odoo_db_data`), sí habría que repetirlo.

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

   → **[VERIFICADO 2026-08-27]** Se verificó que hoy no existe ninguna
   respuesta posible de Chano a esta pregunta porque **no hay ninguna API HTTP
   propia para elegir entre (a)/(b)/(c)**: `ll-odoo/odoo-modules/ll_webpage/controllers/index.py`
   tiene todo su contenido comentado (cero rutas activas), y el único
   controlador real del proyecto es
   `ll-odoo/odoo-modules/ll_oauth/controllers/auth_main.py`, que solo extiende
   `OAuthLogin.list_providers()` de `auth_oauth` para agregar parámetros extra
   al link de auth — no expone datos. Cambia el planteo: en vez de preguntarle
   a Chano en abstracto, el frontend **escribe el controlador REST él mismo**
   (`/api/v1/...`, lecturas de catálogo públicas con `sudo()` acotado, ver
   pregunta 7) en una rama propia de `ll-odoo` y se lo manda como **PR
   concreto para que lo revise** — más fácil revisar código real que decidir
   sin nada construido. Respeta la disciplina del proyecto: rama propia + PR,
   nunca push directo a `checklist_base`/`master`.

   → **[VERIFICADO 2026-08-30 — controlador escrito y probado]** Se escribió
   el controlador descrito arriba: rama `anitrack/rest-catalog-api` de
   `ll-odoo` (creada desde `checklist_base`), archivo nuevo
   `odoo-modules/ll_webpage/controllers/api_catalog.py` (~535 líneas, 3
   archivos de diff en total con `controllers/__init__.py` y
   `__manifest__.py`). Rutas bajo `/api/v1`: `/genres`, `/platforms`,
   `/companies`, `/franchises` (con filtros/paginación/orden),
   `/franchises/<id>`, `/contents/<id>`, `/search`, `/images/<id>`,
   `/platforms/<id>/image`, `/countries/<id>/image` — todas GET, todas
   `auth="public"` (ver ADR-010 y ADR-011 en `docs/03-decisiones-arquitectura.md`
   para el porqué de `sudo()`+filtro `published` y de `type="http"`). **Nada**
   de sesión ni de listas del usuario (eso es Sprint 3). Se validó con un test
   temporal (ya borrado) que las 7 respuestas reales del Odoo local pasan los
   esquemas Zod del frontend sin traducción — la tarea 2.8 del plan queda
   cerrada con esto (detalle completo en `docs/11-spike-integracion-real.md`).
   **Todavía sin commitear ni pushear**: queda para revisión del dueño del
   proyecto y, eventualmente, como PR real a Chano — el "PR concreto" que
   proponía la respuesta anterior ya existe como código, solo falta enviarlo.

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
     → **[VERIFICADO 2026-08-27]** Resuelta leyendo el modelo directamente: en
     `ll-odoo/odoo-modules/ll_checklist/models/database/link.py:44-48`, el
     campo `link_show_name` está declarado con
     `compute="compute_show_name"` **y `store=True`**. Es justo lo que el
     frontend prefería. Consecuencia: **no** hay costo de cómputo por request
     en catálogos grandes por este campo — el valor está materializado en la
     tabla. Ya no es una pregunta para Chano.
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
     → **[VERIFICADO 2026-08-27]** No es algo que se pueda leer del código
     (es una decisión de implementación, no un hecho ya definido), pero se
     confirma el mismo hallazgo que en la pregunta 1: no hay controladores
     `/api/v1` todavía, así que no hay nada que "eximir" hoy. El enfoque queda
     igual (eximir esas rutas del CSRF de Odoo + apoyarse en `SameSite` y CORS
     estricto), y se implementa directamente en el controlador que el
     frontend va a escribir y mandar como PR (ver 1). Deja de ser una pregunta
     abierta para Chano y pasa a ser una decisión de implementación del PR.

## Auth

6. **OAuth Twitch**: ¿está operativo? ¿El flujo soporta `redirect` de vuelta a
   una URL de la SPA tras el login? ¿Solo Twitch o habrá más proveedores?
   → Respuesta: **[BLOQUEADA]** No puedo confirmar si el OAuth de Twitch está
   operativo ni si redirige a una URL de la SPA: es estado/config del backend y
   de la app de Twitch. Lo que **sí** decido en frontend: el flujo espera volver
   a `/auth/callback?...` y ahí leo el resultado. Con MSW simulo el flujo
   completo, así que puedo construir toda la UI de login social sin bloquearme.
   → **[VERIFICADO 2026-08-27]** Se verificó en el código que
   `ll-odoo/odoo-modules/ll_oauth/__manifest__.py` solo declara como `data`
   `views/auth_oauth.xml` y `views/login_templates.xml`; y que
   `views/auth_oauth.xml` únicamente agrega el campo `ll_oauth_extra_params`
   al formulario de `auth.oauth.provider` (heredando
   `auth_oauth.view_oauth_provider_form`). **No hay ningún registro semilla de
   `auth.oauth.provider` con Twitch en el código** — un proveedor OAuth se
   configura a mano en el admin de Odoo (`client_id`/`client_secret` de una
   app registrada en la consola de developers de Twitch) y esa config vive
   solo en la base de datos de esa instalación, no en el código versionado.
   Consecuencia: **deja de bloquear el desarrollo**. Se puede registrar una
   app de Twitch propia de prueba (gratis) y configurarla en el Odoo local
   para construir y verificar el flujo OAuth completo end-to-end sin depender
   de Chano. Lo único que sigue dependiendo genuinamente de él es, al momento
   del deploy, confirmar si su app de producción está activa y qué
   `redirect_uri` acepta.
   >
   > **Nota sin verificar** (no confundir con lo de arriba, que sí está
   > verificado): el dueño del proyecto recuerda que "cuando probó el Odoo en
   > su máquina, el auth de Twitch funcionaba", pero no está seguro. Queda
   > registrado como recuerdo pendiente de confirmación empírica contra el
   > Odoo local — no se presenta como hecho hasta probarlo.
   >
   > **[VERIFICADO 2026-08-27 — empírico contra Odoo local]** Se levantó
   > `docker compose --profile backend up -d odoo db` (Odoo en
   > `localhost:8069`, DB `anitrack` en el contenedor `chambachambure-db-1`) y
   > se consultó la base viva por `psql`:
   > `SELECT id, name, enabled, client_id, auth_endpoint, ll_oauth_extra_params
   > FROM auth_oauth_provider ORDER BY id;` devuelve exactamente 3 filas —
   > `Odoo.com Accounts` (`enabled=t`), `Facebook Graph` y `Google OAuth2`
   > (ambos deshabilitados/sin `client_id`) — los tres son los que trae de
   > fábrica el módulo `auth_oauth` de Odoo. **Ninguno es Twitch.**
   > `ll_oauth_extra_params` está vacío en los tres. Confirmado también por
   > `curl http://localhost:8069/web/login`: renderiza un solo botón OAuth,
   > "Log in with Odoo.com" (`redirect_uri=http://localhost:8069/auth_oauth/signin`),
   > sin botón de Twitch.
   >
   > Conclusión: en el Odoo local, hoy, **Twitch no está deshabilitado — no
   > existe como proveedor**. Esto **cierra la nota sin verificar de arriba: el
   > recuerdo del usuario NO se confirma**, al menos no contra este entorno.
   > Hipótesis más probable (no un hecho verificado): la maquinaria OAuth sí
   > funciona — el módulo `ll_oauth` está instalado y su personalización activa
   > (la columna `ll_oauth_extra_params` existe en el esquema de
   > `auth_oauth_provider`, confirmado) — así que es plausible que el usuario
   > haya visto el flujo OAuth andando con el botón de Odoo.com y lo haya
   > asociado a Twitch, o que lo haya probado alguna vez contra la instancia de
   > Chano (no este entorno local). Matiz importante: la config de proveedores
   > vive en la base (volumen `odoo_db_data`), así que si alguna vez se hubiera
   > configurado Twitch en este local, habría persistido. Que no esté significa
   > o bien que nunca se configuró en local, o bien que la DB se recreó desde
   > entonces. No cambia la conclusión de la pregunta 6: sigue sin bloquear
   > seguir construyendo (se puede registrar una app de Twitch de prueba propia
   > y configurarla acá mismo).

   - 6.1. ¿El `redirect_uri` de Twitch está en whitelist fija en la app de
     Twitch, o es configurable por entorno? Necesito una URL de callback
     distinta en dev/staging/prod.
     → Respuesta: **[BLOQUEADA → requisito FE]** Quién administra la app de
     Twitch (vos) configura el `redirect_uri`. Requisito del frontend: necesito
     **una URL de callback por entorno** (dev `localhost`, prod). Si es whitelist
     fija, hay que agregar la de dev.
     → **[VERIFICADO 2026-08-27]** Para desarrollo, deja de bloquear: como se
     verificó en la pregunta 6 que el proveedor OAuth se configura a mano
     (no hay seed en el código), se puede registrar una app de Twitch propia
     de prueba con su propio `redirect_uri` de `localhost` apuntando al Odoo
     local, y probar el flujo completo sin depender de Chano. Lo que sigue
     genuinamente bloqueado es solo la parte de **producción**: si la
     whitelist del `redirect_uri` en la app de Twitch de Chano es fija o
     configurable, y si acepta agregar la URL de prod del frontend — eso solo
     lo sabe él, y se confirma recién al momento del deploy.
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
   → **[VERIFICADO 2026-08-27]** Resuelta, y la respuesta es **no**, con un
   alcance mayor al que la pregunta asumía. En
   `ll-odoo/odoo-modules/ll_checklist/security/administrator.xml` las reglas
   `ir.model.access` de **todos** los modelos del módulo (`ll.checklist.image`,
   `ll.checklist.image.group`, `ll.checklist.franchise`, `ll.checklist.content`,
   `ll.checklist.version`, `ll.checklist.db.name`, `ll.checklist.genre`,
   `ll.checklist.platform`, `ll.checklist.country`, `ll.checklist.company`,
   `ll.checklist.link`, `ll.checklist.checklist`, `ll.checklist.user`, etc.)
   están atadas **exclusivamente** al grupo `rg_ll_checklist_administrator`. En
   `ll-odoo/odoo-modules/ll_checklist/security/groups.xml` no existe ningún
   grupo `public` ni `portal`, y el `__manifest__.py` de `ll_checklist` solo
   depende de `base` (nada que otorgue acceso anónimo, como `website`). En
   Odoo, sin una regla `ir.model.access` explícita para el usuario público, el
   acceso se **deniega por default**.
   >
   > Consecuencia más amplia que la pregunta original: hoy, tal cual está el
   > código, **nada del catálogo es legible sin sesión** — no es solo un
   > problema de imágenes. Esto deja de ser una pregunta abierta y pasa a ser
   > un **requisito `[FE→BE]` concreto**: hace falta o bien reglas de acceso
   > para el usuario público, o bien que los endpoints REST públicos (los que
   > el frontend va a proponer en el PR de la pregunta 1) lean con `sudo()`
   > acotado — ese es el camino que se va a proponer con código, no en
   > abstracto.
   >
   > **[VERIFICADO 2026-08-27 — doble, código + base viva]** Se confirmó lo
   > mismo consultando por `psql` la base del Odoo local (`docker compose
   > --profile backend up -d odoo db`, DB `anitrack`): un join de
   > `ir_model_access` con `ir_model` y `res_groups` filtrando
   > `model LIKE 'll.checklist%'` devuelve **16 filas**, una por modelo
   > (`checklist`, `company`, `content`, `country`, `db.name`, `franchise`,
   > `genre`, `image`, `image.group`, `link`, `link.copy`, `platform`,
   > `shared.access`, `user`, `version`, `wizard.link`), y **todas** con el
   > grupo `LL Checklist / Administrator`. Cero reglas para público o portal.
   > Que la lectura del código (`administrator.xml`) y la consulta a la base
   > viva coincidan exactamente le da más peso a este hallazgo: confirma que
   > hace falta trabajo real de backend para que el catálogo se vea
   > deslogueado — no es una lectura errónea del XML ni algo que un dato
   > sembrado distinto en runtime pudiera contradecir.

   > **[VERIFICADO 2026-08-30 — matiz sobre `/web/image` + solución
   > construida]** Se probó `GET /web/image/ll.checklist.image/35/image_binary`
   > **sin sesión**: responde HTTP **200**, pero el cuerpo son 6078 bytes del
   > **placeholder gris genérico de Odoo**, no la imagen real (la real es un
   > SVG de 555 bytes — la misma que sí devuelve `/api/v1/images/35`; el id
   > es el de esa corrida y cambia al re-sembrar con `--reset`). Es
   > decir: el acceso sigue denegado en los hechos, pero Odoo **degrada en
   > silencio a un placeholder en vez de dar 403/404**, lo cual es peor para
   > depurar que un error limpio (un frontend integrado contra `/web/image`
   > vería cuadros grises sin ninguna señal de error). Esto no cambia la
   > conclusión de arriba, la precisa: el requisito `[FE→BE]` queda resuelto
   > del lado frontend con la ruta propia `/api/v1/images/<id>` del
   > controlador de ADR-010 (ver pregunta 1, verificación 2026-08-30): sirve
   > el binario real con `sudo()`, detecta el mimetype, manda
   > `Cache-Control: public, max-age=86400` + `ETag`, con revalidación
   > `If-None-Match` → `304` verificada. Detalle completo en
   > `docs/11-spike-integracion-real.md`.

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
     → **[VERIFICADO 2026-08-27 — parcial, solo entorno local]** Se confirmó
     por query directa contra la base del Odoo local que
     `ll_checklist_franchise`, `ll_checklist_content` y `ll_checklist_version`
     están en **0** filas — es decir, en este entorno **no hay ningún dato de
     catálogo cargado**, ni curado ni sucio: simplemente no existe todavía
     (detalle completo en la "Actualización (2026-08-27)" de la ronda de
     verificación, más arriba, y en 14.1). Esto no responde si el catálogo de
     **producción** de Chano es curado o no — eso sigue sin saberse y sigue
     siendo `[FE→BE]` tal cual estaba.
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
    → **[VERIFICADO 2026-08-27 — empírico]** Se verificó por query directa
    contra la base viva del Odoo local (`docker compose --profile backend up
    -d odoo db`, DB `anitrack`) que la carga descrita arriba **todavía no se
    hizo**: `ll_checklist_franchise`/`content`/`version`/`link` están en 0
    filas; solo hay `ll_checklist_user` (1, el perfil propio) y
    `ll_checklist_checklist` (7, checklists de una sesión anterior). Falta
    cargar manualmente las franquicias de prueba antes del spike 2.8 (probar
    el endpoint de franchises contra este mismo Odoo local) — si no, el
    endpoint respondería una lista vacía y el spike no probaría nada. También
    se confirmó, contra `res_groups_users_rel`, que el usuario `admin` de esta
    base **ya tiene** el grupo `LL Checklist / Administrator` (el menú es
    visible) — no hace falta repetir el fix manual de doc 09, salvo que se
    recree la base de datos desde cero (volumen `odoo_db_data`).

    - 14.1. ¿Alguna franquicia de prueba en particular que ya tengas cargada en
      tu entorno de desarrollo, para no duplicar el trabajo de carga?
      → Respuesta: **[BLOQUEADA]** Qué franquicias ya tenés cargadas lo sabés vos;
      si me pasás la lista evito duplicar. Dato tuyo.
