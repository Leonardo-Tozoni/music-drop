import { useState } from 'react'
import type { Track } from '../types'

interface Props {
  allTracks: Track[]
  existingTrackIds: Set<string>
  onAdd: (trackIds: string[]) => void
  onClose: () => void
}

export default function AddTracksModal({ allTracks, existingTrackIds, onAdd, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const available = allTracks.filter((t) => !existingTrackIds.has(t.id))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar músicas</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {available.length === 0 ? (
          <p className="add-tracks-empty">Todas as músicas já estão na playlist.</p>
        ) : (
          <>
            <div className="add-tracks-list">
              {available.map((track) => (
                <label
                  key={track.id}
                  className={`add-track-item${selected.has(track.id) ? ' selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(track.id)}
                    onChange={() => toggle(track.id)}
                  />
                  <div className="add-track-info">
                    <span className="add-track-name">{track.name}</span>
                    <span className="add-track-meta">{track.band} · {track.key}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={selected.size === 0}
                onClick={() => onAdd([...selected])}
              >
                {selected.size > 0 ? `Adicionar (${selected.size})` : 'Adicionar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
