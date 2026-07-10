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

**El bloqueo #1** es la conversación pendiente con Chano: transporte de API (REST
custom vs JSON-RPC), CORS/deploy y auth para SPA. [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md)
tiene las preguntas listas para enviar. Mientras tanto, MSW permite construir el
100% del frontend sin backend.

## Estado del proyecto

- [x] Análisis del backend completado (rama `checklist_base`, commit `9ba6b0e`)
- [x] Decisiones de arquitectura tomadas
- [x] Contrato API v1 redactado
- [x] **Sprint 1 del frontend completado** — ver [09-sprint1-completado.md](./09-sprint1-completado.md)
- [ ] Conversación con Chano (usar [`../docs-backend/08-preguntas-backend.md`](../docs-backend/08-preguntas-backend.md))
- [x] Repo remoto del frontend inicializado localmente (Fase 0.3) — falta crear el remoto en GitHub y hacer el primer push
- [ ] Sprint 2 — catálogo completo
- [ ] Sprint 3 — auth + listas + tracking
- [ ] Sprint 4 — integración, pulido y deploy
