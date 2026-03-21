import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { scanFood, scanCombination, analyzeLabel } from '../services/claude'
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
        result = await scanCombination({ foods: [...combinationFoods, foodName], memberProfile: profile, lang })
        result.isCombination = true
      } else {
        result = await scanFood({ foodName, memberProfile: profile, lang })
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
    setLoading(true); setError('')
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const b64 = ev.target.result.split(',')[1]
        const result = await analyzeLabel({ imageBase64: b64, lang })
        setLastResult(result); nav('/result'); setLoading(false)
      }
      reader.readAsDataURL(file)
    } catch { setError('Image analysis failed.'); setLoading(false) }
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice not supported'); return }
    const rec = new SR()
    rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    rec.onresult = (e) => setQuery(e.results[0][0].transcript)
    rec.onerror = () => setError('Voice recognition failed')
    rec.start()
  }

  const currentAlert = fssaiAlerts[ticker % fssaiAlerts.length]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* FSSAI Alert Ticker */}
      <div key={ticker} style={{
        background: 'linear-gradient(135deg, #fff8ed, #fef3e0)',
        borderRadius: 10, padding: '9px 12px',
        border: '1px solid #fac775',
        display: 'flex', gap: 8, alignItems: 'flex-start',
        animation: 'slideIn 0.4s ease',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#e07c1a', flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', fontWeight: 700,
        }}>!</div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#e07c1a', letterSpacing: '0.08em', marginBottom: 2 }}>
            FSSAI ALERT {ticker + 1}/{fssaiAlerts.length}
          </div>
          <div style={{ fontSize: 11.5, color: '#633806', lineHeight: 1.4, fontWeight: 500 }}>
            {currentAlert}
          </div>
        </div>
      </div>

      {/* Main Scan Card */}
      <div className="card" style={{
        background: '#fff', borderRadius: 16, padding: 18,
        border: '1px solid #e8ede4',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #1a3d2b, #2d6647)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>🔍</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3d2b' }}>{t(lang, 'scan')}</div>
            <div style={{ fontSize: 10, color: '#999' }}>AI-powered adulteration detection</div>
          </div>
        </div>

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: '#f5f7f3', borderRadius: 10,
          border: '1.5px solid #e0e8da', marginBottom: 10,
          overflow: 'hidden',
        }}>
          <span style={{ padding: '0 10px', fontSize: 16 }}>🌾</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder={t(lang, 'placeholder')}
            style={{
              flex: 1, padding: '11px 0', background: 'none',
              border: 'none', fontSize: 13, outline: 'none',
              fontFamily: 'inherit', color: '#1a3d2b',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              padding: '0 12px', background: 'none', border: 'none',
              cursor: 'pointer', color: '#999', fontSize: 16,
            }}>×</button>
          )}
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[
            { label: '📷 Photo', action: () => fileRef.current.click() },
            { label: '🎤 Voice', action: startVoice },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} className="mode-btn" style={{
              padding: '8px 4px', borderRadius: 8,
              border: '1.5px solid #e0e8da', background: '#f5f7f3',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              color: '#1a3d2b', fontWeight: 500,
            }}>
              {btn.label}
            </button>
          ))}
          <BarcodeScanner onResult={(name) => setQuery(name)} onError={(err) => setError(err)} />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>

        {error && (
          <div style={{
            fontSize: 11, color: '#A32D2D', marginBottom: 10,
            background: '#fff0f0', padding: '6px 10px', borderRadius: 6,
          }}>{error}</div>
        )}

        <button onClick={handleScan} disabled={loading || !query.trim()} className="scan-btn" style={{
          width: '100%', padding: 12, borderRadius: 10, border: 'none',
          background: loading || !query.trim()
            ? '#ccc'
            : 'linear-gradient(135deg, #1a3d2b, #2d6647)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.02em',
        }}>
          {loading ? '⏳ ' + t(lang, 'scanning') : '🔍 ' + t(lang, 'scanNow')}
        </button>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: '🎉', title: 'Festival Guide', sub: 'Safe foods for festivals', to: '/festival', color: '#fff8ed', border: '#fac775' },
          { label: '🩺', title: 'Symptom Check', sub: 'Identify food poisoning', to: '/symptoms', color: '#fef0f0', border: '#f7c1c1' },
        ].map(({ label, title, sub, to, color, border }) => (
          <button key={to} onClick={() => nav(to)} className="card" style={{
            padding: '12px 14px', borderRadius: 12,
            border: `1px solid ${border}`,
            background: color, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a3d2b' }}>{title}</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Combination Risk */}
      <div className="card" style={{
        background: '#fff', borderRadius: 16, padding: 16,
        border: '1px solid #e8ede4',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a3d2b' }}>⚗️ {t(lang, 'combinationRisk')}</div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>Check multiple foods together</div>
          </div>
          {combinationFoods.length > 0 && (
            <button onClick={clearCombination} style={{
              fontSize: 10, color: '#A32D2D', background: '#fff0f0',
              border: '1px solid #f7c1c1', borderRadius: 6,
              padding: '3px 8px', cursor: 'pointer',
            }}>Clear</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {combinationFoods.map((f, i) => (
            <span key={i} style={{
              background: '#EAF3DE', color: '#27500A', fontSize: 11,
              padding: '4px 10px', borderRadius: 20, fontWeight: 500,
            }}>{f}</span>
          ))}
          <button onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              border: '1.5px dashed #c0dd97', background: 'none',
              cursor: 'pointer', color: '#27500A', fontFamily: 'inherit',
            }}>
            + {t(lang, 'addFood') || 'Add Food'}
          </button>
        </div>
      </div>

      {/* Family selector */}
      {family.length > 0 && (
        <div className="card" style={{
          background: '#fff', borderRadius: 16, padding: 16,
          border: '1px solid #e8ede4',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a3d2b', marginBottom: 10 }}>
            👨‍👩‍👧 {t(lang, 'scanFor')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {family.map(m => (
              <button key={m.id} onClick={() => setActiveMember(activeMember?.id === m.id ? null : m)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 20,
                border: `1.5px solid ${activeMember?.id === m.id ? '#1a3d2b' : '#e0e8da'}`,
                background: activeMember?.id === m.id ? '#EAF3DE' : '#f5f7f3',
                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                fontWeight: activeMember?.id === m.id ? 600 : 400,
                color: '#1a3d2b',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#1a3d2b', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                {m.name}
                {m.conditions?.length > 0 && ' 🩺'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}