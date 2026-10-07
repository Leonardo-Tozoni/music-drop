import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    // Members are created in the Supabase dashboard; there is no public sign-up
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSending(false)
    if (authError) setError('E-mail ou senha incorretos.')
  }

  return (
    <div className="login-page">
      <div className="modal login-card">
        <h1 className="logo"><img src={logo} alt="Página 404" /><span>Ecossistema</span></h1>
        <form onSubmit={handleSubmit} className="upload-form">
          <label className="form-group">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
              autoFocus
            />
          </label>
          <label className="form-group">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={sending || !email.trim() || !password}>
            {sending ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="form-hint">Esqueceu a senha? Peça para o admin da banda redefinir.</p>
        </form>
      </div>
    </div>
  )
}
