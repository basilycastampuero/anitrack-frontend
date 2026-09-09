# AniTrack — Documentación exclusiva del backend

Análisis del backend Odoo real (`ll-odoo`, de Chano / chanochambure) hecho por el
equipo de frontend, y las preguntas pendientes para él. **No se escribe nada
dentro de `ll-odoo/`** (repo Git propio de Chano, en `../../ll-odoo/` desde
aquí): esta carpeta vive aparte para no tocarlo. Vive dentro del repo de
`anitrack-frontend` como carpeta hermana de [`../docs/`](../docs/README.md)
porque es documentación de análisis, no decisiones propias del frontend.

| Documento | Qué contiene |
|---|---|
| [02-analisis-backend-odoo.md](./02-analisis-backend-odoo.md) | Análisis modelo por modelo del backend real (rama `checklist_base`) + diagrama ER + gaps vs el brief original |
| [08-preguntas-backend.md](./08-preguntas-backend.md) | Lista de preguntas concretas para Chano (transporte de API, CORS/deploy, auth, campos [EXT]) — enviar tal cual |
| [14-resumen-implementacion-api.md](./14-resumen-implementacion-api.md) | Estado real de implementación del contrato del doc 04 contra `ll-odoo`: qué está construido, en qué rama/commit, qué falta y qué hallazgos no anticipados aparecieron en el modelo de Chano |

Los números de archivo son los de la numeración original de planificación (ver
[`../docs/README.md`](../docs/README.md)), no correlativos dentro de esta carpeta.

**Estado (actualizado 2026-09-08):** el bloqueo #1 original dejó de serlo. La
sección de hosting/deploy la respondió Chano (Railway self-hosted, sin
staging remoto cómodo, frontend debe correr contra Odoo local); las secciones
de auth e imágenes se resolvieron leyendo y probando el código de `ll-odoo`
directamente en vez de esperar respuesta (preguntas 6, 7 y 8, marcadas
`[VERIFICADO]`/cerradas — ver ADR-014 a ADR-017 en
[`../docs/03-decisiones-arquitectura.md`](../docs/03-decisiones-arquitectura.md)).
El transporte de API tampoco depende ya de una respuesta suya: el frontend
escribió los controladores REST él mismo en la rama `anitrack/rest-catalog-api`
de `ll-odoo` (sin pushear al remoto de Chano) — el del catálogo (pregunta 1 y
7 del doc 08, cerrando la tarea 2.8 del plan: no hace falta adaptador, ver
[`../docs/11-spike-integracion-real.md`](../docs/11-spike-integracion-real.md)),
el de sesión (`/api/v1/auth/*`, tarea B1, commit `d17d00a`), el de lectura de
listas (`/me/*`, tarea B3, commit `b708bcb`) y ahora también el de
**escritura** (tarea B4, commit `3c4e091`, incluye cerrar la fuga de imágenes
que ADR-014 había dejado como deuda abierta). El **checkpoint de contrato
(tarea B5)** cerró el carril B completo: encontró y corrigió un drift real —
`POST /auth/register` con email duplicado filtraba el mensaje crudo de
Postgres en vez del `422 VALIDATION` + `field: "email"` que pide el contrato
(fix en commit `b5f30a3`) — cerrando también la última nota `[FE→BE]`
pendiente de la pregunta 8 de este doc. Ver
[`../docs/13-sprint3a-avance.md`](../docs/13-sprint3a-avance.md).
Lo que sigue genuinamente bloqueado, solo de producción: el `invitation_scope`
de la instancia real de Chano (pregunta 8, nota final), qué pasa si el mismo
email se usa por registro propio y por Twitch (pregunta 8.2), y si su app de
Twitch acepta un `redirect_uri` de este frontend (pregunta 6.1). Mientras
tanto, el frontend sigue construyendo contra MSW sin depender de nada de esto
(ADR-001 y ADR-017).

**Nota (2026-09-08):** el detalle endpoint por endpoint de qué está
implementado y qué falta —antes una tabla al final de
[`../docs/04-contrato-api.md`](../docs/04-contrato-api.md)— se movió a
[14-resumen-implementacion-api.md](./14-resumen-implementacion-api.md), para
no mezclar la especificación del contrato (audiencia frontend) con el estado
de avance (audiencia Chano).
