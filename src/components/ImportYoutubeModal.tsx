import { useState } from 'react'
import { supabase } from '../lib/supabase'

const YOUTUBE_RE = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//

interface Props {
  onClose: () => void
  onSuccess: () => void
  onBulk: () => void
}

export default function ImportYoutubeModal({ onClose, onSuccess, onBulk }: Props) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [band, setBand] = useState('')
  const [key, setKey] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!YOUTUBE_RE.test(url.trim())) { setError('Cole um link do YouTube.'); return }

    setSending(true)
    setError('')
    // The import worker (server/worker.py) picks up pending rows and downloads the audio;
    // empty name/band are filled from the video's title and channel
    const { error: dbError } = await supabase.from('tracks').insert({
      name: name.trim(),
      band: band.trim(),
      key: key.trim(),
      source: 'youtube',
      youtube_url: url.trim(),
      status: 'pending',
    })
    if (dbError) {
      setError('Erro ao salvar: ' + dbError.message)
      setSending(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importar do YouTube</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <button type="button" className="btn-secondary" onClick={onBulk}>
            Importar uma lista de músicas de uma vez
          </button>
          <label className="form-group">
            <span>Link do YouTube</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              autoFocus
            />
          </label>
          <label className="form-group">
            <span>Nome da Música (opcional — usa o título do vídeo)</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="form-group">
            <span>Banda / Artista (opcional — usa o canal)</span>
            <input type="text" value={band} onChange={(e) => setBand(e.target.value)} />
          </label>
          <label className="form-group">
            <span>Tom</span>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Ex: Am, C, G#m..."
            />
          </label>
          <p className="form-hint">
            O áudio é baixado pelo importador da banda e aparece na lista quando ficar pronto.
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={sending}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={sending || !url.trim()}>
              {sending ? 'Enviando...' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
