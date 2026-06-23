export interface Track {
  id: string
  name: string
  band: string
  key: string
  file_path: string
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
