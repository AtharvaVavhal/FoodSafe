import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { scanFood, scanCombination, analyzeLabel } from '../services/claude'

const FSSAI_ALERTS = [
  'FSSAI: MDH spices flagged for pesticide residue — Apr 2024',
  'FSSAI: Loose turmeric samples fail lead chromate tests in Maharashtra',
  'FSSAI: 83% paneer samples fail quality in UP cities — Feb 2024',
  'FSSAI: Honey adulteration with HFCS — NMR tests recommended',
]

export default function HomePage() {
  const { lang, family, activeMember, setActiveMember, addScan, setLastResult, combinationFoods, addCombinationFood, clearCombination } = useStore()
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode]   = useState('text')   // text | camera | voice | barcode
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticker] = useState(0)
  const fileRef = useRef()

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
    } catch (e) {
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
        setLastResult(result)
        nav('/result')
        setLoading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Image analysis failed.'); setLoading(false)
    }
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice not supported in this browser'); return }
    const rec = new SR()
    rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    rec.onresult = (e) => setQuery(e.results[0][0].transcript)
    rec.onerror  = () => setError('Voice recognition failed')
    rec.start()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* FSSAI ticker */}
      <div style={{ background: '#FAEEDA', borderRadius: 8, padding: '7px 10px',
                    fontSize: 11, color: '#854F0B', display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#854F0B', flexShrink: 0 }} />
        {FSSAI_ALERTS[ticker % FSSAI_ALERTS.length]}
      </div>

      {/* Scan card */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 8 }}>
          {t(lang, 'scan')}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder={t(lang, 'placeholder')}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
                     fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { id: 'image', label: t(lang, 'uploadPhoto'), action: () => fileRef.current.click() },
            { id: 'voice', label: t(lang, 'voiceInput'),  action: startVoice },
          ].map(btn => (
            <button key={btn.id} onClick={btn.action}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid #ddd',
                       background: '#f8f9f6', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {btn.label}
            </button>
          ))}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>

        {error && <div style={{ fontSize: 11, color: '#A32D2D', marginBottom: 8 }}>{error}</div>}

        <button onClick={handleScan} disabled={loading || !query.trim()}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none',
                   background: loading || !query.trim() ? '#ccc' : '#1a3d2b',
                   color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? t(lang, 'scanning') : t(lang, 'scanNow')}
        </button>
      </div>

      {/* Combination risk */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 8 }}>
          {t(lang, 'combinationRisk')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {combinationFoods.map((f, i) => (
            <span key={i} style={{ background: '#EAF3DE', color: '#27500A', fontSize: 11,
                                    padding: '3px 8px', borderRadius: 12 }}>
              {f}
            </span>
          ))}
          <button onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, border: '1px dashed #ccc',
                     background: 'none', cursor: 'pointer', color: '#666' }}>
            + {t(lang, 'addFood')||'Add'}
          </button>
          {combinationFoods.length > 0 &&
            <button onClick={clearCombination}
              style={{ fontSize: 11, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear
            </button>
          }
        </div>
      </div>

      {/* Family selector */}
      {family.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 8 }}>
            {t(lang, 'scanFor')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {family.map(m => (
              <button key={m.id} onClick={() => setActiveMember(activeMember?.id === m.id ? null : m)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                         borderRadius: 8, border: `1px solid ${activeMember?.id === m.id ? '#1a3d2b' : '#e0e0d8'}`,
                         background: activeMember?.id === m.id ? '#EAF3DE' : '#f8f9f6',
                         cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#E1F5EE',
                               color: '#0F6E56', fontSize: 9, fontWeight: 500,
                               display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                {m.name}
                {m.conditions?.length > 0 && ' 🩺'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: '🎉 Festival Guide', to: '/festival' },
          { label: '🤒 Symptom Check', to: '/symptoms' },
        ].map(({ label, to }) => (
          <button key={to} onClick={() => nav(to)}
            style={{ padding: 12, borderRadius: 10, border: '0.5px solid #e0e0d8',
                     background: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                     color: '#1a3d2b', fontWeight: 500 }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
