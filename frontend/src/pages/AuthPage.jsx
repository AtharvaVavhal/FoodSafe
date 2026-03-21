import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { register, login } from '../services/api'

export default function AuthPage() {
  const { setAuth } = useStore()
  const nav = useNavigate()
  const [mode, setMode]       = useState('login') // login | register
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    if (!email || !password) return
    setLoading(true); setError('')
    try {
      const res = mode === 'register'
        ? await register({ name, email, password, city })
        : await login({ email, password })
      setAuth({ id: res.user_id, name: res.name, email }, res.access_token)
      nav('/')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 500, textAlign: 'center', marginBottom: 4 }}>
        🌿 FoodSafe
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', background: '#f0f0e8', borderRadius: 10, padding: 3 }}>
        {['login', 'register'].map(m => (
          <button key={m} onClick={() => { setMode(m); setError('') }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
              fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
              background: mode === m ? '#fff' : 'transparent',
              fontWeight: mode === m ? 500 : 400,
              color: mode === m ? '#1a3d2b' : '#888',
            }}>
            {m === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '0.5px solid #e0e0d8', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'register' && (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City (e.g. Pune)"
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          </>
        )}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />

        {error && <div style={{ fontSize: 11, color: '#A32D2D' }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            padding: 10, borderRadius: 8, border: 'none',
            background: loading ? '#ccc' : '#1a3d2b',
            color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </div>

      {/* Skip */}
      <button onClick={() => nav('/')}
        style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
        Skip for now →
      </button>
    </div>
  )
}