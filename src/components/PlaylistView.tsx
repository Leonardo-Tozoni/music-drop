import type { Playlist, PlaylistTrackWithTrack } from '../types'

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
            onClick={() => { if (confirm(`Deletar playlist "${playlist.name}"?`)) onDeletePlaylist() }}
          >
            Deletar playlist
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state">
          <p>Playlist vazia.</p>
          <button className="btn-primary" onClick={onAddTracks}>Adicionar músicas</button>
        </div>
      ) : (
        <div className="pv-list">
          <div className="pv-list-header">
            <span>#</span>
            <span>Música</span>
            <span>Banda</span>
            <span>Tom</span>
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
                <span className="pv-num">{active ? '▶' : i + 1}</span>
                <span className="pv-name">{pt.track.name}</span>
                <span className="pv-band">{pt.track.band}</span>
                <span className="track-key">{pt.track.key}</span>
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
                  title="Remover da playlist"
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
