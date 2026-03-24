import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { analyzeLabel } from '../services/claude'
import { scanFoodAPI, scanCombinationAPI } from '../services/api'
import ScanLoader from '../components/ScanLoader'

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

const PREMIUM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; }

  .fs-root {
    font-family: 'DM Sans', sans-serif;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #0a0f16;
    min-height: 100vh;
    padding: 0 0 80px;
  }

  .fs-hero {
    background: linear-gradient(160deg, #0d2818 0%, #1a3d2b 60%, #1e4d34 100%);
    padding: 24px 16px 32px;
    position: relative;
    overflow: hidden;
  }

  .fs-hero::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .fs-hero::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 20px;
    background: #0a0f16;
    border-radius: 20px 20px 0 0;
  }

  .fs-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .fs-brand-icon {
    width: 36px; height: 36px;
    background: rgba(201,168,76,0.2);
    border: 1px solid rgba(201,168,76,0.4);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  .fs-brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: #f5f0e8;
    letter-spacing: -0.01em;
  }

  .fs-brand-sub {
    font-size: 10px;
    color: rgba(245,240,232,0.5);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 300;
    margin-top: 1px;
  }

  .fs-search-wrap {
    position: relative;
    margin-bottom: 12px;
  }

  .fs-search-input {
    width: 100%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(245,240,232,0.2);
    border-radius: 14px;
    padding: 14px 48px 14px 18px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #f5f0e8;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    backdrop-filter: blur(8px);
  }

  .fs-search-input::placeholder { color: rgba(245,240,232,0.4); }
  .fs-search-input:focus {
    border-color: rgba(201,168,76,0.5);
    background: rgba(255,255,255,0.12);
  }

  .fs-search-clear {
    position: absolute; right: 14px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none;
    color: rgba(245,240,232,0.5); font-size: 18px;
    cursor: pointer; padding: 0; line-height: 1;
  }

  .fs-scan-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #c9a84c 0%, #e0c068 100%);
    color: #0d2818;
    font-size: 14px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: opacity 0.2s, transform 0.1s;
    box-shadow: 0 4px 16px rgba(201,168,76,0.35);
  }

  .fs-scan-btn:disabled {
    background: rgba(255,255,255,0.1);
    color: rgba(245,240,232,0.3);
    box-shadow: none;
    cursor: not-allowed;
  }

  .fs-scan-btn:not(:disabled):active { transform: scale(0.98); }

  @keyframes scanGlow {
    0%, 100% { box-shadow: 0 4px 16px rgba(201,168,76,0.35); }
    50% { box-shadow: 0 4px 30px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.15); }
  }
  .fs-scan-btn:not(:disabled) { animation: scanGlow 3s ease infinite; }

  .fs-mode-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .fs-mode-btn {
    flex: 1;
    padding: 9px 4px;
    border-radius: 10px;
    border: 1px solid rgba(245,240,232,0.15);
    background: rgba(255,255,255,0.06);
    color: rgba(245,240,232,0.7);
    font-size: 11px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    backdrop-filter: blur(4px);
  }

  .fs-mode-btn:hover {
    background: rgba(255,255,255,0.12);
    border-color: rgba(245,240,232,0.3);
  }

  .fs-ticker {
    margin: 0 16px;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    gap: 10px;
    align-items: flex-start;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
  }

  .fs-ticker-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #c9a84c;
    flex-shrink: 0;
    margin-top: 5px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .fs-ticker-label {
    font-size: 9px;
    font-weight: 600;
    color: #c9a84c;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .fs-ticker-text {
    font-size: 11.5px;
    color: rgba(255,255,255,0.7);
    line-height: 1.45;
    font-weight: 400;
  }

  .fs-section {
    padding: 0 16px;
  }

  .fs-section-label {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
    margin-left: 2px;
  }

  .fs-card {
    background: rgba(255,255,255,0.04);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    overflow: hidden;
    transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
    backdrop-filter: blur(10px);
  }

  .fs-card:hover {
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.12);
  }

  .fs-quick-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .fs-quick-btn {
    background: rgba(255,255,255,0.04);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    padding: 14px;
    cursor: pointer;
    text-align: left;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
  }

  .fs-quick-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    border-color: rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.07);
  }

  .fs-quick-icon {
    font-size: 22px;
    margin-bottom: 6px;
    display: block;
  }

  .fs-quick-title {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
    margin-bottom: 2px;
  }

  .fs-quick-sub {
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    font-weight: 300;
  }

  .fs-combo-wrap {
    padding: 14px 16px;
  }

  .fs-combo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .fs-combo-title {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
  }

  .fs-combo-sub {
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    font-weight: 300;
    margin-top: 1px;
  }

  .fs-combo-clear {
    font-size: 10px;
    color: #ff6450;
    background: rgba(255,80,60,0.1);
    border: 1px solid rgba(255,80,60,0.3);
    border-radius: 6px;
    padding: 3px 8px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .fs-chip {
    background: rgba(0,200,150,0.12);
    color: #00e09c;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 500;
    border: 1px solid rgba(0,200,150,0.2);
  }

  .fs-add-food {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    border: 1.5px dashed rgba(0,200,150,0.3);
    background: none;
    cursor: pointer;
    color: #00e09c;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }

  .fs-add-food:hover { background: rgba(0,200,150,0.08); }

  .fs-family-wrap { padding: 14px 16px; }

  .fs-family-title {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
    margin-bottom: 10px;
  }

  .fs-member-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }

  .fs-member-avatar {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: #1a3d2b;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  .fs-error {
    font-size: 11px;
    color: #ff6450;
    background: rgba(255,80,60,0.1);
    padding: 7px 12px;
    border-radius: 8px;
    margin-bottom: 10px;
    border: 1px solid rgba(255,80,60,0.3);
  }

  @keyframes tickerIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .ticker-anim { animation: tickerIn 0.35s ease; }
`

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

  // ── Voice input (Web Speech API) ──────────────────────────────
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
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
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
    const API = '/api'
    fetch(`${API}/fssai/alerts`)
      .then(r => r.json())
      .then(data => { if (data.alerts?.length > 0) setFssaiAlerts(data.alerts.map(a => a.title)) })
      .catch(() => {})
  }, [])

  async function openCamera() {
    setCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      cameraRef.current.srcObject = stream
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
    const video = cameraRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      await handleImageUpload({ target: { files: [file], value: '' } })
    }, 'image/jpeg', 0.9)
  }

  async function handleScan() {
    const foodName = query.trim()
    if (!foodName) return
    setLoading(true); setError('')
    try {
      const profile = activeMember || null
      let result
      if (combinationFoods.length > 0) {
        result = await scanCombinationAPI({ foods: [...combinationFoods, foodName], member_profile: profile, lang })
        result.isCombination = true
      } else {
        try {
          result = await scanFoodAPI({ food_name: foodName, member_profile: profile, lang })
        } catch {
          const { scanFood } = await import('../services/claude')
          result = await scanFood({ foodName, memberProfile: profile, lang })
        }
      }
      addScan({ food_name: foodName, risk_level: result.riskLevel, safety_score: result.safetyScore })
      setLastResult(result)
      nav('/result')
    } catch {
      setError('Scan failed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (e.target.value !== undefined) e.target.value = ''
    setLoading(true); setError('')
    try {
      const API = '/api'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lang', lang)
      const res = await fetch(`${API}/scan/image`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Backend image scan failed')
      const result = await res.json()
      if (result.foodName || result.food_name) {
        addScan({
          food_name: result.foodName || result.food_name || 'Image scan',
          risk_level: result.riskLevel,
          safety_score: result.safetyScore,
        })
      }
      setLastResult(result)
      nav('/result')
    } catch {
      try {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          try {
            const b64 = ev.target.result.split(',')[1]
            const result = await analyzeLabel({ imageBase64: b64, lang })
            setLastResult(result)
            nav('/result')
          } catch {
            setError('Image analysis failed.')
          } finally {
            setLoading(false)
          }
        }
        reader.onerror = () => { setError('Could not read image file.'); setLoading(false) }
        reader.readAsDataURL(file)
        return
      } catch {
        setError('Image analysis failed.')
      }
    }
    setLoading(false)
  }

  const currentAlert = fssaiAlerts[ticker % fssaiAlerts.length]

  return (
    <div className="fs-root">
      <style>{PREMIUM_STYLES}</style>
      {loading && <ScanLoader food={query.trim()} lang={lang} />}

      {/* Camera Modal */}
      {cameraOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12
        }}>
          <video ref={cameraRef} autoPlay playsInline
            style={{ width: '90vw', maxWidth: 400, borderRadius: 12 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={capturePhoto} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#c9a84c', color: '#0d2818', fontWeight: 600,
              fontSize: 14, cursor: 'pointer'
            }}>📸 {t(lang, 'capture')}</button>
            <button onClick={stopCamera} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#A32D2D', color: '#fff', fontWeight: 600,
              fontSize: 14, cursor: 'pointer'
            }}>{t(lang, 'cancel')}</button>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* Hero / Scan area */}
      <div className="fs-hero">
        {/* Brand */}
        <div className="fs-brand">
          <div className="fs-brand-icon">🌿</div>
          <div>
            <div className="fs-brand-name">FoodSafe</div>
            <div className="fs-brand-sub">{t(lang, 'protectPlate') || "PROTECT YOUR FAMILY'S PLATE"}</div>
          </div>
        </div>

        {/* Search */}
        <div className="fs-search-wrap">
          <input
            className="fs-search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder={t(lang, 'placeholder') || 'Search any food — paneer, oil, spices…'}
          />
          {query && (
            <button className="fs-search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        {/* Mode buttons */}
        <div className="fs-mode-row">
          <button className="fs-mode-btn" onClick={() => fileRef.current.click()}>
            🖼️ {t(lang, 'uploadBtn')}
          </button>
          <button className="fs-mode-btn" onClick={openCamera}>
            📷 {t(lang, 'cameraBtn')}
          </button>
          <button
            className={`fs-mode-btn${listening ? ' fs-mic-active' : ''}`}
            onClick={toggleVoice}
            style={listening ? { background: 'rgba(220,30,60,0.3)', borderColor: 'rgba(220,30,60,0.5)', color: '#ff6450' } : {}}
          >
            {listening ? '⏹️' : '🎤'} {t(lang, 'voiceInput')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </div>

        {error && <div className="fs-error">{error}</div>}

        {/* Scan button */}
        <button
          className="fs-scan-btn"
          onClick={handleScan}
          disabled={loading || !query.trim()}
        >
          🔍 {t(lang, 'scanNow') || 'Scan Now'}
        </button>
      </div>

      {/* FSSAI Ticker */}
      <div className="fs-section" style={{ marginTop: 4 }}>
        <div key={ticker} className="fs-ticker ticker-anim">
          <div className="fs-ticker-dot" />
          <div>
            <div className="fs-ticker-label">
              {t(lang, 'fssaiAlert')} {ticker + 1}/{fssaiAlerts.length}
            </div>
            <div className="fs-ticker-text">{currentAlert}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="fs-section">
        <div className="fs-section-label">{t(lang, 'quickActions')}</div>
        <div className="fs-quick-grid">
          {[
            { icon: '🎉', titleKey: 'festivalGuide', subKey: 'festivalGuideSub', to: '/festival' },
            { icon: '🩺', titleKey: 'symptomCheck', subKey: 'symptomCheckSub', to: '/symptoms' },
            { icon: '🗺️', titleKey: 'foodSafetyMap', subKey: 'foodSafetyMapSub', to: '/map' },
          ].map(({ icon, titleKey, subKey, to }) => (
            <button key={to} className="fs-quick-btn" onClick={() => nav(to)}>
              <span className="fs-quick-icon">{icon}</span>
              <div className="fs-quick-title">{t(lang, titleKey)}</div>
              <div className="fs-quick-sub">{t(lang, subKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Combination Risk */}
      <div className="fs-section">
        <div className="fs-section-label">{t(lang, 'combinationRisk')}</div>
        <div className="fs-card">
          <div className="fs-combo-wrap">
            <div className="fs-combo-header">
              <div>
                <div className="fs-combo-title">⚗️ {t(lang, 'combinationRisk') || 'Combination Risk'}</div>
                <div className="fs-combo-sub">{t(lang, 'combinationSub')}</div>
              </div>
              {combinationFoods.length > 0 && (
                <button className="fs-combo-clear" onClick={clearCombination}>{t(lang, 'clear')}</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {combinationFoods.map((f, i) => (
                <span key={i} className="fs-chip">{f}</span>
              ))}
              <button
                className="fs-add-food"
                onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}
              >
                + {t(lang, 'addFood') || 'Add Food'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Family Selector */}
      {family.length > 0 && (
        <div className="fs-section">
          <div className="fs-section-label">{t(lang, 'scanFor')}</div>
          <div className="fs-card">
            <div className="fs-family-wrap">
              <div className="fs-family-title">👨‍👩‍👧 {t(lang, 'scanFor') || 'Scan For'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {family.map(m => {
                  const active = activeMember?.id === m.id
                  return (
                    <button
                      key={m.id}
                      className="fs-member-btn"
                      onClick={() => setActiveMember(active ? null : m)}
                      style={{
                        border: `1.5px solid ${active ? '#1a3d2b' : '#e0e8da'}`,
                        background: active ? '#EAF3DE' : '#f5f7f3',
                        fontWeight: active ? 600 : 400,
                        color: '#1a3d2b',
                      }}
                    >
                      <div className="fs-member-avatar">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      {m.name}
                      {m.conditions?.length > 0 && ' 🩺'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}