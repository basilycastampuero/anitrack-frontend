import { t } from '@/i18n/en'

/**
 * Formatea el total de episodios de una versión (doc 04): `episodes: 0`
 * significa desconocido/en emisión (o "no aplica" en juegos) — nunca se
 * muestra como "0 episodes".
 */
export function formatEpisodeCount(episodes: number): string {
  return episodes > 0
    ? t.detail.version.episodesCount(episodes)
    : t.detail.version.episodesUnknown
}
