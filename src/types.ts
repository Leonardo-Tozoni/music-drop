export interface Track {
  id: string
  name: string
  band: string
  key: string
  file_path: string | null
  source: 'upload' | 'youtube'
  youtube_url: string | null
  status: 'pending' | 'ready' | 'error'
  error_msg: string | null
  chords: string
  created_at: string
}

export interface Playlist {
  id: string
  name: string
  created_at: string
}

export interface PlaylistTrackWithTrack {
  id: string
  playlist_id: string
  track_id: string
  position: number
  track: Track
}

export interface Profile {
  id: string
  name: string
  instrument: string
}

export type EventType = 'show' | 'ensaio'

export interface BandEvent {
  id: string
  type: EventType
  title: string
  starts_at: string
  location: string
  notes: string
  setlist_id: string | null
  created_by: string | null
  created_at: string
}

export type AttendanceStatus = 'vou' | 'nao_vou' | 'talvez'

export interface Attendance {
  id: string
  event_id: string
  user_id: string
  status: AttendanceStatus
  updated_at: string
}
