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

Los números de archivo son los de la numeración original de planificación (ver
[`../docs/README.md`](../docs/README.md)), no correlativos dentro de esta carpeta.

**Estado:** bloqueo #1 del proyecto — la conversación con Chano usando el doc 08
empezó (respondió la sección de hosting/deploy: Railway self-hosted, sin
staging remoto cómodo, frontend debe correr contra Odoo local), pero faltan
las demás secciones (transporte de API, CORS/deploy, auth, campos [EXT]),
algunas bloqueantes para el Sprint 3a (tarea 3.3, OAuth de Twitch) y para el
Sprint 4 (tarea 4.1, integración real). Mientras tanto, el
frontend construye contra MSW sin depender de esto (ADR-001 en
[`../docs/03-decisiones-arquitectura.md`](../docs/03-decisiones-arquitectura.md)).
