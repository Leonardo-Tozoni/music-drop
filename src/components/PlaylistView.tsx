import { Link } from 'react-router-dom'
import type { Playlist, PlaylistTrackWithTrack } from '../types'
import { PlayIcon } from './Icons'

interface Props {
  playlist: Playlist
  tracks: PlaylistTrackWithTrack[]
  currentTrackId: string | null
  onPlay: (trackId: string) => void
  onReorder: (index: number, direction: 'up' | 'down') => void
  onRemove: (playlistTrackId: string) => void
  onAddTracks: () => void
  onDeletePlaylist: () => void
}

export default function PlaylistView({
  playlist, tracks, currentTrackId,
  onPlay, onReorder, onRemove, onAddTracks, onDeletePlaylist,
}: Props) {
  return (
    <div className="playlist-view">
      <div className="pv-header">
        <div>
          <h2 className="pv-title">♪ {playlist.name}</h2>
          <span className="pv-meta">{tracks.length} {tracks.length === 1 ? 'música' : 'músicas'}</span>
        </div>
        <div className="pv-actions">
          <button className="btn-primary" onClick={onAddTracks}>+ Adicionar músicas</button>
          <button
            className="btn-danger"
            onClick={() => { if (confirm(`Deletar repertório "${playlist.name}"?`)) onDeletePlaylist() }}
          >
            Deletar repertório
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state">
          <p>Repertório vazio.</p>
          <button className="btn-primary" onClick={onAddTracks}>Adicionar músicas</button>
        </div>
      ) : (
        <div className="pv-list">
          <div className="pv-list-header">
            <span>#</span>
            <span>Música</span>
            <span>Banda</span>
            <span>Tom</span>
            <span>Cifra</span>
            <span>Ordem</span>
            <span />
          </div>
          {tracks.map((pt, i) => {
            const active = currentTrackId === pt.track.id
            return (
              <div
                key={pt.id}
                className={`pv-item${active ? ' active' : ''}`}
                onClick={() => onPlay(pt.track.id)}
              >
                <span className="pv-num">{active ? <PlayIcon size={12} /> : i + 1}</span>
                <span className="pv-name">{pt.track.name}</span>
                <span className="pv-band">{pt.track.band}</span>
                <span className="track-key">{pt.track.key}</span>
                <Link
                  to={`/musicas/${pt.track.id}/cifra`}
                  className={`chord-link${pt.track.chords ? ' has-chords' : ''}`}
                  title={pt.track.chords ? 'Ver cifra' : 'Adicionar cifra'}
                  onClick={(e) => e.stopPropagation()}
                >
                  𝄞
                </Link>
                <div className="reorder-btns">
                  <button
                    className="reorder-btn"
                    disabled={i === 0}
                    title="Mover para cima"
                    onClick={(e) => { e.stopPropagation(); onReorder(i, 'up') }}
                  >↑</button>
                  <button
                    className="reorder-btn"
                    disabled={i === tracks.length - 1}
                    title="Mover para baixo"
                    onClick={(e) => { e.stopPropagation(); onReorder(i, 'down') }}
                  >↓</button>
                </div>
                <button
                  className="delete-btn"
                  title="Remover do repertório"
                  onClick={(e) => { e.stopPropagation(); onRemove(pt.id) }}
                >×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
