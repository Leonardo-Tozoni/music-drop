import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [band, setBand] = useState('')
  const [key, setKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Selecione um arquivo MP3.'); return }

    setUploading(true)
    setError('')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('music')
      .upload(fileName, file, { contentType: 'audio/mpeg' })

    if (uploadError) {
      setError('Erro no upload: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase
      .from('tracks')
      .insert({ name, band, key, file_path: fileName })

    if (dbError) {
      await supabase.storage.from('music').remove([fileName])
      setError('Erro ao salvar: ' + dbError.message)
      setUploading(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Música</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <label className="form-group">
            <span>Arquivo MP3</span>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <label className="form-group">
            <span>Nome da Música</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Música"
              required
            />
          </label>
          <label className="form-group">
            <span>Banda / Artista</span>
            <input
              type="text"
              value={band}
              onChange={(e) => setBand(e.target.value)}
              placeholder="Ex: Minha Banda"
              required
            />
          </label>
          <label className="form-group">
            <span>Tom</span>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Ex: Am, C, G#m..."
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={uploading || !file}>
              {uploading ? 'Enviando...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
