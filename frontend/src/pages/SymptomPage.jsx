import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const URGENCY_CONFIG = {
  MONITOR:        { bg:'#eaf3de', color:'#27500A', border:'#c0dd97', icon:'🟢', label:'Monitor at home' },
  CONSULT_DOCTOR: { bg:'#fff8ed', color:'#633806', border:'#fac775', icon:'🟡', label:'Visit a doctor' },
  EMERGENCY:      { bg:'#fff0f0', color:'#791F1F', border:'#f7c1c1', icon:'🔴', label:'Seek emergency care' },
}

const CONF_COLOR = {
  HIGH:   '#791F1F',
  MEDIUM: '#854F0B',
  LOW:    '#27500A',
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; }
  .sp-root { font-family:'DM Sans',sans-serif; background:#f7f5f0; min-height:100vh; display:flex; flex-direction:column; gap:10px; padding-bottom:80px; }
  .sp-header { background:linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%); padding:20px 16px 28px; position:relative; overflow:hidden; }
  .sp-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:18px; background:#f7f5f0; border-radius:18px 18px 0 0; }
  .sp-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:600; color:#f5f0e8; margin-bottom:2px; }
  .sp-sub { font-size:11px; color:rgba(245,240,232,0.5); font-weight:300; letter-spacing:0.04em; margin-bottom:14px; }
  .sp-recent { font-size:11px; color:rgba(245,240,232,0.5); margin-top:10px; font-weight:300; }
  .sp-recent span { color:rgba(245,240,232,0.8); }
  .sp-textarea { width:100%; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:12px 16px; font-size:13px; font-family:'DM Sans',sans-serif; color:#f5f0e8; outline:none; resize:none; transition:border-color 0.2s; line-height:1.55; }
  .sp-textarea::placeholder { color:rgba(245,240,232,0.35); }
  .sp-textarea:focus { border-color:rgba(201,168,76,0.5); }
  .sp-btn { width:100%; padding:13px; border-radius:12px; border:none; background:linear-gradient(135deg,#c9a84c,#e0c068); color:#0d2818; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; box-shadow:0 3px 12px rgba(201,168,76,0.3); transition:opacity 0.15s,transform 0.1s; margin-top:10px; }
  .sp-btn:disabled { background:rgba(255,255,255,0.1); color:rgba(245,240,232,0.3); box-shadow:none; cursor:not-allowed; }
  .sp-btn:not(:disabled):active { transform:scale(0.98); }
  .sp-section { padding:0 16px; }
  .sp-section-label { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#999; margin-bottom:6px; margin-left:2px; }
  .sp-card { background:#fff; border-radius:16px; border:1px solid #ece8df; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
  .sp-urgency { border-radius:14px; padding:14px 16px; border:1px solid; margin-bottom:0; }
  .sp-urgency-label { font-size:16px; font-weight:600; font-family:'Playfair Display',serif; }
  .sp-cause-row { padding:11px 16px; border-bottom:1px solid #f4f1eb; }
  .sp-cause-row:last-child { border-bottom:none; }
  .sp-cause-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; }
  .sp-cause-name { font-size:13px; font-weight:600; color:#1a3d2b; }
  .sp-conf { font-size:10px; font-weight:600; padding:2px 8px; border-radius:10px; }
  .sp-cause-desc { font-size:11px; color:#666; line-height:1.5; }
  .sp-rec { background:linear-gradient(135deg,#0d2818,#1a3d2b); border-radius:14px; padding:14px 16px; font-size:13px; color:#f5f0e8; font-weight:500; line-height:1.55; border:1px solid rgba(201,168,76,0.2); }
  .sp-disclaimer { font-size:10px; color:#aaa; line-height:1.6; padding:0 16px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .sp-fade { animation:fadeUp 0.3s ease forwards; }
`

export default function SymptomPage() {
  const { scanHistory, lang } = useStore()
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const recentFoods = [...new Set(scanHistory.slice(0, 5).map(s => s.food_name))]

  async function analyze() {
    if (!symptoms.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symptoms.trim(), recent_foods: recentFoods }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const urgencyCfg = result?.urgency ? (URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.MONITOR) : null

  return (
    <div className="sp-root">
      <style>{STYLES}</style>

      <div className="sp-header">
        <div className="sp-title">{t(lang, 'symptomChecker')}</div>
        <div className="sp-sub">{t(lang, 'symptomSub')}</div>

        <textarea
          className="sp-textarea"
          rows={4}
          value={symptoms}
          onChange={e => setSymptoms(e.target.value)}
          placeholder={t(lang, 'symptomPlaceholder')}
        />

        {recentFoods.length > 0 && (
          <div className="sp-recent">
            {t(lang, 'recentFoods')}: <span>{recentFoods.join(', ')}</span>
          </div>
        )}

        {error && (
          <div style={{ fontSize:11, color:'#f7c1c1', marginTop:8 }}>{error}</div>
        )}

        <button
          className="sp-btn"
          onClick={analyze}
          disabled={loading || !symptoms.trim()}
        >
          {loading ? `⏳ ${t(lang, 'analyzingSymptoms')}` : `🩺 ${t(lang, 'analyzeSymptoms')}`}
        </button>
      </div>

      {result && !result.error && (
        <>
          {/* Urgency banner */}
          {urgencyCfg && (
            <div className="sp-section sp-fade">
              <div className="sp-urgency" style={{
                background: urgencyCfg.bg,
                borderColor: urgencyCfg.border,
                color: urgencyCfg.color,
              }}>
                <div className="sp-urgency-label">{urgencyCfg.icon} {urgencyCfg.label}</div>
              </div>
            </div>
          )}

          {/* Possible causes */}
          {result.possibleCauses?.length > 0 && (
            <div className="sp-section sp-fade">
              <div className="sp-section-label">{t(lang, 'possibleCauses')}</div>
              <div className="sp-card">
                {result.possibleCauses.map((c, i) => (
                  <div key={i} className="sp-cause-row">
                    <div className="sp-cause-top">
                      <span className="sp-cause-name">{c.adulterant}</span>
                      <span className="sp-conf" style={{
                        color: CONF_COLOR[c.confidence] || '#666',
                        background: c.confidence === 'HIGH' ? '#fff0f0' : c.confidence === 'MEDIUM' ? '#fff8ed' : '#eaf3de',
                      }}>{c.confidence}</span>
                    </div>
                    <div className="sp-cause-desc">via {c.food} — {c.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div className="sp-section sp-fade">
              <div className="sp-section-label">{t(lang, 'recommendation')}</div>
              <div className="sp-rec">💡 {result.recommendation}</div>
            </div>
          )}

          {result.disclaimer && (
            <div className="sp-disclaimer sp-fade">{result.disclaimer}</div>
          )}
        </>
      )}
    </div>
  )
}