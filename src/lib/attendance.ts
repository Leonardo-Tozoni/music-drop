import type { AttendanceStatus } from '../types'

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  vou: 'Vou',
  nao_vou: 'Não vou',
  talvez: 'Talvez',
}

export const STATUSES: AttendanceStatus[] = ['vou', 'talvez', 'nao_vou']
