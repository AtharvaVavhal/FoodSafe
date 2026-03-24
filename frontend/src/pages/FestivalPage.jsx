import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const API_URL = '/api'

const RISK_CONFIG = {
  LOW:      { bg:'#eaf3de', text:'#27500A', border:'#c0dd97', bar:'#639922' },
  MEDIUM:   { bg:'#fff8ed', text:'#633806', border:'#fac775', bar:'#e07c1a' },
  HIGH:     { bg:'#fff0f0', text:'#791F1F', border:'#f7c1c1', bar:'#c0392b' },
  CRITICAL: { bg:'#A32D2D', text:'#fff',    border:'#7F0000', bar:'#7F0000' },
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; }
  .fep-root { font-family:'DM Sans',sans-serif; background:#f7f5f0; min-height:100vh; display:flex; flex-direction:column; gap:10px; padding-bottom:80px; }
  .fep-header { position:relative; overflow:hidden; padding:20px 16px 28px; }
  .fep-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:18px; background:#f7f5f0; border-radius:18px 18px 0 0; }
  .fep-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:600; color:#f5f0e8; margin-bottom:2px; }
  .fep-sub { font-size:11px; color:rgba(245,240,232,0.5); font-weight:300; letter-spacing:0.04em; margin-bottom:16px; }
  .fep-current { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); border-radius:14px; padding:14px; backdrop-filter:blur(4px); }
  .fep-fest-icon { font-size:28px; margin-bottom:6px; display:block; }
  .fep-fest-name { font-family:'Playfair Display',serif; font-size:18px; font-weight:600; color:#f5f0e8; margin-bottom:2px; }
  .fep-fest-headline { font-size:12px; color:rgba(245,240,232,0.65); font-weight:300; line-height:1.5; margin-bottom:10px; }
  .fep-risk-pill { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:600; padding:4px 12px; border-radius:20px; letter-spacing:0.04em; border:1px solid; }
  .fep-section { padding:0 16px; }
  .fep-section-label { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#999; margin-bottom:6px; margin-left:2px; }
  .fep-card { background:#fff; border-radius:16px; border:1px solid #ece8df; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
  .fep-food-row { display:flex; justify-content:space-between; align-items:center; padding:11px 16px; border-bottom:1px solid #f4f1eb; }
  .fep-food-row:last-child { border-bottom:none; }
  .fep-food-name { font-size:13px; font-weight:600; color:#1a3d2b; }
  .fep-food-concern { font-size:11px; color:#888; font-weight:300; margin-top:2px; }
  .fep-sev { font-size:9px; padding:3px 8px; border-radius:10px; font-weight:600; border:1px solid; flex-shrink:0; }
  .fep-tip-row { display:flex; gap:8px; align-items:flex-start; padding:9px 16px; border-bottom:1px solid #f4f1eb; font-size:12px; color:#444; }
  .fep-tip-row:last-child { border-bottom:none; }
  .fep-tip-arrow { color:#c9a84c; font-weight:700; flex-shrink:0; font-size:13px; }
  .fep-season-row { display:flex; justify-content:space-between; align-items:center; padding:11px 16px; border-bottom:1px solid #f4f1eb; }
  .fep-season-row:last-child { border-bottom:none; }
  .fep-season-left { display:flex; align-items:center; gap:10px; }
  .fep-season-icon { font-size:20px; }
  .fep-season-name { font-size:13px; font-weight:600; color:#1a3d2b; }
  .fep-season-months { font-size:10px; color:#aaa; font-weight:300; margin-top:1px; }
  .fep-season-concern { font-size:11px; color:#888; font-weight:300; }
  .fep-loading { text-align:center; padding:40px 16px; color:#aaa; font-size:13px; font-weight:300; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fep-fade { animation:fadeUp 0.3s ease forwards; }
`

export default function FestivalPage() {
  const { lang } = useStore()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/festival/current?lang=${lang}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lang])

  if (loading) {
    return (
      <div className="fep-root">
        <style>{STYLES}</style>
        <div className="fep-loading">{t(lang, 'loadingFestival')}</div>
      </div>
    )
  }

  if (!data) return null

  const cfg = RISK_CONFIG[data.risk] || RISK_CONFIG.MEDIUM

  // Hero gradient based on risk
  const heroBg = data.risk === 'LOW'
    ? 'linear-gradient(160deg,#0d2818,#1a3d2b)'
    : data.risk === 'MEDIUM'
    ? 'linear-gradient(160deg,#2a1a00,#3d2800)'
    : data.risk === 'HIGH'
    ? 'linear-gradient(160deg,#2a0808,#3d1010)'
    : 'linear-gradient(160deg,#1a0000,#2d0000)'

  return (
    <div className="fep-root">
      <style>{STYLES}</style>

      {/* Hero */}
      <div className="fep-header" style={{ background: heroBg }}>
        <div className="fep-title">{t(lang, 'festivalSafetyGuide')}</div>
        <div className="fep-sub">{t(lang, 'festivalSafetySub')}</div>

        <div className="fep-current">
          <span className="fep-fest-icon">{data.icon}</span>
          <div className="fep-fest-name">{data.festival}</div>
          <div className="fep-fest-headline">{data.headline}</div>
          <span className="fep-risk-pill" style={{ background:cfg.bg, color:cfg.text, borderColor:cfg.border }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.bar, display:'inline-block' }} />
            {data.risk} {t(lang, 'riskSeason')}
          </span>
        </div>
      </div>

      {/* Risky foods */}
      {data.riskyFoods?.length > 0 && (
        <div className="fep-section fep-fade">
          <div className="fep-section-label">{t(lang, 'riskyFoodsSeason')}</div>
          <div className="fep-card">
            {data.riskyFoods.map((f, i) => (
              <div key={i} className="fep-food-row">
                <div>
                  <div className="fep-food-name">{f.name}</div>
                  <div className="fep-food-concern">{f.concern}</div>
                </div>
                <span className="fep-sev" style={{
                  background: RISK_CONFIG[f.severity]?.bg || '#eee',
                  color:      RISK_CONFIG[f.severity]?.text || '#333',
                  borderColor:RISK_CONFIG[f.severity]?.border || '#ddd',
                }}>{f.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {data.tips?.length > 0 && (
        <div className="fep-section fep-fade">
          <div className="fep-section-label">{t(lang, 'safetyTips')}</div>
          <div className="fep-card">
            {data.tips.map((tip, i) => (
              <div key={i} className="fep-tip-row">
                <span className="fep-tip-arrow">→</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All seasons */}
      {data.allSeasons?.length > 0 && (
        <div className="fep-section fep-fade">
          <div className="fep-section-label">{t(lang, 'yearRoundCalendar')}</div>
          <div className="fep-card">
            {data.allSeasons.map((s, i) => (
              <div key={i} className="fep-season-row">
                <div className="fep-season-left">
                  <span className="fep-season-icon">{s.icon}</span>
                  <div>
                    <div className="fep-season-name">{s.name}</div>
                    <div className="fep-season-months">{s.months}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span className="fep-sev" style={{
                    background: RISK_CONFIG[s.risk]?.bg || '#eee',
                    color:      RISK_CONFIG[s.risk]?.text || '#333',
                    borderColor:RISK_CONFIG[s.risk]?.border || '#ddd',
                    display:'inline-block', marginBottom:3,
                  }}>{s.risk}</span>
                  <div className="fep-season-concern">{s.topConcern}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}