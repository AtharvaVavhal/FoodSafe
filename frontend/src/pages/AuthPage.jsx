import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { register, login } from '../services/api'
import { User, Mail, Lock, MapPin, ArrowRight, ShieldCheck } from 'lucide-react'

export default function AuthPage() {
  const { setAuth } = useStore()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden animate-fade-up">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero section */}
      <div className="text-center mb-10 relative z-10 w-full max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-glass-gradient border border-brand/20 shadow-[0_0_40px_rgba(0,224,156,0.3)] flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-brand" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-2">FoodSafe</h1>
        <p className="text-sm text-white/50 tracking-[0.15em] uppercase font-bold">Protect your family's plate</p>
      </div>

      {/* Authentication Card */}
      <div className="w-full max-w-sm bg-glass-gradient backdrop-blur-2xl rounded-[32px] border border-surface-200 shadow-2xl p-8 relative z-10">

        {/* Toggle Controls */}
        <div className="flex bg-surface-100/50 rounded-2xl p-1.5 mb-8 border border-white/5">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300
                ${mode === m
                  ? 'bg-surface-200 text-brand shadow-sm border border-white/10'
                  : 'text-white/40 hover:text-white/70'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand transition-colors" />
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-surface-100 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all shadow-inner"
                />
              </div>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand transition-colors" />
                <input
                  value={city} onChange={e => setCity(e.target.value)}
                  placeholder="City (e.g. Pune)"
                  className="w-full bg-surface-100 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all shadow-inner"
                />
              </div>
            </>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand transition-colors" />
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" type="email"
              className="w-full bg-surface-100 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all shadow-inner"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand transition-colors" />
            <input
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" type="password"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-surface-100 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all shadow-inner"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit} disabled={loading}
            className={`w-full mt-4 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex justify-center items-center gap-2
              ${loading
                ? 'bg-surface-200 text-white/30 cursor-not-allowed border border-white/5'
                : 'bg-brand text-background hover:scale-[1.02] shadow-[0_4px_24px_rgba(0,224,156,0.3)] hover:shadow-[0_8px_32px_rgba(0,224,156,0.5)] border border-brand-light'}`}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Skip option */}
      <button
        onClick={() => nav('/scan')}
        className="mt-8 text-xs font-bold text-white/30 hover:text-white transition-colors uppercase tracking-[0.2em]"
      >
        Skip for now
      </button>
    </div>
  )
}
