const RISK_COLOR = { CRITICAL: '#A32D2D', HIGH: '#854F0B', MEDIUM: '#639922' }
const RISK_BG    = { CRITICAL: '#FCEBEB', HIGH: '#FAEEDA', MEDIUM: '#EAF3DE' }

export function FestivalCard({ festival }) {
  const { icon, name, risk, foods } = festival
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '0.5px solid #e0e0d8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{icon} {name}</div>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: RISK_BG[risk], color: RISK_COLOR[risk],
        }}>
          {risk}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        Risky foods: {foods.join(', ')}
      </div>
    </div>
  )
}

export function SeasonAlert({ festival }) {
  const { icon, name, risk, tips } = festival
  return (
    <div style={{ background: RISK_BG[risk], borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 16 }}>{icon} {name} Alert</div>
      <div style={{ fontSize: 11, color: RISK_COLOR[risk], marginTop: 4, fontWeight: 500 }}>
        {risk} RISK SEASON
      </div>
      <div style={{ marginTop: 8 }}>
        {tips.map((tip, i) => (
          <div key={i} style={{ fontSize: 12, color: '#444', padding: '3px 0' }}>→ {tip}</div>
        ))}
      </div>
    </div>
  )
}