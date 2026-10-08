import { Link } from 'react-router-dom'
import type { Track } from '../types'
import { PlayIcon } from './Icons'

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
        <span>Cifra</span>
        <span />
      </div>
      {tracks.map((track, i) => {
        const active = currentTrackId === track.id
        const ready = track.status === 'ready'
        return (
          <div
            key={track.id}
            className={`track-item${active ? ' active' : ''}${ready ? '' : ' disabled'}`}
            onClick={() => ready && onSelect(track.id)}
          >
            <span className="track-num">{active ? <PlayIcon size={12} /> : i + 1}</span>
            <span className="track-name">
              {track.name || (track.status === 'pending' ? 'Importando…' : 'Sem título')}
              {track.source === 'youtube' && <span className="badge" title={track.youtube_url ?? ''}>YT</span>}
              {track.status === 'pending' && <span className="badge badge-pending">processando…</span>}
              {track.status === 'error' && (
                <span className="badge badge-error" title={track.error_msg ?? ''}>erro</span>
              )}
            </span>
            <span className="track-band">{track.band}</span>
            <span className="track-key">{track.key}</span>
            <Link
              to={`/musicas/${track.id}/cifra`}
              className={`chord-link${track.chords ? ' has-chords' : ''}`}
              title={track.chords ? 'Ver cifra' : 'Adicionar cifra'}
              onClick={(e) => e.stopPropagation()}
            >
              𝄞
            </Link>
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
