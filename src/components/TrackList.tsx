import type { Track } from '../types'

interface Props {
  tracks: Track[]
  currentTrackId: string | null
  onSelect: (id: string) => void
  onDelete: (track: Track) => void
}

export default function TrackList({ tracks, currentTrackId, onSelect, onDelete }: Props) {
  const handleDelete = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()
    if (!confirm(`Deletar "${track.name}"?`)) return
    onDelete(track)
  }

  return (
    <div className="track-list">
      <div className="track-list-header">
        <span>#</span>
        <span>Música</span>
        <span>Banda</span>
        <span>Tom</span>
        <span />
      </div>
      {tracks.map((track, i) => {
        const active = currentTrackId === track.id
        return (
          <div
            key={track.id}
            className={`track-item${active ? ' active' : ''}`}
            onClick={() => onSelect(track.id)}
          >
            <span className="track-num">{active ? '▶' : i + 1}</span>
            <span className="track-name">{track.name}</span>
            <span className="track-band">{track.band}</span>
            <span className="track-key">{track.key}</span>
            <button
              className="delete-btn"
              onClick={(e) => handleDelete(e, track)}
              title="Remover"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
