import { useStore } from '../store'
import { t } from '../i18n/translations'
import { useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const RISK_COLOR = { LOW:'#639922', MEDIUM:'#e07c1a', HIGH:'#c0392b', CRITICAL:'#7F0000' }
const RISK_BG    = { LOW:'#eaf3de', MEDIUM:'#fff8ed', HIGH:'#fff0f0', CRITICAL:'#f7c1c1' }
const RISK_BORDER= { LOW:'#c0dd97', MEDIUM:'#fac775', HIGH:'#f7c1c1', CRITICAL:'#f09595' }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; }
  .dp-root { font-family:'DM Sans',sans-serif; background:#f7f5f0; min-height:100vh; display:flex; flex-direction:column; gap:10px; padding-bottom:80px; }
  .dp-header { background:linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%); padding:20px 16px 28px; position:relative; overflow:hidden; }
  .dp-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:18px; background:#f7f5f0; border-radius:18px 18px 0 0; }
  .dp-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:600; color:#f5f0e8; margin-bottom:2px; }
  .dp-sub { font-size:11px; color:rgba(245,240,232,0.5); font-weight:300; letter-spacing:0.04em; margin-bottom:16px; }
  .dp-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .dp-stat { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 8px; text-align:center; backdrop-filter:blur(4px); }
  .dp-stat-val { font-family:'Playfair Display',serif; font-size:22px; font-weight:600; line-height:1; margin-bottom:3px; }
  .dp-stat-lbl { font-size:9px; color:rgba(245,240,232,0.5); font-weight:300; letter-spacing:0.06em; text-transform:uppercase; }
  .dp-section { padding:0 16px; }
  .dp-section-label { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#999; margin-bottom:6px; margin-left:2px; }
  .dp-card { background:#fff; border-radius:16px; border:1px solid #ece8df; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
  .dp-card-inner { padding:14px 16px; }
  .dp-insight { padding:10px 14px; border-radius:12px; margin-bottom:8px; border:1px solid; font-size:12px; line-height:1.55; }
  .dp-insight:last-child { margin-bottom:0; }
  .dp-insight-icon { font-size:14px; margin-right:5px; }
  .dp-history-row { display:flex; justify-content:space-between; align-items:center; padding:9px 16px; border-bottom:1px solid #f4f1eb; }
  .dp-history-row:last-child { border-bottom:none; }
  .dp-food-name { font-size:13px; font-weight:600; color:#1a3d2b; }
  .dp-food-date { font-size:10px; color:#aaa; font-weight:300; margin-top:1px; }
  .dp-risk-pill { font-size:9px; padding:3px 9px; border-radius:10px; font-weight:600; letter-spacing:0.04em; border:1px solid; }
  .dp-score-bar-wrap { margin-top:4px; }
  .dp-score-bar-bg { height:3px; background:#f0ede8; border-radius:2px; overflow:hidden; width:80px; }
  .dp-score-bar { height:3px; border-radius:2px; transition:width 0.8s ease; }
  .dp-empty { text-align:center; padding:40px 16px; color:#aaa; font-size:13px; font-weight:300; line-height:1.7; }
  .dp-grade { font-family:'Playfair Display',serif; font-size:36px; font-weight:600; line-height:1; }
  .dp-donut-wrap { display:flex; align-items:center; gap:16px; padding:14px 16px; }
  .dp-legend { display:flex; flex-direction:column; gap:6px; flex:1; }
  .dp-legend-row { display:flex; align-items:center; gap:8px; font-size:11px; }
  .dp-legend-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .dp-legend-label { color:#555; flex:1; }
  .dp-legend-count { font-weight:600; color:#1a3d2b; font-size:12px; }
  .dp-weekly-bar { display:flex; align-items:flex-end; gap:4px; height:60px; }
  .dp-week-col { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; }
  .dp-week-bar { width:100%; border-radius:4px 4px 0 0; transition:height 0.6s ease; min-height:2px; }
  .dp-week-label { font-size:8px; color:#aaa; font-weight:300; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .dp-fade { animation:fadeUp 0.3s ease forwards; }
`

function DonutChart({ data, size = 100 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  let offset = 0
  const r = 38
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  const slices = data.map(d => {
    const pct = d.value / total
    const dash = pct * circumference
    const slice = { ...d, dash, offset: offset * circumference }
    offset += pct
    return slice
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f1eb" strokeWidth="14" />
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="14"
          strokeDasharray={`${s.dash} ${circumference}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}

export default function DiaryPage() {
  const { scanHistory, lang } = useStore()
  const [aiInsights, setAiInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)

  const total  = scanHistory.length
  const high   = scanHistory.filter(s => ['HIGH','CRITICAL'].includes(s.risk_level)).length
  const avg    = total ? Math.round(scanHistory.reduce((a, s) => a + (s.safety_score || 50), 0) / total) : 0
  const grade  = avg >= 80 ? 'A' : avg >= 65 ? 'B' : avg >= 50 ? 'C' : avg >= 35 ? 'D' : 'F'
  const gradeColor = grade === 'A' ? '#27500A' : grade === 'B' ? '#639922' : grade === 'C' ? '#e07c1a' : '#c0392b'

  // Risk distribution
  const riskCounts = ['LOW','MEDIUM','HIGH','CRITICAL'].map(r => ({
    label: r,
    value: scanHistory.filter(s => s.risk_level === r).length,
    color: RISK_COLOR[r],
  })).filter(r => r.value > 0)

  // Last 7 days weekly breakdown
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)
    const dateStr = d.toDateString()
    const scans = scanHistory.filter(s => new Date(s.date).toDateString() === dateStr)
    const avgScore = scans.length
      ? Math.round(scans.reduce((a, s) => a + (s.safety_score || 50), 0) / scans.length)
      : 0
    return { label, scans: scans.length, avgScore }
  })
  const maxScans = Math.max(...weekDays.map(d => d.scans), 1)

  // Most scanned foods
  const foodFreq = scanHistory.reduce((acc, s) => {
    acc[s.food_name] = (acc[s.food_name] || 0) + 1
    return acc
  }, {})
  const topFoods = Object.entries(foodFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Fetch AI insights when history changes
  useEffect(() => {
    if (scanHistory.length < 3) return
    setLoadingInsights(true)
    const summary = scanHistory.slice(0, 10).map(s => ({
      food: s.food_name,
      risk: s.risk_level,
      score: s.safety_score,
    }))
    fetch(`${API_URL}/scan/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_name: `DIARY_ANALYSIS: ${JSON.stringify(summary)}`,
        lang,
      }),
    })
    .then(r => r.json())
    .then(data => {
      // Use verdict + summary as insight
      if (data.verdict || data.summary) {
        setAiInsights({
          main: data.verdict || data.summary,
          warning: data.cookingWarning || null,
          tip: data.buyingTips?.[0] || null,
        })
      }
    })
    .catch(() => {})
    .finally(() => setLoadingInsights(false))
  }, [scanHistory.length])

  return (
    <div className="dp-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="dp-header">
        <div className="dp-title">Food Safety Diary</div>
        <div className="dp-sub">Your personal adulteration exposure tracker</div>
        <div className="dp-stats">
          <div className="dp-stat">
            <div className="dp-stat-val" style={{ color: '#c9a84c' }}>{total}</div>
            <div className="dp-stat-lbl">Total Scans</div>
          </div>
          <div className="dp-stat">
            <div className="dp-stat-val" style={{ color: high > 0 ? '#E24B4A' : '#c9a84c' }}>{high}</div>
            <div className="dp-stat-lbl">High Risk</div>
          </div>
          <div className="dp-stat">
            <div className="dp-grade" style={{ color: gradeColor }}>{total ? grade : '—'}</div>
            <div className="dp-stat-lbl">Safety Grade</div>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="dp-empty">
          No scans yet.<br />
          Start scanning food to build<br />your safety diary.
        </div>
      ) : (
        <>
          {/* Risk Distribution */}
          <div className="dp-section dp-fade">
            <div className="dp-section-label">Risk Distribution</div>
            <div className="dp-card">
              <div className="dp-donut-wrap">
                <DonutChart data={riskCounts} size={100} />
                <div className="dp-legend">
                  {riskCounts.map((r, i) => (
                    <div key={i} className="dp-legend-row">
                      <div className="dp-legend-dot" style={{ background: r.color }} />
                      <span className="dp-legend-label">{r.label}</span>
                      <span className="dp-legend-count">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="dp-section dp-fade">
            <div className="dp-section-label">Last 7 Days</div>
            <div className="dp-card">
              <div className="dp-card-inner">
                <div className="dp-weekly-bar">
                  {weekDays.map((d, i) => (
                    <div key={i} className="dp-week-col">
                      <div className="dp-week-bar" style={{
                        height: d.scans ? `${(d.scans / maxScans) * 48}px` : '2px',
                        background: d.scans
                          ? `linear-gradient(180deg, #c9a84c, #1a3d2b)`
                          : '#f0ede8',
                      }} />
                      <div className="dp-week-label">{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Foods */}
          {topFoods.length > 0 && (
            <div className="dp-section dp-fade">
              <div className="dp-section-label">Most Scanned</div>
              <div className="dp-card">
                {topFoods.map(([food, count], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: i < topFoods.length - 1 ? '1px solid #f4f1eb' : 'none',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3d2b' }}>{food}</div>
                    <div style={{ fontSize: 11, color: '#aaa', fontWeight: 300 }}>{count}× scanned</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {(aiInsights || loadingInsights) && (
            <div className="dp-section dp-fade">
              <div className="dp-section-label">AI Insights</div>
              <div className="dp-card">
                <div className="dp-card-inner">
                  {loadingInsights ? (
                    <div style={{ fontSize: 12, color: '#aaa', fontWeight: 300, padding: '4px 0' }}>
                      🤖 Analyzing your scan history…
                    </div>
                  ) : (
                    <>
                      {aiInsights?.main && (
                        <div className="dp-insight" style={{ background: '#f5f7f3', borderColor: '#e0e8da', color: '#1a3d2b' }}>
                          <span className="dp-insight-icon">💡</span>{aiInsights.main}
                        </div>
                      )}
                      {aiInsights?.warning && (
                        <div className="dp-insight" style={{ background: '#fff0f0', borderColor: '#f7c1c1', color: '#791F1F' }}>
                          <span className="dp-insight-icon">⚠️</span>{aiInsights.warning}
                        </div>
                      )}
                      {aiInsights?.tip && (
                        <div className="dp-insight" style={{ background: '#fff8ed', borderColor: '#fac775', color: '#633806' }}>
                          <span className="dp-insight-icon">→</span>{aiInsights.tip}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Avg score */}
          <div className="dp-section dp-fade">
            <div className="dp-section-label">Average Safety Score</div>
            <div className="dp-card">
              <div className="dp-card-inner" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 600,
                  background: avg >= 75 ? '#eaf3de' : avg >= 50 ? '#fff8ed' : '#fff0f0',
                  color: avg >= 75 ? '#27500A' : avg >= 50 ? '#633806' : '#791F1F',
                  border: `2px solid ${avg >= 75 ? '#c0dd97' : avg >= 50 ? '#fac775' : '#f7c1c1'}`,
                }}>
                  {avg}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3d2b', marginBottom: 6 }}>
                    {avg >= 80 ? 'Excellent food choices' : avg >= 65 ? 'Good overall' : avg >= 50 ? 'Room for improvement' : 'High risk diet detected'}
                  </div>
                  <div style={{ height: 6, background: '#f0ede8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${avg}%`,
                      background: avg >= 75 ? '#639922' : avg >= 50 ? '#e07c1a' : '#c0392b',
                      transition: 'width 1s ease',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scan History */}
          <div className="dp-section dp-fade">
            <div className="dp-section-label">Recent Scans</div>
            <div className="dp-card">
              {scanHistory.slice(0, 20).map((s, i) => (
                <div key={s.id || i} className="dp-history-row">
                  <div>
                    <div className="dp-food-name">{s.food_name}</div>
                    <div className="dp-food-date">{new Date(s.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                    <div className="dp-score-bar-wrap">
                      <div className="dp-score-bar-bg">
                        <div className="dp-score-bar" style={{
                          width: `${s.safety_score || 50}%`,
                          background: RISK_COLOR[s.risk_level] || '#639922',
                        }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="dp-risk-pill" style={{
                      background: RISK_BG[s.risk_level] || '#eee',
                      color: RISK_COLOR[s.risk_level] || '#666',
                      borderColor: RISK_BORDER[s.risk_level] || '#ddd',
                    }}>
                      {s.risk_level || '?'}
                    </span>
                    <div style={{ fontSize: 11, color: '#aaa', fontWeight: 300, marginTop: 4 }}>
                      {s.safety_score || 50}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}