import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { Playlist } from '../types'

interface Props {
  playlists: Playlist[]
  trackCount: number
  onCreatePlaylist: (name: string) => void
  onDeletePlaylist: (id: string) => void
}

const itemClass = ({ isActive }: { isActive: boolean }) => `sidebar-item${isActive ? ' active' : ''}`

export default function Sidebar({ playlists, trackCount, onCreatePlaylist, onDeletePlaylist }: Props) {
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
      <NavLink to="/agenda" className={itemClass}>
        <span>📅 Agenda</span>
      </NavLink>
      <NavLink to="/musicas" className={itemClass}>
        <span>🎵 Músicas</span>
        <span className="sidebar-count">{trackCount}</span>
      </NavLink>

      <div className="sidebar-section-title">
        <span>Repertórios</span>
        <button
          className="sidebar-add-btn"
          onClick={() => setCreating(true)}
          title="Novo repertório"
        >+</button>
      </div>

      {creating && (
        <form className="create-playlist-form" onSubmit={handleCreate}>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do repertório..."
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
        <NavLink key={pl.id} to={`/repertorios/${pl.id}`} className={itemClass}>
          <span className="sidebar-playlist-name">♪ {pl.name}</span>
          <button
            className="sidebar-delete-btn"
            title="Deletar repertório"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (confirm(`Deletar repertório "${pl.name}"?`)) onDeletePlaylist(pl.id)
            }}
          >
            ×
          </button>
        </NavLink>
      ))}

      {playlists.length === 0 && !creating && (
        <div className="sidebar-empty">Nenhum repertório</div>
      )}
    </aside>
  )
}
