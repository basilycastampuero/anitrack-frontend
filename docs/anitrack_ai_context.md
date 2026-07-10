# AniTrack — Contexto del Proyecto para IA

> Este documento es para dar contexto a una IA (Claude Code u otra) sobre el proyecto AniTrack.
> Leé todo antes de escribir una línea de código o dar cualquier sugerencia técnica.

---

## Quién soy y cómo trabajamos

- Soy desarrollador frontend en formación, con visión de crecer hacia fullstack.
- Tengo experiencia previa con React, Vite y shadcn/ui (proyecto anterior: SaasVault).
- Necesito que **expliques los conceptos técnicos** cuando aparezcan, no solo el código. El objetivo es aprender mientras construyo.
- Sé directo y objetivo. Si algo está mal planteado, decímelo.
- Este chat es para **ejecutar código**. La planificación y las dudas conceptuales las resuelvo en otro chat separado.

---

## Qué es AniTrack

Plataforma de tracking de contenido multimedia: anime, manga, series, películas y juegos.
Referencia directa: MyAnimeList / AniList.

| Aspecto | Detalle |
|--------|---------|
| Tipo | Freelance pagado + pieza de portafolio |
| Rol | Frontend principal (posible backend extra) |
| Backend | Odoo (base de datos principal, desarrollado por otro dev) |
| Plazo | 1–2 meses desde inicio oficial |
| Stack | React 18 + Vite + TypeScript |

---

## Stack tecnológico — completo y definitivo

### Core
| Herramienta | Uso |
|------------|-----|
| React 18 | Framework UI |
| TypeScript | Tipado estático — obligatorio |
| Vite | Build tool y dev server |

### Routing
| Herramienta | Uso |
|------------|-----|
| React Router v6 | Navegación del lado del cliente |

### Estado y datos
| Herramienta | Uso |
|------------|-----|
| TanStack Query | Server state: cache, loading, refetch, paginación, optimistic updates |
| Zustand | UI state: usuario autenticado, preferencias, filtros activos |

### Estilos y UI
| Herramienta | Uso |
|------------|-----|
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Componentes base del design system |
| Framer Motion | Animaciones y transiciones |

### Formularios y validación
| Herramienta | Uso |
|------------|-----|
| React Hook Form | Manejo de estado de formularios |
| Zod | Validación de esquemas + integración con TypeScript |

### HTTP y API
| Herramienta | Uso |
|------------|-----|
| Axios | Cliente HTTP con interceptors para auth y errores |
| MSW (Mock Service Worker) | Datos falsos durante desarrollo, mientras Odoo no esté listo |

### Integración con Odoo
Pendiente de confirmar con el dev de backend. Las posibilidades son:
- JSON-RPC nativo (por defecto en Odoo)
- REST controllers personalizados
- Combinación de ambos

**Regla crítica:** toda comunicación con Odoo pasa por la capa de servicios (`features/*/services/*.service.ts`). Ningún componente llama a la API directamente.

### Utilidades
| Herramienta | Uso |
|------------|-----|
| date-fns | Manejo de fechas |
| clsx | Clases CSS condicionales |

### Desarrollo y calidad
| Herramienta | Uso |
|------------|-----|
| ESLint + Prettier | Linting y formato |
| Vitest | Tests unitarios |
| React Testing Library | Tests de componentes |

---

## Arquitectura — Feature-based

La estructura de carpetas es **feature-based**, no layer-based. Todo el código relacionado a una funcionalidad vive junto.

```
src/
  assets/
  components/
    ui/              # shadcn/ui y componentes base del design system
    layout/          # Header, Sidebar, Footer, PageWrapper
  features/
    auth/
      components/    # LoginForm, RegisterForm
      hooks/         # useAuth, useCurrentUser
      services/      # auth.service.ts
      types/         # auth.types.ts
    catalog/
      components/    # MediaCard, MediaGrid, MediaDetail, FilterBar
      hooks/         # useMediaList, useMediaDetail, useSearch
      services/      # catalog.service.ts
      types/         # media.types.ts
    tracking/
      components/    # UserList, StatusBadge, RatingStars, ProgressTracker
      hooks/         # useUserList, useUpdateStatus
      services/      # tracking.service.ts
      types/         # tracking.types.ts
    profile/
      components/    # ProfileHeader, StatsGrid, ActivityFeed
      hooks/         # useProfile
      services/      # profile.service.ts
      types/         # profile.types.ts
    search/
      components/    # SearchBar, SearchResults, FilterPanel
      hooks/         # useSearch
      services/      # search.service.ts
  lib/               # configuración de librerías (axios instance, queryClient)
  hooks/             # hooks verdaderamente globales (useMediaQuery, useTheme)
  pages/             # solo ensamblado de features, sin lógica propia
  router/            # definición de rutas
  store/             # Zustand stores globales
  types/             # tipos globales compartidos
  utils/             # funciones utilitarias puras
```

**Regla:** las `pages/` no tienen lógica propia. Solo ensamblan features. Toda la lógica vive en `features/`.

---

## Páginas del proyecto

### Públicas (sin login)
| Página | Ruta |
|--------|------|
| Home | `/` |
| Catálogo | `/catalog` |
| Detalle de media | `/anime/:id`, `/manga/:id`, `/series/:id`, etc. |
| Búsqueda | `/search?q=...` |
| Login | `/login` |
| Registro | `/register` |

### Privadas (requieren autenticación)
| Página | Ruta |
|--------|------|
| Mi lista | `/my-list` |
| Perfil | `/profile/:username` |
| Configuración | `/settings` |

---

## Funcionalidades core

### Sistema de tracking (el corazón del producto)
Cada ítem del catálogo puede tener un estado por usuario:

```
Anime / Series:  Watching | Completed | On Hold | Dropped | Plan to Watch
Manga:           Reading  | Completed | On Hold | Dropped | Plan to Read
Películas:       Watched  | Plan to Watch
Juegos:          Playing  | Completed | On Hold | Dropped | Plan to Play
```

Campos adicionales por ítem:
- Rating personal (1–10)
- Progreso (episodio o capítulo actual / total)
- Notas privadas
- Fecha de inicio y fin

### Catálogo
- Grid responsive de MediaCards
- Filtros: tipo, género, año, estado de emisión, score
- Ordenamiento: popularidad, score, fecha, alfabético
- Paginación o infinite scroll

### Detalle de media
- Header con poster, título, info clave y score
- Sinopsis expandible
- Info técnica (estudio, episodios, duración, etc.)
- Score promedio y distribución de ratings
- Reviews de usuarios
- Sección de tracking: añadir/editar estado y rating
- Recomendaciones relacionadas

### Perfil de usuario
- Header con avatar, nombre y estadísticas globales
- Distribución de tiempo/items por categoría
- Actividad reciente
- Listas públicas por estado

---

## Componentes del design system — construir primero

Estos componentes se usan en todo el sitio. Tienen que estar bien hechos desde el inicio:

| Componente | Descripción |
|-----------|-------------|
| `MediaCard` | Poster + título + score + tipo + estado personal del usuario |
| `StatusBadge` | Chip de color por estado (watching=verde, dropped=rojo, etc.) |
| `RatingStars` | Input de rating 1–10 |
| `ScoreDisplay` | Score promedio con formato visual |
| `FilterBar` | Fila de filtros con chips seleccionables |
| `SearchBar` | Input con debounce y autocompletado |
| `ProgressBar` | Episodio X de Y con barra |
| `UserAvatar` | Foto de perfil o iniciales |
| `LoadingSkeleton` | Placeholder durante carga — crítico para UX |
| `EmptyState` | Ilustración + mensaje cuando no hay resultados |
| `ErrorBoundary` | Captura errores de rendering sin romper la app |

---

## Estándares de calidad — no negociables

1. **Skeletons en todos los estados de carga.** No spinners genéricos. El skeleton tiene la forma exacta del contenido final.
2. **Dark mode desde el día 1.** Tailwind lo maneja, pero hay que pensarlo desde el principio.
3. **Responsive mobile-first.** Todo se diseña primero para mobile, luego se adapta a desktop.
4. **Estados vacíos cuidados.** Cuando no hay resultados, se muestra algo diseñado, no nada.
5. **Optimistic updates.** Las acciones de tracking (añadir, cambiar estado, puntuar) se reflejan instantáneamente en la UI sin esperar al servidor.
6. **Animaciones con Framer Motion.** Transiciones de página, stagger en grids, hover en cards.
7. **TypeScript estricto.** Sin `any`. Todos los modelos tienen su tipo definido en `types/`.

---

## Capa de servicios — patrón obligatorio

Toda llamada a la API sigue este patrón. Nunca llamar a Axios directamente desde un componente o hook:

```typescript
// src/features/catalog/services/catalog.service.ts
export const catalogService = {
  getMediaList: async (filters: MediaFilters): Promise<PaginatedResponse<Media>> => {
    // Única capa que sabe cómo hablar con Odoo
  },
  getMediaById: async (id: string, type: MediaType): Promise<MediaDetail> => {
    // ...
  },
}
```

Los hooks usan los servicios. Los componentes usan los hooks. Nadie se salta la cadena.

---

## Plan de sprints

| Sprint | Semanas | Foco |
|--------|---------|------|
| 1 | 1–2 | Setup, estructura, router, layout base, design system base, dark mode, MSW |
| 2 | 3–4 | Catálogo, MediaCard, filtros, detalle de media, búsqueda, skeletons, integración Odoo |
| 3 | 5–6 | Auth, sistema de tracking, optimistic updates, Mi Lista, perfil con stats |
| 4 | 7–8 | Animaciones, responsive, errores, performance, tests, deploy |

---

## Estado actual del proyecto

> **Actualizar esta sección cada vez que empiece una nueva sesión de trabajo.**

- [ ] Conversación con dev de Odoo: **pendiente** — usar `docs/08-preguntas-backend.md`
- [ ] Setup inicial del proyecto: pendiente
- [x] Análisis del backend real + planificación completa: **completada (2026-07-06)** — ver `docs/README.md`
- [ ] Sprint actual: — (próximo: Fase 0 + Sprint 1, ver `docs/07-plan-de-trabajo.md`)
- [x] Última tarea completada: documentación de planificación (docs 01–08)
- [ ] Próxima tarea: validar ADRs (doc 03) y enviar preguntas al dev backend (doc 08)

> ⚠️ **Hallazgo clave de la sesión 2026-07-06:** el backend real (rama
> `checklist_base` de `ll-odoo`) NO implementa el modelo MAL de este brief
> (sin ratings, sin estados fijos, sin notas/fechas). El modelo real es
> Franchise → Content → Version + checklists libres del usuario + links con
> progreso de episodios. Este documento queda como visión; la fuente de verdad
> técnica es `docs/`. Detalle del gap: `docs/02-analisis-backend-odoo.md`.

---

## Lo que NO hacer

- No uses `any` en TypeScript.
- No pongas lógica en las pages, solo ensamblado.
- No llames a la API directamente desde componentes.
- No uses `useEffect` para fetching de datos — para eso existe TanStack Query.
- No hagas componentes gigantes. Si un componente supera ~150 líneas, probablemente hay que dividirlo.
- No asumas que el backend de Odoo está listo. Usar MSW hasta confirmación explícita.
