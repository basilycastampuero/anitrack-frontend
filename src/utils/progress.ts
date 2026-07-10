import type { Progress } from '@/features/lists/types'

/**
 * Deriva el progreso para la UI a partir del modelo real: el backend manda
 * `total = 0` cuando los episodios son desconocidos (en emisión), que la UI
 * representa como total nulo y barra indeterminada (doc 05, ProgressBar).
 */
export function toProgress(watched: number, totalEpisodes: number): Progress {
  const total = totalEpisodes > 0 ? totalEpisodes : null
  if (total === null) {
    return { watched, total: null, percent: null }
  }
  const percent = Math.max(0, Math.min(100, (watched / total) * 100))
  return { watched, total, percent }
}

/** Formatea el progreso como en Odoo: `03/12` o `03/—` si es desconocido. */
export function formatProgress(progress: Progress): string {
  const total = progress.total === null ? '—' : String(progress.total)
  return `${progress.watched}/${total}`
}
