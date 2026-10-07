import { useState } from 'react'
import { supabase } from '../lib/supabase'

const MIN_PASSWORD = 6

interface Props {
  userId: string
  name: string
  onClose: () => void
  onSaved: (name: string) => void
}

export default function ProfileModal({ userId, name: initialName, onClose, onSaved }: Props) {
  const [name, setName] = useState(initialName)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password && password.length < MIN_PASSWORD) { setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`); return }
    if (password !== confirm) { setError('As senhas não conferem.'); return }

    setSaving(true)
    setError('')
    const trimmed = name.trim()
    if (trimmed && trimmed !== initialName) {
      const { error: dbError } = await supabase.from('profiles').update({ name: trimmed }).eq('id', userId)
      if (dbError) { setError('Erro ao salvar nome: ' + dbError.message); setSaving(false); return }
    }
    if (password) {
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) { setError('Erro ao trocar senha: ' + authError.message); setSaving(false); return }
    }
    onSaved(trimmed || initialName)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Meu perfil</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <label className="form-group">
            <span>Nome na banda</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="form-group">
            <span>Nova senha (deixe em branco para manter)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {password && (
            <label className="form-group">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
