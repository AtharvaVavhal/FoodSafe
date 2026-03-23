import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { register, login } from '../services/api'

export default function AuthPage() {
  const { setAuth } = useStore()
  const nav = useNavigate()
  const [mode, setMode]         = useState('login')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (!email || !password) return
    setLoading(true); setError('')
    try {
      const res = mode === 'register'
        ? await register({ name, email, password, city })
        : await login({ email, password })
      setAuth({ id: res.user_id, name: res.name, email }, res.access_token)
      nav('/scan')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    padding: '12px 14px', borderRadius: 10,
    border: '1px solid #e0e8da', fontSize: 14,
    fontFamily: 'inherit', outline: 'none', width: '100%',
    background: '#fafaf8', color: '#1a1208',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d2818 0%, #1a3d2b 100%)',
      overflowY: 'auto',
      padding: '40px 20px 40px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🌿</div>
        <div style={{
          fontSize: 24, fontWeight: 700, color: '#f5f0e8',
          fontFamily: "'Playfair Display', serif",
        }}>FoodSafe</div>
        <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', marginTop: 4 }}>
          Protect your family's plate
        </div>
      </div>

      {/* Card */}
      <div style={{
        maxWidth: 400, margin: '0 auto',
        background: '#fff', borderRadius: 24,
        padding: '28px 24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Toggle */}
        <div style={{
          display: 'flex', background: '#f0f4ee',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
              fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
              background: mode === m ? '#fff' : 'transparent',
              fontWeight: mode === m ? 600 : 400,
              color: mode === m ? '#1a3d2b' : '#888',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Full name" style={inp} />
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="City (e.g. Pune)" style={inp} />
            </>
          )}
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" type="email" style={inp} />
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" type="password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inp} />

          {error && (
            <div style={{
              fontSize: 12, color: '#A32D2D',
              background: '#fff0f0', padding: '8px 12px',
              borderRadius: 8, border: '1px solid #f7c1c1',
            }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            padding: '13px', borderRadius: 10, border: 'none',
            background: loading ? '#ccc' : 'linear-gradient(135deg, #1a3d2b, #2d6647)',
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', marginTop: 4,
            boxShadow: '0 4px 16px rgba(26,61,43,0.25)',
          }}>
            {loading ? 'Please wait...' : mode === 'login' ? '→ Login' : '→ Create Account'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => nav('/scan')} style={{
            fontSize: 12, color: '#aaa', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  )
}
