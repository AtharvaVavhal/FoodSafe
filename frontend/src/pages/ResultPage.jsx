import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const RISK_COLORS = {
  LOW:      { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' },
  MEDIUM:   { bg: '#FAEEDA', text: '#633806', border: '#FAC775' },
  HIGH:     { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
  CRITICAL: { bg: '#A32D2D', text: '#fff',    border: '#A32D2D' },
}

const SEV_COLOR = {
  LOW: '#639922', MEDIUM: '#854F0B', HIGH: '#A32D2D', CRITICAL: '#7F0000'
}

export default function ResultPage() {
  const { lastResult, lang, activeMember } = useStore()
  const nav = useNavigate()

  if (!lastResult) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#666' }}>No result yet.</p>
        <button onClick={() => nav('/')} style={{ marginTop: 12, padding: '8px 20px',
          borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
          ← Back to Scan
        </button>
      </div>
    )
  }

  const r = lastResult
  const risk = r.riskLevel || r.combinedRiskLevel || 'MEDIUM'
  const score = r.safetyScore ?? r.combinedScore ?? 50
  const colors = RISK_COLORS[risk] || RISK_COLORS.MEDIUM

  function shareWhatsApp() {
    const text = `🌿 FoodSafe Report: ${r.foodName || 'Food scan'}\n` +
      `Risk: ${risk} | Score: ${score}/100\n${r.verdict || r.recommendation || ''}\n\nvia FoodSafe app`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Back */}
      <button onClick={() => nav('/')}
        style={{ alignSelf: 'flex-start', fontSize: 12, color: '#666', background: 'none',
                 border: 'none', cursor: 'pointer', padding: 0 }}>
        ← Back
      </button>

      {/* Header card */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Score ring */}
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                        border: `3px solid ${colors.text === '#fff' ? '#A32D2D' : colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 500, color: SEV_COLOR[risk] }}>
            {score}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{r.foodName || r.productName || 'Food Item'}</div>
            {activeMember && (
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                ⚕ Personalized for {activeMember.name}
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 500,
                             background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                {risk} RISK
              </span>
            </div>
          </div>
        </div>

        {r.summary && (
          <p style={{ fontSize: 12, color: '#555', marginTop: 10, lineHeight: 1.5 }}>{r.summary}</p>
        )}
      </div>

      {/* Cooking warning */}
      {r.cookingWarning && (
        <div style={{ background: '#FCEBEB', borderLeft: '3px solid #A32D2D', borderRadius: 8,
                      padding: '8px 12px', fontSize: 12, color: '#791F1F' }}>
          🔥 {r.cookingWarning}
        </div>
      )}

      {/* Personalized warning */}
      {r.personalizedWarning && (
        <div style={{ background: '#FAEEDA', borderLeft: '3px solid #EF9F27', borderRadius: 8,
                      padding: '8px 12px', fontSize: 12, color: '#633806' }}>
          ⚕ {r.personalizedWarning}
        </div>
      )}

      {/* Adulterants */}
      {r.adulterants?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 10 }}>
            {t(lang, 'adulterants')}
          </div>
          {r.adulterants.map((a, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < r.adulterants.length-1 ? '0.5px solid #f0f0e8' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
                               background: RISK_COLORS[a.severity]?.bg || '#eee',
                               color: RISK_COLORS[a.severity]?.text || '#333' }}>
                  {a.severity}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>{a.healthRisk}</div>
              {a.isPersonalRisk && (
                <div style={{ fontSize: 10, color: '#A32D2D', marginTop: 3 }}>⚠ High risk for your profile</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Home tests */}
      {r.homeTests?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 10 }}>
            {t(lang, 'homeTests')}
          </div>
          {r.homeTests.map((test, i) => (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 10,
                                   borderBottom: i < r.homeTests.length-1 ? '0.5px solid #f0f0e8' : 'none' }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                🧪 {test.name}
                <span style={{ marginLeft: 6, fontSize: 10, color: '#666' }}>({test.difficulty})</span>
              </div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{test.steps}</div>
              <div style={{ fontSize: 11, color: '#27500A', background: '#EAF3DE',
                             padding: '4px 8px', borderRadius: 6 }}>✓ {test.result}</div>
            </div>
          ))}
        </div>
      )}

      {/* Buying tips */}
      {r.buyingTips?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 8 }}>
            {t(lang, 'buyingTips')}
          </div>
          {r.buyingTips.map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: '#444', padding: '4px 0',
                                   borderBottom: i < r.buyingTips.length-1 ? '0.5px solid #f0f0e8' : 'none' }}>
              → {tip}
            </div>
          ))}
        </div>
      )}

      {/* Verdict */}
      {r.verdict && (
        <div style={{ background: '#EAF3DE', borderRadius: 10, padding: '10px 14px',
                      fontSize: 12, color: '#27500A', fontWeight: 500 }}>
          💡 {r.verdict}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => nav('/brands')}
          style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: '#1a3d2b',
                   color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          🛒 See Safe Brands
        </button>
        <button onClick={shareWhatsApp}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #25D366',
                   background: '#fff', color: '#25D366', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          WhatsApp
        </button>
      </div>
    </div>
  )
}
