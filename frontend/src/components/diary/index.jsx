// components/diary/ScanHistoryItem.jsx
const RISK_COLOR = { LOW:'#639922', MEDIUM:'#854F0B', HIGH:'#A32D2D', CRITICAL:'#7F0000' }
const RISK_BG    = { LOW:'#EAF3DE', MEDIUM:'#FAEEDA', HIGH:'#FCEBEB', CRITICAL:'#F7C1C1' }

export function ScanHistoryItem({ scan, isLast }) {
  const { food_name, risk_level, safety_score, date } = scan
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0',
      borderBottom: isLast ? 'none' : '0.5px solid #f0f0e8',
    }}>
      <div>
        <div style={{ fontSize: 13 }}>{food_name}</div>
        <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
          {new Date(date).toLocaleDateString()}
          {safety_score != null && ` · Score: ${safety_score}`}
        </div>
      </div>
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
        background: RISK_BG[risk_level] || '#eee',
        color: RISK_COLOR[risk_level] || '#666',
      }}>
        {risk_level || '?'}
      </span>
    </div>
  )
}

// components/diary/StatsBar.jsx
export function StatsBar({ total, high, grade }) {
  const gradeColor = grade <= 'B' ? '#27500A' : '#854F0B'
  const items = [
    { val: total, lbl: 'Total Scans', color: '#1a1a1a' },
    { val: high,  lbl: 'High Risk',   color: '#A32D2D' },
    { val: grade, lbl: 'Safety Grade', color: gradeColor },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {items.map((s, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 10, padding: '10px 8px',
          textAlign: 'center', border: '0.5px solid #e0e0d8',
        }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.val}</div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{s.lbl}</div>
        </div>
      ))}
    </div>
  )
}