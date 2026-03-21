import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { analyzeLabel } from '../services/claude'
import { scanFoodAPI, scanCombinationAPI } from '../services/api'
import { BarcodeScanner } from '../components/scan'

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
    background: #f7f5f0;
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
    background: #f7f5f0;
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
    background: #fff;
    border-radius: 12px;
    padding: 10px 14px;
    border: 1px solid #ece8df;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
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
    color: #3d2c0a;
    line-height: 1.45;
    font-weight: 400;
  }

  .fs-section {
    padding: 0 16px;
  }

  .fs-section-label {
    font-size: 10px;
    font-weight: 600;
    color: #888;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
    margin-left: 2px;
  }

  .fs-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #ece8df;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    overflow: hidden;
    transition: box-shadow 0.15s;
  }

  .fs-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.07); }

  .fs-quick-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .fs-quick-btn {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #ece8df;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .fs-quick-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .fs-quick-icon {
    font-size: 22px;
    margin-bottom: 6px;
    display: block;
  }

  .fs-quick-title {
    font-size: 12px;
    font-weight: 600;
    color: #1a3d2b;
    margin-bottom: 2px;
  }

  .fs-quick-sub {
    font-size: 10px;
    color: #999;
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
    color: #1a3d2b;
  }

  .fs-combo-sub {
    font-size: 10px;
    color: #999;
    font-weight: 300;
    margin-top: 1px;
  }

  .fs-combo-clear {
    font-size: 10px;
    color: #A32D2D;
    background: #fff0f0;
    border: 1px solid #f7c1c1;
    border-radius: 6px;
    padding: 3px 8px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .fs-chip {
    background: #eaf3de;
    color: #27500A;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 500;
  }

  .fs-add-food {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    border: 1.5px dashed #c0dd97;
    background: none;
    cursor: pointer;
    color: #27500A;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }

  .fs-add-food:hover { background: #f0f9e5; }

  .fs-family-wrap { padding: 14px 16px; }

  .fs-family-title {
    font-size: 12px;
    font-weight: 600;
    color: #1a3d2b;
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
    color: #A32D2D;
    background: #fff0f0;
    padding: 7px 12px;
    border-radius: 8px;
    margin-bottom: 10px;
    border: 1px solid #f7c1c1;
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
  const fileRef = useRef()

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    fetch(`${API}/fssai/alerts`)
      .then(r => r.json())
      .then(data => { if (data.alerts?.length > 0) setFssaiAlerts(data.alerts.map(a => a.title)) })
      .catch(() => {})
  }, [])

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
    e.target.value = ''
    setLoading(true); setError('')
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
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

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice not supported on this browser'); return }
    const rec = new SR()
    rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    rec.onresult = (e) => setQuery(e.results[0][0].transcript)
    rec.onerror = () => setError('Voice recognition failed')
    rec.start()
  }

  const currentAlert = fssaiAlerts[ticker % fssaiAlerts.length]

  return (
    <div className="fs-root">
      <style>{PREMIUM_STYLES}</style>

      {/* Hero / Scan area */}
      <div className="fs-hero">
        {/* Brand */}
        <div className="fs-brand">
          <div className="fs-brand-icon">🌿</div>
          <div>
            <div className="fs-brand-name">FoodSafe</div>
            <div className="fs-brand-sub">Protect your family's plate</div>
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
            📷 Photo
          </button>
          <button className="fs-mode-btn" onClick={startVoice}>
            🎤 Voice
          </button>
          <BarcodeScanner
            onResult={(name) => setQuery(name)}
            onError={(err) => setError(err)}
          />
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
          {loading
            ? '⏳ ' + (t(lang, 'scanning') || 'Scanning…')
            : '🔍 ' + (t(lang, 'scanNow') || 'Scan Now')}
        </button>
      </div>

      {/* FSSAI Ticker */}
      <div className="fs-section" style={{ marginTop: 4 }}>
        <div key={ticker} className="fs-ticker ticker-anim">
          <div className="fs-ticker-dot" />
          <div>
            <div className="fs-ticker-label">
              FSSAI Alert {ticker + 1}/{fssaiAlerts.length}
            </div>
            <div className="fs-ticker-text">{currentAlert}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="fs-section">
        <div className="fs-section-label">Quick Actions</div>
        <div className="fs-quick-grid">
          {[
            { icon: '🎉', title: 'Festival Guide', sub: 'Safe foods for festivals', to: '/festival' },
            { icon: '🩺', title: 'Symptom Check', sub: 'Identify food poisoning', to: '/symptoms' },
          ].map(({ icon, title, sub, to }) => (
            <button key={to} className="fs-quick-btn" onClick={() => nav(to)}>
              <span className="fs-quick-icon">{icon}</span>
              <div className="fs-quick-title">{title}</div>
              <div className="fs-quick-sub">{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Combination Risk */}
      <div className="fs-section">
        <div className="fs-section-label">Combination Risk</div>
        <div className="fs-card">
          <div className="fs-combo-wrap">
            <div className="fs-combo-header">
              <div>
                <div className="fs-combo-title">⚗️ {t(lang, 'combinationRisk') || 'Combination Risk'}</div>
                <div className="fs-combo-sub">Check multiple foods together</div>
              </div>
              {combinationFoods.length > 0 && (
                <button className="fs-combo-clear" onClick={clearCombination}>Clear</button>
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
          <div className="fs-section-label">Scan For</div>
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