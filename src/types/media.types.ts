/** Tipos base del dominio de catálogo (doc 05). */

export type ContentType = 'G' | 'V' // Game | Video
export type VideoType = 'C' | 'M' | 'OVA' | 'ONA' | 'S' | 'TV'

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  C: 'Compilation',
  M: 'Movie',
  OVA: 'OVA',
  ONA: 'ONA',
  S: 'Special',
  TV: 'TV',
}
