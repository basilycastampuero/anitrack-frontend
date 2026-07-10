# 01 — Visión y Alcance

## Qué es AniTrack (según el brief)

Plataforma de tracking de contenido multimedia (anime, manga, series, películas,
juegos) al estilo MyAnimeList/AniList. Freelance pagado + pieza de portafolio.
Frontend en React; backend en Odoo desarrollado por otro dev ("LexRis Logic").
Plazo: 1–2 meses desde inicio oficial.

## Qué es AniTrack (según el código real del backend)

Tras leer todo el repositorio `ll-odoo` (rama activa: `checklist_base`), el
producto que el backend implementa hoy es más preciso llamarlo **"checklist
manager con catálogo multimedia"**:

1. **Catálogo curado** (lo carga un administrador desde el backoffice de Odoo):
   franquicias con sus contenidos (juegos y videos — donde "video" cubre TV,
   película, OVA, ONA, especial, compilación) y las versiones de cada contenido
   (temporadas, doblajes, ports por plataforma, etc.).
2. **Listas personales**: cada usuario arma sus propias checklists, anidables en
   árbol, con nombre, descripción e imagen. No hay estados predefinidos.
3. **Tracking por vinculación**: el usuario "linkea" una versión del catálogo (o
   una franquicia entera) dentro de una checklist, y ahí registra su progreso en
   episodios (`[03/12]`). Los links de franquicia agrupan y suman el progreso de
   sus versiones (`Naruto [S1 12/12] - [S2 03/24]`).
4. **Links sincronizados**: un mismo ítem puede vivir en dos checklists distintas
   con el progreso espejado (feature `link.copy`).
5. **Compartir**: checklists con flags `published` (visible públicamente) y
   `shared` + una lista de accesos compartidos por usuario.
6. **Login social**: OAuth (por los campos `user_twitch_identifier` y
   `preferred_username`/`picture`, el proveedor objetivo es Twitch).

La visión MAL-like del brief (ratings 1–10, estados fijos, notas, fechas, reviews,
score comunitario, recomendaciones) **no existe en el backend hoy**. El detalle
del gap está en el doc 02, y cómo lo manejamos en el doc 03 (ADR-003 y ADR-004).

## Alcance del frontend (este proyecto)

### Dentro del alcance

- SPA completa en React: catálogo público, búsqueda, detalle de franquicia y
  contenido, auth, "mis listas" (CRUD de checklists + árbol), flujo de vincular
  ítems del catálogo a listas, edición de progreso, perfil público con listas
  publicadas y estadísticas derivadas.
- Design system propio (shadcn/ui + Tailwind) con dark mode, skeletons,
  empty states, animaciones y responsive mobile-first.
- Capa de mocks (MSW) que implementa el contrato API completo, para desarrollar
  sin depender del backend.
- Documentación del contrato API para que el dev de Odoo implemente los
  endpoints (doc 04).

### Fuera del alcance (v1)

- Cualquier desarrollo dentro de Odoo (salvo que se negocie como "backend extra").
- Reviews, recomendaciones, score comunitario, actividad social entre usuarios:
  no hay soporte de backend ni está en el plazo.
- Apps móviles nativas, SSR/SEO avanzado (es SPA; si el catálogo público
  necesitara SEO real, se evalúa después).
- Carga/administración del catálogo (eso vive en el backoffice de Odoo).

### Zona gris (decidir con el cliente/dev backend)

- **Rating, notas y fechas por ítem**: el frontend los deja diseñados y mockeados
  tras un feature flag; se activan si el backend los agrega (ADR-004).
- **Manga/lectura**: el modelo actual solo tiene `Game | Video`. Agregar un tipo
  de contenido de lectura es un cambio de backend (campo `content_type` +
  probablemente "capítulos" en vez de "episodios" — el campo `version_episodes`
  es genérico y serviría).

## Usuarios y roles

| Rol | Qué hace | Dónde |
|-----|----------|-------|
| Visitante | Navega catálogo público, busca, ve perfiles/listas publicadas | Frontend |
| Usuario registrado | Todo lo anterior + gestiona sus checklists y progreso | Frontend |
| Administrador de catálogo | Carga franquicias/contenidos/versiones/imágenes | Backoffice Odoo (fuera de alcance) |

## Restricciones

- **Plazo**: 1–2 meses. El plan (doc 07) prioriza el corazón del producto
  (catálogo + listas + progreso) y deja pulido/extras al final.
- **Backend en movimiento**: la rama `checklist_base` tiene commits activos
  (último: mayo 2026). El modelo puede cambiar; la capa de servicios + el
  contrato API aíslan ese riesgo.
- **Sin API aún**: bloqueo real para integración; no para desarrollo (MSW).
- **Aprendizaje**: el dueño del proyecto está en formación frontend — los
  documentos explican el porqué de cada decisión, y el plan incluye notas de
  conceptos a aprender por fase.
