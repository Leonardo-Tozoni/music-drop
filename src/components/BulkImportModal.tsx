import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { lyricSearch, parseSongList, songKey } from '../lib/songList'
import type { Track } from '../types'

interface Props {
  tracks: Track[]
  onClose: () => void
  onSuccess: (playlistId: string | null) => void
}

export default function BulkImportModal({ tracks, onClose, onSuccess }: Props) {
  const [text, setText] = useState('')
  const [createSetlist, setCreateSetlist] = useState(true)
  const [setlistName, setSetlistName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { songs, ignored } = parseSongList(text)
  const existing = new Map(tracks.map((t) => [songKey(t.name, t.band), t.id]))
  const toImport = songs.filter((s, i) =>
    !existing.has(songKey(s.name, s.band))
    // The same song twice in the list is imported once
    && songs.findIndex((o) => songKey(o.name, o.band) === songKey(s.name, s.band)) === i)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    // Key left empty: the import worker estimates it from the recording
    const { data: inserted, error: insertError } = toImport.length
      ? await supabase.from('tracks').insert(toImport.map((s) => ({
          name: s.name,
          band: s.band,
          key: '',
          source: 'youtube',
          youtube_url: lyricSearch(s),
          status: 'pending',
        }))).select('id, name, band')
      : { data: [], error: null }
    if (insertError) { setError('Erro ao criar músicas: ' + insertError.message); setSaving(false); return }

    for (const t of inserted ?? []) existing.set(songKey(t.name, t.band), t.id)

    let playlistId: string | null = null
    if (createSetlist) {
      const { data: playlist, error: plError } = await supabase
        .from('playlists').insert({ name: setlistName.trim() || 'Setlist' }).select().single()
      if (plError || !playlist) { setError('Músicas criadas, mas o repertório falhou: ' + plError?.message); setSaving(false); return }
      playlistId = playlist.id
      const ids = [...new Set(songs.map((s) => existing.get(songKey(s.name, s.band))).filter(Boolean))]
      const { error: ptError } = await supabase.from('playlist_tracks').insert(
        ids.map((trackId, position) => ({ playlist_id: playlist.id, track_id: trackId, position })),
      )
      if (ptError) { setError('Repertório criado, mas sem as músicas: ' + ptError.message); setSaving(false); return }
    }

    onSuccess(playlistId)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importar lista de músicas</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <label className="form-group">
            <span>Uma música por linha, no formato "Música - Artista" (numeração é ignorada)</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={'1 - Livin\' On A Prayer - Bon Jovi\n2 - Enter Sandman - Metallica'}
              autoFocus
            />
          </label>

          {songs.length > 0 && (
            <div className="bulk-preview">
              {songs.map((s, i) => {
                const isNew = toImport.includes(s)
                return (
                  <div key={i} className="bulk-row">
                    <span className="bulk-num">{i + 1}</span>
                    <span className="bulk-name">{s.name}</span>
                    <span className="bulk-band">{s.band}</span>
                    <span className={`badge ${isNew ? 'badge-pending' : ''}`}>{isNew ? 'nova' : 'já existe'}</span>
                  </div>
                )
              })}
              {ignored.length > 0 && (
                <p className="form-hint">Linhas ignoradas: {ignored.join(', ')}</p>
              )}
            </div>
          )}

          <label className="checkbox-row">
            <input type="checkbox" checked={createSetlist} onChange={(e) => setCreateSetlist(e.target.checked)} />
            <span>Criar repertório com essas músicas, nesta ordem</span>
          </label>
          {createSetlist && (
            <label className="form-group">
              <span>Nome do repertório</span>
              <input type="text" value={setlistName} onChange={(e) => setSetlistName(e.target.value)} placeholder="Ex: Show Bar do Zé" />
            </label>
          )}

          <p className="form-hint">
            Cada música é buscada no YouTube na versão lyric de estúdio, e o tom original é estimado pelo áudio
            (confira depois). O importador leva cerca de 20 s por música.
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || songs.length === 0}>
              {saving ? 'Criando...' : `Importar ${toImport.length} música${toImport.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
