import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { useEffect, useState } from 'react'

const RISK_COLORS = {
  LOW:      { bg: '#eaf3de', text: '#27500A', border: '#c0dd97', accent: '#639922' },
  MEDIUM:   { bg: '#fff8ed', text: '#633806', border: '#fac775', accent: '#e07c1a' },
  HIGH:     { bg: '#fff0f0', text: '#791F1F', border: '#f7c1c1', accent: '#c0392b' },
  CRITICAL: { bg: '#A32D2D', text: '#fff',    border: '#A32D2D', accent: '#7F0000' },
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function ResultPage() {
  const { lastResult, lang, activeMember } = useStore()
  const nav = useNavigate()
  const [collab, setCollab] = useState(null)

  useEffect(() => {
    if (!lastResult) return
    const foodName = lastResult.foodName || lastResult.productName
    if (!foodName) return
    fetch(`${API_URL}/recommendations/similar-users/${encodeURIComponent(foodName)}`)
      .then(r => r.json())
      .then(data => { if (data.flag_rate_percent > 0) setCollab(data) })
      .catch(() => {})
  }, [lastResult])

  if (!lastResult) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>No scan result yet.</p>
        <button onClick={() => nav('/')} style={{
          padding: '10px 24px', borderRadius: 10, border: 'none',
          background: '#1a3d2b', color: '#fff', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        }}>← Back to Scan</button>
      </div>
    )
  }

  const r = lastResult
  const risk = r.riskLevel || r.combinedRiskLevel || 'MEDIUM'
  const score = r.safetyScore ?? r.combinedScore ?? 50
  const colors = RISK_COLORS[risk] || RISK_COLORS.MEDIUM

  function shareWhatsApp() {
    const text = `🌿 FoodSafe Report: ${r.foodName || 'Food scan'}\nRisk: ${risk} | Score: ${score}/100\n${r.verdict || ''}\n\nvia FoodSafe app`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  const scoreColor = risk === 'LOW' ? '#639922' : risk === 'MEDIUM' ? '#e07c1a' : risk === 'HIGH' ? '#c0392b' : '#7F0000'
  const circumference = 2 * Math.PI * 22
  const strokeDash = (score / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        .result-card { transition: box-shadow 0.15s ease; }
        .result-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease forwards; }
      `}</style>

      {/* Back */}
      <button onClick={() => nav('/')} style={{
        alignSelf: 'flex-start', fontSize: 12, color: '#666',
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4, padding: 0,
        fontFamily: 'inherit',
      }}>← Back to Scan</button>

      {/* Header card */}
      <div className="result-card fade-up" style={{
        background: '#fff', borderRadius: 16, padding: 18,
        border: '1px solid #e8ede4',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* SVG score ring */}
          <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
            <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r="22" fill="none" stroke="#f0f2ee" strokeWidth="5" />
              <circle cx="30" cy="30" r="22" fill="none"
                stroke={scoreColor} strokeWidth="5"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: scoreColor,
            }}>{score}</div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a3d2b', marginBottom: 4 }}>
              {r.foodName || r.productName || 'Food Item'}
            </div>
            {activeMember && (
              <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
                ⚕ Personalized for {activeMember.name}
              </div>
            )}
            <span style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 20,
              fontWeight: 600, letterSpacing: '0.05em',
              background: colors.bg, color: colors.text,
              border: `1px solid ${colors.border}`,
            }}>
              {risk} RISK
            </span>
          </div>
        </div>

        {r.summary && (
          <p style={{
            fontSize: 12, color: '#555', marginTop: 12,
            lineHeight: 1.6, padding: '10px 12px',
            background: '#f5f7f3', borderRadius: 8,
          }}>{r.summary}</p>
        )}
      </div>

      {/* Warnings */}
      {r.cookingWarning && (
        <div className="fade-up" style={{
          background: '#fff0f0', borderLeft: '3px solid #c0392b',
          borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#791F1F',
        }}>🔥 {r.cookingWarning}</div>
      )}
      {r.personalizedWarning && (
        <div className="fade-up" style={{
          background: '#fff8ed', borderLeft: '3px solid #e07c1a',
          borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#633806',
        }}>⚕ {r.personalizedWarning}</div>
      )}

      {/* Adulterants */}
      {r.adulterants?.length > 0 && (
        <div className="result-card fade-up" style={{
          background: '#fff', borderRadius: 16, padding: 16,
          border: '1px solid #e8ede4',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3d2b', marginBottom: 12, letterSpacing: '0.06em' }}>
            ⚠️ {t(lang, 'adulterants')}
          </div>
          {r.adulterants.map((a, i) => (
            <div key={i} style={{
              padding: '10px 0',
              borderBottom: i < r.adulterants.length - 1 ? '1px solid #f0f2ee' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3d2b' }}>{a.name}</span>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                  background: RISK_COLORS[a.severity]?.bg || '#eee',
                  color: RISK_COLORS[a.severity]?.text || '#333',
                }}>{a.severity}</span>
              </div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>{a.healthRisk}</div>
              {a.isPersonalRisk && (
                <div style={{
                  fontSize: 10, color: '#A32D2D', marginTop: 4,
                  background: '#fff0f0', padding: '3px 8px', borderRadius: 6, display: 'inline-block',
                }}>⚠ High risk for your profile</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Home tests */}
      {r.homeTests?.length > 0 && (
        <div className="result-card fade-up" style={{
          background: '#fff', borderRadius: 16, padding: 16,
          border: '1px solid #e8ede4',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3d2b', marginBottom: 12, letterSpacing: '0.06em' }}>
            🧪 {t(lang, 'homeTests')}
          </div>
          {r.homeTests.map((test, i) => (
            <div key={i} style={{
              marginBottom: 12, paddingBottom: 12,
              borderBottom: i < r.homeTests.length - 1 ? '1px solid #f0f2ee' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a3d2b' }}>{test.name}</span>
                <span style={{
                  fontSize: 9, color: '#888', background: '#f5f7f3',
                  padding: '2px 7px', borderRadius: 10,
                }}>{test.difficulty}</span>
              </div>
              <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5, marginBottom: 6 }}>{test.steps}</div>
              <div style={{
                fontSize: 11, color: '#27500A', background: '#eaf3de',
                padding: '5px 10px', borderRadius: 8, fontWeight: 500,
              }}>✓ {test.result}</div>
            </div>
          ))}
        </div>
      )}

      {/* Buying tips */}
      {r.buyingTips?.length > 0 && (
        <div className="result-card fade-up" style={{
          background: '#fff', borderRadius: 16, padding: 16,
          border: '1px solid #e8ede4',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3d2b', marginBottom: 10, letterSpacing: '0.06em' }}>
            🛒 {t(lang, 'buyingTips')}
          </div>
          {r.buyingTips.map((tip, i) => (
            <div key={i} style={{
              fontSize: 12, color: '#444', padding: '6px 0',
              borderBottom: i < r.buyingTips.length - 1 ? '1px solid #f0f2ee' : 'none',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ color: '#27500A', fontWeight: 700, flexShrink: 0 }}>→</span>
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Verdict */}
      {r.verdict && (
        <div className="fade-up" style={{
          background: 'linear-gradient(135deg, #eaf3de, #d4eac0)',
          borderRadius: 12, padding: '12px 16px',
          fontSize: 13, color: '#1a3d2b', fontWeight: 600,
          border: '1px solid #c0dd97', lineHeight: 1.5,
        }}>
          💡 {r.verdict}
        </div>
      )}

      {/* Community Intelligence */}
      {collab && (
        <div className="result-card fade-up" style={{
          background: '#fff', borderRadius: 16, padding: 16,
          border: '1px solid #e8ede4',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3d2b', marginBottom: 8, letterSpacing: '0.06em' }}>
            👥 Community Intelligence
          </div>
          <div style={{ fontSize: 13, color: '#1a3d2b', fontWeight: 600, marginBottom: 6 }}>
            {collab.message}
          </div>
          {collab.top_cities?.length > 0 && (
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
              📍 Most reported in: {collab.top_cities.map(c => c.city).join(', ')}
            </div>
          )}
          {collab.also_flagged?.length > 0 && (
            <div style={{
              fontSize: 11, color: '#633806', background: '#fff8ed',
              padding: '8px 12px', borderRadius: 8, border: '1px solid #fac775',
            }}>
              ⚠ Users also flagged: {collab.also_flagged.join(', ')}
            </div>
          )}
        </div>
      )}


      {/* ML Insights */}
      {(r.seasonalRisk || r.personalizedScore) && (
        <div className="result-card fade-up" style={{
          background: '#fff', borderRadius: 16, padding: 16,
          border: '1px solid #e8ede4',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3d2b', marginBottom: 10, letterSpacing: '0.06em' }}>
            🤖 ML Insights
          </div>

          {r.seasonalRisk && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 8,
              background: r.seasonalRisk.seasonal_alert ? '#fff0f0' : '#f5f7f3',
              border: `1px solid ${r.seasonalRisk.seasonal_alert ? '#f7c1c1' : '#e0e8da'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a3d2b' }}>
                  📅 Seasonal Risk — {r.seasonalRisk.month}
                </span>
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                  background: r.seasonalRisk.seasonal_alert ? '#fff0f0' : '#eaf3de',
                  color: r.seasonalRisk.seasonal_alert ? '#c0392b' : '#27500A',
                  border: `1px solid ${r.seasonalRisk.seasonal_alert ? '#f7c1c1' : '#c0dd97'}`,
                }}>
                  {r.seasonalRisk.risk_level}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{r.seasonalRisk.reason}</div>
              <div style={{ fontSize: 9, color: '#aaa', marginTop: 4 }}>
                {r.seasonalRisk.source === 'prophet_model' ? '🔬 Prophet Time-Series ML' : '📊 Rule-based fallback'}
              </div>
            </div>
          )}

          {r.personalizedScore && (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: '#f5f7f3', border: '1px solid #e0e8da',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1a3d2b', marginBottom: 6 }}>
                👤 Personalized Toxin Exposure
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700,
                  background: r.personalizedScore.exposure_level === 'HIGH' ? '#fff0f0' :
                               r.personalizedScore.exposure_level === 'MEDIUM' ? '#fff8ed' : '#eaf3de',
                  color: r.personalizedScore.exposure_level === 'HIGH' ? '#c0392b' :
                         r.personalizedScore.exposure_level === 'MEDIUM' ? '#e07c1a' : '#27500A',
                  border: `2px solid ${r.personalizedScore.exposure_level === 'HIGH' ? '#f7c1c1' :
                           r.personalizedScore.exposure_level === 'MEDIUM' ? '#fac775' : '#c0dd97'}`,
                }}>
                  {r.personalizedScore.cumulative_score ?? 0}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a3d2b' }}>
                    {r.personalizedScore.exposure_level || 'LOW'} Exposure
                  </div>
                  <div style={{ fontSize: 10, color: '#888' }}>Cumulative toxin score</div>
                </div>
              </div>
              {r.personalizedScore.recommendation && (
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                  {r.personalizedScore.recommendation}
                </div>
              )}
              <div style={{ fontSize: 9, color: '#aaa', marginTop: 4 }}>🔬 Random Forest ML Model</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="fade-up" style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => nav('/brands')} style={{
          flex: 2, padding: 12, borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #1a3d2b, #2d6647)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 2px 8px rgba(26,61,43,0.2)',
        }}>
          🛒 See Safe Brands
        </button>
        <button onClick={shareWhatsApp} style={{
          flex: 1, padding: 12, borderRadius: 10,
          border: '1.5px solid #25D366',
          background: '#f0fff4', color: '#128C7E',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          📤 Share
        </button>
      </div>
    </div>
  )
}