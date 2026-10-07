import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toLocalInput } from '../lib/dates'
import type { BandEvent, EventType, Playlist } from '../types'

interface Props {
  event?: BandEvent
  playlists: Playlist[]
  onClose: () => void
  onSaved: (eventId: string) => void
}

export default function EventModal({ event, playlists, onClose, onSaved }: Props) {
  const [type, setType] = useState<EventType>(event?.type ?? 'ensaio')
  const [title, setTitle] = useState(event?.title ?? '')
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(event.starts_at) : '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [setlistId, setSetlistId] = useState(event?.setlist_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const row = {
      type,
      title: title.trim() || (type === 'ensaio' ? 'Ensaio' : 'Show'),
      starts_at: new Date(startsAt).toISOString(),
      location: location.trim(),
      notes: notes.trim(),
      setlist_id: setlistId || null,
    }
    const { data, error: dbError } = event
      ? await supabase.from('events').update(row).eq('id', event.id).select().single()
      : await supabase.from('events').insert(row).select().single()
    setSaving(false)
    if (dbError || !data) { setError('Erro ao salvar: ' + (dbError?.message ?? '')); return }
    onSaved(data.id)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? 'Editar evento' : 'Novo evento'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="segmented">
            <button type="button" className={type === 'ensaio' ? 'active' : ''} onClick={() => setType('ensaio')}>
              Ensaio
            </button>
            <button type="button" className={type === 'show' ? 'active' : ''} onClick={() => setType('show')}>
              Show
            </button>
          </div>
          <label className="form-group">
            <span>Título</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'ensaio' ? 'Ensaio' : 'Ex: Bar do Zé'}
            />
          </label>
          <label className="form-group">
            <span>Data e hora</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </label>
          <label className="form-group">
            <span>Local</span>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Estúdio X" />
          </label>
          <label className="form-group">
            <span>Repertório</span>
            <select value={setlistId} onChange={(e) => setSetlistId(e.target.value)}>
              <option value="">Nenhum</option>
              {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span>Observações</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || !startsAt}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
