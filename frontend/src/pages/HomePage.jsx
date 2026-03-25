import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { scanFoodAPI, scanImageAPI, scanCombinationAPI } from '../services/api'
import ScanLoader from '../components/ScanLoader'
import { Camera, Image as ImageIcon, Mic, Search as SearchIcon, X, Sparkles, HeartPulse, MapPin, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react'

const DEFAULT_ALERTS = [
  "MDH spices flagged for pesticide residue — Apr 2024",
  "Everest Fish Curry Masala recalled — ethylene oxide",
  "Loose turmeric samples fail lead chromate tests in Maharashtra",
  "83% paneer samples fail quality in UP cities — Feb 2024",
  "Honey adulteration with HFCS — NMR test recommended",
  "Argemone oil in mustard oil detected in Rajasthan",
  "Sudan Red dye found in chilli powder — Tamil Nadu",
  "Synthetic milk adulteration in Mawa/Khoya — Maharashtra",
]

export default function HomePage() {
  const { lang, family, activeMember, setActiveMember, addScan, setLastResult, combinationFoods, addCombinationFood, clearCombination } = useStore()
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticker, setTicker] = useState(0)
  const [fssaiAlerts, setFssaiAlerts] = useState(DEFAULT_ALERTS)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [listening, setListening]   = useState(false)

  const fileRef   = useRef()
  const cameraRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()
  const recognitionRef = useRef(null)

  // ── Voice input ───────────────────────────────────────────────
  const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }

  function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser')
      return
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = LANG_MAP[lang] || 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend   = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/fssai/alerts')
      .then(r => r.json())
      .then(data => { if (data.alerts?.length > 0) setFssaiAlerts(data.alerts.map(a => a.title)) })
      .catch(() => {})
  }, [])

  // ── Camera ────────────────────────────────────────────────────
  async function openCamera() {
    setCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (cameraRef.current) cameraRef.current.srcObject = stream
    } catch {
      setCameraOpen(false)
      setError('Camera access denied')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraOpen(false)
  }

  async function capturePhoto() {
    const video  = cameraRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      await handleImageUpload({ target: { files: [file] } })
    }, 'image/jpeg', 0.9)
  }

  // ── Text / combination scan ───────────────────────────────────
  async function handleScan() {
    const foodName = query.trim()
    if (!foodName) return
    setLoading(true)
    setError('')
    try {
      const profile = activeMember || null
      let result
      if (combinationFoods.length > 0) {
        result = await scanCombinationAPI({
          foods: [...combinationFoods, foodName],
          member_profile: profile,
          lang,
        })
        result.isCombination = true
      } else {
        result = await scanFoodAPI({ food_name: foodName, member_profile: profile, lang })
      }
      addScan({ food_name: foodName, risk_level: result.riskLevel, safety_score: result.safetyScore })
      setLastResult(result)
      nav('/result')
    } catch {
      setError('Scan failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Image upload (FIXED) ──────────────────────────────────────
  // FIX 1: Removed broken `analyzeLabel` import and fallback — it didn't exist.
  // FIX 2: Use `scanImageAPI` from api.js (handles multipart/form-data correctly).
  // FIX 3: Removed the early-return bug that left loading=true forever on error.
  // FIX 4: Validate file type and size on the frontend before sending.
  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input so the same file can be re-selected if needed
    if (e.target.value !== undefined) e.target.value = ''

    // Client-side validation (mirrors backend limits)
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 5MB.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lang', lang)

      // scanImageAPI already sets Content-Type: multipart/form-data via axios
      const result = await scanImageAPI(formData)

      const foodName = result.foodName || result.food_name || result.productName || 'Image scan'
      addScan({
        food_name:    foodName,
        risk_level:   result.riskLevel,
        safety_score: result.safetyScore,
      })
      setLastResult(result)
      nav('/result')
    } catch (err) {
      // Show a meaningful error instead of silently failing
      const status = err?.response?.status
      if (status === 413) {
        setError('Image is too large. Please use a smaller photo.')
      } else if (status === 400) {
        setError('Unsupported image format. Please use JPEG, PNG, or WebP.')
      } else {
        setError('Image analysis failed. Please try again or type the food name instead.')
      }
    } finally {
      // FIX 3: This now always runs — no more infinite spinner
      setLoading(false)
    }
  }

  const currentAlert = fssaiAlerts[ticker % fssaiAlerts.length]

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {loading && <ScanLoader food={query.trim()} lang={lang} />}

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-deep/90 backdrop-blur-xl z-[999] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <video ref={cameraRef} autoPlay playsInline className="w-full h-[60vh] object-cover" />
            <div className="absolute inset-0 border-2 border-brand/40 rounded-3xl pointer-events-none m-4
                            after:absolute after:top-0 after:left-1/4 after:w-1/2 after:h-1 after:bg-brand after:animate-pulse-slow" />
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-center gap-4">
              <button onClick={stopCamera} className="w-14 h-14 rounded-full bg-surface-200 border border-white/20 flex items-center justify-center text-white/70 hover:bg-surface-300 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-brand shadow-[0_0_30px_rgba(0,224,156,0.4)] flex items-center justify-center hover:scale-105 transition-transform border-4 border-white/20">
                <div className="w-12 h-12 rounded-full border-2 border-black/20" />
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Hero Interactive Surface */}
      <div className="relative p-7 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden backdrop-blur-2xl mt-2">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className="font-serif text-3xl md:text-4xl text-white font-medium tracking-tight mb-2">What's in your food?</h2>
            <p className="font-sans text-[13px] md:text-sm text-white/50">{t(lang, 'placeholder') || 'Search paneer, complex spices, or ingredients...'}</p>
          </div>

          {/* Search Bar */}
          <div className="relative group w-full">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-brand transition-colors" />
            <input
              className="w-full bg-surface-200 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder-white/40 focus:bg-surface-300 focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10 transition-all shadow-inner"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="E.g. Turmeric powder, Amul Milk..."
            />
            {query && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                onClick={() => setQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Multi-modal Inputs */}
          <div className="flex gap-3 h-20">
            <button
              className="flex-1 rounded-2xl border border-white/10 bg-surface-100 flex flex-col items-center justify-center gap-1.5 hover:bg-surface-200 hover:border-white/20 transition-all hover:-translate-y-1 group"
              onClick={() => fileRef.current.click()}
            >
              <ImageIcon className="w-5 h-5 text-white/60 group-hover:text-gold transition-colors" />
              <span className="text-[11px] font-medium text-white/60 group-hover:text-white">{t(lang, 'uploadBtn')}</span>
            </button>
            <button
              className="flex-1 rounded-2xl border border-white/10 bg-surface-100 flex flex-col items-center justify-center gap-1.5 hover:bg-surface-200 hover:border-white/20 transition-all hover:-translate-y-1 group"
              onClick={openCamera}
            >
              <Camera className="w-5 h-5 text-white/60 group-hover:text-blue-400 transition-colors" />
              <span className="text-[11px] font-medium text-white/60 group-hover:text-white">{t(lang, 'cameraBtn')}</span>
            </button>
            <button
              className={`flex-1 rounded-2xl border transition-all hover:-translate-y-1 group flex flex-col items-center justify-center gap-1.5
                ${listening ? 'bg-red-500/10 border-red-500/30' : 'bg-surface-100 border-white/10 hover:bg-surface-200 hover:border-white/20'}`}
              onClick={toggleVoice}
            >
              <Mic className={`w-5 h-5 transition-colors ${listening ? 'text-red-400 animate-pulse' : 'text-white/60 group-hover:text-purple-400'}`} />
              <span className={`text-[11px] font-medium ${listening ? 'text-red-400' : 'text-white/60 group-hover:text-white'}`}>
                {listening ? 'Listening...' : t(lang, 'voiceInput')}
              </span>
            </button>

            {/* Hidden file input — wired to handleImageUpload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-[12px] text-red-400">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          {/* Scan Button */}
          <button
            className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2
              ${query.trim()
                ? 'bg-brand text-deep shadow-[0_4px_24px_rgba(0,224,156,0.3)] hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,224,156,0.4)] border border-brand-light'
                : 'bg-surface-100 text-white/30 border border-white/5 cursor-not-allowed'}`}
            onClick={handleScan}
            disabled={loading || !query.trim()}
          >
            <SearchIcon className="w-4 h-4" />
            {t(lang, 'scanNow') || 'Analyze Food Safety'}
          </button>
        </div>
      </div>

      {/* FSSAI Ticker */}
      <div className="relative group overflow-hidden rounded-[24px] bg-surface-100 border border-surface-200 p-4 flex gap-4 items-center shadow-lg hover:bg-surface-200 transition-colors cursor-pointer">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping opacity-50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">{t(lang, 'fssaiAlert')}</span>
            <span className="text-[10px] text-white/30">{ticker % fssaiAlerts.length + 1}/{fssaiAlerts.length}</span>
          </div>
          <p className="text-[12px] text-white/80 font-medium truncate group-hover:text-white transition-colors" key={ticker}>
            {currentAlert}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4 pl-1">{t(lang, 'quickActions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Sparkles,  color: 'text-gold',     bg: 'bg-gold/10',     border: 'group-hover:border-gold/30',     title: 'festivalGuide', sub: 'festivalGuideSub', to: '/festival' },
            { icon: HeartPulse,color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'group-hover:border-blue-400/30', title: 'symptomCheck',  sub: 'symptomCheckSub',  to: '/symptoms' },
            { icon: MapPin,    color: 'text-brand',    bg: 'bg-brand/10',    border: 'group-hover:border-brand/30',    title: 'foodSafetyMap', sub: 'foodSafetyMapSub', to: '/map' },
          ].map(({ icon: Icon, color, bg, border, title, sub, to }) => (
            <button key={to} onClick={() => nav(to)} className={`p-4 rounded-[20px] bg-surface-100 border border-surface-200 shadow-sm flex flex-col gap-3 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-surface-200 group ${border}`}>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div className="space-y-0.5">
                <div className="text-[13px] font-semibold text-white/90 group-hover:text-white">{t(lang, title)}</div>
                <div className="text-[10px] text-white/40 leading-snug">{t(lang, sub)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Combination Builder */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4 pl-1">{t(lang, 'combinationRisk') || 'Combination Analysis'}</h3>
        <div className="p-5 rounded-[24px] bg-glass-gradient border border-surface-200 shadow-xl backdrop-blur-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand" />
                <h4 className="text-[13px] font-semibold text-white">Meal Safety Stack</h4>
              </div>
              <p className="text-[11px] text-white/40 mt-1">{t(lang, 'combinationSub')}</p>
            </div>
            {combinationFoods.length > 0 && (
              <button className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-md hover:bg-red-400/20 transition-colors" onClick={clearCombination}>
                {t(lang, 'clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {combinationFoods.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 text-brand text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
                <CheckCircle2 className="w-3 h-3" />
                {f}
              </span>
            ))}
            <button
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 border border-dashed border-white/20 px-3 py-1.5 rounded-full hover:border-white/40 hover:text-white transition-colors"
              onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}
            >
              <Plus className="w-3 h-3" />
              {t(lang, 'addFood') || 'Add to Stack'}
            </button>
          </div>
        </div>
      </div>

      {/* Family Profiles */}
      {family.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4 pl-1">{t(lang, 'scanFor')}</h3>
          <div className="p-4 rounded-[24px] bg-surface-100 border border-surface-200 flex flex-wrap gap-2">
            {family.map(m => {
              const active = activeMember?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMember(active ? null : m)}
                  className={`
                    flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300
                    ${active
                      ? 'bg-brand text-deep border-brand shadow-[0_2px_12px_rgba(0,224,156,0.3)] scale-105 font-bold'
                      : 'bg-surface-200 border-white/5 text-white/60 hover:text-white hover:bg-surface-300 hover:border-white/20 font-medium'}
                  `}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm
                    ${active ? 'bg-deep/20 text-deep' : 'bg-deep text-white/60'}`}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[12px]">{m.name}</span>
                  {m.conditions?.length > 0 && <HeartPulse className={`w-3 h-3 ${active ? 'text-deep/70' : 'text-red-400'}`} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}