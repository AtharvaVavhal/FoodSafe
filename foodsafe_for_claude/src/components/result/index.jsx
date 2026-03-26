// components/result/AdulterantCard.jsx
const RISK_COLORS = {
  LOW:      { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' },
  MEDIUM:   { bg: '#FAEEDA', text: '#633806', border: '#FAC775' },
  HIGH:     { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
  CRITICAL: { bg: '#A32D2D', text: '#fff',    border: '#A32D2D' },
}

export function AdulterantCard({ adulterant }) {
  const { name, description, healthRisk, severity, isPersonalRisk } = adulterant
  const colors = RISK_COLORS[severity] || RISK_COLORS.MEDIUM
  return (
    <div style={{ padding: '8px 0', borderBottom: '0.5px solid #f0f0e8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 10,
          background: colors.bg, color: colors.text,
        }}>
          {severity}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{description}</div>
      <div style={{ fontSize: 11, color: '#666' }}>{healthRisk}</div>
      {isPersonalRisk && (
        <div style={{ fontSize: 10, color: '#A32D2D', marginTop: 3 }}>⚠ High risk for your profile</div>
      )}
    </div>
  )
}

// components/result/HomeTestCard.jsx
export function HomeTestCard({ test }) {
  const { name, steps, result, difficulty } = test
  const diffColor = difficulty === 'Easy' ? '#27500A' : difficulty === 'Medium' ? '#854F0B' : '#A32D2D'
  return (
    <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '0.5px solid #f0f0e8' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
        🧪 {name}
        <span style={{ marginLeft: 6, fontSize: 10, color: diffColor }}>({difficulty})</span>
      </div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{steps}</div>
      <div style={{
        fontSize: 11, color: '#27500A', background: '#EAF3DE',
        padding: '4px 8px', borderRadius: 6,
      }}>
        ✓ {result}
      </div>
    </div>
  )
}

// components/result/VerdictBadge.jsx
export function VerdictBadge({ verdict }) {
  if (!verdict) return null
  return (
    <div style={{
      background: '#EAF3DE', borderRadius: 10,
      padding: '10px 14px', fontSize: 12,
      color: '#27500A', fontWeight: 500,
    }}>
      💡 {verdict}
    </div>
  )
}

// components/result/RiskScoreRing.jsx
const SEV_COLOR = {
  LOW: '#639922', MEDIUM: '#854F0B', HIGH: '#A32D2D', CRITICAL: '#7F0000'
}
const RISK_COLORS_BORDER = {
  LOW:      '#C0DD97',
  MEDIUM:   '#FAC775',
  HIGH:     '#F7C1C1',
  CRITICAL: '#A32D2D',
}

export function RiskScoreRing({ score, risk }) {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
      border: `3px solid ${RISK_COLORS_BORDER[risk] || '#ccc'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 500,
      color: SEV_COLOR[risk] || '#666',
    }}>
      {score}
    </div>
  )
}