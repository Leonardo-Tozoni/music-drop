import { useState } from 'react'
import type { Playlist } from '../types'

interface Props {
  playlists: Playlist[]
  selectedPlaylistId: string | null
  trackCount: number
  onSelectAll: () => void
  onSelectPlaylist: (id: string) => void
  onCreatePlaylist: (name: string) => void
  onDeletePlaylist: (id: string) => void
}

export default function Sidebar({
  playlists, selectedPlaylistId, trackCount,
  onSelectAll, onSelectPlaylist, onCreatePlaylist, onDeletePlaylist,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    onCreatePlaylist(newName.trim())
    setNewName('')
    setCreating(false)
  }

  const handleCancel = () => {
    setCreating(false)
    setNewName('')
  }

  return (
    <aside className="sidebar">
      <div
        className={`sidebar-item${selectedPlaylistId === null ? ' active' : ''}`}
        onClick={onSelectAll}
      >
        <span>Todas as músicas</span>
        <span className="sidebar-count">{trackCount}</span>
      </div>

      <div className="sidebar-section-title">
        <span>Playlists</span>
        <button
          className="sidebar-add-btn"
          onClick={() => setCreating(true)}
          title="Nova playlist"
        >+</button>
      </div>

      {creating && (
        <form className="create-playlist-form" onSubmit={handleCreate}>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da playlist..."
          />
          <div className="create-playlist-actions">
            <button type="submit" className="btn-primary" disabled={!newName.trim()}>
              Criar
            </button>
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              ×
            </button>
          </div>
        </form>
      )}

      {playlists.map((pl) => (
        <div
          key={pl.id}
          className={`sidebar-item${selectedPlaylistId === pl.id ? ' active' : ''}`}
          onClick={() => onSelectPlaylist(pl.id)}
        >
          <span className="sidebar-playlist-name">♪ {pl.name}</span>
          <button
            className="sidebar-delete-btn"
            title="Deletar playlist"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Deletar playlist "${pl.name}"?`)) onDeletePlaylist(pl.id)
            }}
          >
            ×
          </button>
        </div>
      ))}

      {playlists.length === 0 && !creating && (
        <div className="sidebar-empty">Nenhuma playlist</div>
      )}
    </aside>
  )
}
