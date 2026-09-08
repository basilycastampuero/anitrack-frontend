# AniTrack Frontend — Documentación

> Generado el 2026-07-06 tras análisis completo del repositorio `ll-odoo`
> (backend de Chano / chanochambure). Reorganizado el 2026-07-10 (movido a
> `anitrack-frontend/`) y el 2026-07-10 nuevamente al pasar todo el
> workspace a este repo Git propio, dejando `docs-backend/` como carpeta
> hermana (ver [`../docs-backend/`](../docs-backend/README.md)) para no
> mezclar el análisis del backend de Chano con las decisiones del frontend.

## En esta carpeta

| Documento | Qué contiene |
|---|---|
| [01-vision-y-alcance.md](./01-vision-y-alcance.md) | Qué es el proyecto realmente, alcance del frontend, restricciones |
| [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md) | Decisiones técnicas (mini-ADRs) con justificación: stack, contrato vía MSW, modelo de listas, feature flags, auth por cookie, imágenes, idioma, seed, estructura de carpetas |
| [04-contrato-api.md](./04-contrato-api.md) | Contrato de API v1: lo que MSW mockea y lo que se le propone a Chano. Es el documento "bisagra" entre frontend y backend |
| [05-modelo-dominio-frontend.md](./05-modelo-dominio-frontend.md) | Tipos TypeScript del dominio + tabla de mapeo Odoo → Frontend |
| [06-diseno-ui.md](./06-diseno-ui.md) | Rutas, páginas, componentes, design system, flujos UX |
| [07-plan-de-trabajo.md](./07-plan-de-trabajo.md) | Plan detallado por fases/sprints con tareas y criterios de aceptación |
| [09-sprint1-completado.md](./09-sprint1-completado.md) | Bitácora: qué se construyó en el setup/Sprint 1, decisiones tomadas sobre la marcha y verificación |
| [10-sprint2-avance.md](./10-sprint2-avance.md) | Bitácora: avance del Sprint 2 (catálogo) en curso — estado real por tarea, decisiones sobre la marcha y verificación |
| [11-spike-integracion-real.md](./11-spike-integracion-real.md) | Bitácora: spike de integración real (tarea 2.8) — seed del catálogo contra Odoo local, controlador REST propio en `ll-odoo` (sin pushear) y decisión "no hace falta adaptador" |
| [12-diseno-sprint3a.md](./12-diseno-sprint3a.md) | Diseño técnico del Sprint 3a: el *cómo* de auth + listas — responsabilidades por capa, contratos, plan por tarea con archivos, y los dos carriles (frontend contra MSW / backend en `ll-odoo`) |
| [13-sprint3a-avance.md](./13-sprint3a-avance.md) | Bitácora: **Sprint 3a completo** (auth + listas) — carril A 8/8 y carril B 5/5, cambio de contrato `field?: string` (ya implementado en el backend real), vista de entries (3.6), onboarding de starter lists (3.5c), escritura en `/me/*` y cierre de la fuga de imágenes de ADR-014 (B4), checkpoint de contrato con un drift real encontrado y corregido (B5) |
| [anitrack_ai_context.md](./anitrack_ai_context.md) | Brief original del proyecto (visión tipo MyAnimeList). Referencia histórica: el backend real NO implementa este modelo tal cual — ver el gap en [`../docs-backend/02-analisis-backend-odoo.md`](../docs-backend/02-analisis-backend-odoo.md) |

Los números de archivo (01, 03...) se conservan de la numeración original de
planificación aunque ya no sean correlativos — así las menciones cruzadas
("doc 04", "doc 08") en el resto de los documentos siguen siendo válidas sin
importar en qué carpeta terminó viviendo cada uno. El doc 08 vive en
[`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md).

## Resumen ejecutivo (TL;DR)

**El hallazgo más importante:** el backend real NO implementa el modelo MyAnimeList
descrito en `anitrack_ai_context.md`. No existen ratings, ni estados fijos
(Watching/Completed/...), ni notas, ni fechas de inicio/fin, ni reviews, ni scores
comunitarios. Lo que existe es:

- Un **catálogo** jerárquico: `Franchise` → `Content` (Game o Video) → `Version`
  (con episodios, fecha, país, plataforma, estudio de doblaje).
- Un sistema de **checklists definidas por el usuario** (árbol de listas anidadas).
- **Links** que conectan ítems del catálogo a las checklists, con progreso de
  episodios por versión (`03/12`) y agregación por franquicia.
- Login **OAuth** (Twitch, según los campos) + usuarios Odoo.
- **Cero API pública**: todo es backoffice de Odoo; el módulo `ll_webpage` está vacío.

**La decisión estratégica** (ADR-003, en [03-decisiones-arquitectura.md](./03-decisiones-arquitectura.md)):
el frontend se construye alrededor del modelo real (checklists flexibles),
emulando la UX de MyAnimeList mediante listas sugeridas por defecto. Los
features que faltan en backend (rating, notas, fechas) quedan mockeados
detrás de un feature flag y documentados como propuesta de extensión para Chano.

**El bloqueo #1 dejó de serlo** (actualizado 2026-08-31): el transporte se
resolvió leyendo y escribiendo el backend en local —ADR-010/011 para el
catálogo, ADR-014/015/016 para auth y listas— y la política sobre `ll-odoo`
ahora permite trabajarlo. Lo que sigue en manos de Chano es solo de
producción (su app de Twitch, el `invitation_scope` de su instancia, y si
acepta el trabajo como PR). La conversación original, con lo respondido y lo que
sigue abierto, vive en [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md).
Mientras tanto MSW sigue cubriendo el 100% del frontend, que es lo que ADR-017
mantiene como camino crítico del Sprint 3a.

## Estado del proyecto

- [x] Análisis del backend completado (rama `checklist_base`, commit `9ba6b0e`)
- [x] Decisiones de arquitectura tomadas
- [x] Contrato API v1 redactado
- [x] **Sprint 1 del frontend completado** — ver [09-sprint1-completado.md](./09-sprint1-completado.md)
- [ ] Conversación con Chano (usar [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md)) — en curso: respondió hosting, faltan las demás secciones
- [x] Repo remoto del frontend creado y pusheado en GitHub (`basilycastampuero/anitrack-frontend`, cuenta principal — Fase 0.3, ver [10-sprint2-avance.md](./10-sprint2-avance.md))
- [x] **Sprint 2 completado** — catálogo de punta a punta (grid → franquicia → contenido → versiones), búsqueda y filtros, objetivo demo cumplido. Las 8 tareas (2.1–2.8) ✅ — ver [10-sprint2-avance.md](./10-sprint2-avance.md) (bitácora completa, cierre en la sección "Actualización 2026-08-31 — Tareas 2.6 y 2.7 + Cierre de Sprint 2") y [11-spike-integracion-real.md](./11-spike-integracion-real.md) (spike 2.8: no hace falta adaptador)
- [x] **Sprint 3a completado** — auth (login/register/logout, OAuth mockeado) y estructura de listas (árbol accesible, CRUD de carpetas, onboarding de starter lists, vista de entries de solo lectura), carril A 8/8 y **carril B 5/5** (backend real en `ll-odoo`, sin pushear: `/me/*` de lectura y escritura, cierre de la fuga de imágenes de ADR-014, checkpoint de contrato con un drift real encontrado y corregido). Diseñado y replanificado el 2026-08-31: ver [12-diseno-sprint3a.md](./12-diseno-sprint3a.md) y **ADR-014 a ADR-019** (aislamiento de datos privados, identidad, transporte de sesión/CSRF, MSW vs. backend en paralelo, recálculo de `aggregatedProgress`, uso de `sudo()` en `/me/*`) — bitácora completa y deuda abierta consolidada en [13-sprint3a-avance.md](./13-sprint3a-avance.md)
- [ ] Sprint 3b — tracking y vinculación (camino crítico actual)
- [ ] Sprint 4 — integración, pulido y deploy

> El Sprint 3 se partió en **3a** (auth + listas) y **3b** (tracking + wizard):
> con 11 tareas era casi el doble de carga que cualquier otro sprint, y las más
> riesgosas del proyecto. El corte, el orden de ejecución y el orden de recorte
> si aprieta el plazo están en [07-plan-de-trabajo.md](./07-plan-de-trabajo.md).
> La numeración de tareas (3.1–3.11) se conservó para no invalidar las
> referencias cruzadas de los demás documentos.
