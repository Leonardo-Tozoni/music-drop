import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatSemitones, transposeKey, transposeSheet } from '../lib/transpose'
import type { Track } from '../types'

interface Props {
  tracks: Track[]
  semitonesFor: (trackId: string) => number
  onSemitonesChange: (trackId: string, semitones: number) => void
  onSaved: () => void
}

export default function ChordSheet({ tracks, semitonesFor, onSemitonesChange, onSaved }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  // 'default' means the sheet was opened directly (no in-app history to go back to)
  const cameFromApp = useLocation().key !== 'default'
  const track = tracks.find((t) => t.id === id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState(false)
  const [fontSize, setFontSize] = useState(15)

  if (!track) return <div className="empty-state">Música não encontrada.</div>

  // A track without chords opens straight in the editor
  const showEditor = editing || !track.chords
  const semitones = semitonesFor(track.id)
  const shiftedKey = semitones !== 0 && track.key ? transposeKey(track.key, semitones) : track.key
  const sheet = transposeSheet(track.chords, semitones, track.key)

  const startEdit = () => { setDraft(track.chords); setEditing(true) }

  const save = async () => {
    setSaving(true)
    await supabase.from('tracks').update({ chords: draft }).eq('id', track.id)
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  return (
    <div className={`chord-sheet${stage ? ' stage' : ''}`}>
      <div className="pv-header">
        <div>
          <button className="back-link" onClick={() => (cameFromApp ? navigate(-1) : navigate('/musicas'))}>← Voltar</button>
          <h2 className="pv-title">{track.name}</h2>
          <span className="pv-meta">
            {track.band} · Tom: {shiftedKey || '—'}
            {semitones !== 0 && ` (${formatSemitones(semitones)} do original ${track.key})`}
          </span>
        </div>
        {!showEditor && (
          <div className="pv-actions">
            <div className="pitch-control inline">
              <button className="pitch-btn" onClick={() => onSemitonesChange(track.id, semitones - 1)} title="Meio tom abaixo">−</button>
              <span className="pitch-value">{formatSemitones(semitones)}</span>
              <button className="pitch-btn" onClick={() => onSemitonesChange(track.id, semitones + 1)} title="Meio tom acima">+</button>
            </div>
            <button className="btn-secondary" onClick={() => setFontSize((s) => Math.max(11, s - 2))}>A−</button>
            <button className="btn-secondary" onClick={() => setFontSize((s) => Math.min(32, s + 2))}>A+</button>
            <button className="btn-secondary" onClick={() => setStage((s) => !s)}>
              {stage ? 'Sair do palco' : 'Modo palco'}
            </button>
            <button className="btn-primary" onClick={startEdit}>Editar</button>
          </div>
        )}
      </div>

      {showEditor ? (
        <div className="chord-editor">
          <p className="form-hint">
            Cole a cifra com os acordes na linha de cima da letra. Use fonte de largura fixa para alinhar.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'G         D\nLetra da música aqui...'}
            spellCheck={false}
            autoFocus
          />
          <div className="form-actions">
            {track.chords && (
              <button className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
            )}
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar cifra'}
            </button>
          </div>
        </div>
      ) : (
        <pre className="chord-text" style={{ fontSize }}>{sheet}</pre>
      )}
    </div>
  )
}
